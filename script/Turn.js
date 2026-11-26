"use strict";

import { RobotTypes, StructureTypes } from "./Enums.js";
import { GenerationState } from "./Generations.js";
import { BuildingGraph } from "./PipeNetwork.js";
import { PrototypeLib } from "./PrototypeLib.js";
import { RecipeLib } from "./RecipeLib.js";
import { MaintenancePhase } from "./TurnMaintenance.js";
import { CapsulePhase, PopulationPhase, RevivalPhase } from "./TurnPopulation.js";

/**
 * Turn: avanzamento di un turno della colonia.
 *
 * Interfaccia:
 *   Turn.project(map) -> TurnReport   proiezione del turno corrente (cosa succederebbe), senza applicarlo
 *   Turn.advance(map) -> TurnReport   applica il turno, avanza la data e ricalcola la proiezione
 *
 * Il turno è una sequenza ordinata di fasi. Ogni fase può avere:
 *   project(ctx) -> plan         prenota/consuma materiali nel Material ledger e restituisce il proprio piano
 *   apply(ctx, plan)             applica gli effetti del piano (avanzamenti, danni, nascite...)
 * L'ordine di PHASES è anche l'ordine di priorità nel consumo dei materiali.
 *
 * TODO: fase eventi (incidenti, catastrofi, scoperte) - vedi Events.js
 * TODO: fase sistemi avanzati (terraforming ecc.)
 */
function TurnConstructor()
{
	let _phases = function()
	{
		return [
			WorkforcePhase,
			BuildingProductionPhase,
			ProductionQueuePhase,
			ResearchPhase,
			MaintenancePhase,
			RobotWearPhase,
			RobotPhase,
			PopulationPhase,
			CapsulePhase,
			RevivalPhase,
			OutcomePhase
		];
	};

	let _project = function(map)
	{
		let state = map.getState();
		state.resetAll();

		let ctx = {
			state: state,
			networks: map.getGraph(),
			map: map,
			events: []
		};
		let phases = _phases();
		let plans = phases.map(function(phase) { return phase.project ? phase.project(ctx) : undefined; });
		return { ctx: ctx, phases: phases, plans: plans };
	};

	let _report = function(ctx)
	{
		return { date: ctx.state.getDate(), events: ctx.events, outcome: ctx.state.getOutcome() };
	};

	/** @return {{date:number, events:Array<{type:string, name:string}>, outcome:string|null}} */
	let _advance = function(map)
	{
		if(map.getState().getOutcome() != null)
		{
			// partita conclusa: il tempo non avanza più
			return _report(_project(map).ctx);
		}
		let turn = _project(map);
		turn.phases.forEach(function(phase, i)
		{
			if(phase.apply)
			{
				phase.apply(turn.ctx, turn.plans[i]);
			}
		});
		turn.ctx.state.updateAll();
		turn.ctx.state.setDate(turn.ctx.state.getDate() + 1);

		let report = _report(turn.ctx);
		_project(map); // proiezione del nuovo turno, mostrata dalla UI
		return report;
	};

	//-------------------------------------

	this.project = function(map) { return _report(_project(map).ctx); };
	this.advance = _advance;

	//-------------------------------------
}

let GameOutcome = {
	Victory: "victory",
	Defeat: "defeat"
};

let TurnEventType = {
	NewCreation: "NEW_CREATION",
	NewDiscovery: "NEW_DISCOVERY",
	RobotBroken: "ROBOT_BROKEN",
	ColonistsRevived: "COLONISTS_REVIVED"
};

// singleton
let Turn = new TurnConstructor();

//-----------------------------------------------------------------------------
// fasi

/**
 * Manodopera del turno, in due materiali distinti che non si accumulano:
 *   roboLabor    1 unità per RoboWorker
 *   workerLabor  1 unità per Lavoratore e RETIREE_LABOR per Pensionato, ridotta dalla felicità fino a MIN_HAPPINESS_FACTOR
 * Nei costi la voce "labor" si paga prima con i robot e poi con i Lavoratori; il personale
 * degli edifici (staff) solo con i Lavoratori.
 */
