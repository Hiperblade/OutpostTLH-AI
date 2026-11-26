"use strict";

let GenerationState = {
	Clones: "clones",
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
 * @param {boolean} [clone] cloni: adulti dal Centro Criogenico, che a fine vita lavorativa muoiono
 *                          invece di diventare Pensionati e non contano per la vittoria
 */
function Generation(date, nurseryUnit, educationLevel, clone)
{
	clone = !!clone;
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
		if(clone)
		{
			return (age > GenerationConst.AGE_RETIREES) ? GenerationState.Deads : GenerationState.Clones;
		}
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
	this.isClone = function() { return clone; };
	/** coloni malati e sani della generazione */
	this.getSick = function() { return lots.reduce(function(n, lot) { return n + lot.getSick(); }, 0); };
	this.getHealthy = function() { return _getPopulation() - this.getSick(); };
	/** toglie i lotti in cui non resta nessuno */
	this.prune = function()
	{
		for(let i = lots.length - 1; i >= 0; i--)
		{
			if(lots[i].getPopulation() <= 0) { lots.splice(i, 1); }
		}
	};
	/** i cloni a fine vita lavorativa muoiono tutti insieme */
	this.expire = function(date)
	{
		if(clone && date - birthDate > GenerationConst.AGE_RETIREES)
		{
			let dead = _getPopulation();
			lots.length = 0;
			return dead;
		}
		return 0;
	};
	this.toData = function() { return { birthDate: birthDate, clone: clone, lots: lots.map(function(lot) { return lot.toData(); }) }; };

	this.getPopulation = _getPopulation;
	this.kill = _kill;
	this.getNextLot = _getNextLot;
	this.teach = _teach;
	this.getState = _getState;

	//-----------------------------------------
}

function GenerationalLot(date, initialEducationLevel, initialDeadCount, initialSickCount)
{
	const INITIAL_POPULATION = 5;

	let birthDate = date;
	let deadCount = initialDeadCount || 0;
	let educationLevel = initialEducationLevel || 0;
	let sickCount = initialSickCount || 0;

	let _getPopulation = function()
	{
		return INITIAL_POPULATION - deadCount;
	};

	/** morte di un colono qualsiasi: è un malato in proporzione a quanti sono */
	let _kill = function()
	{
		if(deadCount < INITIAL_POPULATION)
		{
			if(sickCount > 0 && Math.random() * _getPopulation() < sickCount)
			{
				sickCount--;
			}
			deadCount++;
		}
		return _getPopulation();
	};

	/** morte di un colono malato */
	let _killSick = function()
	{
		if(sickCount > 0)
		{
			sickCount--;
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
	this.toData = function() { return { educationLevel: educationLevel, deadCount: deadCount, sickCount: sickCount }; };

	this.getSick = function() { return sickCount; };
	this.getHealthy = function() { return _getPopulation() - sickCount; };
	/** si ammalano fino a count coloni sani; restituisce quanti */
	this.fallIll = function(count) { let n = Math.max(0, Math.min(count, _getPopulation() - sickCount)); sickCount += n; return n; };
	/** guariscono fino a count malati; restituisce quanti */
	this.heal = function(count) { let n = Math.max(0, Math.min(count, sickCount)); sickCount -= n; return n; };
	this.killSick = _killSick;

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

/** una generazione di cloni adulti e istruiti, usciti dalle capsule del Centro Criogenico */
function createClones(date, lots)
{
	return new Generation(date - GenerationConst.AGE_ADULTS, lots,
		GenerationConst.EDUCATIONAL_PRIMARY + GenerationConst.EDUCATIONAL_SECONDARY, true);
}

/** ricostruisce una generazione salvata */
function generationFromData(data)
{
	let generation = new Generation(data.birthDate, 0, undefined, data.clone);
	data.lots.forEach(function(lot)
	{
		generation.getLots().push(new GenerationalLot(data.birthDate, lot.educationLevel, lot.deadCount, lot.sickCount));
	});
	return generation;
}

export { createClones, createWorkers, generationFromData, GenerationState, GenerationConst, Generation, GenerationalLot };
