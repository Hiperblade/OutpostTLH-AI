"use strict";

import { StructureTypes } from "./Enums.js";

/**
 * Orbite e satelliti (vedi GLOSSARY.md: Orbita, Satellite, Silos di Lancio).
 *
 * Stato (ColonyState.getOrbits()): { capacity: { microwave, observation }, satellites: [{ type, life }], launches: { date, count } }
 *   life = turni che restano al satellite
 *
 *   Orbit.TYPES                           tipi di satellite: orbita, durata, giacimenti che mostrano
 *   Orbit.emptyState(capacity)            orbite vuote con i posti indicati (predefiniti ORBIT_CAPACITY)
 *   Orbit.count(state, orbit|type)        satelliti in un'orbita (o di un tipo)
 *   Orbit.room(state, orbit)              posti liberi in un'orbita
 *   Orbit.put(state, type)                mette in orbita un satellite a durata piena, se c'è posto (true/false)
 *   Orbit.detected(state)                 tipi di giacimento rilevati dai satelliti in orbita: { Metal: true, ... }
 *   Orbit.launchesLeft(state)             lanci ancora possibili in questo turno (uno per Silos attivo)
 *   Orbit.checkLaunch(state, type) / Orbit.launch(state, type)
 *                                         -> { ok } | { ok: false, reason }; il lancio consuma il satellite in magazzino
 *   Orbit.useLaunch(state)                registra un lancio (anche quello del Modulo d'Atterraggio Automatizzato)
 *   OrbitPhase                            fase del turno: i satelliti invecchiano, avvisano e si esauriscono
 */
const ORBIT_CAPACITY = { microwave: 3, observation: 3 };
const ORBITS = Object.keys(ORBIT_CAPACITY);

const SATELLITE_TYPES = {
	MicrowaveSatellite: { orbit: "microwave", life: 100, detects: [] },
	MiningSatellite: { orbit: "observation", life: 80, detects: ["Metal", "Mineral"] },
	MiningSatelliteAdv: { orbit: "observation", life: 80, detects: ["Radioactive"] },
	ThermalSatelliteAdv: { orbit: "observation", life: 80, detects: ["Fumarole"] }
};
const EXPIRY_WARNING = 5;		// turni di preavviso prima che un satellite si esaurisca
const SILO = "LaunchSilo";

let LaunchReason = {
	NoSilo: "noSilo",
	NoLaunch: "noLaunch",
	NoSatellite: "noSatellite",
	OrbitFull: "orbitFull"
};

let Orbit = {
	TYPES: SATELLITE_TYPES,
	ORBITS: ORBITS,
	CAPACITY: ORBIT_CAPACITY,
	EXPIRY_WARNING: EXPIRY_WARNING,

	emptyState: function(capacity)
	{
		return { capacity: Object.assign({}, ORBIT_CAPACITY, capacity || {}), satellites: [], launches: { date: -1, count: 0 } };
	},

	count: function(state, key)
	{
		return state.getOrbits().satellites.filter(function(s) { return s.type == key || SATELLITE_TYPES[s.type].orbit == key; }).length;
	},

	room: function(state, orbit)
	{
		return Math.max(0, state.getOrbits().capacity[orbit] - Orbit.count(state, orbit));
	},

	put: function(state, type)
	{
		if(SATELLITE_TYPES[type] === undefined || Orbit.room(state, SATELLITE_TYPES[type].orbit) <= 0)
		{
			return false;
		}
		state.getOrbits().satellites.push({ type: type, life: SATELLITE_TYPES[type].life });
		return true;
	},

	detected: function(state)
	{
		let result = {};
		state.getOrbits().satellites.forEach(function(s) { SATELLITE_TYPES[s.type].detects.forEach(function(r) { result[r] = true; }); });
		return result;
	},

	/** Silos attivi in questo turno (secondo l'ultima proiezione) */
	silos: function(state)
	{
		return (state.getActiveList()[SILO] || []).length;
	},

	launchesLeft: function(state)
	{
		let launches = state.getOrbits().launches;
		let used = (launches.date == state.getDate()) ? launches.count : 0;
		return Math.max(0, Orbit.silos(state) - used);
	},

	useLaunch: function(state)
	{
		let launches = state.getOrbits().launches;
		if(launches.date != state.getDate())
		{
			launches.date = state.getDate();
			launches.count = 0;
		}
		launches.count++;
	},

	checkLaunch: function(state, type)
	{
		if(Orbit.silos(state) == 0)
		{
			return { ok: false, reason: LaunchReason.NoSilo };
		}
		if(Orbit.launchesLeft(state) <= 0)
		{
			return { ok: false, reason: LaunchReason.NoLaunch };
		}
		if(state.getStored(type) < 1)
		{
			return { ok: false, reason: LaunchReason.NoSatellite };
		}
		if(SATELLITE_TYPES[type] !== undefined && Orbit.room(state, SATELLITE_TYPES[type].orbit) <= 0)
		{
			return { ok: false, reason: LaunchReason.OrbitFull };
		}
		return { ok: true };
	},

	launch: function(state, type)
	{
		let result = Orbit.checkLaunch(state, type);
		if(result.ok)
		{
			state.destroyMaterials({ [type]: 1 });
			Orbit.put(state, type);
			Orbit.useLaunch(state);
		}
		return result;
	}
};

