"use strict";

import { Building, Pipe, Resource } from "./TerrainMap.js";

let AreaTypes = {
	One: "1",
	TwoEast: "2e",
	TwoWest: "2w",
	Four: "4"
};

function PrototypeLibConstructor()
{	
	let list = {};
	let priorityList = [];

	/**
	 *  @param {PipeType} pipeType
	 *  @param {TerrainLayer} terrainLayer
	 *  @param {number} buildingTime
	 *  @param {object} buildingCost
	 *  @param {object} parameters vedi BasePrototype
	 */
	let _addPipe = function(pipeType, terrainLayer, buildingTime, buildingCost, parameters)
	{
		let buildingType = "Pipe_" + pipeType + "_" + terrainLayer;
		let item = new BasePrototype(buildingType, terrainLayer, buildingTime, buildingCost, parameters);
		item.createItem = function(position)
		{
			return new Pipe(pipeType, terrainLayer, position, buildingTime);
		};
		list[buildingType] = item;
		priorityList.push(buildingType);
		return item;
	};

	/**
	 *  @param {string} buildingType
	 *  @param {TerrainLayer} terrainLayer
	 *  @param {number} buildingTime
	 *  @param {object} buildingCost
	 *  @param {object} parameters vedi BasePrototype
	 */
	let _add = function(buildingType, terrainLayer, buildingTime, buildingCost, parameters)
	{
		let item = new BasePrototype(buildingType, terrainLayer, buildingTime, buildingCost, parameters);
		list[buildingType] = item;
		priorityList.push(buildingType);
		return item;
	};

	/**
	 *  @param {string} resourceType
	 *  @param {TerrainLayer} terrainLayer
	 *  @param {string} color
	 */
	let _addResource = function(resourceType, terrainLayer, color)
	{
		let buildingType = "Resource_" + resourceType;
		let item = new BasePrototype(buildingType, terrainLayer, 0, {}, {});
		item.createItem = function(position)
		{
			return new Resource(resourceType, terrainLayer, color, position);
		};
		list[buildingType] = item;
		return item;
	};

	/**
	 *  @param {string} resourceType
	 *  @param {TerrainLayer} terrainLayer
	 *  @param {number} buildingTime
	 *  @param {object} buildingCost
	 *  @param {object} parameters vedi BasePrototype
	 */
	let _addMine = function(resourceType, terrainLayer, buildingTime, buildingCost, parameters)
	{
		let buildingType = "Mine" + resourceType;
		parameters = parameters || {};
		parameters.builder = "RoboMiner";
		let item = new BasePrototype(buildingType, terrainLayer, buildingTime, buildingCost, parameters);
		list[buildingType] = item;
		priorityList.push(buildingType);
		return item;
	};

	/**
	 *  @param {string} buildingType
	 */
	let _get = function(buildingType)
	{
		return list[buildingType];
	};

	/**
	 *  @param {string} buildingType
	 *  @param {object} position
	 *  @param {boolean} alreadyBuilt
	 */
	let _createBuilding = function(buildingType, position, alreadyBuilt)
	{
		let prototype = list[buildingType];
		let ret = prototype.createItem(position);
		if(prototype.getPorts() != null)
		{
			ret.setPorts(prototype.getPorts());
		}
		if(prototype.isHeadquarter())
		{
			ret.setHeadquarter();
		}
		if(alreadyBuilt)
		{
			ret.setBuilded();
		}
		return ret;
	};

	/**
	 *  @param {PipeType} pipeType
	 *  @param {TerrainLayer} layer
	 *  @param {object} position
	 *  @param {boolean} alreadyBuilt
	 */
	let _createPipe = function(pipeType, layer, position, alreadyBuilt)
	{
		return _createBuilding("Pipe_" + pipeType + "_" + layer, position, alreadyBuilt);
	};

	/**
	 *  @param {string} resourceType
	 *  @param {object} position
	 */
	let _createResource = function(resourceType, position)
	{
		return list["Resource_" + resourceType].createItem(position);
	};

	this.addPipe = _addPipe;
	this.add = _add;
	this.addResource = _addResource;
	this.addMine = _addMine;
	this.get = _get;
	this.createBuilding = _createBuilding;
	this.createPipe = _createPipe;
	this.createResource = _createResource;
	this.getPriorityList = function() { return priorityList; }
}

/**
 * Prototipo di un tipo di edificio.
 *
 * parameters:
 *   requiredResource   risorsa su cui va costruito
 *   consumption, production, productionWaste, capacity   materiali per turno
 *   disposal           scarti eliminati a turno, fino a esaurimento (quando l'edificio è attivo)
 *   builder            immagine del cantiere
 *   imageId, areaType  immagine e area mostrate nelle schede
 *   ports              collegamenti come un tubo, es. "nesw" (n, e, s, w, u = su, d = giù)
 *   headquarter        l'edificio è un Headquarter (le reti collegate sono attive)
 *   parts              struttura composita: [{ type, dx, dy }] parti create, completate e distrutte
 *                      insieme all'edificio principale; il layer è quello del prototipo della parte
 *   canPlace(position, map)    vincolo aggiuntivo (puro) per il posizionamento
 *   onPlaced(item, map)        effetti al posizionamento
 *   onCompleted(item, map)     effetti a fine costruzione
 *   onDestroyed(item, map)     effetti alla distruzione
 */
function BasePrototype(buildingType, terrainLayer, buildingTime, buildingCost, parameters)
{
	parameters = parameters || {};

	let consumption = parameters.consumption || {};
	let production = parameters.production || {};
	let productionWaste = parameters.productionWaste || {};
	let capacity = parameters.capacity || {};
	let disposal = parameters.disposal || {};
	let requiredResource = parameters.requiredResource;
	let parts = parameters.parts || [];

	let _createItem = function(position)
	{
		return new Building(buildingType, terrainLayer, position, buildingTime, parameters.builder);
	};

	//-----------------------------------------

	this.canPlace = parameters.canPlace;
	this.onPlaced = parameters.onPlaced;
	this.onCompleted = parameters.onCompleted;
	this.onDestroyed = parameters.onDestroyed;

	this.getBuildingType = function() { return buildingType; };
	this.getTerrainLayer = function() { return terrainLayer; };
	this.getBuildingTime = function() { return buildingTime; };
	this.getBuildingCost = function() { return buildingCost; };
	this.getConsumption = function() { return consumption; };
	this.getProduction = function() { return production; };
	this.getProductionWaste = function() { return productionWaste; };
	this.getCapacity = function() { return capacity; };
	this.getDisposal = function() { return disposal; };
	this.getRequiredResource = function() { return requiredResource; };
	this.getBuildingImageId = function() { return parameters.imageId || buildingType; };
	this.getAreaType = function() { return parameters.areaType || AreaTypes.One; };
	this.getPorts = function() { return parameters.ports || null; };
	this.isHeadquarter = function() { return parameters.headquarter === true; };
	this.getParts = function() { return parts; };

	this.createItem = _createItem;

	//-----------------------------------------
}

// singleton
let PrototypeLib = new PrototypeLibConstructor();

export { AreaTypes, PrototypeLibConstructor, BasePrototype, PrototypeLib };
