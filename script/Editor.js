"use strict";

/**
 * Editor delle missioni (editor.html).
 *
 * Con "Apri cartella missioni" (Chrome, Edge) l'editor legge data/missions e vi salva direttamente
 * le missioni e index.json; altrimenti mostra le missioni del server in sola lettura e permette di
 * esportare e importare singoli file. "Prova missione" apre il gioco con la missione in modifica,
 * passata tramite l'archivio del browser (la partita di prova non si salva).
 */

import { imagesList } from "./DataImagesLib.js";
import { PlanetCatalog } from "./DataPlanets.js";
import { LANDING_TECHNOLOGIES } from "./DataPrototype.js";
import { Site } from "./GameSetup.js";
import { ImagesLib } from "./ImagesLib.js";
import { Mission, Missions } from "./Mission.js";
import { RecipeLib, RecipeType } from "./RecipeLib.js";
import { TextRepository } from "./TextRepository.js";
import "./DataRecipe.js";
import "./DataText_it.js";

const TEST_MISSION_KEY = "outposttlh-test-mission";

const OBJECTIVES = [
	{ type: "happyPopulation", params: [
		{ key: "population", label: "coloni", value: 200 },
		{ key: "turns", label: "turni", value: 20 },
		{ key: "happiness", label: "felicità minima (0-1)", value: 0.75, step: 0.05 }] },
	{ type: "shipLaunch", params: [{ key: "ships", label: "navicelle", value: 1 }] },
	{ type: "superintelligence", params: [] },
	{ type: "terraforming", params: [{ key: "points", label: "punti", value: 300 }] }
];
const KIT_FIELDS = ["roboWorker", "dozer", "digger", "miner", "MicrowaveSatellite"];
const STOCK_MATERIALS = ["foodUnit", "ironBar", "metalOre", "mineralOre", "cristalOre", "radioactiveOre", "radioactiveBar",
	"pharmaceuticalUnit", "goodsUnit", "mediKit", "goods", "cryoCapsule", "shipHull", "shipEngine", "shipFuel"];

let missions = [];		// { data: missione normalizzata, savedId: id del file su disco (null se nuova), dirty }
let current = -1;
let folder = null;		// cartella data/missions (File System Access API)
let removedIds = [];	// file da eliminare al prossimo salvataggio

let name = function(id) { return TextRepository.get(id); };
let escape = function(text) { return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); };

// ---------------------------------------------------------------- catalogo di studi ed edifici

let studies = RecipeLib.getAll().filter(function(r) { return r.getRecipeType() == RecipeType.Research; })
	.sort(function(a, b) { return name(a.getName()).localeCompare(name(b.getName())); });

let buildings = (function()
{
	let set = new Set(LANDING_TECHNOLOGIES);
	studies.forEach(function(r) { (r.getResult().technology || []).forEach(function(t) { set.add(t); }); });
	return Array.from(set).sort(function(a, b) { return name(a).localeCompare(name(b)); });
})();

/** studi che producono una conoscenza (teoria o tecnologia) */
let producersOf = function(item)
{
	return studies.filter(function(r)
	{
		let result = r.getResult();
		return (result.theory || []).indexOf(item) >= 0 || (result.technology || []).indexOf(item) >= 0;
	}).map(function(r) { return r.getName(); });
};

// ---------------------------------------------------------------- avvisi di coerenza

