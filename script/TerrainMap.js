"use strict";

import { ColonyState } from "./ColonyState.js";
import { Morphology, PipePorts, RobotTypes, StaffPriority, StructureTypes, TerrainLayer } from "./Enums.js";
import { PipeNetwork } from "./PipeNetwork.js";
import { PrototypeLib } from "./PrototypeLib.js";
import { inherits } from "./SystemLib.js";

/**
 * @param {string} terrainTypology tipo di pianeta
 * @param {{x:number, y:number}} size
 * @param {number[][]} [surfaceMorphology] morfologia iniziale della superficie (dal sito); altrimenti casuale
 */
function TerrainMap(terrainTypology, size, surfaceMorphology)
{
	let self = this;
	let typology = terrainTypology;
	let layer = TerrainLayer.Surface;
	let surface = [];
	let underground = [];
	let deep = [];
	let structure = [];
	let state = new ColonyState();

	let _initialize = function()
	{
		let x, y;
		for(x = 0; x < size.x; x++)
		{
			surface[x] = [];
			underground[x] = [];
			deep[x] = [];
			for(y = 0; y < size.y; y++)
			{
				surface[x][y] = surfaceMorphology ? surfaceMorphology[x][y] : _randomMorphology();
				underground[x][y] = 9;
				deep[x][y] = 9;
				//debug: underground[x][y] = _randomMorphology();
				//debug: deep[x][y] = _randomMorphology();
			}
		}
	};

	let _randomMorphology = function()
	{
		let ret = Math.floor(Math.random() * 4);
		if(ret == 0) return 1;
		else if(ret == 1) return 2;
		else if(ret == 2) return 4;
		else if(ret == 3) return 8;
		return 0;
	};

	let _getMorphology = function(detritus)
	{
		if(detritus == 0)
		{
			return Morphology.Razed;
		}
		else if(detritus <= 1)
		{
			return Morphology.Clear;
		}
		else if(detritus <= 2)
		{
			return Morphology.Rough;
		}
		else if(detritus <= 4)
		{
			return Morphology.Impervious;
		}
		else if(detritus <= 8)
		{
			return Morphology.Inaccessible;
		}
		else
		{
			return Morphology.Undiscovery;
		}
	};

	let _getLayer = function(selectedLayer)
	{
		selectedLayer = selectedLayer || layer;
		switch(selectedLayer)
		{
			case TerrainLayer.Surface:
				return surface;
			case TerrainLayer.Underground:
				return underground;
			case TerrainLayer.Deep:
				return deep;
			default:
				return surface;
		}
	};

	let _getTerrainImageId = function(x, y)
	{
		let detritus = _getLayer()[x][y];
		if(detritus < 9)
		{
			return "Terrain_" + typology + "_" + layer + "_" + _getMorphology(detritus);
		}
		return null;
	};

	let _addResource = function(resourceType, position)
	{
		let val = PrototypeLib.createResource(resourceType, position);
		_addObject(structure, val);
		if(val.getLayer() == TerrainLayer.Surface)
		{
			_getLayer(val.getLayer())[position.x][position.y] = 0;
		}
	};

	let _isInside = function(point)
	{
		return (point.x >= 0) && (point.y >= 0) && (point.x < size.x) && (point.y < size.y);
	};

	let _partPosition = function(position, part)
	{
		return { x: position.x + (part.dx || 0), y: position.y + (part.dy || 0) };
	};

	/** verifica pura: l'edificio può essere posizionato qui (cella libera, area delle parti libera, vincoli del prototipo) */
	let _canPlaceBuilding = function(buildingType, position)
	{
		let prototype = PrototypeLib.get(buildingType);
		if(prototype == undefined || !_isInside(position) || _findBuilding(position, prototype.getTerrainLayer()) != null)
		{
			return false;
		}
		let partsFree = prototype.getParts().every(function(part)
		{
			let partLayer = PrototypeLib.get(part.type).getTerrainLayer();
			let partPosition = _partPosition(position, part);
			return _isInside(partPosition) &&
				(_findBuilding(partPosition, partLayer) == null) &&
				(_findResource(partPosition, partLayer) == null);
		});
		return partsFree && (prototype.canPlace == undefined || prototype.canPlace(position, self));
	};

	let _addStructure = function(item)
	{
		_addObject(structure, item);
		let position = item.getPosition();
		_getLayer(item.getLayer())[position.x][position.y] = 0;
	};

	/** posiziona un edificio con le sue eventuali parti; restituisce null se non è possibile */
	let _addBuilding = function(buildingType, position, alreadyBuilt)
	{
		if(!_canPlaceBuilding(buildingType, position))
		{
			return null;
		}

		let prototype = PrototypeLib.get(buildingType);
		let newBuilding = PrototypeLib.createBuilding(buildingType, position, alreadyBuilt);
		prototype.getParts().forEach(function(part)
		{
			let item = PrototypeLib.createBuilding(part.type, _partPosition(position, part), alreadyBuilt);
			item.setFrozen(true);
			item.setMainBuilding(newBuilding);
			newBuilding.addPart(item);
			_addStructure(item);
		});
		if(prototype.onPlaced != undefined)
		{
			prototype.onPlaced(newBuilding, self);
		}
		_addStructure(newBuilding);
		return newBuilding;
	};

	let _addPipe = function(pipeType, layer, position, alreadyBuilt)
	{
		let val = PrototypeLib.createPipe(pipeType, layer, position, alreadyBuilt);
		_addObject(structure, val);
		_getLayer(layer)[position.x][position.y] = 0;
	};

	let _addObject = function(array, val)
	{
		let valPosition = val.getPosition();
		for(let i = 0; i < array.length; i++)
		{
			let arrayPosition = array[i].getPosition();
			if((arrayPosition.x == valPosition.x) && (arrayPosition.y == valPosition.y))
			{
				if(array[i].getType() == StructureTypes.Resource)
				{
					array.splice(i, 0, val);
					return;
				}
			}
			else if((arrayPosition.x < valPosition.x) ||
				((arrayPosition.x == valPosition.x) && (arrayPosition.y > valPosition.y)))
			{
				array.splice(i, 0, val);
				return;
			}
		}
		array.push(val);
	};

	let _delBuilding = function(position, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		for(let i = 0; i < structure.length; i++)
		{
			if(structure[i].getType() == StructureTypes.Building)
			{
				let arrayPosition = structure[i].getPosition();
				if((arrayPosition.x == position.x) &&
					(arrayPosition.y == position.y) &&
					(structure[i].getLayer() == selectedLayer))
				{
					structure[i].destroy();
					structure.splice(i, 1);
					return;
				}
			}
		}
	};

	let _isVisible = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		return (_getLayer(selectedLayer)[point.x][point.y] < 9);
	};

	let _getNearTiles = function(point)
	{	
		let ret = [];
		if(point.y > 0)
		{
			if(point.x > 0)
			{
				// 1
				ret.push({ x: point.x - 1, y: point.y - 1 });
			}
			// 2
			ret.push({ x: point.x, y: point.y - 1 });
			if(point.x < size.x - 1)
			{
				// 3
				ret.push({ x: point.x + 1, y: point.y - 1 });
			}
		}

		if(point.x < size.x - 1)
		{
			// 4
			ret.push({ x: point.x + 1, y: point.y });
		}

		if(point.y < size.y - 1)
		{
			if(point.x < size.x - 1)
			{
				// 5
				ret.push({ x: point.x + 1, y: point.y + 1 });
			}
			// 6
			ret.push({ x: point.x, y: point.y + 1 });
			if(point.x > 0)
			{
				// 7
				ret.push({ x: point.x - 1, y: point.y + 1 });
			}
		}

		if(point.x > 0)
		{
			// 8
			ret.push({ x: point.x - 1, y: point.y });
		}

		return ret;
	};

	let _isDiggable = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		let tiles = _getNearTiles(point);
		for(let i = 0; i < tiles.length; i++)
		{
			if(_getLayer(selectedLayer)[tiles[i].x][tiles[i].y] >= 9)
			{
				return true;
			}
		}
		return false;
	};

	let _discoveryTile = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		if(_getLayer(selectedLayer)[point.x][point.y] >= 9)
		{
			let resource = _findResource(point, selectedLayer);
			if(resource != null)
			{
				state.addKnowledge({ discovery: [resource.getBuildingType()] });
				_getLayer(selectedLayer)[point.x][point.y] = 0;
			}
			else
			{
				_getLayer(selectedLayer)[point.x][point.y] = _randomMorphology();
			}
		}
	};

	let _discoveryNearTiles = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		let nearTiles = _getNearTiles(point);
		for(let i = 0; i < nearTiles.length; i++)
		{
			if(!_isVisible(nearTiles[i], selectedLayer))
			{
				_discoveryTile(nearTiles[i], selectedLayer);
			}
		}
	};

	let _dig = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		let tiles = _getNearTiles(point);
		let onlyCheck = false;
		for(let i = 0; i < tiles.length; i++)
		{
			let detritus = _getLayer(selectedLayer)[tiles[i].x][tiles[i].y];
			if(detritus >= 9)
			{
				if(!onlyCheck)
				{
					onlyCheck = true;

					detritus--;
					if(detritus < 9)
					{
						_discoveryTile(tiles[i], selectedLayer);
					}
					else
					{
						_getLayer(selectedLayer)[tiles[i].x][tiles[i].y] = detritus;
						return false;
					}
				}
				else
				{
					return false;
				}
			}
		}
		return true;
	};

	let _isRazable = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		let detritus = _getLayer(selectedLayer)[point.x][point.y];
		return ((detritus > 0) && (detritus < 9));
	};

	let _raze = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		let detritus = _getLayer(selectedLayer)[point.x][point.y];
		if((detritus > 0) && (detritus < 9))
		{
			detritus -= 1;
			_getLayer(selectedLayer)[point.x][point.y] = detritus;
		}
		return detritus;
	};

	let _findBuilding = function(position, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		for (let i = 0; i < structure.length; i++)
		{
			if((structure[i].getLayer() == selectedLayer) &&
				(structure[i].getPosition().x == position.x) &&
				(structure[i].getPosition().y == position.y) &&
				(structure[i].getType() == StructureTypes.Building))
			{
				return structure[i];
			}
		}
		return null;
	};

	let _findResource = function(position, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		for (let i = 0; i < structure.length; i++)
		{
			if((structure[i].getLayer() == selectedLayer) &&
				(structure[i].getPosition().x == position.x) &&
				(structure[i].getPosition().y == position.y) &&
				(structure[i].getType() == StructureTypes.Resource ))
			{
				return structure[i];
			}
		}
		return null;
	};

	let _addRoboDozer = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		let val = new Robot(RobotTypes.Dozer, selectedLayer, point);
		_addObject(structure, val);
	};

	let _addRoboDigger = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		let val = new Robot(RobotTypes.Digger, selectedLayer, point);
		_addObject(structure, val);
	};

	let _getRobot = function(point, selectedLayer)
	{
		selectedLayer = selectedLayer || layer;

		for(let i = 0; i < structure.length; i++)
		{
			if((structure[i].getPosition().x == point.x) &&
				(structure[i].getPosition().y == point.y) &&
				(structure[i].getLayer() == selectedLayer) &&
				(structure[i].getType() == StructureTypes.Robot))
			{
				return structure[i];
			}
		}

		return null;
	};

	//-----------------------------------------
	// salvataggio

	let _structureToData = function(el)
	{
		let common = { layer: el.getLayer(), position: { x: el.getPosition().x, y: el.getPosition().y } };
		switch(el.getType())
		{
			case StructureTypes.Resource:
				return Object.assign(common, { kind: StructureTypes.Resource, resourceType: el.getResourceType() });
			case StructureTypes.Robot:
				return Object.assign(common, { kind: StructureTypes.Robot, robotType: el.getRobotType() });
		}
		let main = el.getMainBuilding();
		return Object.assign(common, {
			kind: StructureTypes.Building,
			buildingType: el.getBuildingType(),
			integrity: el.getIntegrity(),
			progressState: el.getProgressState(),
			frozen: el.getFrozen(),
			staffPriority: el.getStaffPriority(),
			suspended: el.isSuspended(),
			main: (main === el) ? -1 : structure.indexOf(main)
		});
	};

	let _structureFromData = function(data)
	{
		switch(data.kind)
		{
			case StructureTypes.Resource:
				return PrototypeLib.createResource(data.resourceType, data.position);
			case StructureTypes.Robot:
				return new Robot(data.robotType, data.layer, data.position);
		}
		return PrototypeLib.createBuilding(data.buildingType, data.position).restoreState(data);
	};

	let _toData = function()
	{
		return {
			typology: typology,
			size: { x: size.x, y: size.y },
			layer: layer,
			surface: surface,
			underground: underground,
			deep: deep,
			structure: structure.map(_structureToData),
			state: state.toData()
		};
	};

	let _loadData = function(data)
	{
		layer = data.layer;
		surface = data.surface;
		underground = data.underground;
		deep = data.deep;
		structure.length = 0;
		data.structure.forEach(function(item) { structure.push(_structureFromData(item)); });
		// collegamenti delle strutture composite
		data.structure.forEach(function(item, i)
		{
			if(item.main >= 0)
			{
				structure[i].setMainBuilding(structure[item.main]);
				structure[item.main].addPart(structure[i]);
			}
		});
		state.loadData(data.state);
	};

	/** reti di edifici collegati (vedi PipeNetwork) */
	let _getGraph = function()
	{
		return PipeNetwork.networksOf(structure);
	};

	/** un edificio è stato distrutto: con lui tutta la sua struttura composita, poi gli effetti del prototipo */
	let _onBuildingDestroyed = function(building)
	{
		let main = building.getMainBuilding();
		main.destroy();
		main.getParts().forEach(function(part) { part.destroy(); });

		let prototype = PrototypeLib.get(building.getBuildingType());
		if(prototype.onDestroyed != undefined)
		{
			prototype.onDestroyed(building, self);
		}
	};

	/** un cantiere è stato completato: si completano le parti (scoprendo i dintorni di quelle su altri layer), poi gli effetti del prototipo */
	let _onBuildingCompleted = function(building)
	{
		building.getParts().forEach(function(part)
		{
			part.setBuilded();
			if(part.getLayer() != building.getLayer())
			{
				_discoveryNearTiles(part.getPosition(), part.getLayer());
			}
		});

		let prototype = PrototypeLib.get(building.getBuildingType());
		if(prototype.onCompleted != undefined)
		{
			prototype.onCompleted(building, self);
		}
	};

	//-----------------------------------------

	this.getSize = function() { return size; };
	this.getLayer = function() { return layer; };
	this.setLayer = function(newLayer) { layer = newLayer; };
	this.getStructure = function() { return structure; };
	this.getState = function() { return state; };
	this.toData = _toData;
	this.loadData = _loadData;

	this.getTerrainImageId = _getTerrainImageId;
	this.addResource = _addResource;
	this.addBuilding = _addBuilding;
	this.canPlaceBuilding = _canPlaceBuilding;
	this.delBuilding = _delBuilding;
	this.addPipe = _addPipe;
	this.isVisible = _isVisible;
	this.getNearTiles = _getNearTiles;
	this.isDiggable = _isDiggable;
	this.dig = _dig;
	this.discoveryTile = _discoveryTile;
	this.discoveryNearTiles = _discoveryNearTiles;
	this.isRazable = _isRazable;
	this.raze = _raze;
	this.findBuilding = _findBuilding;
	this.findResource = _findResource;
	this.getGraph = _getGraph;

	this.addRoboDozer = _addRoboDozer;
	this.addRoboDigger = _addRoboDigger;
	this.getRobot = _getRobot;

	this.onBuildingDestroyed = _onBuildingDestroyed;
	this.onBuildingCompleted = _onBuildingCompleted;

	//-----------------------------------------
	_initialize();
}

