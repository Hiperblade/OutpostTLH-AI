"use strict";

import { TerrainMap } from "./TerrainMap.js";

/**
 * Salvataggio della partita in un unico slot del browser (localStorage).
 *   SaveGame.save(map, site)     salva lo stato completo
 *   SaveGame.load() -> { map, siteData } | null
 *   SaveGame.exists(), SaveGame.clear()
 */
function SaveGameConstructor()
{
	const KEY = "outposttlh-save";
	const VERSION = 1;

	let _storage = function()
	{
		try { return window.localStorage; } catch(e) { return null; }
	};

	let _save = function(map, site)
	{
		let storage = _storage();
		if(storage == null)
		{
			return false;
		}
		storage.setItem(KEY, JSON.stringify({ version: VERSION, site: site.toData(), map: map.toData() }));
		return true;
	};

	let _read = function()
	{
		let storage = _storage();
		let text = (storage == null) ? null : storage.getItem(KEY);
		if(text == null)
		{
			return null;
		}
		try
		{
			let data = JSON.parse(text);
			return (data.version === VERSION) ? data : null;
		}
		catch(e)
		{
			return null;
		}
	};

	let _load = function()
	{
		let data = _read();
		return (data == null) ? null : { map: TerrainMap.fromData(data.map), siteData: data.site };
	};

	this.save = _save;
	this.load = _load;
	this.exists = function() { return _read() != null; };
	this.clear = function() { let storage = _storage(); if(storage != null) { storage.removeItem(KEY); } };
}

// singleton
let SaveGame = new SaveGameConstructor();

export { SaveGame };