let warnings = function(m)
{
	let list = [];
	let excludedStudy = function(id) { return m.excludedResearch.indexOf(id) >= 0 && m.completedResearch.indexOf(id) < 0; };
	let excludedBuilding = function(id) { return m.excludedBuildings.indexOf(id) >= 0; };
	if(!PlanetCatalog.some(function(p) { return p.id == m.planetId && p.sites.some(function(s) { return s.id == m.siteId; }); }))
	{
		list.push("Pianeta o sito non presenti nel catalogo.");
	}
	m.objectives.forEach(function(o)
	{
		if(o.type == "happyPopulation" && (excludedBuilding("Nursery") || excludedStudy("Embryology")))
		{
			list.push("Popolazione felice: senza Asilo (o Embriologia) non nascono coloni.");
		}
		if(o.type == "shipLaunch" && (excludedBuilding("SpacePort") || excludedStudy("QuantumPhysics")))
		{
			list.push("Navicella: servono lo Spazioporto e Fisica Quantistica.");
		}
		if(o.type == "superintelligence" && (excludedBuilding("Mainframe") ||
			["AI", "AdvancedNeuralNetworks", "ArtificialConsciousness", "Superintelligence"].some(excludedStudy)))
		{
			list.push("Superintelligenza: servono il Mainframe e gli studi da Intelligenza Artificiale a Superintelligenza.");
		}
		if(o.type == "terraforming" && ((excludedBuilding("Terraformer") && excludedBuilding("TerraformerAdv")) || excludedStudy("Terraforming")))
		{
			list.push("Terraformazione: servono almeno un tipo di Terraformatore e lo studio Terraformazione.");
		}
	});
	// studi già completati con un prerequisito impossibile da ottenere
	m.completedResearch.forEach(function(id)
	{
		let recipe = RecipeLib.get(id);
		if(recipe == undefined) { return; }
		let req = recipe.getRequirement();
		(req.theory || []).concat(req.technology || []).forEach(function(item)
		{
			let producers = producersOf(item);
			if(producers.length > 0 && producers.every(function(p) { return excludedStudy(p); }))
			{
				list.push("“" + name(id) + "” è già completato ma il suo prerequisito “" + name(item) + "” si ottiene solo da studi esclusi.");
			}
		});
	});
	if(m.excludedResearch.some(function(id) { return m.completedResearch.indexOf(id) >= 0; }))
	{
		list.push("Alcuni studi sono sia esclusi sia già completati.");
	}
	return list;
};

// ---------------------------------------------------------------- elenco

let renderList = function()
{
	let box = $("#missionList").empty();
	missions.forEach(function(entry, i)
	{
		$('<div class="item"></div>').toggleClass("selected", i == current)
			.html(escape(entry.data.name) + (entry.dirty ? ' <span class="dirty">●</span>' : ''))
			.attr("title", entry.data.id).appendTo(box).on("click", function() { current = i; render(); });
	});
	$("#folderStatus").text(folder ? "Cartella aperta: le modifiche si salvano nei file." :
		(window.showDirectoryPicker ? "Missioni del server in sola lettura: apri la cartella per salvarle." : "Questo browser non apre le cartelle: usa Esporta e Importa."));
};

// ---------------------------------------------------------------- scheda della missione

