"use strict";

/**
 * Editor delle campagne (sezione "Campagne" di editor.html): nome, presentazione e missioni in ordine,
 * scelte tra quelle dell'editor delle missioni. Si salvano nella cartella data/campaigns (Chrome, Edge)
 * con index.json, oppure si esportano e importano come file.
 */

import { Campaign, Campaigns } from "./Campaign.js";

let campaigns = [];		// { data, savedId, dirty }
let current = -1;
let folder = null;
let removedIds = [];
let active = false;		// sezione Campagne visibile

let escape = function(text) { return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };
let slug = function(text)
{
	return String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "campagna";
};
/** missioni disponibili nell'editor delle missioni */
let missionList = function() { return window.editor ? window.editor.getMissions().map(function(entry) { return entry.data; }) : []; };
let missionName = function(id) { let m = missionList().find(function(x) { return x.id == id; }); return m ? m.name : id; };

let warnings = function(c)
{
	let list = [];
	let known = missionList().map(function(m) { return m.id; });
	if(c.missions.length == 0) { list.push("La campagna non ha missioni."); }
	c.missions.forEach(function(id)
	{
		if(known.indexOf(id) < 0) { list.push("La missione “" + id + "” non esiste in data/missions."); }
	});
	if(new Set(c.missions).size != c.missions.length) { list.push("Una missione compare più volte."); }
	return list;
};

// ---------------------------------------------------------------- sezioni Missioni / Campagne

let setMode = function(campaignMode)
{
	active = campaignMode;
	$("#campaignSide").toggle(campaignMode);
	$("#missionSide").toggle(!campaignMode);
	$("#modeCampaigns").toggleClass("primary", campaignMode);
	$("#modeMissions").toggleClass("primary", !campaignMode);
	if(campaignMode) { render(); } else { $("#missionList .item.selected").trigger("click"); }
};
$("#modeMissions").on("click", function() { setMode(false); });
$("#modeCampaigns").on("click", function() { setMode(true); });

// ---------------------------------------------------------------- elenco e scheda

let renderList = function()
{
	let box = $("#campaignList").empty();
	campaigns.forEach(function(entry, i)
	{
		$('<div class="item"></div>').toggleClass("selected", i == current)
			.html(escape(entry.data.name) + (entry.dirty ? ' <span class="dirty">●</span>' : ''))
			.attr("title", entry.data.id).appendTo(box).on("click", function() { current = i; render(); });
	});
	$("#campaignFolderStatus").text(folder ? "Cartella aperta: le modifiche si salvano nei file." :
		(window.showDirectoryPicker ? "Campagne del server in sola lettura: apri la cartella data/campaigns per salvarle." : "Questo browser non apre le cartelle: usa Esporta e Importa."));
};

