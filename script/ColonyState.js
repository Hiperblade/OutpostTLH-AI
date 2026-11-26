"use strict";

import { generationFromData } from "./Generations.js";
import { MaterialLedger } from "./MaterialLedger.js";
import { RecipeLib } from "./RecipeLib.js";

 
	function ColonyState()
	{
		let state = {};
		state.buildList = [];
		state.destroyedList = [];
		state.activeList = {};
		state.inactiveList = {};
		state.knowledge = {
			discovery: [],
			theory: [],
			technology: [],
			completed: [],
			researchQueue: [],
			productionQueue: []
			};
		state.population = {
			registry: [],
			subsistence: 1,
			wellness: 1,
			happiness: 0
			};
		state.robotsAvailable = {
			controllers: 0,
			dozer: 0,
			digger: 0
			};
		state.date = 0;
		// esito della partita: null finché si gioca, poi GameOutcome.Victory o GameOutcome.Defeat
		state.outcome = null;
		state.victoryStreak = 0;
		state.kitDelivered = false;
		// capsule criogeniche di cui il giocatore ha chiesto il risveglio
		state.pendingRevival = 0;
		// avanzamento della prossima nascita, in unità dell'Asilo (vedi PopulationPhase.BIRTH_COST)
		state.birthProgress = 0;
		// cure prenotate dal giocatore per questo turno, cure automatiche e nascite sospese (scelte di tutta la colonia)
		state.pendingCures = 0;
		state.autoCure = false;
		state.birthsSuspended = false;
		// usura di ogni robot, per tipo: [{ wear, life }] (vedi RobotWearPhase)
		state.robotWear = { roboWorker: [], dozer: [], digger: [] };

		// i materiali sono gestiti dal Material ledger
		let ledger = new MaterialLedger();

		/** perché un edificio non funziona in questo turno: { reason: "inactive" | "stalled" | "disconnected", missing: [...] } */
		let buildingIssues = new Map();
		let buildPoints = new Map();
		/** abitabilità del turno: per supporto vitale, alloggi e cibo { available, needed } */
		let habitability = null;

		let _resetAll = function()
		{
			ledger.resetTurn();

			state.buildList = [];
			state.destroyedList = [];
			state.activeList = {};
			state.inactiveList = {};
			buildingIssues = new Map();
			buildPoints = new Map();
			habitability = null;
		};

		/** cantiere che lavora in questo turno, con i punti lavoro ricevuti */
		let _addToBuildList = function(building, points)
		{
			state.buildList.push(building);
			buildPoints.set(building, (points === undefined) ? 1 : points);
		};

		let _addToDestroyedList = function(building)
		{
			state.destroyedList.push(building);
		};

		let _addToActiveList = function(building)
		{
			if(state.activeList[building.getBuildingType()] == undefined)
			{
				state.activeList[building.getBuildingType()] = [];
			}
			state.activeList[building.getBuildingType()].push(building);
		};

		let _addToInactiveList = function(building)
		{
			if(state.inactiveList[building.getBuildingType()] == undefined)
			{
				state.inactiveList[building.getBuildingType()] = [];
			}
			state.inactiveList[building.getBuildingType()].push(building);
		};

		// Knowledge
		let _isCompletedKnowledge = function(name)
		{
			return _contains(state.knowledge.completed, name);
		};

		let _addCompletedResearch = function(research)
		{
			state.knowledge.completed.push(research);
		};

		let _checkKnowledge = function(knowledge)
		{
			let ret = true;
			for(let type in knowledge)
			{
				if(knowledge.hasOwnProperty(type))
				{
					for(let ii = 0; ii < knowledge[type].length; ii++)
					{
						if(!_contains(state.knowledge[type], knowledge[type][ii]))
						{
							ret = false;
						}
					}
				}
			}
			return ret;
		};

		let _addKnowledge = function(knowledge)
		{
			let ret = true;
			for(let type in knowledge)
			{
				if(knowledge.hasOwnProperty(type))
				{
					for(let ii = 0; ii < knowledge[type].length; ii++)
					{
						if(!_contains(state.knowledge[type], knowledge[type][ii]))
						{
							state.knowledge[type].push(knowledge[type][ii]);
						}
					}
				}
			}
			return ret;
		};

		let _delKnowledge = function(knowledge)
		{
			let ret = true;
			for(let type in knowledge)
			{
				if(knowledge.hasOwnProperty(type))
				{
					for(let ii = 0; ii < knowledge[type].length; ii++)
					{
						if(_contains(state.knowledge[type], knowledge[type][ii]))
						{
							state.knowledge[type].splice(state.knowledge[type].indexOf(knowledge[type][ii]), 1); // remove
						}
					}
				}
			}
			return ret;
		};

		let _contains = function(array, obj)
		{
			for(let i = 0; i < array.length; i++)
			{
				if (array[i] === obj)
				{
					return true;
				}
			}
			return false;
		};

		let _getRoboDozerAvailable = function()
		{
			return Math.min(state.robotsAvailable.dozer, state.robotsAvailable.controllers);
		};

		let _useRoboDozer = function()
		{
			if(_getRoboDozerAvailable() > 0)
			{
				state.robotsAvailable.dozer--;
				state.robotsAvailable.controllers--;
				return true;
			}
			return false;
		};

		let _getRoboDiggerAvailable = function()
		{
			return Math.min(state.robotsAvailable.digger, state.robotsAvailable.controllers);
		};

		let _useRoboDigger = function()
		{
			if(_getRoboDiggerAvailable() > 0)
			{
				state.robotsAvailable.digger--;
				state.robotsAvailable.controllers--;
				return true;
			}
			return false;
		};

		let _getRoboMinerAvailable = function()
		{
			return ledger.getStored("miner");
		};

		/** il RoboMiner diventa la miniera: viene consumato */
		let _useRoboMiner = function()
		{
			if(_getRoboMinerAvailable() > 0)
			{
				ledger.destroyStock({ miner: 1 });
				return true;
			}
			return false;
		};

		let _setRobotsAvailable = function(data)
		{
			state.robotsAvailable.controllers = data.controllers;
			state.robotsAvailable.dozer = data.dozer;
			state.robotsAvailable.digger = data.digger;
		};

		//-----------------------------------------
		// salvataggio (le liste del turno si ricalcolano con la proiezione)

		let _queueToData = function(queue)
		{
			return queue.map(function(item) { return { name: item.getName(), currentTime: item.getCurrentTime() }; });
		};

		let _queueFromData = function(queue, data)
		{
			queue.length = 0;
			data.forEach(function(entry)
			{
				let item = RecipeLib.create(entry.name);
				item.setCurrentTime(entry.currentTime);
				queue.push(item);
			});
		};

		let _toData = function()
		{
			let knowledge = state.knowledge;
			return {
				date: state.date,
				outcome: state.outcome,
				victoryStreak: state.victoryStreak,
				kitDelivered: state.kitDelivered,
				pendingRevival: state.pendingRevival,
				birthProgress: state.birthProgress,
				pendingCures: state.pendingCures,
				autoCure: state.autoCure,
				birthsSuspended: state.birthsSuspended,
				robotWear: JSON.parse(JSON.stringify(state.robotWear)),
				robotsAvailable: Object.assign({}, state.robotsAvailable),
				knowledge: {
					discovery: knowledge.discovery.slice(),
					theory: knowledge.theory.slice(),
					technology: knowledge.technology.slice(),
					completed: knowledge.completed.slice(),
					researchQueue: _queueToData(knowledge.researchQueue),
					productionQueue: _queueToData(knowledge.productionQueue)
				},
				population: {
					registry: state.population.registry.map(function(generation) { return generation.toData(); }),
					subsistence: state.population.subsistence,
					wellness: state.population.wellness,
					happiness: state.population.happiness
				},
				ledger: ledger.toData()
			};
		};

		let _loadData = function(data)
		{
			state.date = data.date;
			state.outcome = data.outcome;
			state.victoryStreak = data.victoryStreak;
			state.kitDelivered = data.kitDelivered;
			state.pendingRevival = data.pendingRevival || 0;
			state.birthProgress = data.birthProgress || 0;
			state.pendingCures = data.pendingCures || 0;
			state.autoCure = !!data.autoCure;
			state.birthsSuspended = !!data.birthsSuspended;
			// i salvataggi precedenti avevano un contatore per tipo: si ripartono da robot nuovi
			state.robotWear = { roboWorker: [], dozer: [], digger: [] };
			Object.keys(data.robotWear || {}).forEach(function(type)
			{
				if(Array.isArray(data.robotWear[type])) { state.robotWear[type] = data.robotWear[type].map(function(r) { return { wear: r.wear, life: r.life }; }); }
			});
			state.robotsAvailable = Object.assign({}, data.robotsAvailable);
			["discovery", "theory", "technology", "completed"].forEach(function(type)
			{
				state.knowledge[type] = data.knowledge[type].slice();
			});
			_queueFromData(state.knowledge.researchQueue, data.knowledge.researchQueue);
			_queueFromData(state.knowledge.productionQueue, data.knowledge.productionQueue);
			state.population.registry = data.population.registry.map(generationFromData);
			state.population.subsistence = data.population.subsistence;
			state.population.wellness = data.population.wellness;
			state.population.happiness = data.population.happiness;
			ledger.loadData(data.ledger);
		};

		this.toData = _toData;
		this.loadData = _loadData;

		//-----------------------------------------

		this.getDate = function() { return state.date; };
		this.setDate = function(date) { state.date = date; };
		this.getOutcome = function() { return state.outcome; };
		this.setOutcome = function(outcome) { state.outcome = outcome; };
		this.getVictoryStreak = function() { return state.victoryStreak; };
		this.setVictoryStreak = function(value) { state.victoryStreak = value; };
		this.isKitDelivered = function() { return state.kitDelivered; };
		this.setKitDelivered = function() { state.kitDelivered = true; };
		this.getPendingRevival = function() { return state.pendingRevival; };
		this.getBirthProgress = function() { return state.birthProgress; };
		this.setBirthProgress = function(value) { state.birthProgress = value; };
		this.getPendingCures = function() { return state.pendingCures; };
		this.setPendingCures = function(value) { state.pendingCures = value; };
		this.isAutoCure = function() { return state.autoCure; };
		this.setAutoCure = function(value) { state.autoCure = !!value; };
		this.areBirthsSuspended = function() { return state.birthsSuspended; };
		this.setBirthsSuspended = function(value) { state.birthsSuspended = !!value; };
		this.setPendingRevival = function(value) { state.pendingRevival = value; };
		this.getRobotWear = function() { return state.robotWear; };

		this.getLedger = function() { return ledger; };
		this.getConsumed = ledger.getConsumed;
		this.getProduced = ledger.getProduced;
		this.getStored = ledger.getStored;
		this.getMaterials = ledger.getNames;
		this.getMetaMaterials = ledger.getPools;
		this.getKnowledge = function() { return state.knowledge; };
		this.getTechnology = function() { return state.knowledge.technology; };
		this.getTheory = function() { return state.knowledge.theory; };
		this.getDiscovery = function() { return state.knowledge.discovery; };
		this.getResearchQueue = function() { return state.knowledge.researchQueue; };
		this.getProductionQueue = function() { return state.knowledge.productionQueue; };
		this.getPopulation = function() { return state.population; };

		this.getRoboDozerAvailable = _getRoboDozerAvailable;
		this.useRoboDozer = _useRoboDozer;
		this.getRoboDiggerAvailable = _getRoboDiggerAvailable;
		this.useRoboDigger = _useRoboDigger;
		this.getRoboMinerAvailable = _getRoboMinerAvailable;
		this.useRoboMiner = _useRoboMiner;
		this.setRobotsAvailable = _setRobotsAvailable;

		this.isMetaMaterial = ledger.isPooled;
		this.getMaterialFromMetaMaterial = ledger.getPoolMembers;
		this.getCapacity = ledger.getCapacity;
		this.getFreeCapacity = ledger.getFreeCapacity;
		this.getFullCapacity = ledger.getPoolStored;
		this.configureMaterial = ledger.joinPool;
		this.resetAll = _resetAll;
		this.updateAll = ledger.closeTurn;
		this.addCapacity = ledger.addCapacity;
		this.haveMaterials = ledger.canAfford;
		this.haveSpace = ledger.hasRoomFor;
		this.delMaterials = ledger.spend;
		this.addMaterials = ledger.produce;
		this.getRemainder = ledger.getAvailable;
		this.destroyMaterials = ledger.destroyStock;
		this.createMaterials = ledger.createStock;
		this.setMaterials = ledger.setStock;

		this.addToBuildList = _addToBuildList;
		this.getBuildList = function() { return state.buildList; };
		this.getBuildPoints = function(building) { return buildPoints.get(building) || 0; };
		this.addToDestroyedList = _addToDestroyedList;
		this.getDestroyedList = function() { return state.destroyedList; };
		this.addToActiveList = _addToActiveList;
		this.getActiveList = function() { return state.activeList; };
		this.addToInactiveList = _addToInactiveList;
		this.getInactiveList = function() { return state.inactiveList; };
		// il primo motivo registrato vince: un edificio scollegato è anzitutto scollegato
		this.setBuildingIssue = function(building, issue) { if(!buildingIssues.has(building)) { buildingIssues.set(building, issue); } };
		this.getBuildingIssue = function(building) { return buildingIssues.get(building) || null; };
		this.getBuildingIssues = function() { return Array.from(buildingIssues.entries()).map(function(e) { return { building: e[0], issue: e[1] }; }); };
		this.setHabitability = function(value) { habitability = value; };
		this.getHabitability = function() { return habitability; };


		this.isCompletedKnowledge = _isCompletedKnowledge;
		this.addCompletedResearch = _addCompletedResearch;
		this.checkKnowledge = _checkKnowledge;
		this.addKnowledge = _addKnowledge;
		this.delKnowledge = _delKnowledge;

		//-----------------------------------------
	}

export { ColonyState };