let render = function()
{
	renderList();
	let form = $("#form").empty();
	if(current < 0 || current >= missions.length)
	{
		form.append("<p>Nessuna missione selezionata.</p>");
		return;
	}
	let m = missions[current].data;
	let changed = function() { missions[current].dirty = true; renderList(); renderWarnings(); };

	// identità
	form.append('<h3>Missione</h3>');
	let idRow = $('<div class="row"></div>').appendTo(form);
	$('<label>Nome <input type="text" size="40"></label>').appendTo(idRow).find("input").val(m.name).on("input", function()
	{
		let auto = (m.id == slug(m.name));
		m.name = this.value;
		if(auto) { m.id = slug(m.name); $("#missionId").val(m.id); }
		changed();
	});
	$('<label>File <input type="text" id="missionId" size="28"></label>').appendTo(idRow).find("input").val(m.id).on("input", function() { m.id = slug(this.value); changed(); });
	$('<div class="row"><label style="display:block">Presentazione</label><textarea></textarea></div>').appendTo(form).find("textarea").val(m.briefing).on("input", function() { m.briefing = this.value; changed(); });

	// pianeta e sito
	form.append('<h3>Pianeta e sito</h3>');
	let placeRow = $('<div class="row"></div>').appendTo(form);
	let planetSelect = $('<select></select>').appendTo($('<label>Pianeta </label>').appendTo(placeRow));
	PlanetCatalog.forEach(function(p) { planetSelect.append($('<option></option>').val(p.id).text(p.name + " (" + name("Typology_" + p.typology) + ")")); });
	let siteSelect = $('<select></select>').appendTo($('<label>Sito </label>').appendTo(placeRow));
	let preview = $('<canvas id="sitePreview" width="300" height="150"></canvas>').appendTo(form);
	let fillSites = function()
	{
		let planet = PlanetCatalog.find(function(p) { return p.id == m.planetId; }) || PlanetCatalog[0];
		siteSelect.empty();
		planet.sites.forEach(function(s) { siteSelect.append($('<option></option>').val(s.id).text(s.name)); });
		if(!planet.sites.some(function(s) { return s.id == m.siteId; })) { m.siteId = planet.sites[0].id; }
		siteSelect.val(m.siteId);
		drawPreview(preview[0], m);
	};
	planetSelect.val(m.planetId).on("change", function() { m.planetId = this.value; fillSites(); changed(); });
	siteSelect.on("change", function() { m.siteId = this.value; drawPreview(preview[0], m); changed(); });
	fillSites();

	// obiettivi
	form.append('<h3>Obiettivi (nessuno: partita senza vittoria)</h3>');
	OBJECTIVES.forEach(function(def)
	{
		let box = $('<div class="objective"></div>').appendTo(form);
		let objective = m.objectives.find(function(o) { return o.type == def.type; });
		let check = $('<input type="checkbox">').prop("checked", !!objective);
		$('<label></label>').append(check).append(" " + escape(name("Objective_" + def.type))).appendTo(box);
		def.params.forEach(function(param)
		{
			let input = $('<input type="number" min="0">').attr("step", param.step || 1);
			input.val(objective && objective.params[param.key] !== undefined ? objective.params[param.key] : param.value);
			$('<label></label>').text(param.label + " ").append(input).appendTo(box);
			input.on("input", function()
			{
				let o = m.objectives.find(function(x) { return x.type == def.type; });
				if(o) { o.params[param.key] = Number(this.value); changed(); }
			});
		});
		check.on("change", function()
		{
			if(this.checked)
			{
				let params = {};
				box.find('input[type=number]').each(function(i) { params[def.params[i].key] = Number(this.value); });
				m.objectives.push({ type: def.type, params: params });
			}
			else
			{
				m.objectives = m.objectives.filter(function(o) { return o.type != def.type; });
			}
			changed();
		});
	});
	let limitRow = $('<div class="row"></div>').appendTo(form);
	$('<label>Limite di turni (0 = nessuno) <input type="number" min="0"></label>').appendTo(limitRow).find("input").val(m.turnLimit).on("input", function() { m.turnLimit = Number(this.value) || 0; changed(); });

	// condizioni iniziali: kit e scorte
	form.append('<h3>Kit di atterraggio</h3>');
	let kitRow = $('<div class="row"></div>').appendTo(form);
	KIT_FIELDS.forEach(function(key)
	{
		$('<label></label>').text(name(key) + " ").append($('<input type="number" min="0">').val(m.kit[key]).on("input", function() { m.kit[key] = Number(this.value) || 0; changed(); })).appendTo(kitRow);
	});
	form.append('<h3>Scorte iniziali</h3>');
	let stockBox = $('<div class="grid"></div>').appendTo(form);
	STOCK_MATERIALS.forEach(function(key)
	{
		$('<div class="entry"></div>').append($('<span></span>').text(name(key)))
			.append($('<input type="number" min="0">').val(m.stock[key] || 0).on("input", function()
			{
				let value = Number(this.value) || 0;
				if(value > 0) { m.stock[key] = value; } else { delete m.stock[key]; }
				changed();
			})).appendTo(stockBox);
	});

	// studi: normale, già completato, escluso
	form.append('<h3>Studi</h3>');
	let studyBox = $('<div class="grid"></div>').appendTo(form);
	studies.forEach(function(recipe)
	{
		let id = recipe.getName();
		let select = $('<select><option value="">normale</option><option value="done">già completato</option><option value="excluded">escluso</option></select>');
		select.val(m.completedResearch.indexOf(id) >= 0 ? "done" : (m.excludedResearch.indexOf(id) >= 0 ? "excluded" : ""));
		select.on("change", function()
		{
			m.completedResearch = m.completedResearch.filter(function(x) { return x != id; });
			m.excludedResearch = m.excludedResearch.filter(function(x) { return x != id; });
			if(this.value == "done") { m.completedResearch.push(id); }
			if(this.value == "excluded") { m.excludedResearch.push(id); }
			changed();
		});
		$('<div class="entry"></div>').append($('<span></span>').text(name(id))).append(select).appendTo(studyBox);
	});

	// edifici esclusi
	form.append('<h3>Edifici esclusi</h3>');
	let buildingBox = $('<div class="grid"></div>').appendTo(form);
	buildings.forEach(function(id)
	{
		let check = $('<input type="checkbox">').prop("checked", m.excludedBuildings.indexOf(id) >= 0).on("change", function()
		{
			m.excludedBuildings = m.excludedBuildings.filter(function(x) { return x != id; });
			if(this.checked) { m.excludedBuildings.push(id); }
			changed();
		});
		$('<label class="entry"></label>').append($('<span></span>').text(name(id))).append(check).appendTo(buildingBox);
	});

	form.append('<h3>Avvisi</h3><div id="warnings"></div>');
	renderWarnings();
};