let render = function()
{
	if(!active) { return; }
	renderList();
	let form = $("#form").empty();
	if(current < 0 || current >= campaigns.length)
	{
		form.append("<p>Nessuna campagna selezionata.</p>");
		return;
	}
	let c = campaigns[current].data;
	let changed = function() { campaigns[current].dirty = true; renderList(); renderWarnings(); };

	form.append('<h3>Campagna</h3>');
	let idRow = $('<div class="row"></div>').appendTo(form);
	$('<label>Nome <input type="text" size="40"></label>').appendTo(idRow).find("input").val(c.name).on("input", function()
	{
		let auto = (c.id == slug(c.name));
		c.name = this.value;
		if(auto) { c.id = slug(c.name); $("#campaignId").val(c.id); }
		changed();
	});
	$('<label>File <input type="text" id="campaignId" size="28"></label>').appendTo(idRow).find("input").val(c.id).on("input", function() { c.id = slug(this.value); changed(); });
	$('<div class="row"><label style="display:block">Presentazione</label><textarea></textarea></div>').appendTo(form).find("textarea").val(c.briefing).on("input", function() { c.briefing = this.value; changed(); });

	form.append('<h3>Missioni, nell\'ordine di gioco</h3>');
	let list = $('<div></div>').appendTo(form);
	c.missions.forEach(function(id, i)
	{
		let row = $('<div class="row objective"></div>').appendTo(list);
		row.append($('<span></span>').text((i + 1) + ". " + missionName(id) + " "));
		$('<span class="tool">Su</span>').appendTo(row).on("click", function() { if(i > 0) { c.missions.splice(i - 1, 0, c.missions.splice(i, 1)[0]); changed(); render(); } });
		$('<span class="tool">Giù</span>').appendTo(row).on("click", function() { if(i < c.missions.length - 1) { c.missions.splice(i + 1, 0, c.missions.splice(i, 1)[0]); changed(); render(); } });
		$('<span class="tool">Togli</span>').appendTo(row).on("click", function() { c.missions.splice(i, 1); changed(); render(); });
	});
	let addRow = $('<div class="row"></div>').appendTo(form);
	let select = $('<select></select>').appendTo($('<label>Aggiungi </label>').appendTo(addRow));
	missionList().forEach(function(m) { select.append($('<option></option>').val(m.id).text(m.name)); });
	$('<span class="tool">Aggiungi missione</span>').appendTo(addRow).on("click", function()
	{
		if(select.val()) { c.missions.push(select.val()); changed(); render(); }
	});

	form.append('<h3>Avvisi</h3><div id="warnings"></div>');
	renderWarnings();
};

let renderWarnings = function()
{
	let box = $("#warnings").empty();
	if(current < 0) { return; }
	let list = warnings(campaigns[current].data);
	if(list.length == 0) { box.append('<div class="ok">Nessun problema trovato.</div>'); }
	list.forEach(function(text) { box.append($('<div></div>').text("⚠ " + text)); });
};

// ---------------------------------------------------------------- comandi dell'elenco

let uniqueId = function(id)
{
	let result = id, n = 2;
	while(campaigns.some(function(e, i) { return i != current && e.data.id == result; })) { result = id + "-" + n++; }
	return result;
};

$("#newCampaign").on("click", function()
{
	campaigns.push({ data: Campaign.normalize({ id: "nuova-campagna", name: "Nuova campagna", missions: [] }), savedId: null, dirty: true });
	current = campaigns.length - 1;
	campaigns[current].data.id = uniqueId(campaigns[current].data.id);
	render();
});
$("#duplicateCampaign").on("click", function()
{
	if(current < 0) { return; }
	let copy = Campaign.normalize(JSON.parse(JSON.stringify(campaigns[current].data)));
	copy.name += " (copia)";
	campaigns.splice(current + 1, 0, { data: copy, savedId: null, dirty: true });
	current++;
	copy.id = uniqueId(slug(copy.name));
	render();
});
$("#deleteCampaign").on("click", function()
{
	if(current < 0 || !window.confirm("Eliminare la campagna “" + campaigns[current].data.name + "”? Con la cartella aperta il file viene cancellato al prossimo salvataggio.")) { return; }
	if(campaigns[current].savedId) { removedIds.push(campaigns[current].savedId); }
	campaigns.splice(current, 1);
	current = Math.min(current, campaigns.length - 1);
	render();
});
let move = function(delta)
{
	let target = current + delta;
	if(current < 0 || target < 0 || target >= campaigns.length) { return; }
	let item = campaigns.splice(current, 1)[0];
	campaigns.splice(target, 0, item);
	current = target;
	item.dirty = true;
	render();
};
$("#campaignUp").on("click", function() { move(-1); });
$("#campaignDown").on("click", function() { move(1); });

// ---------------------------------------------------------------- file

let readJson = async function(dir, file) { return JSON.parse(await (await (await dir.getFileHandle(file)).getFile()).text()); };
let writeJson = async function(dir, file, data)
{
	let stream = await (await dir.getFileHandle(file, { create: true })).createWritable();
	await stream.write(JSON.stringify(data, null, "\t") + "\n");
	await stream.close();
};

