"use strict";

import { RobotTypes } from "./Enums.js";
import { PrototypeLib } from "./PrototypeLib.js";

/**
 * Placement: regole per posizionare sulla mappa uno strumento scelto dal giocatore
 * (edificio, tubo, RoboDozer, RoboDigger, RoboMiner).
 *
 * Interfaccia:
 *   Placement.check(map, tool, point) -> PlacementResult   solo verifica, nessun effetto
 *   Placement.place(map, tool, point) -> PlacementResult   verifica e, se possibile, esegue
 *
 * tool: { buildingType } per edifici e tubi, { isRobot: true, robotType } per i robot.
 * PlacementResult: { ok: true } oppure { ok: false, reason: PlacementReason, data }
 * Le reason marcate come silenziose non vanno segnalate al giocatore (click senza effetto).
 */
let PlacementReason = {
	// silenziose
	NotVisible: "notVisible",
	Occupied: "occupied",
	NotApplicable: "notApplicable",
	Blocked: "blocked",
	// da segnalare
	NoDozer: "noDozer",
	NoDigger: "noDigger",
	NoMiner: "noMiner",
	NoExtractionTechnology: "noExtractionTechnology",
	NotRazed: "notRazed",
	NoResourceRequired: "noResourceRequired",
	RequiresResource: "requiresResource"
};

function PlacementConstructor()
{
	const SILENT = [PlacementReason.NotVisible, PlacementReason.Occupied, PlacementReason.NotApplicable, PlacementReason.Blocked];

	let _ok = function(action) { return { ok: true, action: action }; };
	let _fail = function(reason, data) { return { ok: false, reason: reason, data: data || {} }; };

	//-----------------------------------------
	// regole per strumento: restituiscono il risultato e, se ok, l'azione da eseguire

	let _dozer = function(map, point)
	{
		let state = map.getState();
		if(map.getRobot(point) != null)
		{
			return _fail(PlacementReason.Occupied);
		}
		let target = map.findBuilding(point);
		if(target == null && !map.isRazable(point))
		{
			return _fail(PlacementReason.NotApplicable);
		}
		if(state.getRoboDozerAvailable() <= 0)
		{
			return _fail(PlacementReason.NoDozer, { robotType: RobotTypes.Dozer });
		}
		return _ok(function()
		{
			state.useRoboDozer();
			if(target != null)
			{
				// demolizione dell'edificio
				if(!target.isDestroyed())
				{
					map.onBuildingDestroyed(target);
				}
				map.delBuilding(point);
			}
			map.addRoboDozer(point);
			return true;
		});
	};

	let _digger = function(map, point)
	{
		let state = map.getState();
		if(map.findBuilding(point) != null || map.getRobot(point) != null)
		{
			return _fail(PlacementReason.Occupied);
		}
		if(!map.isDiggable(point))
		{
			return _fail(PlacementReason.NotApplicable);
		}
		if(state.getRoboDiggerAvailable() <= 0)
		{
			return _fail(PlacementReason.NoDigger, { robotType: RobotTypes.Digger });
		}
		return _ok(function()
		{
			state.useRoboDigger();
			map.addRoboDigger(point);
			return true;
		});
	};

	let _miner = function(map, point)
	{
		let resource = map.findResource(point);
		if(resource == null)
		{
			return _fail(PlacementReason.NotApplicable);
		}
		let material = resource.getResourceType();
		if(!map.getState().checkKnowledge({ theory: ["Extraction_" + material] }))
		{
			return _fail(PlacementReason.NoExtractionTechnology, { resource: material });
		}
		if(map.isRazable(point))
		{
			return _fail(PlacementReason.NotRazed);
		}
		if(map.getState().getRoboMinerAvailable() <= 0)
		{
			return _fail(PlacementReason.NoMiner, { robotType: RobotTypes.Miner });
		}
		return _ok(function()
		{
			// il RoboMiner si consuma solo se la miniera viene posizionata
			if(map.addBuilding("Mine" + material, point) == null)
			{
				return false;
			}
			map.getState().useRoboMiner();
			return true;
		});
	};

	let _building = function(map, buildingType, point)
	{
		if(map.findBuilding(point) != null)
		{
			return _fail(PlacementReason.Occupied);
		}

		let prototype = PrototypeLib.get(buildingType);
		if(map.isRazable(point))
		{
			// solo il modulo di atterraggio può scendere su terreno non spianato
			if(buildingType != "LandingModule")
			{
				return _fail(PlacementReason.NotApplicable);
			}
		}
		else
		{
			let required = prototype.getRequiredResource();
			let resource = map.findResource(point);
			if(resource == null && required != null)
			{
				return _fail(PlacementReason.RequiresResource, { resource: required });
			}
			if(resource != null && required == null)
			{
				return _fail(PlacementReason.NoResourceRequired);
			}
			if(resource != null && resource.getResourceType() != required)
			{
				return _fail(PlacementReason.RequiresResource, { resource: required });
			}
		}

		if(!map.canPlaceBuilding(buildingType, point))
		{
			return _fail(PlacementReason.Blocked);
		}
		return _ok(function()
		{
			return map.addBuilding(buildingType, point) != null;
		});
	};

	//-----------------------------------------

	let _check = function(map, tool, point)
	{
		if(!map.isVisible(point))
		{
			return _fail(PlacementReason.NotVisible);
		}
		if(tool.isRobot)
		{
			switch(tool.robotType)
			{
				case RobotTypes.Dozer: return _dozer(map, point);
				case RobotTypes.Digger: return _digger(map, point);
				case RobotTypes.Miner: return _miner(map, point);
			}
			return _fail(PlacementReason.NotApplicable);
		}
		return _building(map, tool.buildingType, point);
	};

	let _place = function(map, tool, point)
	{
		let result = _check(map, tool, point);
		if(result.ok && !result.action())
		{
			return _fail(PlacementReason.Blocked);
		}
		return result;
	};

	//-----------------------------------------

	this.check = _check;
	this.place = _place;
	this.isSilent = function(result) { return result.ok || SILENT.indexOf(result.reason) >= 0; };
}

// singleton
let Placement = new PlacementConstructor();

export { PlacementReason, PlacementConstructor, Placement };
