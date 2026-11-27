"use strict";

import { StructureTypes } from "./Enums.js";

/**
 * Lancio della navicella dallo Spazioporto (obiettivo "Lancio della navicella").
 *
 *   Launch.check(map)   -> { ok } | { ok: false, reason, missing }
 *   Launch.perform(map) -> idem; se possibile consuma i componenti e registra il lancio
 *
 * Serve uno Spazioporto costruito (anche a riposo) e un esemplare di ogni componente.
 */
let LaunchReason = {
	NoSpacePort: "noSpacePort",
	MissingParts: "missingParts"
};

function LaunchConstructor()
{
	const SHIP_PARTS = { shipHull: 1, shipEngine: 1, shipFuel: 1 };

	let _check = function(map)
	{
		let state = map.getState();
		let spacePort = map.getStructure().some(function(el)
		{
			return el.getType() == StructureTypes.Building && el.getBuildingType() == "SpacePort" && el.isOperative();
		});
		if(!spacePort)
		{
			return { ok: false, reason: LaunchReason.NoSpacePort, missing: [] };
		}
		let missing = Object.keys(SHIP_PARTS).filter(function(name) { return state.getStored(name) < SHIP_PARTS[name]; });
		if(missing.length > 0)
		{
			return { ok: false, reason: LaunchReason.MissingParts, missing: missing };
		}
		return { ok: true };
	};

	let _perform = function(map)
	{
		let result = _check(map);
		if(result.ok)
		{
			let state = map.getState();
			state.destroyMaterials(SHIP_PARTS);
			state.addShipLaunched();
		}
		return result;
	};

	this.SHIP_PARTS = SHIP_PARTS;
	this.check = _check;
	this.perform = _perform;
}

// singleton
let Launch = new LaunchConstructor();

export { Launch, LaunchReason };
