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
			PopulationPhase
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
		return { date: ctx.state.getDate(), events: ctx.events };
	};

	/** @return {{date:number, events:Array<{type:string, name:string}>}} */
	let _advance = function(map)
	{
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

let TurnEventType = {
	NewCreation: "NEW_CREATION",
	NewDiscovery: "NEW_DISCOVERY"
};

// singleton
let Turn = new TurnConstructor();

//-----------------------------------------------------------------------------
// fasi

/** manodopera umana e robotica */
let WorkforcePhase = {
	project: function(ctx)
	{
		let state = ctx.state;
		let date = state.getDate();
		let humanWorkUnit = 0;
		let generations = state.getPopulation().registry;
		for(let i = 0; i < generations.length; i++)
		{
			if(generations[i].getState(date) == GenerationState.Scientists)
			{
				humanWorkUnit += generations[i].getPopulation();
			}
		}
		state.setMaterials({ humanWorkUnit: humanWorkUnit });
		state.setMaterials({ roboticsWorkUnit: state.getStored("roboticsWorker") });
	}
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
						if(state.haveMaterials(prototype.getBuildingCost()))
						{
							state.delMaterials(prototype.getBuildingCost());
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

export { TurnConstructor, TurnEventType, Turn, WorkforcePhase, BuildingProductionPhase, ProductionQueuePhase, ResearchPhase, RobotPhase };