$("#openCampaignFolder").on("click", async function()
{
	if(!window.showDirectoryPicker)
	{
		window.alert("Questo browser non permette di aprire le cartelle: usa Esporta e Importa (oppure Chrome o Edge).");
		return;
	}
	try
	{
		let dir = await window.showDirectoryPicker({ mode: "readwrite" });
		let index;
		try { index = await readJson(dir, "index.json"); }
		catch(e)
		{
			if(!window.confirm("La cartella non contiene index.json. Usarla comunque come cartella delle campagne?")) { return; }
			index = { campaigns: [] };
		}
		let loaded = [];
		for(let id of (index.campaigns || []))
		{
			try { loaded.push({ data: Campaign.normalize(await readJson(dir, id + ".json")), savedId: id, dirty: false }); }
			catch(e) { window.alert("Impossibile leggere " + id + ".json: viene saltata."); }
		}
		folder = dir;
		campaigns = loaded;
		removedIds = [];
		current = campaigns.length ? 0 : -1;
		render();
	}
	catch(e)
	{
		if(e.name != "AbortError") { window.alert("Errore nell'apertura della cartella: " + e.message); }
	}
});

$("#saveCampaign").on("click", async function()
{
	if(!folder)
	{
		window.alert("Apri prima la cartella data/campaigns (Chrome, Edge), oppure usa Esporta.");
		return;
	}
	try
	{
		for(let entry of campaigns)
		{
			if(!entry.dirty) { continue; }
			await writeJson(folder, entry.data.id + ".json", entry.data);
			if(entry.savedId && entry.savedId != entry.data.id) { removedIds.push(entry.savedId); }
			entry.savedId = entry.data.id;
			entry.dirty = false;
		}
		for(let id of removedIds)
		{
			if(!campaigns.some(function(e) { return e.data.id == id; }))
			{
				try { await folder.removeEntry(id + ".json"); } catch(e) { /* già assente */ }
			}
		}
		removedIds = [];
		await writeJson(folder, "index.json", { campaigns: campaigns.map(function(e) { return e.data.id; }) });
		render();
		$("#campaignFolderStatus").text("Salvato: " + campaigns.length + " campagne e index.json.");
	}
	catch(e)
	{
		window.alert("Errore nel salvataggio: " + e.message);
	}
});

$("#exportCampaign").on("click", function()
{
	if(current < 0) { return; }
	let c = campaigns[current].data;
	let link = document.createElement("a");
	link.href = URL.createObjectURL(new Blob([JSON.stringify(c, null, "\t") + "\n"], { type: "application/json" }));
	link.download = c.id + ".json";
	link.click();
	URL.revokeObjectURL(link.href);
});
$("#importCampaign").on("click", function() { $("#importCampaignFile").val("").trigger("click"); });
$("#importCampaignFile").on("change", async function()
{
	let file = this.files[0];
	if(!file) { return; }
	try
	{
		let data = Campaign.normalize(JSON.parse(await file.text()));
		campaigns.push({ data: data, savedId: null, dirty: true });
		current = campaigns.length - 1;
		data.id = uniqueId(data.id || slug(data.name));
		render();
	}
	catch(e)
	{
		window.alert("File non valido: " + e.message);
	}
});

window.addEventListener("beforeunload", function(e)
{
	if(folder && campaigns.some(function(entry) { return entry.dirty; })) { e.preventDefault(); e.returnValue = ""; }
});

// campagne del server, in sola lettura finché non si apre la cartella
Campaigns.list().then(function(list)
{
	if(folder) { return; }
	campaigns = list.map(function(c) { return { data: c, savedId: c.id, dirty: false }; });
	current = campaigns.length ? 0 : -1;
	render();
});

window.campaignEditor = { getCampaigns: function() { return campaigns; }, warnings: warnings, setMode: setMode };
