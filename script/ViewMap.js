"use strict";

import { StructureTypes } from "./Enums.js";
import { TextRepository } from "./TextRepository.js";

/** segnalatori delle risorse: forma e colore per tipo (la forma aiuta chi distingue male i colori) */
const RESOURCE_MARKERS = {
	Metal: { shape: "circle", color: "#1EA7FF" },
	Mineral: { shape: "diamond", color: "#FF3EDB" },
	Radioactive: { shape: "triangle", color: "#7CFF00" },
	Fumarole: { shape: "square", color: "#FF8C00" }
};
const MARKER_SIZE = 4;
const ZONE_RADIUS = 15;		// caselle (1 casella = 1 pixel della minimappa)
const ZONE_STEP = 3;		// passo della ricerca dei centri delle zone
const OPTIONS_KEY = "outposttlh-minimap";

/**
 * Minimappa: foto del sito, edifici, segnalatori delle risorse e area visibile.
 * Due pulsanti accanto alla minimappa: mostra/nascondi i segnalatori e modalità analisi (segnalatori di
 * tutti gli strati e cerchi sulle zone che hanno vicino almeno una risorsa di ogni tipo presente).
 * Le scelte restano nel browser tra una partita e l'altra.
 * @param {CanvasImageSource} backgroundImage immagine del sito
 */
