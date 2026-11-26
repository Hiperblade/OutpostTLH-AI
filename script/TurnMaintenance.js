"use strict";

import { BuildingGraph } from "./PipeNetwork.js";

/**
 * Manutenzione: costo in repairUnit degli edifici collegati a un Headquarter, danni da incuria,
 * riparazioni, avanzamento dei cantieri. Gli edifici scollegati da ogni Headquarter decadono.
 */
let MaintenancePhase = (function()
{
	const REPAIR_COST = 10;		// repairUnit per edificio a turno
	const REPAIR_AMOUNT = 20;	// integrità recuperata a turno senza incuria
	const DAMAGE_VARIANCE = 6;
	const DISCONNECTED_DAMAGE = 100;
	const EMERGENCY_TEAM_REDUCTION = 0.25;	// riduzione dei danni da incuria per squadra di emergenza

	let _damageFor = function(neglectPercentage)
	{
		if(neglectPercentage < 20) { return 0; }
		if(neglectPercentage < 40) { return 10; }
		if(neglectPercentage < 80) { return 50; }
		return 100;
	};

	let _damageAll = function(ctx, graph, amount)
	{
		BuildingGraph.forEachBuilding(graph, function(building)
		{
			if(!building.isDestroyed())
			{
				if(building.damage(amount + Math.floor(Math.random() * DAMAGE_VARIANCE)) == 0)
				{
					ctx.state.addToDestroyedList(building);
					ctx.map.onBuildingDestroyed(building);
				}
			}
			else
			{
				ctx.state.addToDestroyedList(building);
			}
		});
	};

	return {
		/** @return {{neglect: number, emergencyTeams: number}} incuria in percentuale e squadre di emergenza impiegate */
		project: function(ctx)
		{
			let state = ctx.state;
			let buildingAmount = 0;
			ctx.networks.forEach(function(graph)
			{
				if(BuildingGraph.hasHeadquarter(graph))
				{
					buildingAmount += BuildingGraph.countAll(graph);
				}
			});

			let emergencyTeams = state.getRemainder("emergencyTeamUnit");
			if(emergencyTeams > 0)
			{
				state.delMaterials({ emergencyTeamUnit: emergencyTeams });
			}

			let costAmount = buildingAmount * REPAIR_COST;
			if(state.haveMaterials({ repairUnit: costAmount }))
			{
				state.delMaterials({ repairUnit: costAmount });
				return { neglect: 0, emergencyTeams: emergencyTeams };
			}
			let available = state.getRemainder("repairUnit");
			state.delMaterials({ repairUnit: available });
			return { neglect: ((costAmount - available) * 100) / costAmount, emergencyTeams: emergencyTeams };
		},

		apply: function(ctx, plan)
		{
			let reduction = Math.max(0, 1 - EMERGENCY_TEAM_REDUCTION * plan.emergencyTeams);
			let damageAmount = Math.round(_damageFor(plan.neglect) * reduction);
			let buildList = ctx.state.getBuildList();

			ctx.networks.forEach(function(graph)
			{
				if(!BuildingGraph.hasHeadquarter(graph))
				{
					_damageAll(ctx, graph, DISCONNECTED_DAMAGE);
					return;
				}

				if(damageAmount > 0)
				{
					_damageAll(ctx, graph, damageAmount);
				}
				else
				{
					BuildingGraph.forEachBuilding(graph, function(building) { building.reapair(REPAIR_AMOUNT); });
				}

				// vita degli edifici e avanzamento dei cantieri di questa rete
				BuildingGraph.forEachBuilding(graph, function(building)
				{
					building.progress();
					if(buildList.indexOf(building) >= 0 && building.progressBuild(ctx.state.getBuildPoints(building)))
					{
						ctx.map.onBuildingCompleted(building);
					}
				});
			});
		}
	};
})();

export { MaintenancePhase };