let WorkforcePhase = {
	MIN_HAPPINESS_FACTOR: 0.5,
	RETIREE_LABOR: 0.5,

	project: function(ctx)
	{
		let state = ctx.state;
		let date = state.getDate();
		let population = state.getPopulation();
		let workers = 0;
		population.registry.forEach(function(generation)
		{
			let phase = generation.getState(date);
			if(phase == GenerationState.Scientists || phase == GenerationState.Clones)
			{
				workers += generation.getPopulation();
			}
			else if(phase == GenerationState.Retirees)
			{
				workers += generation.getPopulation() * WorkforcePhase.RETIREE_LABOR;
			}
		});
		let factor = WorkforcePhase.MIN_HAPPINESS_FACTOR + (1 - WorkforcePhase.MIN_HAPPINESS_FACTOR) * population.happiness;
		state.setMaterials({ roboLabor: state.getStored("roboWorker"), workerLabor: Math.floor(workers * factor) });
	}
};

/** traduce la voce "labor" di un costo in manodopera robotica, poi dei Lavoratori */
let _withLabor = function(state, cost)
{
	let ret = Object.assign({}, cost);
	let need = ret.labor || 0;
	delete ret.labor;
	if(need > 0)
	{
		let robots = Math.min(need, Math.max(0, state.getRemainder("roboLabor")));
		if(robots > 0) { ret.roboLabor = robots; }
		if(need > robots) { ret.workerLabor = need - robots; }
	}
	return ret;
};
let _canPay = function(state, cost) { return state.haveMaterials(_withLabor(state, cost)); };
let _pay = function(state, cost) { state.delMaterials(_withLabor(state, cost)); };

/** materiali di un costo che non bastano in questo momento ("labor" = manodopera di robot e Lavoratori) */
let _missing = function(state, cost)
{
	return Object.keys(cost).filter(function(name)
	{
		if(name == "labor")
		{
			return state.getRemainder("roboLabor") + state.getRemainder("workerLabor") < cost.labor;
		}
		return state.getRemainder(name) < cost[name];
	});
};

/** consumi di un edificio attivo, compreso il personale */
let _runningCost = function(prototype)
{
	let cost = Object.assign({}, prototype.getConsumption());
	if(prototype.getStaff() > 0)
	{
		cost.workerLabor = (cost.workerLabor || 0) + prototype.getStaff();
	}
	return cost;
};

/** smaltimento: elimina fino alla quantità indicata di ogni scarto disponibile */
let _dispose = function(state, disposal)
{
	for(let name in disposal)
	{
		if(disposal.hasOwnProperty(name))
		{
			let amount = Math.min(disposal[name], state.getRemainder(name));
			if(amount > 0)
			{
				state.delMaterials({ [name]: amount });
			}
		}
	}
};

/** costo di un turno di cantiere: costo di costruzione più 1 unità di manodopera */
let _constructionCost = function(prototype)
{
	let cost = Object.assign({}, prototype.getBuildingCost());
	cost.labor = (cost.labor || 0) + 1;
	return cost;
};

