"use strict";

import { RobotTypes, StructureTypes } from "./Enums.js";
import { GenerationState } from "./Generations.js";
import { PrototypeLib } from "./PrototypeLib.js";
import { RecipeLib } from "./RecipeLib.js";
import { MaintenancePhase } from "./TurnMaintenance.js";
import { PopulationPhase } from "./TurnPopulation.js";

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
			RobotPhase,
			PopulationPhase,
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
	NewDiscovery: "NEW_DISCOVERY"
};

// singleton
let Turn = new TurnConstructor();

//-----------------------------------------------------------------------------
// fasi

/**
 * Manodopera del turno (materiale "labor"): 1 unità per Lavoratore, ridotta dalla felicità
 * fino a un minimo di MIN_HAPPINESS_FACTOR, più 1 unità per RoboWorker. Non si accumula.
 */
let WorkforcePhase = {
	MIN_HAPPINESS_FACTOR: 0.5,

	project: function(ctx)
	{
		let state = ctx.state;
		let date = state.getDate();
		let population = state.getPopulation();
		let workers = 0;
		population.registry.forEach(function(generation)
		{
			if(generation.getState(date) == GenerationState.Scientists)
			{
				workers += generation.getPopulation();
			}
		});
		let factor = WorkforcePhase.MIN_HAPPINESS_FACTOR + (1 - WorkforcePhase.MIN_HAPPINESS_FACTOR) * population.happiness;
		state.setMaterials({ labor: Math.floor(workers * factor) + state.getStored("roboWorker") });
	}
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
			PrototypeLib.getPriorityList().forEach(function(buildingType)
			{
				if(graph[buildingType] == undefined)
				{
					return;
				}
				let prototype = PrototypeLib.get(buildingType);
				graph[buildingType].forEach(function(building)
				{
					if(building.isOperative())
					{
						if(state.haveMaterials(prototype.getConsumption()) && state.haveSpace(prototype.getProductionWaste()))
						{
							state.delMaterials(prototype.getConsumption());
							state.addMaterials(prototype.getProduction());
							state.addMaterials(prototype.getProductionWaste());
							state.addCapacity(prototype.getCapacity());
							_dispose(state, prototype.getDisposal());
							state.addToActiveList(building);
						}
						else
						{
							// edificio inattivo per la mancanza di materie prime
							state.addToInactiveList(building);
						}
					}
					else if(building.underConstruction())
					{
						// senza materiali o manodopera il cantiere resta fermo questo turno
						let cost = _constructionCost(prototype);
						if(state.haveMaterials(cost))
						{
							state.delMaterials(cost);
							state.addToBuildList(building);
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
	while(state.haveMaterials(cost) && value < item.getRemainTime())
	{
		state.delMaterials(cost);
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
 * Vittoria: almeno VICTORY_POPULATION coloni in piena sussistenza per VICTORY_TURNS turni consecutivi.
 * Sconfitta: dopo l'arrivo dei coloni, tutti morti e nessuna Nursery attiva; oppure, dopo l'atterraggio,
 * nessun Headquarter rimasto in piedi.
 */
let OutcomePhase = {
	VICTORY_POPULATION: 200,
	VICTORY_TURNS: 20,

	apply: function(ctx)
	{
		let state = ctx.state;
		let population = state.getPopulation();
		let people = population.registry.reduce(function(n, generation) { return n + generation.getPopulation(); }, 0);
		if(people > 0)
		{
			state.setColonistsArrived();
		}

		// vittoria
		if(people >= OutcomePhase.VICTORY_POPULATION && population.subsistence == 1)
		{
			state.setVictoryStreak(state.getVictoryStreak() + 1);
		}
		else
		{
			state.setVictoryStreak(0);
		}
		if(state.getVictoryStreak() >= OutcomePhase.VICTORY_TURNS)
		{
			state.setOutcome(GameOutcome.Victory);
			return;
		}

		// sconfitta
		let headquarters = ctx.map.getStructure().filter(function(el)
		{
			return el.getType() == StructureTypes.Building && el.isHeadquarter();
		});
		let landed = headquarters.length > 0 || state.haveColonistsArrived();
		let headquarterStanding = headquarters.some(function(el) { return !el.isDestroyed(); });
		let nurseryActive = (state.getActiveList()["Nursery"] || []).length > 0;
		if((landed && !headquarterStanding) ||
			(state.haveColonistsArrived() && people == 0 && !nurseryActive))
		{
			state.setOutcome(GameOutcome.Defeat);
		}
	}
};

export { GameOutcome, OutcomePhase, TurnConstructor, TurnEventType, Turn, WorkforcePhase, BuildingProductionPhase, ProductionQueuePhase, ResearchPhase, RobotPhase };
