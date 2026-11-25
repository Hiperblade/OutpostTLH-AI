"use strict";

// Punto di ingresso del gioco: caricamento immagini, inizializzazione della partita, collegamento dei pulsanti.

import { imagesList } from "./DataImagesLib.js";
import { PipeType, TerrainLayer, Typology } from "./Enums.js";
import { ImagesLib } from "./ImagesLib.js";
import { InitializeMainSystem, Main, MainCommand, Site } from "./Main.js";
import { BuildingInfoView } from "./ViewBuildingInfo.js";
import { Queue } from "./ViewQueueBase.js";

// dati di gioco: registrano prototipi, ricette e testi nelle rispettive librerie
import "./DataPrototype.js";
import "./DataRecipe.js";
import "./DataText_it.js";

let main;

function initialize()
{
	//FILE: http://www.html5rocks.com/en/tutorials/file/dndfiles/
	//context.globalAlpha=0.5;

	var site = new Site(Typology.Vulcanic, "Site_vulcanic_1");
	//var site = new Site(Typology.Asteroid, "Site_vulcanic_1");
	//var site = new Site(Typology.Ice, "Site_vulcanic_1");
	//var site = new Site(Typology.Desert, "Site_vulcanic_1");
	//var site = new Site(Typology.Jungle, "Site_vulcanic_1");
	//var site = new Site(Typology.Rock, "Site_vulcanic_1");
	//var site = new Site(Typology.Stone, "Site_vulcanic_1");

	main = InitializeMainSystem("tileArea", "mapArea", "buildingArea", site);

	//buildMap(main.getTerrainMap());

	//------------------------

	var map = main.getTerrainMap();
	var i;
	for(i = 0; i < 60; i++)
	{
		map.addResource("Metal", { x: Math.floor(Math.random() * 150), y: Math.floor(Math.random() * 300) });
	}
	for(i = 0; i < 40; i++)
	{
		map.addResource("Mineral", { x: Math.floor(Math.random() * 150), y: Math.floor(Math.random() * 300) });
	}
	for(i = 0; i < 10; i++)
	{
		map.addResource("Radioactive", { x: Math.floor(Math.random() * 150), y: Math.floor(Math.random() * 300) });
	}
	for(i = 0; i < 10; i++)
	{
		map.addResource("Fumarole", { x: Math.floor(Math.random() * 150), y: Math.floor(Math.random() * 300) });
	}

	var state = main.getState();
	state.addKnowledge({ technology: ["LandingModule"] });

	state.addKnowledge({ discovery: ["ElectrostaticDischarge"] });
	state.addKnowledge({ discovery: ["Robotics"] });
	state.addKnowledge({ discovery: ["Resource_Metal"] });
	//state.addKnowledge({ theory: ["Extraction_Metal"] });

	state.addKnowledge({ theory: ["Find_Metal"] });

	state.addKnowledge({ theory: ["Find_Mineral"] });
	state.addKnowledge({ theory: ["Find_Radioactive"] });
	state.addKnowledge({ theory: ["Find_Fumarole"] });

	//state.addKnowledge({ technology: ["SpacePort"] });

	/*
	state.addKnowledge({ technology: [
		"LandingModule",
		"MicrowavePlant",
		"ElectrostaticCoil",
		"Geothermal",
		"StorageArea",
		"Tokamak",
		"TokamakAdv",
		"Capacitor",
		"CommandCenter",
		"MaintenanceCenter",
		"RoboRemittance",
		"RoboRemittanceAdv",
		"RoboCommander",
		"RoboCommanderAdv",
		"EnvironmentalControl",
		"EnvironmentalControlAdv",
		"Agridome",
		"AgridomeAdv",
		"AgridomeIntensive",
		"VerticalFarm",
		"VerticalFarmAdv",
		"Residential",
		"ResidentialAdv",
		"Nursery",
		"MedicalStructure",
		"MedicalStructureAdv",
		"School",
		"Univesity",
		"UnivesityAdv",
		"RecreationalFacility",
		"Park",
		"Warehouse",
		"Smelter",
		"SmelterAdv",
		"GoodsFactory",
		"IndustrialFactory",
		"ChemicalFactory",
		"PharmaceuticalIndustry",
		"HotLab",
		"HotLabAdv",
		"Lab",
		"LabAdv",
		"DeepLab",
		"SpacePort"
		] });
	*/
	//state.createMaterials({ repairUnit: 10000 });
	//state.destroyMaterials({ repairUnit: 10000 });
	/*
	state.configureMaterial("metalOre", "genericStorage");
	state.configureMaterial("mineralOre", "genericStorage");
	state.configureMaterial("cristalOre", "genericStorage");
	state.configureMaterial("ironBar", "genericStorage");
	state.configureMaterial("goodsUnit", "genericStorage");
	state.configureMaterial("pharmaceuticalUnit", "genericStorage");
	state.configureMaterial("fusionWaste", "genericStorage");

	state.configureMaterial("dozer", "roboticStorage");
	state.configureMaterial("digger", "roboticStorage");
	state.configureMaterial("miner", "roboticStorage");
	state.configureMaterial("worker", "roboticStorage");
	state.configureMaterial("MicrowaveSatellite", "roboticStorage");

	state.configureMaterial("radioactiveOre", "radioactiveStorage");
	state.configureMaterial("radioactiveWaste", "radioactiveStorage");
	state.configureMaterial("toxicWaste", "radioactiveStorage");
	*/

	state.configureMaterial("mediKit", "genericStorage");
	state.configureMaterial("goods", "genericStorage");
	state.configureMaterial("toxicWaste", "genericStorage");
	state.configureMaterial("fusionWaste", "genericStorage");

	state.configureMaterial("dozer", "roboticStorage");
	state.configureMaterial("digger", "roboticStorage");
	state.configureMaterial("miner", "roboticStorage");
	state.configureMaterial("worker", "roboticStorage");
	state.configureMaterial("MicrowaveSatellite", "roboticStorage");

	state.configureMaterial("radioactiveBar", "radioactiveStorage");
	state.configureMaterial("radioactiveWaste", "radioactiveStorage");

	//state.createMaterials({ dozer: 10 });
	//state.createMaterials({ digger: 10 });

	//------------------------

	main.redraw();
}

