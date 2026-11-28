"use strict";

import { StructureTypes, TerrainLayer, Typology } from "./Enums.js";

/**
 * Eventi della colonia: fatti imprevisti che la colpiscono (vedi GLOSSARY.md, sezione Eventi).
 *
 * Configurazione (per partita): { epidemic: { enabled, ...parametri }, earthquake: {...}, sandstorm: {...} }
 *   Events.normalize(config)       configurazione completa: i tipi mancanti sono spenti, i parametri mancanti predefiniti
 *   Events.freeGame(enabled)       configurazione della partita libera: { epidemic: true, ... } con i parametri predefiniti
 *   Events.canHappen(type, typology)  il tipo di evento può avvenire su questo tipo di pianeta
 *
 * Stato in corso (ColonyState.getEvents()):
 *   { config, earthquake: { turns, intensity } | null, sandstorm: { turns } | null, epidemic: bool }
 *
 * EventPhase è la prima fase del turno: nella proiezione spegne gli edifici fermati dagli eventi in corso
 * (Tempesta di sabbia: Impianti a Microonde); nell'applicazione fa durare e finire gli eventi in corso e ne
 * fa scoppiare di nuovi. I Nidi alieni si piazzano con la mappa (Events.placeNests); NestPhase, dopo la
 * manutenzione, fa scoppiare l'epidemia quando si completa una costruzione vicino a un Nido non contenuto.
 * Il contagio dell'epidemia avviene nella fase della malattia (Epidemic.spread).
 */
const EVENT_TYPES = ["epidemic", "earthquake", "sandstorm"];

const EVENT_DEFAULTS = {
	// Nidi: quota delle caselle del sottosuolo; costruire entro "radius" caselle da un Nido non contenuto
	// fa scoppiare l'epidemia con "probability"
	epidemic: { rate: 0.001, radius: 2, probability: 0.25 },
	earthquake: { probability: 0.01, minTurn: 30, minDuration: 1, maxDuration: 3, minIntensity: 1, maxIntensity: 3 },
	sandstorm: { probability: 0.02, minTurn: 20, minDuration: 2, maxDuration: 4 }
};

/** tipi di pianeta su cui l'evento può avvenire (null: tutti) */
const EVENT_PLANETS = {
	epidemic: [Typology.Jungle],
	earthquake: [Typology.Vulcanic],
	sandstorm: [Typology.Desert]
};

const EARTHQUAKE_DAMAGE = 50;		// integrità persa a turno per punto di intensità (5% di 1000)
const EARTHQUAKE_DESTROY = 0.02;	// probabilità di distruzione a turno per punto di intensità
const SANDSTORM_DAMAGE = 10;		// integrità persa a turno dagli edifici di superficie (1%)
const SANDSTORM_STOPS = ["MicrowavePlant"];
const EPIDEMIC_START = 0.01;		// coloni nati che si ammalano alla comparsa di un Nido
const CONTAINMENT = "ContainmentStructure";
const RESPONSE_CORE = "EpidemicResponseCore";
const VACCINE = "Vaccine";

let _random = function(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); };

let Events = {
	TYPES: EVENT_TYPES,
	DEFAULTS: EVENT_DEFAULTS,
	PLANETS: EVENT_PLANETS,

	normalize: function(config)
	{
		let result = {};
		config = config || {};
		EVENT_TYPES.forEach(function(type)
		{
			let source = config[type] || {};
			result[type] = Object.assign({}, EVENT_DEFAULTS[type], source, { enabled: !!source.enabled });
		});
		return result;
	},

	freeGame: function(enabled)
	{
		let config = {};
		EVENT_TYPES.forEach(function(type) { config[type] = { enabled: !enabled || enabled[type] !== false }; });
		return Events.normalize(config);
	},

	canHappen: function(type, typology)
	{
		return EVENT_PLANETS[type] === null || EVENT_PLANETS[type].indexOf(typology) >= 0;
	},

	/** stato iniziale degli eventi: tutti spenti (le partite salvate prima degli eventi restano così) */
	emptyState: function(config)
	{
		return { config: Events.normalize(config), earthquake: null, sandstorm: null, epidemic: false };
	},

	/** Nidi alieni nascosti nel sottosuolo, se l'epidemia è attiva e il pianeta lo prevede; restituisce quanti */
	placeNests: function(map)
	{
		let config = map.getState().getEvents().config.epidemic;
		if(!config.enabled || !Events.canHappen("epidemic", map.getTypology()))
		{
			return 0;
		}
		let size = map.getSize();
		let count = Math.round(size.x * size.y * config.rate);
		let placed = 0;
		for(let attempt = 0; placed < count && attempt < count * 20; attempt++)
		{
			let position = { x: Math.floor(Math.random() * size.x), y: Math.floor(Math.random() * size.y) };
			if(map.findResource(position, TerrainLayer.Underground) == null && map.findBuilding(position, TerrainLayer.Underground) == null)
			{
				map.addResource("AlienNest", position);
				placed++;
			}
		}
		return placed;
	},

	/** edifici fermati in questo turno dagli eventi in corso */
	stoppedTypes: function(state)
	{
		return state.getEvents().sandstorm ? SANDSTORM_STOPS.slice() : [];
	}
};

