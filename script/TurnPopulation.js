"use strict";

import { Generation, GenerationState, createClones } from "./Generations.js";
import { Cure } from "./Cure.js";
import { BuildingGraph } from "./PipeNetwork.js";

/** popolazione: consumi di sussistenza, istruzione, nascite, morti e stato della popolazione */
let PopulationPhase = {
	/** abitabilità del turno, per il report: supporto vitale, alloggi e cibo rispetto ai coloni */
	project: function(ctx)
	{
		let state = ctx.state;
		let people = state.getPopulation().registry.reduce(function(n, generation) { return n + generation.getPopulation(); }, 0);
		let colonists = people + state.getPendingRevival();
		let citizens = state.getPopulation().registry.reduce(function(n, generation) { return n + (generation.isClone() ? 0 : generation.getPopulation()); }, 0);
		let elements = 0;
		ctx.networks.forEach(function(graph)
		{
			if(BuildingGraph.hasHeadquarter(graph))
			{
				elements += BuildingGraph.countPipes(graph);
			}
		});
		state.setHabitability({
			people: people,
			pendingRevival: state.getPendingRevival(),
			capsules: state.getStored("cryoCapsule"),
			revivalCapacity: Math.max(0, state.getRemainder("cryoRevival")),
			habitat: { available: Math.max(0, state.getRemainder("habitatUnit")), needed: elements },
			housing: { available: Math.max(0, state.getRemainder("residentialUnit")), needed: colonists },
			food: { available: Math.max(0, state.getRemainder("foodUnit")), needed: colonists },
			// copertura medica: servono solo ai coloni nati (i cloni non si ammalano)
			medical: { available: Math.max(0, state.getRemainder("medicalUnit")), needed: citizens }
		});
	},


	RETIREE_DEATH_RATE: 0.05,
	BIRTH_COST: 8,		// unità dell'Asilo per un gruppo di bambini
	BIRTH_GROUP: 5,		// bambini per nascita (un lotto)
	MEDICAL_DEATH_REDUCTION: 0.5,
	GOODS_PER_PEOPLE: 10,
	GOODS_HAPPINESS_BONUS: 0.25,

	apply: function(ctx)
	{
		let colonyState = ctx.state;
		let graphs = ctx.networks;
		let date = colonyState.getDate();

		// totale popolazione
		let people = 0;
		let population = colonyState.getPopulation();
		let generations = population.registry;
		for(let g  = 0; g < generations.length; g++)
		{
			if(generations[g].getState(date) != GenerationState.Deads)
			{
				people += generations[g].getPopulation();
			}
		}

		// totale tubi
		let countPipes = 0;
		for(let graph = 0; graph < graphs.length; graph++)
		{
			if(BuildingGraph.hasHeadquarter(graphs[graph]))
			{
				countPipes += BuildingGraph.countPipes(graphs[graph]);
			}
		}

		let inhospitality = 1;
		let malnutrition = 1;
		let overcrowding = 1;
		let missingHealthCover = 1;
		let missingEducation = 1;
		let missingHighEducation = 1;
		let sadness = 1;

		// ambiente (aria - acqua - temperatura) (inhospitality)
		if(countPipes > 0)
		{
			let habitatUnit = colonyState.getRemainder("habitatUnit");
			colonyState.delMaterials( { habitatUnit: Math.min(habitatUnit, countPipes) } );
			inhospitality = 1 - (habitatUnit / countPipes);
			if(inhospitality < 0)
			{
				inhospitality = 0;
			}
		}

		// se ci sono persone
		if(people > 0)
		{
			// cibo (malnutrizione)
			let foodUnit = colonyState.getRemainder("foodUnit");
			colonyState.delMaterials( { foodUnit: Math.min(foodUnit, people) } );
			malnutrition = 1 - (foodUnit / people);
			if(malnutrition < 0)
			{
				malnutrition = 0;
			}

			// alloggi (sovraffollamento)
			let residentialUnit = colonyState.getRemainder("residentialUnit");
			colonyState.delMaterials( { residentialUnit: Math.min(residentialUnit, people) } );
			overcrowding = 1 - (residentialUnit / people);
			if(overcrowding < 0)
			{
				overcrowding = 0;
			}

			// medicinali (copertura sanitaria mancante): servono solo ai coloni nati, i cloni non si ammalano
			let citizens = generations.reduce(function(n, generation) { return n + (generation.isClone() ? 0 : generation.getPopulation()); }, 0);
			let medicalUnit = colonyState.getRemainder("medicalUnit");
			colonyState.delMaterials( { medicalUnit: Math.min(medicalUnit, citizens) } );
			missingHealthCover = (citizens > 0) ? Math.max(0, 1 - (medicalUnit / citizens)) : 0;

			// istruzione (mancanza di istruzione)
			let educationUnit = colonyState.getRemainder("educationUnit");
			let students = 0;
			let highEducationUnit = colonyState.getRemainder("highEducationUnit");
			let researchers = 0;
			for(let i = 0; i < generations.length; i++)
			{
				let lots = generations[i].getLots();
				if(lots.length == 0)
				{
					continue; // generazione estinta
				}
				let minEducationLevel = lots[lots.length - 1].getEducationLevel();
				let ii;
				for(ii = 0; ii < lots.length; ii++)
				{
					if(lots[ii].getEducationLevel() == minEducationLevel)
					{
						break;
					}
				}
				for(let index = ii; index < ii + lots.length; index++)
				{
					if(generations[i].getState(date) == GenerationState.Students)
					{
						// Students: i malati non studiano; il gruppo avanza in proporzione ai sani
						let lot = lots[index % lots.length];
						students += lot.getHealthy();
						if(students <= educationUnit && lot.getPopulation() > 0 && Math.random() * lot.getPopulation() < lot.getHealthy())
						{
							lot.teach();
						}
					}
					else if(generations[i].getState(date) == GenerationState.Researchers)
					{
						// Researchers: i malati non studiano; il gruppo avanza in proporzione ai sani
						let lot = lots[index % lots.length];
						researchers += lot.getHealthy();
						if(researchers <= highEducationUnit && lot.getPopulation() > 0 && Math.random() * lot.getPopulation() < lot.getHealthy())
						{
							lot.teach();
						}
					}
				}
			}

			// Students
			colonyState.delMaterials( { educationUnit: Math.min(educationUnit, students) } );
			if(students > 0)
			{
				missingEducation = 1 - (educationUnit / students);
				if(missingEducation < 0)
				{
					missingEducation = 0;
				}
			}
			else
			{
				missingEducation = 0;
			}

			// Researchers
			colonyState.delMaterials( { highEducationUnit: Math.min(highEducationUnit, researchers) } );
			if(researchers > 0)
			{
				missingHighEducation = 1 - (highEducationUnit / researchers);
				if(missingHighEducation < 0)
				{
					missingHighEducation = 0;
				}
			}
			else
			{
				missingHighEducation = 0;
			}

			// felicità (tristezza)
			let recreationalUnit = colonyState.getRemainder("recreationalUnit");
			colonyState.delMaterials( { recreationalUnit: Math.min(recreationalUnit, people) } );
			sadness = 1 - (recreationalUnit / people);
			if(sadness < 0)
			{
				sadness = 0;
			}
		}
		else // non ci sono persone
		{
			if(colonyState.getRemainder("foodUnit") > 0)
			{
				malnutrition = 0;
			}

			if(colonyState.getRemainder("residentialUnit") > 0)
			{
				overcrowding = 0;
			}

			if(colonyState.getRemainder("medicalUnit") > 0)
			{
				missingHealthCover = 0;
			}
		}

		//subsistence
		//  inhospitality // inospitabilità dell'ambiente
		//	malnutrition // malnutrizione
		let subsistence = 1 - Math.max(inhospitality, malnutrition);

		//wellness
		//	overcrowding // sovraffollamento
		//	missingHealthCover // copertura sanitaria mancante		
		let wellness = 1 - Math.max(overcrowding, missingHealthCover);

		//happiness
		//	missingEducation // mancanza di istruzione
		//	missingHighEducation // mancanza di alta formazione
		//	sadness // tristezza
		let happiness = 1 - Math.max(missingEducation, missingHighEducation, sadness);

		// beni di consumo: 1 ogni GOODS_PER_PEOPLE coloni, alzano la felicità fino a GOODS_HAPPINESS_BONUS
		if(people > 0)
		{
			let goodsNeeded = Math.ceil(people / PopulationPhase.GOODS_PER_PEOPLE);
			let goodsUsed = Math.min(goodsNeeded, colonyState.getRemainder("goods"));
			if(goodsUsed > 0)
			{
				colonyState.delMaterials({ goods: goodsUsed });
			}
			happiness = Math.min(1, happiness + PopulationPhase.GOODS_HAPPINESS_BONUS * goodsUsed / goodsNeeded);
		}

		let subsistenceAverage = (population.subsistence + subsistence) / 2;
		let wellnessAverage = (population.wellness + wellness) / 2;
		// nascite: l'Asilo accumula avanzamento; a BIRTH_COST nasce un gruppo di BIRTH_GROUP bambini, se la
		// colonia è in piena sussistenza e cibo, alloggi e habitat avanzano per i nuovi nati
		let progress = Math.min(PopulationPhase.BIRTH_COST, colonyState.getBirthProgress() + Math.max(0, colonyState.getRemainder("nurseryUnit")));
		if(progress >= PopulationPhase.BIRTH_COST && subsistenceAverage == 1 && overcrowding == 0 &&
			colonyState.getRemainder("foodUnit") >= PopulationPhase.BIRTH_GROUP &&
			colonyState.getRemainder("residentialUnit") >= PopulationPhase.BIRTH_GROUP)
		{
			generations.push(new Generation(date, 1));
			progress = 0;
			ctx.events.push({ type: "BIRTHS", count: PopulationPhase.BIRTH_GROUP });
		}
		colonyState.setBirthProgress(progress);
		if(subsistenceAverage < 1)
		{
			// morti
			let dead = Math.floor(people * (1 - subsistenceAverage));
			for(let d = 0; d < dead; d++)
			{
				generations[d % generations.length].kill();
			}
		}

		// i cloni non vanno in pensione: a fine vita lavorativa muoiono; il turno prima arriva l'avviso
		let expired = generations.reduce(function(n, generation) { return n + generation.expire(date); }, 0);
		if(expired > 0)
		{
			ctx.events.push({ type: "CLONES_EXPIRED", count: expired });
		}
		generations.forEach(function(generation)
		{
			if(generation.isClone() && generation.getPopulation() > 0 && generation.expiresAt(date + 1))
			{
				ctx.events.push({ type: "CLONES_EXPIRING", count: generation.getPopulation() });
			}
		});

		// mortalità naturale dei Pensionati, rallentata dalle cure mediche
		let healthCover = 1 - missingHealthCover;
		let deathRate = PopulationPhase.RETIREE_DEATH_RATE * (1 - PopulationPhase.MEDICAL_DEATH_REDUCTION * healthCover);
		generations.forEach(function(generation)
		{
			if(generation.getState(date) == GenerationState.Retirees)
			{
				let expected = generation.getPopulation() * deathRate;
				let deaths = Math.floor(expected) + ((Math.random() < expected - Math.floor(expected)) ? 1 : 0);
				for(let d = 0; d < deaths; d++)
				{
					generation.kill();
				}
			}
		});

		population.subsistence = subsistence;
		population.wellness = wellness;
		population.happiness = happiness;
	}
};

