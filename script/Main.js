"use strict";

import { PipeType, RobotTypes, TerrainLayer } from "./Enums.js";
import { Placement, PlacementReason } from "./Placement.js";
import { Cure } from "./Cure.js";
import { Revival } from "./Revival.js";
import { SaveGame } from "./SaveGame.js";
import { Log } from "./SystemLib.js";
import { TextRepository } from "./TextRepository.js";
import { GameOutcome, Turn } from "./Turn.js";
import { InitializeBuildingInfoView } from "./ViewBuildingInfo.js";
import { BuildingSelectorView } from "./ViewBuildingSelector.js";
import { IsometricView } from "./ViewIsometric.js";
import { ColonySummaryView } from "./ViewColonySummary.js";
import { MapView } from "./ViewMap.js";
import { InitializeQueueView, ProductionQueueData, ResearchQueueData } from "./ViewQueueBase.js";
import { HelpQueueData } from "./ViewQueueHelp.js";
import { ReportQueueData } from "./ViewQueueReport.js";

let Main;

/**
 * @param {Site} siteType sito della partita
 * @param {TerrainMap} map mappa della partita (nuova o salvata)
 */
function InitializeMainSystem(mapCanvas, miniMapCanvas, selectorCanvas, siteType, map)
{
	Main = new MainSystemConstructor(mapCanvas, miniMapCanvas, selectorCanvas, siteType, map);
	return Main;
}

let MainCommand =
{
	GoNorth: "GoNorth",
	GoEast: "GoEast",
	GoSouth: "GoSouth",
	GoWest: "GoWest",
	GoUp: "GoUp",
	GoDown: "GoDown",
	Dozer: "Dozer",
	Digger: "Digger",
	Miner: "Miner",
	PipeNorthEastSouthWest: "PipeNorthEastSouthWest",
	PipeEastWest: "PipeEastWest",
	PipeNorthSouth: "PipeNorthSouth",
	PipeDown: "PipeDown",
	SelectBuilding: "Building",
	ShowHelp: "ShowHelp",
	ShowReport: "ShowReport",
	ShowProduction: "ShowProduction",
	ShowResearch: "ShowResearch",
	DoNext: "DoNext",
	WakeUp: "WakeUp",
	Cure: "Cure",
	ClearSelection: "ClearSelection"
};