//-----------------------------------------------------------------------------
// epidemia

/** i coloni nati vivi (i cloni sono immuni) */
let _colonists = function(state)
{
	return state.getPopulation().registry.filter(function(generation) { return !generation.isClone() && generation.getPopulation() > 0; });
};

let Epidemic = {
	/** fa ammalare fino a count coloni sani, scelti a caso; restituisce quanti */
	infect: function(state, count)
	{
		let lots = [];
		_colonists(state).forEach(function(generation) { generation.getLots().forEach(function(lot) { lots.push(lot); }); });
		let healthy = lots.reduce(function(n, lot) { return n + lot.getHealthy(); }, 0);
		let done = 0;
		while(done < count && healthy > 0)
		{
			let pick = Math.random() * healthy;
			for(let i = 0; i < lots.length; i++)
			{
				if(pick < lots[i].getHealthy())
				{
					lots[i].fallIll(1);
					break;
				}
				pick -= lots[i].getHealthy();
			}
			healthy--;
			done++;
		}
		return done;
	},

	/** l'1% dei coloni nati (almeno 1) si ammala: alla comparsa di un Nido */
	outbreak: function(state)
	{
		let born = _colonists(state).reduce(function(n, generation) { return n + generation.getPopulation(); }, 0);
		return (born > 0) ? Epidemic.infect(state, Math.max(1, Math.ceil(born * EPIDEMIC_START))) : 0;
	},

	/**
	 * Contagio di fine turno, dopo cure, guarigioni e morti: ogni malato infetta un sano (ogni 2 malati con un
	 * Nucleo di risposta epidemie attivo). Il Vaccino ferma il contagio; senza più malati l'epidemia finisce.
	 */
	spread: function(ctx)
	{
		let state = ctx.state;
		let events = state.getEvents();
		if(!events.epidemic)
		{
			return;
		}
		if(state.isCompletedKnowledge(VACCINE))
		{
			events.epidemic = false;
			ctx.events.push({ type: "EPIDEMIC_VACCINE" });
			return;
		}
		let sick = _colonists(state).reduce(function(n, generation) { return n + generation.getSick(); }, 0);
		if(sick == 0)
		{
			events.epidemic = false;
			ctx.events.push({ type: "EPIDEMIC_END" });
			return;
		}
		let core = (state.getActiveList()[RESPONSE_CORE] || []).length > 0;
		let infected = Epidemic.infect(state, core ? Math.floor(sick / 2) : sick);
		if(infected > 0)
		{
			ctx.events.push({ type: "EPIDEMIC_SPREAD", count: infected });
		}
	}
};

//-----------------------------------------------------------------------------
// fase degli eventi

/** danneggia gli edifici (principali e tubi): chi arriva a zero è distrutto */
let _damage = function(ctx, buildings, amount, destroyChance)
{
	let destroyed = 0;
	buildings.forEach(function(building)
	{
		if(building.isDestroyed() || building.getFrozen())
		{
			return;
		}
		let pipe = building.getBuildingType().indexOf("Pipe_") == 0;
		let headquarter = building.getBuildingType() == "LandingModule" || building.getBuildingType() == "CommandCenter";
		// tubi e Headquarter non crollano: si danneggiano soltanto
		let collapse = destroyChance > 0 && !pipe && !headquarter && Math.random() < destroyChance;
		if(building.damage(collapse ? building.getIntegrity() : amount) <= 0)
		{
			building.destroy();
			ctx.state.addToDestroyedList(building);
			ctx.map.onBuildingDestroyed(building);
			destroyed++;
		}
	});
	return destroyed;
};

/** edifici principali (non le parti delle strutture composite) */
let _buildings = function(map, layer)
{
	return map.getStructure().filter(function(el)
	{
		return el.getType() == StructureTypes.Building && (!layer || el.getLayer() == layer) && el.getMainBuilding() === el;
	});
};