let renderWarnings = function()
{
	let box = $("#warnings").empty();
	if(current < 0) { return; }
	let list = warnings(missions[current].data);
	if(list.length == 0) { box.append('<div class="ok">Nessun problema trovato.</div>'); }
	list.forEach(function(text) { box.append($('<div></div>').text("⚠ " + text)); });
};

let drawPreview = function(canvas, m)
{
	let ctx = canvas.getContext("2d");
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	try { ctx.drawImage(new Site(m.planetId, m.siteId).getBackground(), 0, 0, canvas.width, canvas.height); } catch(e) { /* immagine non ancora caricata */ }
};

let slug = function(text)
{
	return String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "missione";
};

// ---------------------------------------------------------------- comandi dell'elenco

let blank = function()
{
	return Mission.normalize({ id: "nuova-missione", name: "Nuova missione", planetId: PlanetCatalog[0].id, siteId: PlanetCatalog[0].sites[0].id,
		objectives: [{ type: "happyPopulation", params: {} }] });
};

let uniqueId = function(id)
{
	let result = id, n = 2;
	while(missions.some(function(e, i) { return i != current && e.data.id == result; })) { result = id + "-" + n++; }
	return result;
};

$("#newMission").on("click", function()
{
	missions.push({ data: blank(), savedId: null, dirty: true });
	current = missions.length - 1;
	missions[current].data.id = uniqueId(missions[current].data.id);
	render();
});
$("#duplicateMission").on("click", function()
{
	if(current < 0) { return; }
	let copy = Mission.normalize(JSON.parse(JSON.stringify(missions[current].data)));
	copy.name += " (copia)";
	missions.splice(current + 1, 0, { data: copy, savedId: null, dirty: true });
	current++;
	copy.id = uniqueId(slug(copy.name));
	render();
});
$("#deleteMission").on("click", function()
{
	if(current < 0 || !window.confirm("Eliminare la missione “" + missions[current].data.name + "”? Con la cartella aperta il file viene cancellato al prossimo salvataggio.")) { return; }
	if(missions[current].savedId) { removedIds.push(missions[current].savedId); }
	missions.splice(current, 1);
	current = Math.min(current, missions.length - 1);
	render();
});
let move = function(delta)
{
	let target = current + delta;
	if(current < 0 || target < 0 || target >= missions.length) { return; }
	let item = missions.splice(current, 1)[0];
	missions.splice(target, 0, item);
	current = target;
	item.dirty = true;	// cambia l'ordine nell'indice
	render();
};
$("#moveUp").on("click", function() { move(-1); });
$("#moveDown").on("click", function() { move(1); });

// ---------------------------------------------------------------- file: cartella, esporta, importa

let readJson = async function(dir, file)
{
	let handle = await dir.getFileHandle(file);
	return JSON.parse(await (await handle.getFile()).text());
};