function MapView(map, canvasId, backgroundImage, areaSize, onChangePosition)
{
	let canvasMap = document.getElementById(canvasId);
	let ctx = canvasMap.getContext("2d");
	let position = { x: 0, y: 0 };
	let findResources = {};
	let options = { markers: true, analysis: false };
	let zonesCache = null;	// { key, zones }

	let _initialize = function()
	{
		canvasMap.width = 300;
		canvasMap.height = 150;
		canvasMap.addEventListener("mousedown", _doMouseDown, false);
		try { options = Object.assign(options, JSON.parse(window.localStorage.getItem(OPTIONS_KEY)) || {}); } catch(e) { /* predefinite */ }
		_bindTools();
	};

	/** pulsanti accanto alla minimappa */
	let _bindTools = function()
	{
		let markers = document.getElementById("mapMarkers");
		let analysis = document.getElementById("mapAnalysis");
		if(markers == null || analysis == null)
		{
			return;
		}
		let legend = Object.keys(RESOURCE_MARKERS).map(function(type)
		{
			return { circle: "\u25CF", diamond: "\u25C6", triangle: "\u25B2", square: "\u25A0" }[RESOURCE_MARKERS[type].shape] + " " + TextRepository.get("Resource_" + type);
		}).join("\n");
		markers.title = TextRepository.get("MapMarkersHint") + "\n\n" + legend;
		analysis.title = TextRepository.get("MapAnalysisHint") + "\n\n" + legend;
		markers.onclick = function() { options.markers = !options.markers; _saveOptions(); _redraw(); };
		analysis.onclick = function() { options.analysis = !options.analysis; _saveOptions(); _redraw(); };
		_refreshTools();
	};

	let _refreshTools = function()
	{
		let markers = document.getElementById("mapMarkers");
		let analysis = document.getElementById("mapAnalysis");
		if(markers) { markers.classList.toggle("mapToolOn", options.markers); }
		if(analysis) { analysis.classList.toggle("mapToolOn", options.analysis); }
	};

	let _saveOptions = function()
	{
		try { window.localStorage.setItem(OPTIONS_KEY, JSON.stringify(options)); } catch(e) { /* archivio non disponibile */ }
		_refreshTools();
	};

	let _doMouseDown = function(e)
	{
		if(onChangePosition != null)
		{
			let newPosition = _fromScreenPosition({ x: e.pageX, y: e.pageY });
			onChangePosition(newPosition);
		}
	};

	let _redraw = function()
	{
		findResources = {};
		let knowledge = map.getState().getTheory();
		for(let know = 0; know < knowledge.length; know++)
		{
			if(knowledge[know].indexOf("Find_") == 0)
			{
				findResources[knowledge[know].substr(5)] = true;
			}
		}

		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		ctx.beginPath();
		ctx.drawImage(backgroundImage, 0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.closePath();
		ctx.fill();

		let structure = map.getStructure();
		for(let i = 0; i < structure.length; i++)
		{
			if(structure[i].getType() == StructureTypes.Building)
			{
				_drawBuilding(structure[i].getPosition(), structure[i]);
			}
		}
		if(options.analysis)
		{
			_drawZones();
		}
		if(options.markers || options.analysis)
		{
			structure.forEach(function(el)
			{
				if(el.getType() == StructureTypes.Resource)
				{
					_drawResource(el.getPosition(), el);
				}
			});
		}

		_drawActiveArea();
		_refreshTools();
	};

	let _setPosition = function(point)
	{
		position = point;
		_redraw();
	};

	let _drawActiveArea = function()
	{
		let point = _toScreenPosition(position);
		ctx.lineWidth = 1;
		ctx.strokeStyle = "lime";
		ctx.strokeRect(point.x - 1, point.y - areaSize.x - 1, areaSize.y + 2, areaSize.x + 2);
	};

	/** segnalatore pieno con contorno scuro; in analisi si vedono quelli di tutti gli strati */
	let _drawResource = function(position, resource)
	{
		if(!findResources[resource.getResourceType()])
		{
			return;
		}
		if(!options.analysis && resource.getLayer() != map.getLayer())
		{
			return;
		}
		if(map.findBuilding(position, resource.getLayer()) != null)
		{
			return;
		}
		let style = RESOURCE_MARKERS[resource.getResourceType()] || { shape: "circle", color: resource.getColor() };
		let p = _toScreenPosition(position);
		let r = MARKER_SIZE;
		ctx.beginPath();
		switch(style.shape)
		{
			case "diamond":
				ctx.moveTo(p.x, p.y - r - 1); ctx.lineTo(p.x + r + 1, p.y); ctx.lineTo(p.x, p.y + r + 1); ctx.lineTo(p.x - r - 1, p.y);
				break;
			case "triangle":
				ctx.moveTo(p.x, p.y - r - 1); ctx.lineTo(p.x + r + 1, p.y + r); ctx.lineTo(p.x - r - 1, p.y + r);
				break;
			case "square":
				ctx.rect(p.x - r, p.y - r, r * 2, r * 2);
				break;
			default:
				ctx.arc(p.x, p.y, r, 0, Math.PI * 2, false);
		}
		ctx.closePath();
		ctx.fillStyle = style.color;
		ctx.fill();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "#000";
		ctx.stroke();
	};

	/**
	 * Zone ricche: centri con almeno una risorsa di ogni tipo presente sul pianeta (tra quelli che la
	 * colonia sa cercare) entro ZONE_RADIUS caselle; si scelgono prima i centri con più risorse vicine,
	 * senza che un centro cada dentro un cerchio già scelto.
	 */
	let _zones = function()
	{
		let resources = map.getStructure().filter(function(el)
		{
			return el.getType() == StructureTypes.Resource && findResources[el.getResourceType()];
		});
		let types = Array.from(new Set(resources.map(function(r) { return r.getResourceType(); })));
		let key = types.join(",") + "|" + resources.length;
		if(zonesCache !== null && zonesCache.key == key)
		{
			return zonesCache.zones;
		}
		let size = map.getSize();
		let candidates = [];
		for(let x = 0; x < size.x; x += ZONE_STEP)
		{
			for(let y = 0; y < size.y; y += ZONE_STEP)
			{
				let found = {}, count = 0;
				resources.forEach(function(r)
				{
					let p = r.getPosition();
					if((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) <= ZONE_RADIUS * ZONE_RADIUS)
					{
						found[r.getResourceType()] = true;
						count++;
					}
				});
				if(types.length > 0 && types.every(function(t) { return found[t]; }))
				{
					candidates.push({ x: x, y: y, count: count });
				}
			}
		}
		candidates.sort(function(a, b) { return b.count - a.count; });
		let zones = [];
		candidates.forEach(function(c)
		{
			if(zones.every(function(z) { return (z.x - c.x) * (z.x - c.x) + (z.y - c.y) * (z.y - c.y) > ZONE_RADIUS * ZONE_RADIUS; }))
			{
				zones.push(c);
			}
		});
		zonesCache = { key: key, zones: zones };
		return zones;
	};

	let _drawZones = function()
	{
		_zones().forEach(function(zone)
		{
			let p = _toScreenPosition(zone);
			ctx.beginPath();
			ctx.arc(p.x, p.y, ZONE_RADIUS, 0, Math.PI * 2, false);
			ctx.lineWidth = 4;
			ctx.strokeStyle = "rgba(255,255,255,0.6)";	// alone per le foto scure
			ctx.stroke();
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#000";
			ctx.stroke();
		});
	};

	let _drawBuilding = function(position, building)
	{
		if(building.getLayer() == map.getLayer()
			/*&& building.isPipe()*/)
		{
			let point = _toScreenPosition(position);
			ctx.lineWidth = 1;
			ctx.strokeStyle = "#00FFFF";
			ctx.strokeRect(point.x, point.y, 1, 1);
		}
	};

	let _fromScreenPosition = function(point)
	{
		let currentLeft = 0, currentTop = 0;
		let obj = ctx.canvas;
		if (obj.offsetParent)
		{
			do
			{
				currentLeft += obj.offsetLeft;
				currentTop += obj.offsetTop;
			}
			while (obj = obj.offsetParent);
		}
		return { x: 150 - (point.y - currentTop), y: point.x - currentLeft };
	};

	let _toScreenPosition = function(point)
	{
		return { x: 0 + point.y, y: 150 - point.x };
	};

	_initialize();

	//-----------------------------------------

	this.getPosition = function(){ return position; };
	this.getZones = function() { return _zones(); };

	this.setPosition = _setPosition;
	this.redraw = _redraw;
	this.fromScreenPosition = _fromScreenPosition;

	//-----------------------------------------
}

export { MapView };
