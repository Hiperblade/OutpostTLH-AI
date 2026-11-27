"use strict";

/**
 * Missioni: partite preparate, descritte da file JSON in data/missions/ (elencati in index.json).
 *
 * Formato di una missione (tutti i campi tranne id, name, planetId e siteId sono facoltativi):
 * {
 *   "id": "primo-atterraggio",
 *   "name": "Primo atterraggio",
 *   "briefing": "Testo di presentazione",
 *   "planetId": "ignis", "siteId": "1",
 *   "objectives": [{ "type": "happyPopulation", "params": { "population": 50, "turns": 10 } }],
 *   "kit": { "roboWorker": 10, "dozer": 3, "digger": 1, "miner": 2, "MicrowaveSatellite": 1 },
 *   "stock": { "foodUnit": 100 },
 *   "completedResearch": ["Medicine"],
 *   "excludedResearch": ["Terraforming"],
 *   "excludedBuildings": ["Terraformer"],
 *   "turnLimit": 400
 * }
 *
 *   Mission.normalize(data)  missione con tutti i campi (valori predefiniti per quelli mancanti)
 *   Mission.KIT              contenuto predefinito del kit di atterraggio
 *   Missions.list()          -> Promise<Array<missione>> nell'ordine di index.json
 */
const KIT = { roboWorker: 10, dozer: 3, digger: 1, miner: 2, MicrowaveSatellite: 1 };
const BASE_PATH = "data/missions/";

let Mission = {
	KIT: KIT,

	normalize: function(data)
	{
		return {
			id: data.id,
			name: data.name || data.id,
			briefing: data.briefing || "",
			planetId: data.planetId,
			siteId: String(data.siteId),
			objectives: (data.objectives || []).map(function(o) { return { type: o.type, params: Object.assign({}, o.params || {}) }; }),
			kit: Object.assign({}, KIT, data.kit || {}),
			stock: Object.assign({}, data.stock || {}),
			completedResearch: (data.completedResearch || []).slice(),
			excludedResearch: (data.excludedResearch || []).slice(),
			excludedBuildings: (data.excludedBuildings || []).slice(),
			turnLimit: data.turnLimit || 0
		};
	}
};

let Missions = {
	/** le missioni elencate in index.json, già normalizzate; quelle che non si caricano vengono saltate */
	list: function()
	{
		return fetch(BASE_PATH + "index.json", { cache: "no-store" })
			.then(function(response) { return response.ok ? response.json() : { missions: [] }; })
			.then(function(index)
			{
				return Promise.all((index.missions || []).map(function(id)
				{
					return fetch(BASE_PATH + id + ".json", { cache: "no-store" })
						.then(function(response) { return response.ok ? response.json() : null; })
						.catch(function() { return null; });
				}));
			})
			.then(function(list) { return list.filter(function(m) { return m != null; }).map(Mission.normalize); })
			.catch(function() { return []; });
	}
};

export { Mission, Missions };
