"use strict";

import { PlanetCatalog, PlanetTypes, catalogImageId } from "./DataPlanets.js";
import { Site } from "./GameSetup.js";
import { ImagesLib } from "./ImagesLib.js";
import { Campaign, CampaignProgress, Campaigns } from "./Campaign.js";
import { Missions } from "./Mission.js";
import { TextRepository } from "./TextRepository.js";

/**
 * Schermata di Creazione della partita: scelta del pianeta, poi del sito; in alternativa
 * ripresa della partita salvata.
 *
 * GameCreationView.show({ canResume, onStart(site, objectives), onStartMission(mission), onResume() })
 */
function GameCreationViewConstructor()
{
	const PLANET_SIZE = 96;
	const SITE_WIDTH = 150, SITE_HEIGHT = 75;
	const OBJECTIVES = ["happyPopulation", "shipLaunch", "superintelligence", "terraforming"];

	let root = null;
	let options = null;
	let selectedPlanet = null;
	let selectedSite = null;

	let _drawPlanet = function(canvas, planet)
	{
		let ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if(planet.image)
		{
			// primo fotogramma del foglio di animazione
			let image = ImagesLib.getImage(catalogImageId(planet.image.fileName));
			let frame = image.width / planet.image.cols;
			ctx.drawImage(image, 0, 0, frame, frame, 0, 0, canvas.width, canvas.height);
			return;
		}
		let r = canvas.width / 2 - 4;
		let gradient = ctx.createRadialGradient(r * 0.7, r * 0.7, r * 0.1, r + 4, r + 4, r);
		gradient.addColorStop(0, "#ffffff");
		gradient.addColorStop(0.25, PlanetTypes[planet.typology].color);
		gradient.addColorStop(1, "#000000");
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(r + 4, r + 4, r, 0, Math.PI * 2);
		ctx.fill();
	};

	let _item = function(canvas, title, subtitle, onClick)
	{
		let item = $('<div class="creationItem"></div>');
		item.append(canvas);
		item.append($('<div class="creationItemTitle"></div>').text(title));
		if(subtitle)
		{
			item.append($('<div class="creationItemSubtitle"></div>').text(subtitle));
		}
		item.on("click", function()
		{
			item.parent().children().removeClass("creationItemSelected");
			item.addClass("creationItemSelected");
			onClick();
		});
		return item;
	};

	let _canvas = function(width, height)
	{
		let canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		return canvas;
	};

	let _showSites = function(planet)
	{
		selectedPlanet = planet;
		selectedSite = null;
		$("#creationStart").addClass("buttonDisable");
		let list = $("#creationSites").empty();
		planet.sites.forEach(function(entry)
		{
			let site = new Site(planet.id, entry.id);
			let canvas = _canvas(SITE_WIDTH, SITE_HEIGHT);
			canvas.getContext("2d").drawImage(site.getBackground(), 0, 0, SITE_WIDTH, SITE_HEIGHT);
			list.append(_item(canvas, entry.name, null, function()
			{
				selectedSite = site;
				$("#creationStart").removeClass("buttonDisable");
			}));
		});
		$("#creationSitesBlock").show();
	};

	let _build = function()
	{
		root.empty();
		let panel = $('<div class="creationPanel"></div>').appendTo(root);
		panel.append($('<h2></h2>').text(TextRepository.get("NewGame")));
		if(options.canResume)
		{
			$('<div id="creationResume" class="creationButton"></div>').text(TextRepository.get("ResumeGame"))
				.on("click", function() { options.onResume(); })
				.appendTo(panel);
		}

		// due strade: partita libera o missione
		let modes = $('<div class="creationModes"></div>').appendTo(panel);
		let freeMode = $('<div class="creationButton creationMode"></div>').text(TextRepository.get("FreeGame")).appendTo(modes);
		let missionMode = $('<div class="creationButton creationMode"></div>').text(TextRepository.get("Missions")).appendTo(modes);
		let campaignMode = $('<div class="creationButton creationMode"></div>').text(TextRepository.get("Campaigns")).appendTo(modes);
		let free = $('<div id="creationFree"></div>').appendTo(panel);
		let missions = $('<div id="creationMissions" class="hide"></div>').appendTo(panel);
		let campaigns = $('<div id="creationCampaigns" class="hide"></div>').appendTo(panel);
		let select = function(mode, section)
		{
			[free, missions, campaigns].forEach(function(s) { s.toggle(s === section); });
			[freeMode, missionMode, campaignMode].forEach(function(m) { m.toggleClass("creationModeSelected", m === mode); });
		};
		freeMode.on("click", function() { select(freeMode, free); });
		missionMode.on("click", function() { select(missionMode, missions); _showMissions(missions); });
		campaignMode.on("click", function() { select(campaignMode, campaigns); _showCampaigns(campaigns); });
		freeMode.addClass("creationModeSelected");
		panel = free;

		panel.append($('<h3></h3>').text(TextRepository.get("ChoosePlanet")));
		let planets = $('<div id="creationPlanets" class="creationList"></div>').appendTo(panel);
		PlanetCatalog.forEach(function(planet)
		{
			let canvas = _canvas(PLANET_SIZE, PLANET_SIZE);
			_drawPlanet(canvas, planet);
			planets.append(_item(canvas, planet.name, TextRepository.get("Typology_" + planet.typology), function() { _showSites(planet); }));
		});

		let sites = $('<div id="creationSitesBlock" class="hide"></div>').appendTo(panel);
		sites.append($('<h3></h3>').text(TextRepository.get("ChooseSite")));
		sites.append('<div id="creationSites" class="creationList"></div>');

		// 3. obiettivi della partita libera (anche nessuno: si gioca senza vittoria)
		panel.append($('<h3></h3>').text(TextRepository.get("ChooseObjectives")));
		let objectives = $('<div id="creationObjectives" class="creationObjectives"></div>').appendTo(panel);
		OBJECTIVES.forEach(function(type)
		{
			let label = $('<label class="creationObjective"></label>');
			$('<input type="checkbox">').attr("data-objective", type).prop("checked", type == "happyPopulation").appendTo(label);
			label.append($('<span></span>').text(" " + TextRepository.get("Objective_" + type)));
			label.attr("title", TextRepository.get("Objective_" + type + "Description"));
			objectives.append(label);
		});

		$('<div id="creationStart" class="creationButton buttonDisable"></div>').text(TextRepository.get("StartGame"))
			.on("click", function()
			{
				if(selectedSite !== null)
				{
					let chosen = $("#creationObjectives input:checked").map(function() { return { type: $(this).attr("data-objective"), params: {} }; }).get();
					options.onStart(selectedSite, chosen);
				}
			})
			.appendTo(panel);
	};

	/** elenco delle missioni (caricate da data/missions) e scheda di quella scelta */
	let _showMissions = function(container)
	{
		if(container.data("loaded"))
		{
			return;
		}
		container.data("loaded", true);
		container.empty().append($('<p></p>').text(TextRepository.get("MissionsLoading")));
		Missions.list().then(function(list)
		{
			container.empty();
			if(list.length == 0)
			{
				container.append($('<p></p>').text(TextRepository.get("NoMissions")));
				return;
			}
			let listBox = $('<div class="creationMissionList"></div>').appendTo(container);
			let detail = $('<div class="creationMissionDetail"></div>').appendTo(container);
			list.forEach(function(mission)
			{
				$('<div class="creationMissionItem"></div>').text(mission.name).appendTo(listBox).on("click", function()
				{
					listBox.children().removeClass("creationItemSelected");
					$(this).addClass("creationItemSelected");
					_showMissionDetail(detail, mission);
				});
			});
		});
	};

	let _showMissionDetail = function(detail, mission, campaign)
	{
		let planet = PlanetCatalog.find(function(p) { return p.id == mission.planetId; });
		let site = planet ? planet.sites.find(function(s) { return s.id == mission.siteId; }) : null;
		detail.empty();
		detail.append($('<h3></h3>').text(mission.name));
		detail.append($('<p class="creationMissionBriefing"></p>').text(mission.briefing));
		detail.append($('<p></p>').text(TextRepository.get("MissionPlace").replace("%p", planet ? planet.name : mission.planetId).replace("%s", site ? site.name : mission.siteId)));
		let objectives = $('<ul class="creationMissionObjectives"></ul>').appendTo(detail);
		if(mission.objectives.length == 0)
		{
			objectives.append($('<li></li>').text(TextRepository.get("NoObjectivesShort")));
		}
		mission.objectives.forEach(function(objective)
		{
			objectives.append($('<li></li>').text(TextRepository.get("Objective_" + objective.type) + _paramsText(objective)));
		});
		if(mission.turnLimit > 0)
		{
			detail.append($('<p></p>').text(TextRepository.get("MissionTurnLimit").replace("%s", mission.turnLimit)));
		}
		$('<div class="creationButton"></div>').text(TextRepository.get("StartGame")).appendTo(detail).on("click", function()
		{
			options.onStartMission(mission, campaign || null);
		});
	};

	/** elenco delle campagne e scheda di quella scelta, con le missioni vinte, disponibili e bloccate */
	let _showCampaigns = function(container)
	{
		container.empty().append($('<p></p>').text(TextRepository.get("MissionsLoading")));
		Promise.all([Campaigns.list(), Missions.list()]).then(function(lists)
		{
			let campaigns = lists[0];
			let missions = lists[1];
			container.empty();
			if(campaigns.length == 0)
			{
				container.append($('<p></p>').text(TextRepository.get("NoCampaigns")));
				return;
			}
			let listBox = $('<div class="creationMissionList"></div>').appendTo(container);
			let detail = $('<div class="creationMissionDetail"></div>').appendTo(container);
			campaigns.forEach(function(campaign)
			{
				$('<div class="creationMissionItem"></div>').text(campaign.name).appendTo(listBox).on("click", function()
				{
					listBox.children().removeClass("creationItemSelected");
					$(this).addClass("creationItemSelected");
					_showCampaignDetail(detail, campaign, missions);
				});
			});
		});
	};

	let _showCampaignDetail = function(detail, campaign, missions)
	{
		let won = CampaignProgress.won(campaign.id);
		detail.empty();
		detail.append($('<h3></h3>').text(campaign.name));
		detail.append($('<p class="creationMissionBriefing"></p>').text(campaign.briefing));
		let list = $('<div></div>').appendTo(detail);
		let missionDetail = $('<div class="creationCampaignMission"></div>').appendTo(detail);
		campaign.missions.forEach(function(id, index)
		{
			let mission = missions.find(function(m) { return m.id == id; });
			let unlocked = Campaign.isUnlocked(campaign, index, won);
			let mark = (won.indexOf(id) >= 0) ? "\u2713 " : (unlocked ? "\u25B6 " : "\uD83D\uDD12 ");
			let item = $('<div class="creationMissionItem"></div>').text(mark + (index + 1) + ". " + (mission ? mission.name : id)).appendTo(list);
			if(!mission || !unlocked)
			{
				item.addClass("creationMissionLocked");
				item.attr("title", mission ? TextRepository.get("CampaignLocked") : TextRepository.get("CampaignMissingMission"));
				return;
			}
			item.on("click", function()
			{
				list.children().removeClass("creationItemSelected");
				item.addClass("creationItemSelected");
				_showMissionDetail(missionDetail, mission, campaign);
			});
		});
	};

	/** parametri di un obiettivo, se diversi dai valori predefiniti */
	let _paramsText = function(objective)
	{
		let p = objective.params || {};
		let parts = [];
		if(p.population) { parts.push(p.population + " " + TextRepository.get("MissionParam_colonists")); }
		if(p.turns) { parts.push(p.turns + " " + TextRepository.get("TimeUnitTurns")); }
		if(p.points) { parts.push(p.points + " " + TextRepository.get("MissionParam_points")); }
		return parts.length ? " (" + parts.join(", ") + ")" : "";
	};

	let _show = function(showOptions)
	{
		options = showOptions;
		root = $("#creationScreen");
		_build();
		root.show();
	};

	let _hide = function()
	{
		$("#creationScreen").hide();
	};

	//-----------------------------------------

	this.show = _show;
	this.hide = _hide;
	this.selectPlanet = function(planetId) { _showSites(PlanetCatalog.find(function(p) { return p.id == planetId; })); };

	//-----------------------------------------
}

// singleton
let GameCreationView = new GameCreationViewConstructor();

export { GameCreationView };
