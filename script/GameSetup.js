"use strict";

import { PlanetCatalog, PlanetTypes, catalogImageId } from "./DataPlanets.js";
import { ImagesLib } from "./ImagesLib.js";
import { SiteTerrain } from "./SiteTerrain.js";
import { TerrainMap } from "./TerrainMap.js";

/**
 * Creazione della partita: dal sito scelto (pianeta + sito del catalogo) alla mappa pronta per l'atterraggio.
 *   new Site(planetId, siteId)        sito del catalogo
 *   Site.fromData(data)               sito di una partita salvata (null se non è più nel catalogo)
 *   createGame(site) -> TerrainMap    nuova partita sul sito
 */
const MAP_SIZE = { x: 150, y: 300 };

function Site(planetId, siteId)
{
	let planet = PlanetCatalog.find(function(p) { return p.id == planetId; });
	let entry = planet ? planet.sites.find(function(s) { return s.id == siteId; }) : undefined;
	if(entry === undefined)
	{
		throw new Error("Sito non presente nel catalogo: " + planetId + "/" + siteId);
	}
	let morphology = null;
	let background = null;

	/** morfologia iniziale della superficie, dalla mappa del terreno o generata */
	let _getMorphology = function()
	{
		if(morphology === null)
		{
			morphology = entry.terrain.fileName
				? SiteTerrain.fromImage(ImagesLib.getImage(catalogImageId(entry.terrain.fileName)), MAP_SIZE)
				: SiteTerrain.fromSeed(entry.terrain.seed, MAP_SIZE);
		}
		return morphology;
	};

	/** immagine del sito per minimappa e anteprime: la foto, altrimenti la mappa del terreno */
	let _getBackground = function()
	{
		if(background === null)
		{
			if(entry.photo)
			{
				background = ImagesLib.getImage(catalogImageId(entry.photo.fileName));
			}
			else if(entry.terrain.fileName)
			{
				background = ImagesLib.getImage(catalogImageId(entry.terrain.fileName));
			}
			else
			{
				background = SiteTerrain.render(_getMorphology(), MAP_SIZE);
			}
		}
		return background;
	};

	//-----------------------------------------

	this.getPlanet = function() { return planet; };
	this.getName = function() { return entry.name; };
	this.getTypology = function() { return planet.typology; };
	this.getMorphology = _getMorphology;
	this.getBackground = _getBackground;
	this.toData = function() { return { planetId: planetId, siteId: siteId }; };

	//-----------------------------------------
}

Site.fromData = function(data)
{
	try { return new Site(data.planetId, data.siteId); }
	catch(e) { return null; }
};

/** posizione casuale sulla mappa */
let _randomPosition = function()
{
	return { x: Math.floor(Math.random() * MAP_SIZE.x), y: Math.floor(Math.random() * MAP_SIZE.y) };
};

/** nuova partita sul sito: terreno del sito, giacimenti secondo il tipo di pianeta, conoscenze e magazzini iniziali */
function createGame(site)
{
	let map = new TerrainMap(site.getTypology(), MAP_SIZE, site.getMorphology());

	let resources = PlanetTypes[site.getTypology()].resources;
	for(let resourceType in resources)
	{
		if(resources.hasOwnProperty(resourceType))
		{
			for(let i = 0; i < resources[resourceType]; i++)
			{
				map.addResource(resourceType, _randomPosition());
			}
		}
	}

	let state = map.getState();
	state.addKnowledge({ technology: ["LandingModule"] });
	state.addKnowledge({ discovery: ["ElectrostaticDischarge", "Robotics", "Resource_Metal"] });
	state.addKnowledge({ theory: ["Find_Metal", "Find_Mineral", "Find_Radioactive", "Find_Fumarole"] });

	// magazzini condivisi
	["mediKit", "goods", "toxicWaste", "fusionWaste"].forEach(function(name) { state.configureMaterial(name, "genericStorage"); });
	["dozer", "digger", "miner", "roboWorker", "MicrowaveSatellite"].forEach(function(name) { state.configureMaterial(name, "roboticStorage"); });
	["radioactiveBar", "radioactiveWaste"].forEach(function(name) { state.configureMaterial(name, "radioactiveStorage"); });

	return map;
}

export { MAP_SIZE, Site, createGame };