/** numero intero con media "expected": la parte decimale diventa una probabilità */
let _randomCount = function(expected)
{
	let whole = Math.floor(expected);
	return whole + ((Math.random() < expected - whole) ? 1 : 0);
};

/**
 * Malattia dei coloni nati (i cloni non si ammalano). A fine turno, in quest'ordine:
 *   cure: prenotate dal giocatore o automatiche, un Kit Medico per malato, nei limiti delle Strutture Mediche,
 *         prima i Lavoratori, poi Universitari e Studenti, poi Bambini, per ultimi i Pensionati;
 *   guarigione spontanea (RECOVERY_RATE) e morte dei malati (DEATH_RATE, RETIREE_DEATH_RATE per i Pensionati);
 *   nuovi malati: ILLNESS_RATE dei sani quando il Benessere è 0, nessuno con il Benessere pieno.
 */
let IllnessPhase = {
	ILLNESS_RATE: 0.1,
	RECOVERY_RATE: 0.1,
	DEATH_RATE: 0.05,
	RETIREE_DEATH_RATE: 0.1,
	CURE_ORDER: [GenerationState.Scientists, GenerationState.Researchers, GenerationState.Students, GenerationState.Infants, GenerationState.Retirees],

	apply: function(ctx)
	{
		let state = ctx.state;
		let date = state.getDate();
		let population = state.getPopulation();
		let colonists = population.registry.filter(function(generation) { return !generation.isClone() && generation.getPopulation() > 0; });
		if(colonists.length == 0)
		{
			state.setPendingCures(0);
			return;
		}

		// cure
		let cures = state.isAutoCure() ? Cure.available(state) : Math.min(state.getPendingCures(), Cure.available(state));
		let treated = 0;
		IllnessPhase.CURE_ORDER.forEach(function(stage)
		{
			colonists.forEach(function(generation)
			{
				if(generation.getState(date) != stage)
				{
					return;
				}
				generation.getLots().forEach(function(lot)
				{
					treated += lot.heal(cures - treated);
				});
			});
		});
		if(treated > 0)
		{
			state.destroyMaterials({ mediKit: treated });
		}
		state.setPendingCures(0);

		// guarigione spontanea e morte dei malati
		let recovered = 0, deaths = 0;
		colonists.forEach(function(generation)
		{
			let rate = (generation.getState(date) == GenerationState.Retirees) ? IllnessPhase.RETIREE_DEATH_RATE : IllnessPhase.DEATH_RATE;
			generation.getLots().forEach(function(lot)
			{
				recovered += lot.heal(_randomCount(lot.getSick() * IllnessPhase.RECOVERY_RATE));
				let dead = Math.min(lot.getSick(), _randomCount(lot.getSick() * rate));
				for(let d = 0; d < dead; d++)
				{
					lot.killSick();
				}
				deaths += dead;
			});
			generation.prune();
		});

		// nuovi malati, in proporzione al Benessere che manca
		let rate = IllnessPhase.ILLNESS_RATE * Math.max(0, 1 - population.wellness);
		let ill = 0;
		colonists.forEach(function(generation)
		{
			generation.getLots().forEach(function(lot)
			{
				ill += lot.fallIll(_randomCount(lot.getHealthy() * rate));
			});
		});

		if(ill > 0) { ctx.events.push({ type: "FELL_ILL", count: ill }); }
		if(treated + recovered > 0) { ctx.events.push({ type: "RECOVERED", count: treated + recovered }); }
		if(deaths > 0) { ctx.events.push({ type: "ILLNESS_DEATHS", count: deaths }); }
	}
};