function MainSystemConstructor(mapCanvas, miniMapCanvas, selectorCanvas, siteType, map)
{
	const TILE_DIMENSION = { x: 106, y: 46 };

	let site = siteType;
	let areaSize = { x: 9, y: 9 };
	let terrainMap;
	let view;
	let mapView;
	let selectorView;
	let queueView;
	let summaryView;
	let buildingInfo;
	let position = { x: 0, y: 0 };
	let state = null;

	let currentTile = null;

	let _initialize = function()
	{
		document.onkeydown = function(event)
		{
			event = event || window.event;
			let e = event.keyCode;
			switch(e)
			{
				case 38: // up
				case 87: // w
					_executeCommand(MainCommand.GoNorth);
					break;
				case 39: // right
				case 68: // d
					_executeCommand(MainCommand.GoEast);
					break;
				case 40: // down
				case 83: // s
					_executeCommand(MainCommand.GoSouth);
					break;
				case 37: // left
				case 65: // a
					_executeCommand(MainCommand.GoWest);
					break;

				case 33: // pageUp
					_executeCommand(MainCommand.GoUp);
					break;
				case 34: // pageDown
					_executeCommand(MainCommand.GoDown);
					break;

				case 60: // < (it)
				case 220: // \ (en)
					_executeCommand(MainCommand.Dozer);
					break;
				case 90: // z
					_executeCommand(MainCommand.Digger);
					break;
				case 88: // x
					_executeCommand(MainCommand.Miner);
					break;
				case 67: // c
					_executeCommand(MainCommand.PipeNorthEastSouthWest);
					break;
				case 86: // v
					_executeCommand(MainCommand.PipeEastWest);
					break;
				case 66: // b
					_executeCommand(MainCommand.PipeNorthSouth);
					break;
				case 78: // n
					_executeCommand(MainCommand.PipeDown);
					break;
				case 77: // m
					_executeCommand(MainCommand.SelectBuilding);
					break;

				case 72: // h
					_executeCommand(MainCommand.ShowHelp);
					break;
				case 74: // j
					_executeCommand(MainCommand.ShowReport);
					break;
				case 75: // k
					_executeCommand(MainCommand.ShowProduction);
					break;
				case 76: // l
					_executeCommand(MainCommand.ShowResearch);
					break;

				case 82: // r
					_executeCommand(MainCommand.WakeUp);
					break;

				case 71: // g
					_executeCommand(MainCommand.Cure);
					break;

				case 13: // enter
					_executeCommand(MainCommand.DoNext);
					break;
			}
		};

		let _onChangePosition = function(newPosition)
		{
			newPosition.x -= Math.floor(areaSize.x / 2);
			newPosition.y -= Math.floor(areaSize.y / 2);
			if(newPosition.x < 0) newPosition.x = 0;
			if(newPosition.y < 0) newPosition.y = 0;

			_setPosition(newPosition);
		};

		let _onClearCurrentItem = function()
		{
			_executeCommand(MainCommand.ClearSelection);
		};

		let _onSelected = function(item)
		{
			if(item != null)
			{
				_setCurrentTile({ buildingType: item });
			}
			else
			{
				_setCurrentTile(null);
			}
		};

		terrainMap = map;
		state = terrainMap.getState();
		view = new IsometricView (terrainMap, mapCanvas, areaSize, TILE_DIMENSION);
		let canvasSize = view.getCanvasSize();

		let mainArea = $("#mainScreen");
		mainArea.css("width", canvasSize.x);
		mainArea.css("height", canvasSize.y);

		summaryView = new ColonySummaryView("colonySummary", terrainMap);
		mapView = new MapView(terrainMap, miniMapCanvas, site.getBackground(), areaSize, _onChangePosition);
		selectorView = new BuildingSelectorView(selectorCanvas, canvasSize.x, state, _onSelected);

		buildingInfo = InitializeBuildingInfoView(_onChangePosition, _onClearCurrentItem, function(building) { return state.getBuildingIssue(building); },
			function()
			{
				// nuova assegnazione del personale o interruttore della colonia: si ricalcola la proiezione del turno
				Turn.project(terrainMap);
				_redraw();
				_save();
			},
			function() { return state; });
		queueView = InitializeQueueView("queueDiv", canvasSize);

		// pulsanti spostamento
		view.addButtonGrid(10, { x: Math.floor(areaSize.x / 2), y: -1 }, "button_west", function (){ _goWest(); });
		view.addButtonGrid(11, { x: areaSize.x, y: Math.floor(areaSize.y / 2) }, "button_north", function() { _goNorth(); });
		view.addButtonGrid(12, { x: Math.floor(areaSize.x / 2), y: areaSize.y }, "button_east",  function() { _goEast(); });
		view.addButtonGrid(13, { x: -1, y: Math.floor(areaSize.y / 2) }, "button_south", function() { _goSouth(); });

		// bordo
		let index;
		for(index = 0; index < areaSize.y; index++)
		{
			view.addImageGrid(300 + index, { x: -1, y: index }, "tileBorder_left")
		}
		for(index = areaSize.x -1; index >= 0; index--)
		{
			view.addImageGrid(200 + index, { x: index, y: areaSize.y }, "tileBorder_right")
		}

		// pulsanti selezione livello
		view.addButton(30, { x: canvasSize.x - 40, y: view.getVerticalMiddle() - 50 }, "button_up", function() { _goUp(); });
		view.addButton(31, { x: canvasSize.x - 40, y: view.getVerticalMiddle() + 50 + 30 }, "button_down", function() { _goDown(); });

		view.setGridCallback(function(point)
			{
				if(currentTile != null)
				{
					let result = Placement.place(terrainMap, currentTile, point);
					if(result.ok)
					{
						_setCurrentTile(null);
					}
					else if(!Placement.isSilent(result))
					{
Log.dialog(_placementMessage(result));
					}
					_redraw();
					return;
				}

				if(!terrainMap.isVisible(point))
				{
					return;
				}

				// nessuno strumento selezionato: informazioni sull'elemento cliccato
				let target = _findBuilding(point);
				if(target != null)
				{
					buildingInfo.show(target);

					if(target.isPipe() && !target.underConstruction() && !target.isDestroyed())
					{
						if(target.haveUp())
						{
							_goUp();
						}
						else if(target.haveDown())
						{
							_goDown();
						}
					}
				}
				else
				{
					let resource = terrainMap.findResource(point);
					if(resource != null)
					{
						buildingInfo.show(resource);
					}
					else
					{
						buildingInfo.hide();
					}
				}
			});

		view.setButtonsCallback(function(id)
			{
			});

		Turn.project(terrainMap);
		_setAbsolutePosition({x: 0, y: 0});
		_setLayer(TerrainLayer.Surface);
	};

	let _placementMessage = function(result)
	{
		switch(result.reason)
		{
			case PlacementReason.NoDozer:
			case PlacementReason.NoDigger:
			case PlacementReason.NoMiner:
				return "Non \u00E8 disponibile nessuna " + TextRepository.get(result.data.robotType) + "!";
			case PlacementReason.NoExtractionTechnology:
				return "Non hai la tecnologia per estrarre questa risorsa!";
			case PlacementReason.NotRazed:
				return "Il terreno non \u00E8 spianato!";
			case PlacementReason.NoResourceRequired:
				return "Questo edificio non richiede la presenza di risorse!";
			case PlacementReason.RequiresResource:
				return "Questo edificio richiede la presenza della risorsa " + result.data.resource + "!";
		}
		return result.reason;
	};

	let _createCurrentTilePipe = function(pipeType, layer)
	{
		return { buildingType: "Pipe_" + pipeType + "_" + layer, image: "Pipe_" + pipeType + "_" + layer};
	};

	let _setPosition = function(point)
	{
		position = point;
		view.setPosition(position);
		mapView.setPosition(position);
	};

	let _redraw = function()
	{
		_updateRoboAvailable();
		summaryView.redraw();
		view.redraw();
		mapView.redraw();
	};

	let _fromScreenPosition = function(point)
	{
		return view.fromScreenPosition(point);
	};

	let _findBuilding = function(point)
	{
		return terrainMap.findBuilding(point);
	};

	let disableCommand = {};

	let _setAbilitationButton = function(name, enable)
	{
		disableCommand[name] = !enable;

		let button = $(".button" + name);
		if(enable)
		{
			button.addClass("buttonEnable");
			button.removeClass("buttonDisable");
		}
		else
		{
			button.addClass("buttonDisable");
			button.removeClass("buttonEnable");
		}
	};

	let _updateRoboAvailable = function()
	{
		if(state.getRoboDozerAvailable() <= 0)
		{
			_setAbilitationButton(MainCommand.Dozer, false);

		}
		else
		{
			_setAbilitationButton(MainCommand.Dozer, true);
		}

		_setAbilitationButton(MainCommand.Miner, state.getRoboMinerAvailable() > 0);

		if((state.getRoboDiggerAvailable() <= 0) || (terrainMap.getLayer() == TerrainLayer.Surface))
		{
			_setAbilitationButton(MainCommand.Digger, false);
		}
		else
		{
			_setAbilitationButton(MainCommand.Digger, true);
		}
	};

	let _setLayer = function(layer)
	{
		_setCurrentTile(null);

		terrainMap.setLayer(layer);

		_setAbilitationButton(MainCommand.PipeDown, true);

		view.setButton(26, true); // elevator
		view.setButton(30, true); // up
		view.setButton(31, true); // down

		if(layer == TerrainLayer.Surface)
		{
			view.setButton(30, false); // up
		}
		else if(layer == TerrainLayer.Deep)
		{
			_setAbilitationButton(MainCommand.PipeDown, false);
			view.setButton(31, false); // down
		}

		selectorView.setLayer(layer);

		_redraw();
	};

	let _goUp = function()
	{
		if(terrainMap.getLayer() == TerrainLayer.Underground)
		{
			_setLayer(TerrainLayer.Surface);
		}
		else if(terrainMap.getLayer() == TerrainLayer.Deep)
		{
			_setLayer(TerrainLayer.Underground);
		}
		_redraw();
	};

	let _goDown = function()
	{
		if(terrainMap.getLayer() == TerrainLayer.Surface)
		{
			_setLayer(TerrainLayer.Underground);
		}
		else if(terrainMap.getLayer() == TerrainLayer.Underground)
		{
			_setLayer(TerrainLayer.Deep);
		}
		_redraw();
	};

	let _goNorth = function()
	{
		if(position.x < terrainMap.getSize().x - view.getSize().x - 1)
		{
			position = { x: position.x + 1, y: position.y };
			_setPosition(position);
		}
	};

	let _goSouth = function()
	{
		if(position.x > 0)
		{
			position = { x: position.x - 1, y: position.y };
			_setPosition(position);
		}
	};

	let _goEast = function()
	{
		if(position.y < terrainMap.getSize().y - view.getSize().y - 1)
		{
			position = { x: position.x, y: position.y + 1 };
			_setPosition(position);
		}
	};

	let _goWest = function()
	{
		if(position.y > 0)
		{
			position = { x: position.x, y: position.y - 1 };
			_setPosition(position);
		}
	};

	/** prenota il risveglio di 5 capsule criogeniche (avviene a fine turno) */
	let _wakeUp = function()
	{
		let result = Revival.request(terrainMap, 5);
Log.dialog(result.ok ? TextRepository.get("RevivalScheduled") : _revivalMessage(result));
	};

	/** prenota le cure dei coloni malati (avvengono a fine turno) */
	let _cure = function()
	{
		let result = Cure.request(terrainMap);
		Log.dialog(result.ok ? TextRepository.get("CureScheduled").replace("%s", state.getPendingCures()) : TextRepository.get("Cure_" + result.reason));
		summaryView.redraw();
	};

	/** motivo del rifiuto, con l'edificio responsabile e cosa gli manca */
	let _revivalMessage = function(result)
	{
		let text = TextRepository.get("Revival_" + result.reason);
		let detail = result.detail;
		if(detail)
		{
			text += " " + TextRepository.get("Revival_status_" + detail.status).replace("%s", TextRepository.get(detail.building));
			if(detail.missing.length > 0)
			{
				text += " " + TextRepository.get("Revival_lacks").replace("%s", detail.missing.map(function(name) { return TextRepository.get(name); }).join(", "));
			}
		}
		return text;
	};

	let _doNext = function()
	{
		if(state.getOutcome() != null)
		{
			return;
		}
		let report = Turn.advance(terrainMap);

		// prima si aggiorna la mappa, così i messaggi del turno si leggono sopra la situazione nuova
		_redraw();
		buildingInfo.refresh();

		let messages = report.events.map(function(event)
		{
			return TextRepository.get("Event_" + event.type) + ": " + (event.count !== undefined ? event.count : TextRepository.get(event.name));
		});
		if(report.outcome == null)
		{
			// un salvataggio non riuscito non deve fermare la partita
			if(!_save() && !saveWarningShown)
			{
				saveWarningShown = true;
				messages.push(TextRepository.get("SaveFailed"));
			}
		}
		else
		{
			// partita conclusa: alla prossima apertura se ne crea una nuova
			SaveGame.clear();
			_setAbilitationButton(MainCommand.DoNext, false);
			messages.push(TextRepository.get(report.outcome == GameOutcome.Victory ? "GameVictory" : "GameDefeat"));
		}
		if(messages.length > 0)
		{
			// i messaggi bloccano la pagina: si mostrano dopo che la mappa è stata ridisegnata
			window.setTimeout(function() { messages.forEach(function(text) { Log.dialog(text); }); }, 50);
		}
	};

	let saveWarningShown = false;

	let _save = function()
	{
		try
		{
			return SaveGame.save(terrainMap, site);
		}
		catch(e)
		{
			return false;
		}
	};

	let _setAbsolutePosition = function(point)
	{
//TODO
		let canvasSize = view.getCanvasSize();
		view.setAbsolutePosition(point);

		selectorView.setAbsolutePosition({x: point.x, y: point.y + canvasSize.y});
	};

	let _setCurrentTile = function(item)
	{
		currentTile = item;
		buildingInfo.show(currentTile);
		_redraw();
	};

	let _executeCommand = function(cmd)
	{
		if(disableCommand[cmd])
		{
			return;
		}

		switch(cmd)
		{
			case MainCommand.GoNorth:
				_goNorth();
				break;
			case MainCommand.GoEast:
				_goEast();
				break;
			case MainCommand.GoSouth:
				_goSouth();
				break;
			case MainCommand.GoWest:
				_goWest();
				break;

			case MainCommand.GoUp:
				_goUp();
				break;
			case MainCommand.GoDown:
				_goDown();
				break;

			case MainCommand.Dozer:
				_setCurrentTile({ isRobot: true, robotType: RobotTypes.Dozer, buildingType: "RoboDozer", image: "RoboDozer" });
				break;
			case MainCommand.Digger:
				_setCurrentTile({ isRobot: true, robotType: RobotTypes.Digger, buildingType: "RoboDigger", image: "RoboDigger" } );
				break;
			case MainCommand.Miner:
				_setCurrentTile({ isRobot: true, robotType: RobotTypes.Miner, buildingType: "RoboMiner", image: "RoboMiner" });
				break;
			case MainCommand.PipeNorthEastSouthWest:
				_setCurrentTile(_createCurrentTilePipe(PipeType.NorthEastSouthWest, terrainMap.getLayer()));
				break;
			case MainCommand.PipeEastWest:
				_setCurrentTile(_createCurrentTilePipe(PipeType.EastWest, terrainMap.getLayer()));
				break;
			case MainCommand.PipeNorthSouth:
				_setCurrentTile(_createCurrentTilePipe(PipeType.NorthSouth, terrainMap.getLayer()));
				break;
			case MainCommand.PipeDown:
				_setCurrentTile(_createCurrentTilePipe(PipeType.Down, terrainMap.getLayer()));
				break;
			case MainCommand.SelectBuilding:
				selectorView.show();
				break;

			case MainCommand.ShowHelp:
				queueView.show(new HelpQueueData(state));
				break;
			case MainCommand.ShowReport:
				queueView.show(new ReportQueueData(state));
				break;
			case MainCommand.ShowProduction:
				queueView.show(new ProductionQueueData(state));
				break;
			case MainCommand.ShowResearch:
				queueView.show(new ResearchQueueData(state));
				break;

			case MainCommand.DoNext:
				_doNext();
				break;

			case MainCommand.WakeUp:
				_wakeUp();
				break;

			case MainCommand.Cure:
				_cure();
				break;

			case MainCommand.ClearSelection:
				_setCurrentTile(null);
				break;
		}
	};

	_initialize();

	//-----------------------------------------

	this.getTerrainMap = function() { return terrainMap; };
	this.getState = function() { return state; };

	this.getLayer = function() { return terrainMap.getLayer(); };
	this.setLayer = _setLayer;

	this.setPosition = _setPosition;
	this.redraw = _redraw;
	this.fromScreenPosition = _fromScreenPosition;
	this.findBuilding = _findBuilding;
	this.goUp = _goUp;
	this.goDown = _goDown;
	this.goNorth = _goNorth;
	this.goSouth = _goSouth;
	this.goEast = _goEast;
	this.goWest = _goWest;
	this.doNext = _doNext;
	this.setAbsolutePosition = _setAbsolutePosition;

	this.executeCommand = _executeCommand;

	//----------------------------------------- */
}

export { Main, InitializeMainSystem, MainCommand, MainSystemConstructor };
