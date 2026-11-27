"use strict";

/**
 * Campagne: sequenze ordinate di missioni, descritte da file JSON in data/campaigns/ (elencati in index.json).
 *
 * Formato: { "id": "pionieri", "name": "Pionieri", "briefing": "...", "missions": ["primo-atterraggio", ...] }
 *
 * La prima missione è subito disponibile, ognuna delle successive si sblocca vincendo la precedente.
 * L'avanzamento (missioni vinte giocandole dalla campagna) si conserva nel browser, separato dalla
 * partita salvata.
 *
 *   Campaign.normalize(data)
 *   Campaign.isUnlocked(campaign, index, won)   true se la missione in posizione index è giocabile
 *   Campaigns.list()                            -> Promise<Array<campagna>> nell'ordine di index.json
 *   CampaignProgress.won(campaignId)            missioni vinte della campagna
 *   CampaignProgress.markWon(campaignId, missionId)
 */
const BASE_PATH = "data/campaigns/";
const PROGRESS_KEY = "outposttlh-campaigns";

let Campaign = {
	normalize: function(data)
	{
		return {
			id: data.id,
			name: data.name || data.id,
			briefing: data.briefing || "",
			missions: (data.missions || []).slice()
		};
	},

	isUnlocked: function(campaign, index, won)
	{
		return index == 0 || won.indexOf(campaign.missions[index - 1]) >= 0;
	},

	/** missione che segue missionId nella campagna, o null se è l'ultima */
	next: function(campaign, missionId)
	{
		let index = campaign.missions.indexOf(missionId);
		return (index >= 0 && index + 1 < campaign.missions.length) ? campaign.missions[index + 1] : null;
	}
};

let Campaigns = {
	list: function()
	{
		return fetch(BASE_PATH + "index.json", { cache: "no-store" })
			.then(function(response) { return response.ok ? response.json() : { campaigns: [] }; })
			.then(function(index)
			{
				return Promise.all((index.campaigns || []).map(function(id)
				{
					return fetch(BASE_PATH + id + ".json", { cache: "no-store" })
						.then(function(response) { return response.ok ? response.json() : null; })
						.catch(function() { return null; });
				}));
			})
			.then(function(list) { return list.filter(function(c) { return c != null; }).map(Campaign.normalize); })
			.catch(function() { return []; });
	}
};

let CampaignProgress = {
	_read: function()
	{
		try { return JSON.parse(window.localStorage.getItem(PROGRESS_KEY)) || {}; } catch(e) { return {}; }
	},

	won: function(campaignId)
	{
		return (CampaignProgress._read()[campaignId] || []).slice();
	},

	markWon: function(campaignId, missionId)
	{
		let progress = CampaignProgress._read();
		let list = progress[campaignId] || [];
		if(list.indexOf(missionId) < 0)
		{
			list.push(missionId);
		}
		progress[campaignId] = list;
		try { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch(e) { /* archivio non disponibile */ }
	}
};

export { Campaign, Campaigns, CampaignProgress };
