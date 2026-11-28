"use strict";

import { Events } from "./Events.js";
import { generationFromData } from "./Generations.js";
import { MaterialLedger } from "./MaterialLedger.js";
import { INCLUSION_BUILDINGS } from "./Mission.js";
import { Orbit } from "./Orbit.js";
import { RecipeLib } from "./RecipeLib.js";

const NOTIFICATION_HISTORY = 100;	// notifiche conservate nello storico

 
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
		// obiettivi della partita: [{ type, params }]; senza obiettivi non si vince (partita libera)
		state.objectives = [{ type: "happyPopulation", params: {} }];
		state.terraformPoints = 0;
		// missione in corso (copia dei dati), null nella partita libera
		state.mission = null;
		// campagna da cui si gioca la missione: { id, name, missions, missionId }, null altrimenti
		state.campaign = null;
		state.shipsLaunched = 0;
		state.kitDelivered = false;
		// capsule criogeniche di cui il giocatore ha chiesto il risveglio
		state.pendingRevival = 0;
		// avanzamento della prossima nascita, in unità dell'Asilo (vedi PopulationPhase.BIRTH_COST)
		state.birthProgress = 0;
		// cure prenotate dal giocatore per questo turno, cure automatiche e nascite sospese (scelte di tutta la colonia)
		state.pendingCures = 0;
		state.autoCure = false;
		state.birthsSuspended = false;
		// storico delle notifiche di fine turno: [{ date, text, level }], le più recenti in fondo
		state.notifications = [];
		// avvisi di stato in corso (per notificare solo inizio e fine): { storage: { pool: bool }, power: bool }
		state.alerts = { storage: {}, power: false };
		// usura di ogni robot, per tipo: [{ wear, life }] (vedi RobotWearPhase)
		state.robotWear = { roboWorker: [], dozer: [], digger: [] };
		// eventi: configurazione della partita ed eventi in corso (vedi Events.js); spenti finché non si configurano
		state.events = Events.emptyState();
		// orbite: posti e satelliti in orbita, lanci del turno (vedi Orbit.js)
		state.orbits = Orbit.emptyState();

		// i materiali sono gestiti dal Material ledger
		let ledger = new MaterialLedger();

		/** perché un edificio non funziona in questo turno: { reason: "inactive" | "stalled" | "disconnected", missing: [...] } */
		let buildingIssues = new Map();
		let buildPoints = new Map();
		let effectivePrecedence = new Map();
		let objectiveStatus = [];
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
						// gli edifici esclusi dalla missione non diventano costruibili
						if(type == "technology" && _isExcludedBuilding(knowledge[type][ii]))
						{
							continue;
						}
						if(!_contains(state.knowledge[type], knowledge[type][ii]))
						{
							state.knowledge[type].push(knowledge[type][ii]);
						}
					}
				}
			}
			return ret;
		};

		/** escluso dalla missione, oppure edificio a inclusione che la missione non include (o partita libera) */
		let _isExcludedBuilding = function(name)
		{
			if(INCLUSION_BUILDINGS.indexOf(name) >= 0)
			{
				return state.mission == null || (state.mission.includedBuildings || []).indexOf(name) < 0;
			}
			return state.mission != null && state.mission.excludedBuildings.indexOf(name) >= 0;
		};
		let _isExcludedResearch = function(name) { return state.mission != null && state.mission.excludedResearch.indexOf(name) >= 0; };

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
				objectives: JSON.parse(JSON.stringify(state.objectives)),
				terraformPoints: state.terraformPoints,
				mission: state.mission ? JSON.parse(JSON.stringify(state.mission)) : null,
				campaign: state.campaign ? JSON.parse(JSON.stringify(state.campaign)) : null,
				shipsLaunched: state.shipsLaunched,
				kitDelivered: state.kitDelivered,
				pendingRevival: state.pendingRevival,
				birthProgress: state.birthProgress,
				pendingCures: state.pendingCures,
				autoCure: state.autoCure,
				birthsSuspended: state.birthsSuspended,
				notifications: state.notifications.slice(),
				alerts: JSON.parse(JSON.stringify(state.alerts)),
				robotWear: JSON.parse(JSON.stringify(state.robotWear)),
				events: JSON.parse(JSON.stringify(state.events)),
				orbits: JSON.parse(JSON.stringify(state.orbits)),
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
			// i salvataggi precedenti avevano solo la popolazione felice
			state.objectives = Array.isArray(data.objectives) ? data.objectives : [{ type: "happyPopulation", params: {} }];
			state.terraformPoints = data.terraformPoints || 0;
			state.mission = data.mission || null;
			state.campaign = data.campaign || null;
			state.shipsLaunched = data.shipsLaunched || 0;
			state.kitDelivered = data.kitDelivered;
			state.pendingRevival = data.pendingRevival || 0;
			state.birthProgress = data.birthProgress || 0;
			state.pendingCures = data.pendingCures || 0;
			state.autoCure = !!data.autoCure;
			state.birthsSuspended = !!data.birthsSuspended;
			state.notifications = Array.isArray(data.notifications) ? data.notifications.slice() : [];
			state.alerts = (data.alerts && data.alerts.storage) ? data.alerts : { storage: {}, power: false };
			// i salvataggi precedenti avevano un contatore per tipo: si ripartono da robot nuovi
			state.robotWear = { roboWorker: [], dozer: [], digger: [] };
			Object.keys(data.robotWear || {}).forEach(function(type)
			{
				if(Array.isArray(data.robotWear[type])) { state.robotWear[type] = data.robotWear[type].map(function(r) { return { wear: r.wear, life: r.life }; }); }
			});
			state.robotsAvailable = Object.assign({}, data.robotsAvailable);
			// i salvataggi precedenti non avevano eventi: restano spenti
			state.events = Object.assign(Events.emptyState(), data.events || {});
			state.events.config = Events.normalize(state.events.config);
			// i salvataggi precedenti non avevano orbite: le prepara SaveGame.load (satelliti per gli impianti esistenti)
			state.orbits = data.orbits ? Object.assign(Orbit.emptyState(), data.orbits) : Orbit.emptyState();
			state.orbitsMissing = !data.orbits;
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
		this.getObjectives = function() { return state.objectives; };
		this.getMission = function() { return state.mission; };
		this.getCampaign = function() { return state.campaign; };
		this.setCampaign = function(campaign) { state.campaign = campaign ? JSON.parse(JSON.stringify(campaign)) : null; };
		this.setMission = function(mission) { state.mission = mission ? JSON.parse(JSON.stringify(mission)) : null; };
		this.isExcludedBuilding = _isExcludedBuilding;
		this.isExcludedResearch = _isExcludedResearch;
		/** contenuto del kit di atterraggio: quello della missione o il predefinito */
		this.getKit = function(defaults) { return Object.assign({}, defaults, state.mission ? state.mission.kit : {}); };
		this.setObjectives = function(list) { state.objectives = list.map(function(o) { return { type: o.type, params: Object.assign({}, o.params || {}) }; }); };
		this.getTerraformPoints = function() { return state.terraformPoints; };
		this.addTerraformPoints = function(value) { state.terraformPoints += value; };
		this.getShipsLaunched = function() { return state.shipsLaunched; };
		this.addShipLaunched = function() { state.shipsLaunched++; };
		/** stato degli obiettivi calcolato nel turno, per i report */
		this.setObjectiveStatus = function(list) { objectiveStatus = list; };
		this.getObjectiveStatus = function() { return objectiveStatus; };
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
		/** aggiunge notifiche allo storico, che tiene le ultime NOTIFICATION_HISTORY */
		this.addNotifications = function(items)
		{
			items.forEach(function(item) { state.notifications.push({ date: item.date, text: item.text, level: item.level }); });
			if(state.notifications.length > NOTIFICATION_HISTORY)
			{
				state.notifications.splice(0, state.notifications.length - NOTIFICATION_HISTORY);
			}
		};
		this.getNotifications = function() { return state.notifications; };
		this.getAlerts = function() { return state.alerts; };
		this.setPendingRevival = function(value) { state.pendingRevival = value; };
		this.getRobotWear = function() { return state.robotWear; };
		/** eventi: { config, earthquake, sandstorm, epidemic, nests, medicalSince } (vedi Events.js) */
		this.getEvents = function() { return state.events; };
		this.setEventsConfig = function(config) { state.events.config = Events.normalize(config); };
		/** orbite: { capacity, satellites, launches } (vedi Orbit.js) */
		this.getOrbits = function() { return state.orbits; };
		this.setOrbitCapacity = function(capacity) { state.orbits.capacity = Object.assign({}, Orbit.CAPACITY, capacity || {}); };
		/** partita salvata prima delle orbite: da preparare una volta al caricamento */
		this.isOrbitsMissing = function() { return !!state.orbitsMissing; };
		this.clearOrbitsMissing = function() { delete state.orbitsMissing; };

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
		/** precedenza effettiva calcolata nel turno (con quella ereditata dai rifornimenti) */
		this.setEffectivePrecedence = function(map) { effectivePrecedence = map; };
		this.getEffectivePrecedence = function(building) { return effectivePrecedence.has(building) ? effectivePrecedence.get(building) : null; };
		this.getBuildingIssues = function() { return Array.from(buildingIssues.entries()).map(function(e) { return { building: e[0], issue: e[1] }; }); };
		this.setHabitability = function(value) { habitability = value; };
		this.getHabitability = function() { return habitability; };


		this.isCompletedKnowledge = _isCompletedKnowledge;
		this.getCompletedResearch = function() { return state.knowledge.completed; };
		this.addCompletedResearch = _addCompletedResearch;
		this.checkKnowledge = _checkKnowledge;
		this.addKnowledge = _addKnowledge;
		this.delKnowledge = _delKnowledge;

		//-----------------------------------------
	}

export { ColonyState };