/** produzione e consumi degli edifici, in ordine di priorità; costi dei cantieri */
let BuildingProductionPhase = {
	project: function(ctx)
	{
		let state = ctx.state;
		ctx.networks.forEach(function(graph)
		{
			let connected = BuildingGraph.hasHeadquarter(graph);
			PrototypeLib.getPriorityList().forEach(function(buildingType)
			{
				if(graph[buildingType] == undefined)
				{
					return;
				}
				let prototype = PrototypeLib.get(buildingType);
				graph[buildingType].forEach(function(building)
				{
					if(!connected && !building.isDestroyed() && !building.getFrozen())
					{
						state.setBuildingIssue(building, { reason: "disconnected", missing: [] });
					}
					if(building.isOperative())
					{
						// senza materiali, energia o personale l'edificio resta inattivo
						let running = _runningCost(prototype);
						if(state.haveMaterials(running) && state.haveSpace(prototype.getProductionWaste()))
						{
							state.delMaterials(running);
							state.addMaterials(prototype.getProduction());
							state.addMaterials(prototype.getProductionWaste());
							state.addCapacity(prototype.getCapacity());
							_dispose(state, prototype.getDisposal());
							state.addToActiveList(building);
						}
						else
						{
							// edificio inattivo
							state.addToInactiveList(building);
							state.setBuildingIssue(building, { reason: "inactive", missing: _missing(state, running), noSpace: !state.haveSpace(prototype.getProductionWaste()) });
						}
					}
					// le parti delle strutture composite sono costruite dall'edificio principale
					else if(building.underConstruction() && !building.getFrozen())
					{
						// senza materiali o manodopera il cantiere resta fermo questo turno
						let cost = _constructionCost(prototype);
						if(_canPay(state, cost))
						{
							_pay(state, cost);
							state.addToBuildList(building);
						}
						else
						{
							state.setBuildingIssue(building, { reason: "stalled", missing: _missing(state, cost) });
						}
					}
					else if(building.getIntegrity() == 0)
					{
						state.addToDestroyedList(building);
					}
				});
			});
		});
	}
};

/**
 * Consuma il costo di un elemento di coda (produzione o ricerca) per quanti più turni di lavoro
 * possibile, fino al tempo residuo. Restituisce le unità di lavoro acquistate.
 */
let _consumeRecipeWork = function(state, item)
{
	let cost = RecipeLib.get(item.getName()).getCost();
	let value = 0;
	while(_canPay(state, cost) && value < item.getRemainTime())
	{
		_pay(state, cost);
		value++;
	}
	return value;
};

/** coda di produzione */
let ProductionQueuePhase = {
	project: function(ctx)
	{
		return ctx.state.getProductionQueue().map(function(item)
		{
			return { item: item, value: (item.getRemainTime() > 0) ? _consumeRecipeWork(ctx.state, item) : 0 };
		});
	},

	apply: function(ctx, plan)
	{
		let state = ctx.state;
		let queue = state.getProductionQueue();
		plan.forEach(function(entry)
		{
			let item = entry.item;
			for(let i = 0; i < entry.value; i++)
			{
				item.progress();
			}

			if(item.getRemainTime() == 0)
			{
				let recipe = RecipeLib.get(item.getName());
				if(state.haveSpace(recipe.getResult()))
				{
					state.addMaterials(recipe.getResult());
					queue.splice(queue.indexOf(item), 1);
					ctx.events.push({ type: TurnEventType.NewCreation, name: item.getName() });
				}
			}
		});
	}
};

/** coda di ricerca */
let ResearchPhase = {
	project: function(ctx)
	{
		return ctx.state.getResearchQueue().map(function(item)
		{
			return { item: item, value: _consumeRecipeWork(ctx.state, item) };
		});
	},

	apply: function(ctx, plan)
	{
		let state = ctx.state;
		let queue = state.getResearchQueue();
		plan.forEach(function(entry)
		{
			let item = entry.item;
			for(let i = 0; i < entry.value; i++)
			{
				if(item.progress() == 0)
				{
					let recipe = RecipeLib.get(item.getName());
					state.addKnowledge(recipe.getResult());
					state.addCompletedResearch(item.getName());
					queue.splice(queue.indexOf(item), 1);
					ctx.events.push({ type: TurnEventType.NewDiscovery, name: item.getName() });
					break;
				}
			}
		});
	}
};