/**
 * Produzione delle capsule criogeniche: ogni Centro Criogenico attivo prepara una capsula a turno
 * con CAPSULE_COST, finché le capsule non riempiono la capienza dei centri (10 ciascuno).
 */
let CapsulePhase = {
	CAPSULE_COST: { mineralOre: 5 },

	project: function(ctx)
	{
		let state = ctx.state;
		let centers = (state.getActiveList()["CryoCenter"] || []).length;
		let room = state.getCapacity("cryoCapsule") - state.getStored("cryoCapsule");
		let n = 0;
		while(n < Math.min(centers, room) && state.haveMaterials(CapsulePhase.CAPSULE_COST))
		{
			state.delMaterials(CapsulePhase.CAPSULE_COST);
			n++;
		}
		if(n > 0)
		{
			state.addMaterials({ cryoCapsule: n });
		}
		return n;
	}
};

/**
 * Risveglio delle capsule criogeniche richiesto dal giocatore (vedi Revival.js): a gruppi di
 * REVIVAL_GROUP, nei limiti della capacità dei Centri Criogenici attivi in questo turno.
 */
let RevivalPhase = {
	REVIVAL_GROUP: 5,

	apply: function(ctx)
	{
		let state = ctx.state;
		let pending = state.getPendingRevival();
		if(pending <= 0)
		{
			return;
		}
		let n = Math.min(pending, state.getStored("cryoCapsule"), Math.max(0, state.getRemainder("cryoRevival")));
		n -= n % RevivalPhase.REVIVAL_GROUP;
		if(n <= 0)
		{
			return;
		}
		state.delMaterials({ cryoRevival: n });
		state.destroyMaterials({ cryoCapsule: n });
		state.getPopulation().registry.push(createClones(state.getDate(), n / RevivalPhase.REVIVAL_GROUP));
		state.setPendingRevival(pending - n);
		ctx.events.push({ type: "COLONISTS_REVIVED", count: n });
	}
};

export { CapsulePhase, IllnessPhase, PopulationPhase, RevivalPhase };
