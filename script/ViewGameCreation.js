"use strict";

import { PlanetCatalog, PlanetTypes, catalogImageId } from "./DataPlanets.js";
import { Site } from "./GameSetup.js";
import { ImagesLib } from "./ImagesLib.js";
import { TextRepository } from "./TextRepository.js";

/**
 * Schermata di Creazione della partita: scelta del pianeta, poi del sito; in alternativa
 * ripresa della partita salvata.
 *
 * GameCreationView.show({ canResume, onStart(site, objectives), onResume() })
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
