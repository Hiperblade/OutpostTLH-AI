"use strict";

import { StructureTypes } from "./Enums.js";
import { BuildingGraph } from "./PipeNetwork.js";
import { PrototypeLib } from "./PrototypeLib.js";

/**
 * Risveglio delle capsule criogeniche, su richiesta del giocatore.
 *
 *   Revival.check(map, count)   -> { ok } | { ok: false, reason }   verifica sulla proiezione del turno
 *   Revival.request(map, count) -> idem; se possibile prenota il risveglio per il turno in corso
 *
 * In caso di rifiuto, detail indica l'edificio responsabile: { building, status, missing }
 *   status "missing": non costruito; "building": in costruzione; "inactive": fermo, missing = cosa gli manca.
 * Il risveglio avviene a fine turno (RevivalPhase), nei limiti della capacità dei Centri Criogenici.
 * Per risvegliare servono un Centro Criogenico attivo, capsule e, per tutti i coloni svegli più i
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

	const HOUSING = ["Residential", "ResidentialAdv"];
	const FOOD = ["Agridome", "AgridomeAdv", "AgridomeIntensive", "VerticalFarm", "VerticalFarmAdv"];
	const HABITAT = ["EnvironmentalControl", "EnvironmentalControlAdv"];
	const CRYO = ["CryoCenter"];

	/** perché gli edifici di questi tipi non forniscono abbastanza: mancanti, in costruzione o fermi */
	let _diagnose = function(map, types)
	{
		let state = map.getState();
		let buildings = map.getStructure().filter(function(el)
		{
			return el.getType() == StructureTypes.Building && types.indexOf(el.getBuildingType()) >= 0 && !el.isDestroyed();
		});
		if(buildings.length == 0)
		{
			return { building: types[0], status: "missing", missing: [] };
		}
		let inactive = [];
		types.forEach(function(type) { inactive = inactive.concat(state.getInactiveList()[type] || []); });
		if(inactive.length > 0)
		{
			let prototype = PrototypeLib.get(inactive[0].getBuildingType());
			let cost = Object.assign({}, prototype.getConsumption());
			if(prototype.getStaff() > 0)
			{
				cost.workerLabor = (cost.workerLabor || 0) + prototype.getStaff();
			}
			let missing = Object.keys(cost).filter(function(name) { return state.getRemainder(name) < cost[name]; });
			return { building: inactive[0].getBuildingType(), status: "inactive", missing: missing };
		}
		let pending = buildings.filter(function(el) { return el.underConstruction(); });
		if(pending.length > 0 && pending.length == buildings.length)
		{
			return { building: pending[0].getBuildingType(), status: "building", missing: [] };
		}
		return null;
	};

	let _fail = function(reason, detail) { return { ok: false, reason: reason, detail: detail || null }; };

	let _check = function(map, count)
	{
		count = count || GROUP;
		let state = map.getState();
		let pending = state.getPendingRevival();
		// prima il centro: è lui che prepara le capsule
		if((state.getActiveList()["CryoCenter"] || []).length == 0)
		{
			return _fail(RevivalReason.NoCryoCenter, _diagnose(map, CRYO));
		}
		if(state.getStored("cryoCapsule") - pending < count)
		{
			return _fail(RevivalReason.NoCapsules);
		}
		let awake = state.getPopulation().registry.reduce(function(n, generation) { return n + generation.getPopulation(); }, 0);
		let people = awake + pending + count;
		if(state.getRemainder("foodUnit") < people)
		{
			return _fail(RevivalReason.NotEnoughFood, _diagnose(map, FOOD));
		}
		if(state.getRemainder("residentialUnit") < people)
		{
			return _fail(RevivalReason.NotEnoughHousing, _diagnose(map, HOUSING));
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
			return _fail(RevivalReason.NotEnoughHabitat, _diagnose(map, HABITAT));
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
