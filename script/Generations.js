"use strict";

let GenerationState = {
	Infants: "infants",
	Students: "students",
	Researchers: "researchers",
	Scientists: "scientists",
	Retirees: "retirees",
	Deads: "deads"
	};

const GenerationConst = {
	AGE_ADULTS: 25,		// età dei coloni che arrivano già Lavoratori
	AGE_INFANTS: 6,
	AGE_RETIREES: 80,
	EDUCATIONAL_PRIMARY: 13,
	EDUCATIONAL_SECONDARY: 5
};

/**
 * @param {number} date data di nascita
 * @param {number} nurseryUnit numero di lotti (5 coloni ciascuno)
 * @param {number} [educationLevel] istruzione già completata (coloni che arrivano adulti)
 */
function Generation(date, nurseryUnit, educationLevel)
{
	let birthDate = date;
	let lots = [];
	for(let i = 0; i < nurseryUnit; i++)
	{
		lots[i] = new GenerationalLot(birthDate, educationLevel);
	}

	let _getPopulation = function()
	{
		let ret = 0;
		for(let i = 0; i < lots.length; i++)
		{
			ret += lots[i].getPopulation();
		}
		return ret;
	};

	let _kill = function()
	{
		if(_getPopulation() > 0)
		{
			do
			{
				let i = Math.floor(Math.random() * lots.length);
				if(lots[i].getPopulation() > 0)
				{
					if(lots[i].kill() == 0)
					{
						// rimuovo il lotto
						lots.splice(i, 1); // remove
					}
					return _getPopulation();
				}
			}
			while(true);
		}
		return 0;
	};

	let _getState = function(date)
	{
		if(_getPopulation() == 0)
		{
			return GenerationState.Deads;
		}

		let age = date - birthDate;
		if(age < GenerationConst.AGE_INFANTS)
		{
			return GenerationState.Infants;
		}
		else if(age > GenerationConst.AGE_RETIREES)
		{
			return GenerationState.Retirees;
		}
		else
		{
			let minEducationLevel = lots[lots.length - 1].getEducationLevel();
			if(minEducationLevel < GenerationConst.EDUCATIONAL_PRIMARY)
			{
				return GenerationState.Students;
			}
			else if(minEducationLevel < GenerationConst.EDUCATIONAL_PRIMARY + GenerationConst.EDUCATIONAL_SECONDARY)
			{
				return GenerationState.Researchers;
			}
			else
			{
				return GenerationState.Scientists;
			}
		}
	};

	let _getNextLot = function()
	{
		if(_getPopulation() > 0)
		{
			let minEducationLevel = lots[lots.length - 1].getEducationLevel();
			for(let i = 0; i < lots.length; i++)
			{
				if(lots[i].getEducationLevel() == minEducationLevel)
				{
					return lots[i];
				}
			}
		}
		return null;
	};

	let _teach = function()
	{
		let lot = _getNextLot();
		if(lot != null)
		{
			lot.teach();
		}
	};

	//-----------------------------------------

	this.getBirthDate = function() { return birthDate; };
	this.getLots = function() { return lots; };
	this.toData = function() { return { birthDate: birthDate, lots: lots.map(function(lot) { return lot.toData(); }) }; };

	this.getPopulation = _getPopulation;
	this.kill = _kill;
	this.getNextLot = _getNextLot;
	this.teach = _teach;
	this.getState = _getState;

	//-----------------------------------------
}

function GenerationalLot(date, initialEducationLevel, initialDeadCount)
{
	const INITIAL_POPULATION = 5;

	let birthDate = date;
	let deadCount = initialDeadCount || 0;
	let educationLevel = initialEducationLevel || 0;

	let _getPopulation = function()
	{
		return INITIAL_POPULATION - deadCount;
	};

	let _kill = function()
	{
		if(deadCount < INITIAL_POPULATION)
		{
			deadCount++;
		}
		return _getPopulation();
	};

	let _teach = function()
	{
		if(deadCount < INITIAL_POPULATION)
		{
			educationLevel++;
		}
	};

	let _getState = function(date)
	{
		if(_getPopulation() == 0)
		{
			return GenerationState.Deads;
		}

		let age = date - birthDate;
		if(age < GenerationConst.AGE_INFANTS)
		{
			return GenerationState.Infants;
		}
		else if(age > GenerationConst.AGE_RETIREES)
		{
			return GenerationState.Retirees;
		}
		else
		{
			if(educationLevel < GenerationConst.EDUCATIONAL_PRIMARY)
			{
				return GenerationState.Students;
			}
			else if(educationLevel < GenerationConst.EDUCATIONAL_PRIMARY + GenerationConst.EDUCATIONAL_SECONDARY)
			{
				return GenerationState.Researchers;
			}
			else
			{
				return GenerationState.Scientists;
			}
		}
	};

	//-----------------------------------------

	this.getEducationLevel = function() { return educationLevel; };
	this.toData = function() { return { educationLevel: educationLevel, deadCount: deadCount }; };

	this.getPopulation = _getPopulation;
	this.kill = _kill;
	this.teach = _teach;
	this.getState = _getState;

	//-----------------------------------------
}

/** una generazione di Lavoratori adulti e istruiti, nata AGE_ADULTS turni prima di date */
function createWorkers(date, lots)
{
	return new Generation(date - GenerationConst.AGE_ADULTS, lots,
		GenerationConst.EDUCATIONAL_PRIMARY + GenerationConst.EDUCATIONAL_SECONDARY);
}

/** ricostruisce una generazione salvata */
function generationFromData(data)
{
	let generation = new Generation(data.birthDate, 0);
	data.lots.forEach(function(lot)
	{
		generation.getLots().push(new GenerationalLot(data.birthDate, lot.educationLevel, lot.deadCount));
	});
	return generation;
}

export { createWorkers, generationFromData, GenerationState, GenerationConst, Generation, GenerationalLot };
