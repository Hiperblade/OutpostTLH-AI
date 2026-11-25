"use strict";

import { MaterialLedger } from "./MaterialLedger.js";

 
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
			subsistence: 0,
			wellness: 0,
			happiness: 0
			};
		state.robotsAvailable = {
			controllers: 0,
			dozer: 0,
			digger: 0
			};
		state.date = 0;

		// i materiali sono gestiti dal Material ledger
		let ledger = new MaterialLedger();

		let _resetAll = function()
		{
			ledger.resetTurn();

			state.buildList = [];
			state.destroyedList = [];
			state.activeList = {};
			state.inactiveList = {};
		};

		let _addToBuildList = function(building)
		{
			state.buildList.push(building);
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

		let _setRobotsAvailable = function(data)
		{
			state.robotsAvailable.controllers = data.controllers;
			state.robotsAvailable.dozer = data.dozer;
			state.robotsAvailable.digger = data.digger;
		};

		//-----------------------------------------

		this.getDate = function() { return state.date; };
		this.setDate = function(date) { state.date = date; };

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
		this.getRoboticsWorkforce = function() { return state.roboticsWorkforce; };
		this.getPopulation = function() { return state.population; };

		this.getRoboDozerAvailable = _getRoboDozerAvailable;
		this.useRoboDozer = _useRoboDozer;
		this.getRoboDiggerAvailable = _getRoboDiggerAvailable;
		this.useRoboDigger = _useRoboDigger;
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
		this.addToDestroyedList = _addToDestroyedList;
		this.getDestroyedList = function() { return state.destroyedList; };
		this.addToActiveList = _addToActiveList;
		this.getActiveList = function() { return state.activeList; };
		this.addToInactiveList = _addToInactiveList;
		this.getInactiveList = function() { return state.inactiveList; };


		this.isCompletedKnowledge = _isCompletedKnowledge;
		this.addCompletedResearch = _addCompletedResearch;
		this.checkKnowledge = _checkKnowledge;
		this.addKnowledge = _addKnowledge;
		this.delKnowledge = _delKnowledge;

		//-----------------------------------------
	}

export { ColonyState };