function Building(buildingType, terrainLayer, position, buildingTime, builder)
{
	const MAX_INTEGRITY = 1000;

	//let buildingType = buildingType;
	//let position = position;
	let layer = terrainLayer;
	let integrity = MAX_INTEGRITY;
	let progressState = - (buildingTime || 0);
	let frozen = false;
	let staffPriority = StaffPriority.Normal;
	let suspended = false;
	//let owner = null;

	//var	builder = builder;
	if(builder == undefined)
	{
		builder = "Building_" + layer;
	}

	let _progress = function()
	{
		if(!frozen && progressState >= 0)
		{
			progressState++;
		}
	};

	/** avanza il cantiere di amount punti lavoro (1 se non indicato); true a costruzione finita */
	let _progressBuild = function(amount)
	{
		if(!frozen && progressState < 0)
		{
			progressState = Math.min(0, progressState + (amount === undefined ? 1 : amount));
		}
		return (progressState == 0);
	};

	let _damage = function(value)
	{
		if(!frozen)
		{
			if(integrity > 0)
			{
				integrity -= value;
			}
			if(integrity <= 0)
			{
				_destroy();
			}
		}
		return integrity;
	};

	let _destroy = function()
	{
		integrity = 0;
	};

	let _isDestroyed = function()
	{
		return (integrity == 0);
	};

	let _reapair = function(value)
	{
		if(integrity > 0)
		{
			integrity += value;
		}

		if(integrity > MAX_INTEGRITY)
		{
			integrity = MAX_INTEGRITY;
		}
		return integrity;
	};

	let _underConstruction = function()
	{
		return (progressState < 0);
	};

	let _setBuilded = function()
	{
		progressState = 0;
	};

	let _isOperative = function()
	{
		return (progressState >= 0) && (integrity > 0);
	};

	let _getImageId = function()
	{
		if(_isDestroyed())
		{
			return "Ruins_" + layer;
		}
		else if(_underConstruction())
		{
			return builder;
		}
		else
		{
			return buildingType.toString();
		}
	};

	//-----------------------------------------

	this.getBuildingType = function() { return buildingType; };
	this.getPosition = function() { return position; };
	this.getLayer = function() { return layer; };
	this.getIntegrity = function() { return integrity; };
	this.getProgressState = function() { return progressState; };
	this.getFrozen = function() { return frozen; };
	this.restoreState = function(data)
	{
		integrity = data.integrity;
		progressState = data.progressState;
		frozen = data.frozen;
		staffPriority = (data.staffPriority === undefined) ? StaffPriority.Normal : data.staffPriority;
		suspended = !!data.suspended;
		return this;
	};
	/** sospeso dal giocatore (es. le nascite dell'Asilo): resta a riposo */
	this.isSuspended = function() { return suspended; };
	this.setSuspended = function(value) { suspended = !!value; return this; };
	/** precedenza nell'assegnazione del personale (StaffPriority) */
	this.getStaffPriority = function() { return staffPriority; };
	this.setStaffPriority = function(value) { staffPriority = value; return this; };
	this.setFrozen = function(value) { frozen = value; return this; };
	//this.getOwner = function() { return owner; };

	this.progress = _progress;
	this.progressBuild = _progressBuild;
	this.damage = _damage;
	this.destroy = _destroy;
	this.isDestroyed = _isDestroyed;
	this.reapair = _reapair;
	this.underConstruction = _underConstruction;
	this.setBuilded = _setBuilded;
	this.isOperative = _isOperative;
	this.getImageId = _getImageId;

	this.getType = function() { return StructureTypes.Building; };

	// collegamenti come un tubo (vedi BasePrototype.ports)
	let ports = null;
	this.setPorts = function(value) { ports = value; return this; };
	this.isPipe = function() { return ports !== null; };
	this.haveNorth = function() { return ports !== null && ports.indexOf("n") >= 0; };
	this.haveSouth = function() { return ports !== null && ports.indexOf("s") >= 0; };
	this.haveEast  = function() { return ports !== null && ports.indexOf("e") >= 0; };
	this.haveWest  = function() { return ports !== null && ports.indexOf("w") >= 0; };
	this.haveUp    = function() { return ports !== null && ports.indexOf("u") >= 0; };
	this.haveDown  = function() { return ports !== null && ports.indexOf("d") >= 0; };

	let headquarter = false;
	this.setHeadquarter = function() { headquarter = true; return this; };
	this.isHeadquarter = function() { return headquarter; };

	// strutture composite: la parte rimanda all'edificio principale, il principale elenca le parti
	let mainBuilding = null;
	let parts = [];
	this.setMainBuilding = function(main) { mainBuilding = main; return this; };
	this.getMainBuilding = function() { return mainBuilding || this; };
	this.addPart = function(part) { parts.push(part); };
	this.getParts = function() { return parts; };

	//-----------------------------------------
}

function Pipe(pipeType, layer, position, buildingTime)
{
	Building.call(this, "Pipe_" + pipeType + "_" + layer, layer, position, buildingTime);

	this.setPorts(PipePorts[pipeType]);
}
inherits(Pipe, Building);

function Resource(resourceType, layer, color, position)
{
	Building.call(this, "Resource_" + resourceType, layer, position, 0);

	this.getType = function() { return StructureTypes.Resource; };

	this.getResourceType = function() { return resourceType; };

	this.getColor = function() {return color; };
}
inherits(Resource, Building);

function Robot(robotType, layer, position)
{
	Building.call(this, robotType, layer, position, 0);

	this.getRobotType = function() { return robotType; };

	this.getType = function() { return StructureTypes.Robot; };

	this.getImageId = function() { return this.getBuildingType().toString(); };
}
inherits(Robot, Building);

/** ricostruisce una mappa salvata */
TerrainMap.fromData = function(data)
{
	let map = new TerrainMap(data.typology, data.size);
	map.loadData(data);
	return map;
};

export { TerrainMap, Building, Pipe, Resource, Robot };