let writeJson = async function(dir, file, data)
{
	let handle = await dir.getFileHandle(file, { create: true });
	let stream = await handle.createWritable();
	await stream.write(JSON.stringify(data, null, "\t") + "\n");
	await stream.close();
};

$("#openFolder").on("click", async function()
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
			if(!window.confirm("La cartella non contiene index.json. Usarla comunque come cartella delle missioni?")) { return; }
			index = { missions: [] };
		}
		let loaded = [];
		for(let id of (index.missions || []))
		{
			try { loaded.push({ data: Mission.normalize(await readJson(dir, id + ".json")), savedId: id, dirty: false }); }
			catch(e) { window.alert("Impossibile leggere " + id + ".json: viene saltata."); }
		}
		folder = dir;
		missions = loaded;
		removedIds = [];
		current = missions.length ? 0 : -1;
		render();
	}
	catch(e)
	{
		if(e.name != "AbortError") { window.alert("Errore nell'apertura della cartella: " + e.message); }
	}
});

$("#saveMission").on("click", async function()
{
	if(!folder)
	{
		window.alert("Apri prima la cartella data/missions (Chrome, Edge), oppure usa Esporta.");
		return;
	}
	try
	{
		for(let entry of missions)
		{
			if(!entry.dirty) { continue; }
			await writeJson(folder, entry.data.id + ".json", entry.data);
			if(entry.savedId && entry.savedId != entry.data.id) { removedIds.push(entry.savedId); }
			entry.savedId = entry.data.id;
			entry.dirty = false;
		}
		for(let id of removedIds)
		{
			if(!missions.some(function(e) { return e.data.id == id; }))
			{
				try { await folder.removeEntry(id + ".json"); } catch(e) { /* già assente */ }
			}
		}
		removedIds = [];
		await writeJson(folder, "index.json", { missions: missions.map(function(e) { return e.data.id; }) });
		render();
		$("#folderStatus").text("Salvato: " + missions.length + " missioni e index.json.");
	}
	catch(e)
	{
		window.alert("Errore nel salvataggio: " + e.message);
	}
});

$("#exportMission").on("click", function()
{
	if(current < 0) { return; }
	let m = missions[current].data;
	let link = document.createElement("a");
	link.href = URL.createObjectURL(new Blob([JSON.stringify(m, null, "\t") + "\n"], { type: "application/json" }));
	link.download = m.id + ".json";
	link.click();
	URL.revokeObjectURL(link.href);
});

$("#importMission").on("click", function() { $("#importFile").val("").trigger("click"); });
$("#importFile").on("change", async function()
{
	let file = this.files[0];
	if(!file) { return; }
	try
	{
		let data = Mission.normalize(JSON.parse(await file.text()));
		missions.push({ data: data, savedId: null, dirty: true });
		current = missions.length - 1;
		data.id = uniqueId(data.id || slug(data.name));
		render();
	}
	catch(e)
	{
		window.alert("File non valido: " + e.message);
	}
});

$("#testMission").on("click", function()
{
	if(current < 0) { return; }
	localStorage.setItem(TEST_MISSION_KEY, JSON.stringify(missions[current].data));
	window.open("Outpost3.html?test=1", "_blank");
});

// avviso se si chiude con modifiche non salvate
window.addEventListener("beforeunload", function(e)
{
	if(folder && missions.some(function(entry) { return entry.dirty; })) { e.preventDefault(); e.returnValue = ""; }
});

// ---------------------------------------------------------------- avvio: missioni del server (sola lettura) e immagini per le anteprime

ImagesLib.initialize("imageLoader", imagesList, function()
{
	if(ImagesLib.getLoadingPercentage() == 1 && current >= 0)
	{
		drawPreview(document.getElementById("sitePreview"), missions[current].data);
	}
});
Missions.list().then(function(list)
{
	if(folder) { return; }
	missions = list.map(function(m) { return { data: m, savedId: m.id, dirty: false }; });
	current = missions.length ? 0 : -1;
	render();
});
render();

window.editor = { getMissions: function() { return missions; }, warnings: warnings };