/**
 * Deterioramento dei robot. Ogni robot ha una propria durata (ROBOT_LIFE turni di lavoro, con una
 * variazione casuale di LIFE_VARIANCE) e accumula usura; a fine durata va fuori uso.
 * Il lavoro di un tipo di robot è ripartito tra tutti i robot di quel tipo. La manutenzione
 * (1 repairUnit per robot al lavoro) riduce l'usura di MAINTENANCE_REDUCTION.
 */
let RobotWearPhase = {
	ROBOT_LIFE: 40,
	LIFE_VARIANCE: 0.2,
	MAINTENANCE_REDUCTION: 0.5,
	TYPES: ["roboWorker", "dozer", "digger"],

	/** allinea l'elenco dei robot di un tipo alla quantità in magazzino (robot nuovi a usura zero) */
	sync: function(state, type)
	{
		let wear = state.getRobotWear();
		let list = wear[type] = wear[type] || [];
		let stock = Math.max(0, state.getStored(type));
		while(list.length < stock)
		{
			list.push({ wear: 0, life: RobotWearPhase.ROBOT_LIFE * (1 + (Math.random() * 2 - 1) * RobotWearPhase.LIFE_VARIANCE) });
		}
		if(list.length > stock)
		{
			list.length = stock;
		}
		return list;
	},

	/** usura media dei robot di un tipo, da 0 (nuovi) a 1 (a fine vita) */
	averageWear: function(state, type)
	{
		let list = state.getRobotWear()[type] || [];
		if(list.length == 0)
		{
			return 0;
		}
		return list.reduce(function(sum, robot) { return sum + Math.min(1, robot.wear / robot.life); }, 0) / list.length;
	},

	project: function(ctx)
	{
		let state = ctx.state;
		let work = { roboWorker: state.getConsumed("roboLabor"), dozer: 0, digger: 0 };
		ctx.map.getStructure().forEach(function(el)
		{
			if(el.getType() == StructureTypes.Robot)
			{
				if(el.getRobotType() == RobotTypes.Dozer) { work.dozer++; }
				else if(el.getRobotType() == RobotTypes.Digger) { work.digger++; }
			}
		});
		let total = work.roboWorker + work.dozer + work.digger;
		let repaired = Math.min(total, Math.max(0, state.getRemainder("repairUnit")));
		if(repaired > 0)
		{
			state.delMaterials({ repairUnit: repaired });
		}
		return { work: work, maintained: (total > 0) ? repaired / total : 1 };
	},

	apply: function(ctx, plan)
	{
		let state = ctx.state;
		let rate = 1 - RobotWearPhase.MAINTENANCE_REDUCTION * plan.maintained;
		RobotWearPhase.TYPES.forEach(function(type)
		{
			let list = RobotWearPhase.sync(state, type);
			if(list.length == 0 || !plan.work[type])
			{
				return;
			}
			let share = plan.work[type] * rate / list.length;
			list.forEach(function(robot) { robot.wear += share; });
			for(let i = list.length - 1; i >= 0; i--)
			{
				if(list[i].wear >= list[i].life)
				{
					list.splice(i, 1);
					state.destroyMaterials({ [type]: 1 });
					ctx.events.push({ type: TurnEventType.RobotBroken, name: type });
				}
			}
		});
	}
};

/** RoboDozer e RoboDigger: avanzamento del lavoro e disponibilità per il turno successivo */
let RobotPhase = {
	apply: function(ctx)
	{
		let state = ctx.state;
		let map = ctx.map;
		let structure = map.getStructure();
		let dozerCount = 0;
		let diggerCount = 0;

		let finishedRobots = [];
		structure.forEach(function(robot)
		{
			if(robot.getType() != StructureTypes.Robot)
			{
				return;
			}
			if(robot.getRobotType() == RobotTypes.Dozer)
			{
				if(map.raze(robot.getPosition(), robot.getLayer()) == 0) { finishedRobots.push(robot); }
				else { dozerCount++; }
			}
			else if(robot.getRobotType() == RobotTypes.Digger)
			{
				if(map.dig(robot.getPosition(), robot.getLayer())) { finishedRobots.push(robot); }
				else { diggerCount++; }
			}
		});
		finishedRobots.forEach(function(robot) { structure.splice(structure.indexOf(robot), 1); });

		state.setRobotsAvailable({
			controllers: state.getRemainder("controlUnit") - (dozerCount + diggerCount),
			dozer: state.getRemainder("dozer") - dozerCount,
			digger: state.getRemainder("digger") - diggerCount
		});
	}
};