/** i satelliti invecchiano di un turno: avviso EXPIRY_WARNING turni prima, poi si esauriscono e liberano il posto */
let OrbitPhase = {
	apply: function(ctx)
	{
		let orbits = ctx.state.getOrbits();
		let expiring = {}, expired = {};
		orbits.satellites.forEach(function(s)
		{
			s.life--;
			if(s.life == EXPIRY_WARNING) { expiring[s.type] = (expiring[s.type] || 0) + 1; }
			if(s.life <= 0) { expired[s.type] = (expired[s.type] || 0) + 1; }
		});
		orbits.satellites = orbits.satellites.filter(function(s) { return s.life > 0; });
		Object.keys(expiring).forEach(function(type) { ctx.events.push({ type: "SATELLITE_EXPIRING", name: type, count: expiring[type] }); });
		Object.keys(expired).forEach(function(type) { ctx.events.push({ type: "SATELLITE_EXPIRED", name: type, count: expired[type] }); });
	}
};

const KNOWN_RADIUS = 10;	// caselle: in superficie un giacimento è conosciuto vicino a un edificio della colonia

/**
 * Giacimenti da mostrare sulla minimappa: quelli conosciuti (nel sottosuolo e in profondità con la casella
 * rivelata, in superficie entro KNOWN_RADIUS caselle da un edificio) e quelli rilevati dai satelliti in orbita.
 * I Nidi alieni si vedono solo se conosciuti.
 */
let visibleDeposits = function(map)
{
	let detected = Orbit.detected(map.getState());
	let buildings = map.getStructure().filter(function(el) { return el.getType() == StructureTypes.Building; }).map(function(el) { return el.getPosition(); });
	let r2 = KNOWN_RADIUS * KNOWN_RADIUS;
	return map.getStructure().filter(function(el)
	{
		if(el.getType() != StructureTypes.Resource)
		{
			return false;
		}
		let p = el.getPosition();
		let known = (el.getLayer() == "surface")
			? buildings.some(function(b) { return (b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y) <= r2; })
			: map.isVisible(p, el.getLayer());
		return known || !!detected[el.getResourceType()];
	});
};

/** Impianti a Microonde costruiti (per dare un satellite a quelli delle partite salvate prima delle orbite) */
let microwavePlants = function(map)
{
	return map.getStructure().filter(function(el)
	{
		return el.getType() == StructureTypes.Building && el.getBuildingType() == "MicrowavePlant" && !el.isDestroyed();
	}).length;
};

export { Orbit, OrbitPhase, LaunchReason as OrbitLaunchReason, SATELLITE_TYPES, microwavePlants, visibleDeposits };