//initialize();

function buildMap(map)
{
	//************ TODO

	map.addBuilding("Park", { x: 4, y: 3 });

	var layer = TerrainLayer.Surface;
	for(var i = 0;i < 3; i++)
	{
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 0, y: 1 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 1, y: 1 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 2, y: 1 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 0, y: 4 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 3, y: 3 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 4, y: 4 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 3, y: 4 }, true);
		//map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 5, y: 2 }, true);
		//map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 5, y: 3 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 5, y: 4 }, true);
		//map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 4, y: 2 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 3, y: 2 }, true);
		map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 3, y: 1 }, true);

		map.addPipe(PipeType.EastWest, layer, { x: 0, y: 6 });
		map.addPipe(PipeType.EastWest, layer, { x: 0, y: 5 });


		if(layer == TerrainLayer.Surface)
		{
			map.addPipe(PipeType.Down, layer, { x: 0, y: 2 }, true);
			map.addPipe(PipeType.EastWest, layer, { x: 0, y: 3 }, true);

			layer = TerrainLayer.Underground;
		}
		else if(layer == TerrainLayer.Underground)
		{
			map.addPipe(PipeType.Up, layer, { x: 0, y: 2 }, true);
			map.addPipe(PipeType.Down, layer, { x: 0, y: 3 }, true);

			layer = TerrainLayer.Deep;
		}
		else
		{
			map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 0, y: 2 }, true);
			map.addPipe(PipeType.Up, layer, { x: 0, y: 3 }, true);
		}

		/*
		if(layer == TerrainLayer.Surface)
		{

			map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 2, y: 4 }, true);
			map.addPipe(PipeType.EastWest, layer, { x: 2, y: 5 }, true);
			map.addPipe(PipeType.NorthEastSouthWest, layer, { x: 2, y: 6 }, true);
			map.addPipe(PipeType.NorthSouth, layer, { x: 3, y: 6 }, true);

			//map.addBuilding(new Building("Agridome", layer, new Point(0, 0), 0));
			//map.addBuilding(new Building("Agridome1", layer, new Point(1, 0), 0));
			//map.addBuilding(new Building("Agridome2", layer, new Point(2, 0), 0));
			//map.addBuilding(new Building("Warehouse", layer, new Point(2, 2), 0));
			//map.addBuilding(new Building("Warehouse", layer, new Point(0, 5), 0));
			//map.addBuilding(new Building("CommandCenter", layer, new Point(1, 2), 0));
			//map.addBuilding(new Building("HotLab", layer, new Point(1, 4), 0));
			//map.addBuilding(new Building("HotLabAdv", layer, new Point(4, 1), 0));

			//map.addBuilding(new Building("HotLab", layer, new Point(3, 0), 20));

			map.addBuilding("CommandCenter", { x: 1, y: 2 }, true);
			map.addBuilding("MaintenanceCenter", { x: 1, y: 0 });

			map.addBuilding("RoboCommander", { x: 2, y: 0 });


			map.addBuilding("ElectrostaticCoil", { x: 6, y: 2 }, true);
			map.addBuilding("ElectrostaticCoil", { x: 6, y: 3 });
			map.addBuilding("ElectrostaticCoil", { x: 6, y: 4 }, true);

			map.addBuilding("Capacitor", { x: 5, y: 5 }, true);
			map.addBuilding("Capacitor", { x: 4, y: 5 });
			map.addBuilding("Capacitor", { x: 3, y: 5 });

			map.addBuilding("Agridome", { x: 4, y: 3 });

			map.addBuilding("ChemicalFactory", { x: 4, y: 1 }, true);
			//map.addBuilding("Warehouse", new Point(4, 1), true);
//map.addBuilding("Mine_surface", { x: 5, y: 1 }, true);


//var test = new Building("HotLabAdv", layer, new Point(4, 3), 0);
//map.addBuilding(test);

			layer = TerrainLayer.Underground;
		}
		else if(layer == TerrainLayer.Underground)
		{
//					map.addBuilding(new Building("Lab", layer, new Point(3, 0), 20));

//var test = new Building("LabAdv", layer, new Point(4, 3), 0);
//map.addBuilding(test);

			map.addBuilding("Lab", { x: 1, y: 4 }, true);


			layer = TerrainLayer.Deep;
		}
		else
		{
			map.addBuilding("StorageArea", { x: 5, y: 5 }, true);

//					map.addBuilding(new Building("DeepLab", layer, new Point(3, 0), 20));

//var test = new Building("DeepLab", layer, new Point(4, 3), 0);
//map.addBuilding(test);

			//map.addBuilding(new Building("GeothermalAdvA", layer, new Point(4, 1), 0));
			//map.addBuilding(new Building("GeothermalAdvB", layer, new Point(5, 1), 0));

			//map.addBuilding(new Building("Geothermal", layer, new Point(6, 3), 0));

			//map.addBuilding(new Building("BlueLigth", layer, new Point(1, 4), 0));

		}

		*/
	}

	showState();
}

