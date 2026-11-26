"use strict";

import { GenerationState } from "./Generations.js";
import { TextRepository } from "./TextRepository.js";
import { RobotWearPhase } from "./Turn.js";

/**
 * Riepilogo della colonia, in alto a sinistra sulla mappa: turno, coloni, condizioni di vita,
 * manodopera e stato dei RoboWorker. Si aggiorna a ogni ridisegno.
 */
function ColonySummaryView(elementId, map)
{
	let element = document.getElementById(elementId);

	let _percent = function(value) { return Math.round((value || 0) * 100) + "%"; };
	let _row = function(label, value, warning)
	{
		return '<div class="summaryRow"><span>' + label + '</span><span class="summaryValue' + (warning ? ' colorError' : '') + '">' + value + '</span></div>';
	};

	let _redraw = function()
	{
		let state = map.getState();
		let date = state.getDate();
		let population = state.getPopulation();
		let awake = 0, workers = 0, retirees = 0;
		population.registry.forEach(function(generation)
		{
			let n = generation.getPopulation();
			let phase = generation.getState(date);
			awake += n;
			if(phase == GenerationState.Scientists) { workers += n; }
			else if(phase == GenerationState.Retirees) { retirees += n; }
		});
		let capsules = state.getStored("cryoCapsule");
		let robots = state.getStored("roboWorker");
		RobotWearPhase.sync(state, "roboWorker");
		let wear = RobotWearPhase.averageWear(state, "roboWorker");
		let colonists = awake > 0;

		let text = '<div class="summaryTitle">' + TextRepository.get("Summary_turn").replace("%s", date) + '</div>';
		text += _row(TextRepository.get("Summary_colonists"), awake + (capsules > 0 ? " + " + capsules + " " + TextRepository.get("Summary_inCapsule") : ""), false);
		if(colonists)
		{
			text += _row(TextRepository.get("subsistence"), _percent(population.subsistence), population.subsistence < 1);
			text += _row(TextRepository.get("wellness"), _percent(population.wellness), population.wellness < 1);
			text += _row(TextRepository.get("happiness"), _percent(population.happiness), population.happiness < 0.75);
			text += _row(TextRepository.get("Summary_workers"), workers + (retirees > 0 ? " + " + retirees + " " + TextRepository.get("Summary_retirees") : ""), false);
		}
		text += _row(TextRepository.get("Summary_labor"), state.getStored("workerLabor") + " + " + state.getStored("roboLabor") + " " + TextRepository.get("Summary_robotic"), false);
		text += _row(TextRepository.get("roboWorker"), robots + " \u00B7 " + TextRepository.get("Summary_wear").replace("%s", _percent(wear)), wear >= 0.75);
		element.innerHTML = text;
	};

	this.redraw = _redraw;
}

export { ColonySummaryView };