let EventPhase = {
	/** gli eventi in corso fermano alcuni edifici (vedi BuildingProductionPhase) */
	project: function(ctx)
	{
		ctx.stoppedTypes = Events.stoppedTypes(ctx.state);
	},

	apply: function(ctx)
	{
		let state = ctx.state;
		let map = ctx.map;
		let events = state.getEvents();
		let config = events.config;
		let typology = map.getTypology();
		let date = state.getDate();

		// terremoto
		if(events.earthquake === null && config.earthquake.enabled && Events.canHappen("earthquake", typology) &&
			date >= config.earthquake.minTurn && Math.random() < config.earthquake.probability)
		{
			events.earthquake = {
				turns: _random(config.earthquake.minDuration, config.earthquake.maxDuration),
				intensity: _random(config.earthquake.minIntensity, config.earthquake.maxIntensity)
			};
			ctx.events.push({ type: "EARTHQUAKE", count: events.earthquake.intensity });
		}
		if(events.earthquake !== null)
		{
			let intensity = events.earthquake.intensity;
			let destroyed = _damage(ctx, _buildings(map), EARTHQUAKE_DAMAGE * intensity, EARTHQUAKE_DESTROY * intensity);
			if(destroyed > 0)
			{
				ctx.events.push({ type: "EARTHQUAKE_DESTROYED", count: destroyed });
			}
			if(--events.earthquake.turns <= 0)
			{
				events.earthquake = null;
				ctx.events.push({ type: "EARTHQUAKE_END" });
			}
		}

		// tempesta di sabbia
		if(events.sandstorm === null && config.sandstorm.enabled && Events.canHappen("sandstorm", typology) &&
			date >= config.sandstorm.minTurn && Math.random() < config.sandstorm.probability)
		{
			events.sandstorm = { turns: _random(config.sandstorm.minDuration, config.sandstorm.maxDuration) };
			ctx.events.push({ type: "SANDSTORM", count: events.sandstorm.turns });
		}
		if(events.sandstorm !== null)
		{
			_damage(ctx, _buildings(map, TerrainLayer.Surface), SANDSTORM_DAMAGE, 0);
			if(--events.sandstorm.turns <= 0)
			{
				events.sandstorm = null;
				ctx.events.push({ type: "SANDSTORM_END" });
			}
		}
	}
};

/**
 * Epidemia dalla costruzione: ogni edificio o tubo completato nel sottosuolo entro "radius" caselle da un Nido
 * non contenuto (senza Struttura di contenimento attiva) la fa scoppiare con "probability"; il Nido, se ancora
 * nascosto, viene scoperto. Dopo il Vaccino i Nidi non fanno più scoppiare epidemie.
 */
let NestPhase = {
	apply: function(ctx)
	{
		let state = ctx.state;
		let config = state.getEvents().config.epidemic;
		let completed = (ctx.completed || []).filter(function(b) { return b.getLayer() == TerrainLayer.Underground; });
		if(!config.enabled || completed.length == 0 || state.isCompletedKnowledge(VACCINE))
		{
			return;
		}
		let contained = new Set((state.getActiveList()[CONTAINMENT] || []).map(function(b) { return b.getPosition().x + "," + b.getPosition().y; }));
		let nests = ctx.map.getStructure().filter(function(el)
		{
			return el.getType() == StructureTypes.Resource && el.getResourceType() == "AlienNest" && !contained.has(el.getPosition().x + "," + el.getPosition().y);
		});
		let r2 = config.radius * config.radius;
		for(let i = 0; i < completed.length; i++)
		{
			let p = completed[i].getPosition();
			let nest = nests.find(function(n) { let q = n.getPosition(); return (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y) <= r2; });
			if(nest !== undefined && Math.random() < config.probability)
			{
				NestPhase.outbreak(ctx, nest);
				return;
			}
		}
	},

	/** scoppia l'epidemia dal Nido: lo si scopre e si ammala l'1% dei coloni nati */
	outbreak: function(ctx, nest)
	{
		let state = ctx.state;
		ctx.map.discoveryTile(nest.getPosition(), TerrainLayer.Underground);
		state.addKnowledge({ discovery: ["Alien_Nest"] });
		state.getEvents().epidemic = true;
		ctx.events.push({ type: "EPIDEMIC", count: Epidemic.outbreak(state), position: nest.getPosition() });
	}
};

export { Events, Epidemic, EventPhase, NestPhase, EVENT_TYPES };
