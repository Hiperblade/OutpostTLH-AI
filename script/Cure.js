"use strict";

import { PrototypeLib } from "./PrototypeLib.js";

/**
 * Cura dei coloni malati, su richiesta del giocatore o automatica.
 *
 *   Cure.capacity(state)   cure possibili in un turno: la somma di "cures" delle Strutture Mediche attive
 *   Cure.sick(state)       coloni malati (i cloni non si ammalano)
 *   Cure.available(state)  cure eseguibili ora: il minimo tra malati, Kit Medici e capacità
 *   Cure.check(map)        -> { ok, count } | { ok: false, reason }   verifica sulla proiezione del turno
 *   Cure.request(map)      -> idem; se possibile prenota il massimo di cure per questo turno
 *
 * Ogni cura consuma un Kit Medico; le cure avvengono a fine turno (IllnessPhase).
 */
let CureReason = {
	NoSick: "noSick",
	NoMedicalStructure: "noMedicalStructure",
	NoMediKit: "noMediKit",
	AllScheduled: "allScheduled"
};

function CureConstructor()
{
	let _capacity = function(state)
	{
		let active = state.getActiveList();
		return Object.keys(active).reduce(function(n, buildingType)
		{
			let prototype = PrototypeLib.get(buildingType);
			return n + ((prototype == undefined) ? 0 : prototype.getCures() * active[buildingType].length);
		}, 0);
	};

	let _sick = function(state)
	{
		return state.getPopulation().registry.reduce(function(n, generation)
		{
			return n + (generation.isClone() ? 0 : generation.getSick());
		}, 0);
	};

	let _available = function(state)
	{
		return Math.max(0, Math.min(_sick(state), state.getStored("mediKit"), _capacity(state)));
	};

	let _check = function(map)
	{
		let state = map.getState();
		if(_sick(state) == 0)
		{
			return { ok: false, reason: CureReason.NoSick };
		}
		if(_capacity(state) == 0)
		{
			return { ok: false, reason: CureReason.NoMedicalStructure };
		}
		if(state.getStored("mediKit") <= 0)
		{
			return { ok: false, reason: CureReason.NoMediKit };
		}
		let count = _available(state) - state.getPendingCures();
		if(count <= 0)
		{
			return { ok: false, reason: CureReason.AllScheduled };
		}
		return { ok: true, count: count };
	};

	let _request = function(map)
	{
		let result = _check(map);
		if(result.ok)
		{
			let state = map.getState();
			state.setPendingCures(_available(state));
		}
		return result;
	};

	this.capacity = _capacity;
	this.sick = _sick;
	this.available = _available;
	this.check = _check;
	this.request = _request;
}

// singleton
let Cure = new CureConstructor();

export { Cure, CureReason };