/**
 * Esito della partita.
 * Vittoria: almeno VICTORY_POPULATION coloni contenti (piena sussistenza e felicità >= VICTORY_HAPPINESS)
 * per VICTORY_TURNS turni consecutivi; i cloni non contano.
 * Sconfitta, dopo la consegna del kit di atterraggio:
 *   - nessun Headquarter in piedi;
 *   - nessuna manodopera e nessun modo di riaverla: niente RoboWorker, Lavoratori, cloni, Pensionati o coloni
 *     giovani, e nessun Centro Criogenico attivo che prepari e risvegli capsule;
 *   - dopo l'arrivo dei primi coloni: nessun colono, nessuna nascita possibile (Asilo non attivo),
 *     nessuna capsula e nessun Centro Criogenico in piedi.
 */
let OutcomePhase = {
	VICTORY_POPULATION: 200,
	VICTORY_TURNS: 20,
	VICTORY_HAPPINESS: 0.75,

	apply: function(ctx)
	{
		let state = ctx.state;
		let date = state.getDate();
		let population = state.getPopulation();
		let people = 0, citizens = 0, workers = 0, young = 0;	// citizens: coloni non clonati; workers: chi fornisce manodopera
		population.registry.forEach(function(generation)
		{
			let n = generation.getPopulation();
			let phase = generation.getState(date);
			people += n;
			if(!generation.isClone()) { citizens += n; }
			if(phase == GenerationState.Scientists || phase == GenerationState.Clones || phase == GenerationState.Retirees) { workers += n; }
			else if(phase == GenerationState.Infants || phase == GenerationState.Students || phase == GenerationState.Researchers) { young += n; }
		});

		// vittoria
		let content = population.subsistence == 1 && population.happiness >= OutcomePhase.VICTORY_HAPPINESS;
		state.setVictoryStreak((citizens >= OutcomePhase.VICTORY_POPULATION && content) ? state.getVictoryStreak() + 1 : 0);
		if(state.getVictoryStreak() >= OutcomePhase.VICTORY_TURNS)
		{
			state.setOutcome(GameOutcome.Victory);
			return;
		}

		// sconfitta
		if(!state.isKitDelivered())
		{
			return;
		}
		let active = function(type) { return (state.getActiveList()[type] || []).length > 0; };
		let headquarterStanding = ctx.map.getStructure().some(function(el)
		{
			return el.getType() == StructureTypes.Building && el.isHeadquarter() && !el.isDestroyed();
		});
		let capsules = state.getStored("cryoCapsule");
		let cryoStanding = ctx.map.getStructure().some(function(el)
		{
			return el.getType() == StructureTypes.Building && el.getBuildingType() == "CryoCenter" && !el.isDestroyed();
		});
		let noLabor = state.getStored("roboWorker") <= 0 && workers == 0 && young == 0 && !active("CryoCenter");
		let colonistsArrived = population.registry.length > 0;
		let noColonists = colonistsArrived && people == 0 && !active("Nursery") && capsules <= 0 && !cryoStanding;
		if(!headquarterStanding || noLabor || noColonists)
		{
			state.setOutcome(GameOutcome.Defeat);
		}
	}
};

export { GameOutcome, OutcomePhase, RobotWearPhase, TurnConstructor, TurnEventType, Turn, WorkforcePhase, BuildingProductionPhase, ProductionQueuePhase, ResearchPhase, RobotPhase };