//---------------------------------------------------

function showState()
{
	var state = main.getState();
	//<table><tr><td>Table cell 1</td><td>Table cell 2</td></tr></table>
	var text = "<div style=\"color:white;\"><table>";
	text += "<tr><td><b>Name </b></td><td><b>Produced </b></td><td><b>Consumed </b></td><td><b>Stored</b></td><td><b>/</b></td><td><b>Capacity</b></td></tr>";
	var name;
	var materials = state.getMaterials();
	var i;
	for(i = 0; i < materials.length; i++)
	{
		name = materials[i];
		var capacity = state.getCapacity(name);
		if(state.isMetaMaterial(name))
		{
			capacity = "(" + capacity + ")";
		}
		text += "<tr><td>" + name + "</td><td>" + (state.getProduced(name) || "--") + "</td><td>" + (state.getConsumed(name) || "--") + "</td><td>" + (state.getStored(name) || state.getFullCapacity(name)) + "</td><td>/</td><td>" + capacity + "</td></tr>";
	}
	text += "</table></div>";

	var stateDiv = document.getElementById("showStateDiv");
	stateDiv.innerHTML = text;

	//----
	text = "<div style=\"color:white;\"><b>Technology:</b><br/>";
	var technology = state.getTechnology();
	for(i = 0; i < technology.length; i++)
	{
		text += technology[i] + "<br/>";
	}
	//----

	stateDiv = document.getElementById("showResearchStateDiv");
	stateDiv.innerHTML = text + "</div>";

	text = "<div style=\"color:white;\"><b>Theory:</b><br/>";
	var theory = state.getTheory();
	for(i = 0; i < theory.length; i++)
	{
		text += theory[i] + "<br/>";
	}

	text += "<br/>Discovery:<br/>";
	var discovery = state.getDiscovery();
	for(i = 0; i < discovery.length; i++)
	{
		text += discovery[i] + "<br/>";
	}

	stateDiv = document.getElementById("showResearchState2Div");
	stateDiv.innerHTML = text + "</div>";
}

//---------------------------------------------------

//---------------------------------------------------
// avvio

var onUpdateLoading = function ()
{
	var loadingPercentage = ImagesLib.getLoadingPercentage();
	var loadingScreenBar = document.getElementById("loadingScreenBar");
	loadingScreenBar.style.width = Math.floor(loadingPercentage * 300) + "px";
	if(loadingPercentage == 1)
	{
		var loadingScreen = document.getElementById("loadingScreen");
		loadingScreen.style.display = 'none';
		initialize();
		var mainScreen = document.getElementById("mainScreen");
		mainScreen.style.display = 'block';
	}
};

ImagesLib.initialize("tileArea", imagesList, onUpdateLoading);

// pulsanti della pagina
$("[data-command]").on("click", function() { Main.executeCommand(MainCommand[$(this).attr("data-command")]); });
$("#buildingInfoImage").on("click", function() { BuildingInfoView.goto(); });
$("#queueBackButton").on("click", function() { Queue.hide(); });
$("#nextTurnButton").on("click", function() { showState(); });

// handle per il debug dalla console del browser
window.outpost = { getMain: function() { return main; } };
