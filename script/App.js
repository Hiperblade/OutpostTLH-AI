"use strict";

// Punto di ingresso del gioco: caricamento immagini, creazione o ripresa della partita, collegamento dei pulsanti.

import { imagesList } from "./DataImagesLib.js";
import { Site, createGame } from "./GameSetup.js";
import { ImagesLib } from "./ImagesLib.js";
import { InitializeMainSystem, Main, MainCommand } from "./Main.js";
import { Mission } from "./Mission.js";
import { SaveGame } from "./SaveGame.js";
import { Log } from "./SystemLib.js";
import { TextRepository } from "./TextRepository.js";
import { BuildingInfoView } from "./ViewBuildingInfo.js";
import { GameCreationView } from "./ViewGameCreation.js";
import { Queue } from "./ViewQueueBase.js";

// dati di gioco: registrano prototipi, ricette, testi e catalogo dei pianeti
import "./DataPrototype.js";
import "./DataRecipe.js";
import "./DataText_it.js";
import "./DataPlanets.js";

let main;

/** avvia la partita sul sito con la mappa data (nuova o salvata) */
function startGame(site, map)
{
	GameCreationView.hide();
	main = InitializeMainSystem("tileArea", "mapArea", "buildingArea", site, map);
	document.getElementById("mainScreen").style.display = "block";
	main.redraw();
}

function showGameCreation()
{
	GameCreationView.show({
		canResume: SaveGame.exists(),
		onStart: function(site, objectives) { startGame(site, createGame(site, objectives)); },
		onStartMission: function(mission)
		{
			let site = new Site(mission.planetId, mission.siteId);
			startGame(site, createGame(site, null, mission));
		},
		onResume: function()
		{
			let saved = SaveGame.load();
			let site = (saved == null) ? null : Site.fromData(saved.siteData);
			if(site == null)
			{
				SaveGame.clear();
Log.dialog(TextRepository.get("SavedGameNotFound"));
				showGameCreation();
				return;
			}
			startGame(site, saved.map);
		}
	});
}

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

/** chiave dell'archivio del browser con cui l'editor passa la missione da provare */
const TEST_MISSION_KEY = "outposttlh-test-mission";

//---------------------------------------------------
// avvio

let onUpdateLoading = function()
{
	let loadingPercentage = ImagesLib.getLoadingPercentage();
	document.getElementById("loadingScreenBar").style.width = Math.floor(loadingPercentage * 300) + "px";
	if(loadingPercentage == 1)
	{
		document.getElementById("loadingScreen").style.display = "none";
		// prova dall'editor: la missione arriva dall'archivio del browser e la partita non si salva
		let test = (location.search.indexOf("test=1") >= 0) ? localStorage.getItem(TEST_MISSION_KEY) : null;
		if(test)
		{
			SaveGame.setDisabled(true);
			let mission = Mission.normalize(JSON.parse(test));
			let site = new Site(mission.planetId, mission.siteId);
			startGame(site, createGame(site, null, mission));
			Log.dialog(TextRepository.get("TestMission").replace("%s", mission.name), "info");
			return;
		}
		showGameCreation();
	}
};

ImagesLib.initialize("tileArea", imagesList, onUpdateLoading);

// pulsanti della pagina
$("[data-command]").on("click", function() { Main.executeCommand(MainCommand[$(this).attr("data-command")]); });
$("#buildingInfoImage").on("click", function() { BuildingInfoView.goto(); });
$("#queueBackButton").on("click", function() { Queue.hide(); });
$("#nextTurnButton").on("click", function() { showState(); });

// handle per il debug dalla console del browser
window.outpost = { getMain: function() { return main; }, creation: GameCreationView };
