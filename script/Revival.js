"use strict";

import { BuildingGraph } from "./PipeNetwork.js";

/**
 * Risveglio delle capsule criogeniche, su richiesta del giocatore.
 *
 *   Revival.check(map, count)   -> { ok } | { ok: false, reason }   verifica sulla proiezione del turno
 *   Revival.request(map, count) -> idem; se possibile prenota il risveglio per il turno in corso
 *
 * Il risveglio avviene a fine turno (RevivalPhase), nei limiti della capacità dei Centri Criogenici.
 * Per risvegliare servono capsule, un Centro Criogenico attivo e, per tutti i coloni svegli più i
 * nuovi, cibo, alloggi e habitat per ogni elemento collegato a un Headquarter.
 */
let RevivalReason = {
	NoCapsules: "noCapsules",
	NoCryoCenter: "noCryoCenter",
	NotEnoughFood: "notEnoughFood",
	NotEnoughHousing: "notEnoughHousing",
	NotEnoughHabitat: "notEnoughHabitat"
};

function RevivalConstructor()
{
	const GROUP = 5;

	let _fail = function(reason) { return { ok: false, reason: reason }; };

	let _check = function(map, count)
	{
		count = count || GROUP;
		let state = map.getState();
		let pending = state.getPendingRevival();
		if(state.getStored("cryoCapsule") - pending < count)
		{
			return _fail(RevivalReason.NoCapsules);
		}
		if((state.getActiveList()["CryoCenter"] || []).length == 0)
		{
			return _fail(RevivalReason.NoCryoCenter);
		}
		let awake = state.getPopulation().registry.reduce(function(n, generation) { return n + generation.getPopulation(); }, 0);
		let people = awake + pending + count;
		if(state.getRemainder("foodUnit") < people)
		{
			return _fail(RevivalReason.NotEnoughFood);
		}
		if(state.getRemainder("residentialUnit") < people)
		{
			return _fail(RevivalReason.NotEnoughHousing);
		}
		let pipes = 0;
		map.getGraph().forEach(function(graph)
		{
			if(BuildingGraph.hasHeadquarter(graph))
			{
				pipes += BuildingGraph.countPipes(graph);
			}
		});
		if(state.getRemainder("habitatUnit") < pipes)
		{
			return _fail(RevivalReason.NotEnoughHabitat);
		}
		return { ok: true };
	};

	let _request = function(map, count)
	{
		count = count || GROUP;
		let result = _check(map, count);
		if(result.ok)
		{
			let state = map.getState();
			state.setPendingRevival(state.getPendingRevival() + count);
		}
		return result;
	};

	this.check = _check;
	this.request = _request;
}

// singleton
let Revival = new RevivalConstructor();

export { Revival, RevivalReason };
