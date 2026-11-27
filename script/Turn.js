"use strict";

import { RobotTypes, StructureTypes } from "./Enums.js";
import { GenerationState } from "./Generations.js";
import { BuildingGraph } from "./PipeNetwork.js";
import { PrototypeLib } from "./PrototypeLib.js";
import { RecipeLib } from "./RecipeLib.js";
import { MaintenancePhase } from "./TurnMaintenance.js";
import { Work } from "./Work.js";
import { CapsulePhase, IllnessPhase, PopulationPhase, RevivalPhase } from "./TurnPopulation.js";

/**
 * Turn: avanzamento di un turno della colonia.
 *
 * Interfaccia:
 *   Turn.project(map) -> TurnReport   proiezione del turno corrente (cosa succederebbe), senza applicarlo
 *   Turn.advance(map) -> TurnReport   applica il turno, avanza la data e ricalcola la proiezione
 *
 * Il turno è una sequenza ordinata di fasi. Ogni fase può avere:
 *   project(ctx) -> plan         prenota/consuma materiali nel Material ledger e restituisce il proprio piano
 *   apply(ctx, plan)             applica gli effetti del piano (avanzamenti, danni, nascite...)
 * L'ordine di PHASES è anche l'ordine di priorità nel consumo dei materiali.
 *
 * TODO: fase eventi (incidenti, catastrofi, scoperte) - vedi Events.js
 * TODO: fase sistemi avanzati (terraforming ecc.)
 */
function TurnConstructor()
{
	let _phases = function()
	{
		return [
			WorkforcePhase,
			BuildingProductionPhase,
			ProductionQueuePhase,
			ResearchPhase,
			MaintenancePhase,
			RobotWearPhase,
			RobotPhase,
			PopulationPhase,
			IllnessPhase,
			CapsulePhase,
			RevivalPhase,
			AlertPhase,
			OutcomePhase
		];
	};

	let _project = function(map)
	{
		let state = map.getState();
		state.resetAll();

		let ctx = {
			state: state,
			networks: map.getGraph(),
			map: map,
			events: []
		};
		let phases = _phases();
		let plans = phases.map(function(phase) { return phase.project ? phase.project(ctx) : undefined; });
		return { ctx: ctx, phases: phases, plans: plans };
	};

	let _report = function(ctx)
	{
		return { date: ctx.state.getDate(), events: ctx.events, outcome: ctx.state.getOutcome() };
	};

	/** @return {{date:number, events:Array<{type:string, name:string}>, outcome:string|null}} */
	/** ciò che il giocatore può costruire, studiare e produrre, e le scoperte fatte */
	let _unlocks = function(state)
	{
		return {
			kit: state.isKitDelivered(),
			buildings: state.getTechnology().slice(),
			studies: RecipeLib.getAvailableResearch(state).map(function(recipe) { return recipe.getName(); }),
			productions: RecipeLib.getAvailableProduction(state).map(function(recipe) { return recipe.getName(); }),
			discoveries: state.getDiscovery().filter(function(name) { return name.indexOf("Resource_") == 0; })
		};
	};

	/** novità rispetto al turno precedente; alla consegna del kit gli edifici diventano una notifica sola */
	let _unlockEvents = function(before, after, events)
	{
		let added = function(key) { return after[key].filter(function(name) { return before[key].indexOf(name) < 0; }); };
		let buildings = added("buildings");
		if(!before.kit && after.kit)
		{
			events.push({ type: TurnEventType.KitDelivered, count: buildings.length });
		}
		else
		{
			buildings.forEach(function(name) { events.push({ type: TurnEventType.NewBuilding, name: name }); });
		}
		added("studies").forEach(function(name) { events.push({ type: TurnEventType.NewStudy, name: name }); });
		added("productions").forEach(function(name) { events.push({ type: TurnEventType.NewProduction, name: name }); });
		added("discoveries").forEach(function(name) { events.push({ type: TurnEventType.Discovery, name: name }); });
	};

	let _advance = function(map)
	{
		if(map.getState().getOutcome() != null)
		{
			// partita conclusa: il tempo non avanza più
			return _report(_project(map).ctx);
		}
		let unlocksBefore = _unlocks(map.getState());
		let turn = _project(map);
		turn.phases.forEach(function(phase, i)
		{
			if(phase.apply)
			{
				phase.apply(turn.ctx, turn.plans[i]);
			}
		});
		turn.ctx.state.updateAll();
		turn.ctx.state.setDate(turn.ctx.state.getDate() + 1);
		_unlockEvents(unlocksBefore, _unlocks(turn.ctx.state), turn.ctx.events);

		let report = _report(turn.ctx);
		_project(map); // proiezione del nuovo turno, mostrata dalla UI
		return report;
	};

	//-------------------------------------

	this.project = function(map) { return _report(_project(map).ctx); };
	this.advance = _advance;

	//-------------------------------------
}

let GameOutcome = {
	Victory: "victory",
	Defeat: "defeat"
};

let TurnEventType = {
	NewCreation: "NEW_CREATION",
	NewDiscovery: "NEW_DISCOVERY",
	RobotBroken: "ROBOT_BROKEN",
	ColonistsRevived: "COLONISTS_REVIVED",
	KitDelivered: "KIT_DELIVERED",
	NewBuilding: "NEW_BUILDING",
	NewStudy: "NEW_STUDY",
	NewProduction: "NEW_PRODUCTION",
	Discovery: "DISCOVERY",
	RobotsWorn: "ROBOTS_WORN",
	StorageFull: "STORAGE_FULL",
	StorageOk: "STORAGE_OK",
	PowerShortage: "POWER_SHORTAGE",
	PowerOk: "POWER_OK"
};

// singleton
let Turn = new TurnConstructor();

//-----------------------------------------------------------------------------
// fasi

/**
 * Manodopera del turno in punti lavoro (vedi Work), in due materiali distinti che non si accumulano:
 *   roboLabor    Work.ROBOT punti per RoboWorker
 *   workerLabor  Work.COLONIST per Lavoratore e Work.RETIREE per Pensionato, ridotti dalla felicità fino a
 *                MIN_HAPPINESS_FACTOR, più Work.CLONE per clone (i cloni non risentono della felicità)
 * Nei costi la voce "labor" si paga prima con i robot e poi con Lavoratori e cloni; il personale
 * degli edifici (staff) solo con Lavoratori e cloni.
 */
let WorkforcePhase = {
	MIN_HAPPINESS_FACTOR: 0.5,

	project: function(ctx)
	{
		let state = ctx.state;
		let date = state.getDate();
		let population = state.getPopulation();
		let colonists = 0, clones = 0;
		population.registry.forEach(function(generation)
		{
			let phase = generation.getState(date);
			// i malati non lavorano
			if(phase == GenerationState.Scientists)
			{
				colonists += generation.getHealthy() * Work.COLONIST;
			}
			else if(phase == GenerationState.Retirees)
			{
				colonists += generation.getHealthy() * Work.RETIREE;
			}
			else if(phase == GenerationState.Clones)
			{
				clones += generation.getPopulation() * Work.CLONE;
			}
		});
		let factor = WorkforcePhase.MIN_HAPPINESS_FACTOR + (1 - WorkforcePhase.MIN_HAPPINESS_FACTOR) * population.happiness;
		state.setMaterials({ roboLabor: state.getStored("roboWorker") * Work.ROBOT, workerLabor: Math.floor(colonists * factor) + clones });
	}
};

/** traduce la voce "labor" di un costo in manodopera robotica, poi dei Lavoratori */
let _withLabor = function(state, cost)
{
	let ret = Object.assign({}, cost);
	let need = ret.labor || 0;
	delete ret.labor;
	if(need > 0)
	{
		let robots = Math.min(need, Math.max(0, state.getRemainder("roboLabor")));
		if(robots > 0) { ret.roboLabor = robots; }
		if(need > robots) { ret.workerLabor = need - robots; }
	}
	return ret;
};
let _canPay = function(state, cost) { return state.haveMaterials(_withLabor(state, cost)); };
let _pay = function(state, cost) { state.delMaterials(_withLabor(state, cost)); };

/** materiali di un costo che non bastano in questo momento ("labor" = manodopera di robot e Lavoratori) */
let _missing = function(state, cost)
{
	return Object.keys(cost).filter(function(name)
	{
		if(name == "labor")
		{
			return state.getRemainder("roboLabor") + state.getRemainder("workerLabor") < cost.labor;
		}
		return state.getRemainder(name) < cost[name];
	});
};

/** manodopera disponibile in questo turno: robot più Lavoratori e cloni */
let _laborAvailable = function(state)
{
	return Math.max(0, state.getRemainder("roboLabor")) + Math.max(0, state.getRemainder("workerLabor"));
};

/** produzione ridotta in proporzione al rendimento del personale (per difetto) */
let _scaled = function(amounts, ratio)
{
	if(ratio >= 1)
	{
		return amounts;
	}
	let ret = {};
	Object.keys(amounts).forEach(function(name)
	{
		let value = Math.floor(amounts[name] * ratio);
		if(value > 0) { ret[name] = value; }
	});
	return ret;
};

/** smaltimento: elimina fino alla quantità indicata di ogni scarto disponibile */
let _dispose = function(state, disposal)
{
	for(let name in disposal)
	{
		if(disposal.hasOwnProperty(name))
		{
			let amount = Math.min(disposal[name], state.getRemainder(name));
			if(amount > 0)
			{
				state.delMaterials({ [name]: amount });
			}
		}
	}
};


/**
 * Materiali che servono solo a studi e produzioni in coda (o ad altri edifici): non si accumulano,
 * quindi un laboratorio o un'industria che produce soltanto questi, quando nessuno li usa, resta a
 * riposo senza consumare energia né personale.
 */
const WORK_MATERIALS = ["researchUnit", "researchStructureAuto", "researchStructureSurface", "researchStructureSurfaceAdv",
	"researchStructureUnderground", "researchStructureUndergroundAdv", "researchStructureDeep", "researchStructureDeepAdv",
	"productionUnit", "productionStandardStructure", "productionChemicalStructure", "goodsUnit", "pharmaceuticalUnit"];

/** materiali richiesti in questo turno: costi degli elementi in coda e consumi degli edifici */
let _demand = function(ctx)
{
	let demand = new Set();
	let state = ctx.state;
	state.getResearchQueue().concat(state.getProductionQueue()).forEach(function(item)
	{
		if(item.getRemainTime() > 0)
		{
			Object.keys(RecipeLib.get(item.getName()).getCost()).forEach(function(name) { demand.add(name); });
		}
	});
	ctx.networks.forEach(function(graph)
	{
		Object.keys(graph).forEach(function(buildingType)
		{
			let prototype = PrototypeLib.get(buildingType);
			if(prototype == undefined || !Array.isArray(graph[buildingType]) || !graph[buildingType].some(function(b) { return b.isOperative(); }))
			{
				return;
			}
			Object.keys(prototype.getConsumption()).forEach(function(name) { demand.add(name); });
		});
	});
	return demand;
};

/** materiali che si accumulano in magazzino o nelle scorte: nella produzione manuale si pagano in proporzione ai punti */
const STOCKABLE_MATERIALS = ["ironBar", "metalOre", "mineralOre", "cristalOre", "radioactiveOre"];

/** unità generiche prodotte da molti edifici: da sole non bastano a far lavorare un laboratorio o un'industria */
const GENERIC_WORK_MATERIALS = ["researchUnit", "productionUnit"];

/**
 * L'edificio produce solo materiali per studi e produzioni, e nessuno di questi serve ora.
 * Per gli edifici con personale contano i materiali specifici (le strutture di ricerca e di produzione):
 * un laboratorio lavora se produce la struttura richiesta da uno studio in coda, non per le sole unità
 * di ricerca; gli edifici automatici lavorano anche solo per le unità generiche.
 */
let _isIdle = function(prototype, demand)
{
	let production = Object.keys(prototype.getProduction());
	if(production.length == 0 || !production.every(function(name) { return WORK_MATERIALS.indexOf(name) >= 0; }))
	{
		return false;
	}
	// gli edifici automatici (senza personale) lavorano anche solo per le unità generiche
	let specific = production.filter(function(name) { return GENERIC_WORK_MATERIALS.indexOf(name) < 0; });
	let relevant = (specific.length > 0 && prototype.getStaff() > 0) ? specific : production;
	return !relevant.some(function(name) { return demand.has(name); });
};

/**
 * Ordine in cui gli edifici lavorano nel turno: l'ordine di priorità dei tipi, ma chi produce un materiale
 * viene sempre prima di chi lo consuma (es. Industria Farmaceutica prima della Struttura Medica), così i
 * materiali che non si accumulano servono già nello stesso turno. Calcolato una volta sola.
 */
let _workOrder = null;
let _productionOrder = function()
{
	if(_workOrder !== null && _workOrder.length == PrototypeLib.getPriorityList().length)
	{
		return _workOrder;
	}
	let types = PrototypeLib.getPriorityList();
	let producers = {};
	types.forEach(function(type)
	{
		Object.keys(PrototypeLib.get(type).getProduction()).forEach(function(name) { (producers[name] = producers[name] || []).push(type); });
	});
	// archi produttore -> consumatore; ordine topologico che a parità segue la priorità originale
	let before = {};
	types.forEach(function(type)
	{
		let set = new Set();
		Object.keys(PrototypeLib.get(type).getConsumption()).forEach(function(name)
		{
			(producers[name] || []).forEach(function(producer) { if(producer != type) { set.add(producer); } });
		});
		before[type] = set;
	});
	let placed = new Set();
	let order = [];
	while(order.length < types.length)
	{
		let next = types.find(function(type)
		{
			return !placed.has(type) && Array.from(before[type]).every(function(producer) { return placed.has(producer); });
		});
		if(next === undefined)
		{
			// ciclo tra produttori e consumatori: si prosegue con il primo tipo rimasto, nell'ordine di priorità
			next = types.find(function(type) { return !placed.has(type); });
		}
		placed.add(next);
		order.push(next);
	}
	_workOrder = order;
	return order;
};

/** sospeso dal giocatore: le nascite valgono per tutta la colonia, gli altri edifici uno per uno */
let _isSuspended = function(state, building)
{
	return (building.getBuildingType() == "Nursery") ? state.areBirthsSuspended() : building.isSuspended();
};

/** edificio attivo: consumi, produzione (in proporzione al rendimento del personale), scarti e smaltimento */
let _runBuilding = function(state, building, prototype, ratio)
{
	state.delMaterials(prototype.getConsumption());
	if(ratio < 1)
	{
		state.setBuildingIssue(building, { reason: "understaffed", missing: [], ratio: ratio });
	}
	state.addMaterials(_scaled(prototype.getProduction(), ratio));
	state.addMaterials(prototype.getProductionWaste());
	_dispose(state, prototype.getDisposal());
	state.addToActiveList(building);
};

let _canRun = function(state, prototype)
{
	return state.haveMaterials(prototype.getConsumption()) && state.haveSpace(prototype.getProductionWaste());
};

/**
 * Precedenza effettiva: la propria, oppure quella più alta (numero più basso) tra gli edifici e i cantieri
 * che usano ciò che l'edificio produce, anche indirettamente (la miniera che rifornisce la Fonderia che
 * rifornisce un cantiere con precedenza Alta lavora come Alta).
 */
let _effectivePrecedence = function(entries)
{
	let effective = new Map();
	entries.forEach(function(entry) { effective.set(entry.building, entry.building.getStaffPriority()); });
	for(let changed = true, guard = 0; changed && guard < 20; guard++)
	{
		changed = false;
		let wanted = {};
		entries.forEach(function(entry)
		{
			let precedence = effective.get(entry.building);
			entry.needs.forEach(function(name) { if(wanted[name] === undefined || precedence < wanted[name]) { wanted[name] = precedence; } });
		});
		entries.forEach(function(entry)
		{
			let precedence = effective.get(entry.building);
			entry.gives.forEach(function(name)
			{
				if(wanted[name] !== undefined && wanted[name] < precedence)
				{
					precedence = wanted[name];
					changed = true;
				}
			});
			effective.set(entry.building, precedence);
		});
	}
	return effective;
};

/** un tentativo di lavoro: null se riesce, altrimenti il problema { reason, missing } */
let _attempt = function(state, entry)
{
	let prototype = entry.prototype;
	if(entry.site)
	{
		// cantiere: avanza dei punti lavoro ricevuti, al massimo Work.UNITS_PER_TURN
		let points = Math.min(Work.UNITS_PER_TURN, -entry.building.getProgressState(), _laborAvailable(state));
		let cost = Object.assign({ labor: Math.max(1, points) }, prototype.getBuildingCost());
		if(points > 0 && _canPay(state, cost))
		{
			_pay(state, cost);
			state.addToBuildList(entry.building, points);
			return null;
		}
		return { reason: "stalled", missing: _missing(state, cost) };
	}
	if(!_canRun(state, prototype))
	{
		return { reason: "inactive", missing: _missing(state, prototype.getConsumption()), noSpace: !state.haveSpace(prototype.getProductionWaste()) };
	}
	// personale: con meno punti del necessario l'edificio produce in proporzione
	let need = prototype.getStaffLabor();
	let staff = Math.min(need, Math.max(0, state.getRemainder("workerLabor")));
	if(need > 0 && staff <= 0)
	{
		return { reason: "inactive", missing: ["workerLabor"], noSpace: false };
	}
	if(staff > 0)
	{
		state.delMaterials({ workerLabor: staff });
	}
	_runBuilding(state, entry.building, prototype, (need > 0) ? staff / need : 1);
	return null;
};

/**
 * Produzione e consumi degli edifici e avanzamento dei cantieri, per precedenza.
 * Gli edifici lavorano a gruppi: prima la precedenza Alta, poi Normale, poi Bassa (precedenza effettiva,
 * vedi _effectivePrecedence); in ogni gruppo chi produce prima di chi consuma, i cantieri per ultimi.
 * Chi lavora prima prende per primo personale, energia e materiali. Alla fine gli edifici e i cantieri
 * rimasti fermi riprovano una volta, nello stesso ordine, con ciò che è rimasto libero.
 */
let BuildingProductionPhase = {
	project: function(ctx)
	{
		let state = ctx.state;
		let demand = _demand(ctx);
		let order = _productionOrder();
		let entries = [];
		ctx.networks.forEach(function(graph)
		{
			let connected = BuildingGraph.hasHeadquarter(graph);
			order.forEach(function(buildingType, typeOrder)
			{
				if(graph[buildingType] == undefined)
				{
					return;
				}
				let prototype = PrototypeLib.get(buildingType);
				graph[buildingType].forEach(function(building)
				{
					if(!connected && !building.isDestroyed() && !building.getFrozen())
					{
						state.setBuildingIssue(building, { reason: "disconnected", missing: [] });
					}
					if(building.isOperative())
					{
						// scorte interne e magazzini contano finché l'edificio esiste, anche se fermo o a riposo
						state.addCapacity(prototype.getCapacity());
						// gli edifici sospesi dal giocatore e quelli senza studi o produzioni da servire restano a riposo
						if(_isSuspended(state, building))
						{
							state.setBuildingIssue(building, { reason: "suspended", missing: [] });
							return;
						}
						if(_isIdle(prototype, demand))
						{
							state.setBuildingIssue(building, { reason: "idle", missing: [] });
							return;
						}
						entries.push({ building: building, prototype: prototype, site: false, order: typeOrder,
							needs: Object.keys(prototype.getConsumption()), gives: Object.keys(prototype.getProduction()) });
					}
					// le parti delle strutture composite sono costruite dall'edificio principale
					else if(building.underConstruction() && !building.getFrozen())
					{
						entries.push({ building: building, prototype: prototype, site: true, order: typeOrder,
							needs: Object.keys(prototype.getBuildingCost()), gives: [] });
					}
					else if(building.getIntegrity() == 0)
					{
						state.addToDestroyedList(building);
					}
				});
			});
		});

		let precedence = _effectivePrecedence(entries);
		state.setEffectivePrecedence(precedence);
		entries.forEach(function(entry, index) { entry.index = index; });
		entries.sort(function(a, b)
		{
			return (precedence.get(a.building) - precedence.get(b.building)) || ((a.site ? 1 : 0) - (b.site ? 1 : 0)) ||
				(a.order - b.order) || (a.index - b.index);
		});

		let failed = entries.filter(function(entry) { return _attempt(state, entry) !== null; });
		// secondo tentativo per chi è rimasto fermo, con le risorse liberate dagli altri
		failed.forEach(function(entry)
		{
			let problem = _attempt(state, entry);
			if(problem === null)
			{
				return;
			}
			if(!entry.site)
			{
				state.addToInactiveList(entry.building);
			}
			state.setBuildingIssue(entry.building, problem);
		});
	}
};

/**
 * Consuma il costo di un elemento di coda (produzione o ricerca) per quanti più turni di lavoro
 * possibile, fino al tempo residuo. Restituisce le unità di lavoro acquistate.
 */
let _consumeRecipeWork = function(state, item)
{
	let cost = RecipeLib.get(item.getName()).getCost();
	let value = 0;
	if(!cost.labor)
	{
		// ricerca: ogni passo paga il costo e avanza di 1
		while(_canPay(state, cost) && value < item.getRemainTime())
		{
			_pay(state, cost);
			value++;
		}
		return value;
	}
	// produzione: ogni passo riceve fino a Work.UNITS_PER_TURN punti di manodopera e paga le unità per turno
	// per intero; i materiali accumulabili si pagano in proporzione ai punti, così il costo totale non cambia
	let units = {}, stock = {};
	Object.keys(cost).forEach(function(name)
	{
		if(name == "labor") { return; }
		if(STOCKABLE_MATERIALS.indexOf(name) >= 0) { stock[name] = cost[name]; } else { units[name] = cost[name]; }
	});
	while(value < item.getRemainTime())
	{
		let points = Math.min(Work.UNITS_PER_TURN, item.getRemainTime() - value, _laborAvailable(state));
		let done = item.getCurrentTime() + value;
		let materials = Object.assign({}, units);
		Object.keys(stock).forEach(function(name)
		{
			let owed = Math.round(stock[name] * (done + points) / Work.UNITS_PER_TURN) - Math.round(stock[name] * done / Work.UNITS_PER_TURN);
			if(owed > 0) { materials[name] = owed; }
		});
		if(points <= 0 || !state.haveMaterials(materials))
		{
			break;
		}
		_pay(state, Object.assign({}, materials, { labor: points }));
		value += points;
	}
	return value;
};

/** coda di produzione */
let ProductionQueuePhase = {
	project: function(ctx)
	{
		return ctx.state.getProductionQueue().map(function(item)
		{
			return { item: item, value: (item.getRemainTime() > 0) ? _consumeRecipeWork(ctx.state, item) : 0 };
		});
	},

	apply: function(ctx, plan)
	{
		let state = ctx.state;
		let queue = state.getProductionQueue();
		plan.forEach(function(entry)
		{
			let item = entry.item;
			for(let i = 0; i < entry.value; i++)
			{
				item.progress();
			}

			if(item.getRemainTime() == 0)
			{
				let recipe = RecipeLib.get(item.getName());
				if(state.haveSpace(recipe.getResult()))
				{
					state.addMaterials(recipe.getResult());
					queue.splice(queue.indexOf(item), 1);
					ctx.events.push({ type: TurnEventType.NewCreation, name: item.getName() });
				}
				else
				{
					// consegna bloccata: il magazzino è pieno
					ctx.blocked = (ctx.blocked || []).concat(Object.keys(recipe.getResult()));
				}
			}
		});
	}
};

/** coda di ricerca */
let ResearchPhase = {
	project: function(ctx)
	{
		return ctx.state.getResearchQueue().map(function(item)
		{
			return { item: item, value: _consumeRecipeWork(ctx.state, item) };
		});
	},

	apply: function(ctx, plan)
	{
		let state = ctx.state;
		let queue = state.getResearchQueue();
		plan.forEach(function(entry)
		{
			let item = entry.item;
			for(let i = 0; i < entry.value; i++)
			{
				if(item.progress() == 0)
				{
					let recipe = RecipeLib.get(item.getName());
					state.addKnowledge(recipe.getResult());
					state.addCompletedResearch(item.getName());
					queue.splice(queue.indexOf(item), 1);
					ctx.events.push({ type: TurnEventType.NewDiscovery, name: item.getName() });
					break;
				}
			}
		});
	}
};

/**
 * Deterioramento dei robot. Ogni robot ha una propria durata (ROBOT_LIFE turni di lavoro, con una
 * variazione casuale di LIFE_VARIANCE) e accumula usura; a fine durata va fuori uso.
 * Il lavoro di un tipo di robot è ripartito tra tutti i robot di quel tipo. La manutenzione
 * (1 repairUnit per robot al lavoro) riduce l'usura di MAINTENANCE_REDUCTION.
 */
let RobotWearPhase = {
	ROBOT_LIFE: 40,
	LIFE_VARIANCE: 0.2,
	MAINTENANCE_REDUCTION: 0.5,
	WORN_WARNING: 0.9,
	TYPES: ["roboWorker", "dozer", "digger"],

	/** allinea l'elenco dei robot di un tipo alla quantità in magazzino (robot nuovi a usura zero) */
	sync: function(state, type)
	{
		let wear = state.getRobotWear();
		let list = wear[type] = wear[type] || [];
		let stock = Math.max(0, state.getStored(type));
		while(list.length < stock)
		{
			list.push({ wear: 0, life: RobotWearPhase.ROBOT_LIFE * (1 + (Math.random() * 2 - 1) * RobotWearPhase.LIFE_VARIANCE) });
		}
		if(list.length > stock)
		{
			list.length = stock;
		}
		return list;
	},

	/** usura media dei robot di un tipo, da 0 (nuovi) a 1 (a fine vita) */
	averageWear: function(state, type)
	{
		let list = state.getRobotWear()[type] || [];
		if(list.length == 0)
		{
			return 0;
		}
		return list.reduce(function(sum, robot) { return sum + Math.min(1, robot.wear / robot.life); }, 0) / list.length;
	},

	project: function(ctx)
	{
		let state = ctx.state;
		let work = { roboWorker: state.getConsumed("roboLabor") / Work.ROBOT, dozer: 0, digger: 0 };
		ctx.map.getStructure().forEach(function(el)
		{
			if(el.getType() == StructureTypes.Robot)
			{
				if(el.getRobotType() == RobotTypes.Dozer) { work.dozer++; }
				else if(el.getRobotType() == RobotTypes.Digger) { work.digger++; }
			}
		});
		let total = work.roboWorker + work.dozer + work.digger;
		let repaired = Math.min(total, Math.max(0, state.getRemainder("repairUnit")));
		if(repaired > 0)
		{
			state.delMaterials({ repairUnit: repaired });
		}
		return { work: work, maintained: (total > 0) ? repaired / total : 1 };
	},

	apply: function(ctx, plan)
	{
		let state = ctx.state;
		let rate = 1 - RobotWearPhase.MAINTENANCE_REDUCTION * plan.maintained;
		RobotWearPhase.TYPES.forEach(function(type)
		{
			let list = RobotWearPhase.sync(state, type);
			if(list.length == 0 || !plan.work[type])
			{
				return;
			}
			let share = plan.work[type] * rate / list.length;
			let worn = 0;
			list.forEach(function(robot)
			{
				// avviso una volta sola, quando il robot supera WORN_WARNING della sua durata
				let before = robot.wear;
				robot.wear += share;
				if(before < robot.life * RobotWearPhase.WORN_WARNING && robot.wear >= robot.life * RobotWearPhase.WORN_WARNING && robot.wear < robot.life)
				{
					worn++;
				}
			});
			if(worn > 0)
			{
				ctx.events.push({ type: TurnEventType.RobotsWorn, name: type, count: worn });
			}
			for(let i = list.length - 1; i >= 0; i--)
			{
				if(list[i].wear >= list[i].life)
				{
					list.splice(i, 1);
					state.destroyMaterials({ [type]: 1 });
					ctx.events.push({ type: TurnEventType.RobotBroken, name: type });
				}
			}
		});
	}
};

/** RoboDozer e RoboDigger: avanzamento del lavoro e disponibilità per il turno successivo */
let RobotPhase = {
	apply: function(ctx)
	{
		let state = ctx.state;
		let map = ctx.map;
		let structure = map.getStructure();
		let dozerCount = 0;
		let diggerCount = 0;

		let finishedRobots = [];
		structure.forEach(function(robot)
		{
			if(robot.getType() != StructureTypes.Robot)
			{
				return;
			}
			if(robot.getRobotType() == RobotTypes.Dozer)
			{
				if(map.raze(robot.getPosition(), robot.getLayer()) == 0) { finishedRobots.push(robot); }
				else { dozerCount++; }
			}
			else if(robot.getRobotType() == RobotTypes.Digger)
			{
				if(map.dig(robot.getPosition(), robot.getLayer())) { finishedRobots.push(robot); }
				else { diggerCount++; }
			}
		});
		finishedRobots.forEach(function(robot) { structure.splice(structure.indexOf(robot), 1); });

		state.setRobotsAvailable({
			controllers: state.getRemainder("controlUnit") - (dozerCount + diggerCount),
			dozer: state.getRemainder("dozer") - dozerCount,
			digger: state.getRemainder("digger") - diggerCount
		});
	}
};



/**
 * Avvisi di stato: magazzini pieni che bloccano qualcosa e energia insufficiente. La notifica arriva nel
 * turno in cui il problema comincia e, in verde, in quello in cui si risolve.
 */
let AlertPhase = {
	apply: function(ctx)
	{
		let state = ctx.state;
		let alerts = state.getAlerts();

		// magazzini: consegne bloccate e edifici fermi per gli scarti, per magazzino
		let pools = state.getMetaMaterials();
		let poolOf = function(material)
		{
			return pools.find(function(pool) { return state.getMaterialFromMetaMaterial(pool).indexOf(material) >= 0; });
		};
		let full = {};
		(ctx.blocked || []).forEach(function(material) { let pool = poolOf(material); if(pool) { full[pool] = true; } });
		state.getBuildingIssues().forEach(function(entry)
		{
			if(entry.issue.noSpace)
			{
				Object.keys(PrototypeLib.get(entry.building.getBuildingType()).getProductionWaste()).forEach(function(material)
				{
					let pool = poolOf(material);
					if(pool) { full[pool] = true; }
				});
			}
		});
		pools.forEach(function(pool)
		{
			let was = !!alerts.storage[pool];
			if(full[pool] && !was) { ctx.events.push({ type: TurnEventType.StorageFull, name: pool }); }
			if(!full[pool] && was) { ctx.events.push({ type: TurnEventType.StorageOk, name: pool }); }
			alerts.storage[pool] = !!full[pool];
		});

		// energia: edifici fermi perché manca energia
		let stopped = state.getBuildingIssues().filter(function(entry)
		{
			return entry.issue.reason == "inactive" && entry.issue.missing.indexOf("power") >= 0;
		});
		if(stopped.length > 0 && !alerts.power)
		{
			let needed = stopped.reduce(function(n, entry) { return n + (PrototypeLib.get(entry.building.getBuildingType()).getConsumption().power || 0); }, 0);
			ctx.events.push({ type: TurnEventType.PowerShortage, count: stopped.length, amount: Math.max(0, needed - Math.max(0, state.getRemainder("power"))) });
		}
		if(stopped.length == 0 && alerts.power)
		{
			ctx.events.push({ type: TurnEventType.PowerOk });
		}
		alerts.power = stopped.length > 0;
	}
};

/**
 * Esito della partita.
 * Vittoria: almeno VICTORY_POPULATION coloni contenti (piena sussistenza e felicità >= VICTORY_HAPPINESS)
 * per VICTORY_TURNS turni consecutivi; i cloni non contano.
 * Sconfitta, dopo la consegna del kit di atterraggio:
 *   - nessun Headquarter in piedi;
 *   - nessuna manodopera e nessun modo di riaverla: niente RoboWorker, Lavoratori, cloni, Pensionati o coloni
 *     giovani, e nessun Centro Criogenico attivo che prepari e risvegli capsule;
 *   - dopo l'arrivo dei primi coloni: nessun colono, nessuna nascita possibile (Asilo non attivo),
 *     nessuna capsula e nessun Centro Criogenico in piedi.
 */
let OutcomePhase = {
	VICTORY_POPULATION: 200,
	VICTORY_TURNS: 20,
	VICTORY_HAPPINESS: 0.75,

	apply: function(ctx)
	{
		let state = ctx.state;
		let date = state.getDate();
		let population = state.getPopulation();
		let people = 0, citizens = 0, workers = 0, young = 0;	// citizens: coloni non clonati; workers: chi fornisce manodopera
		population.registry.forEach(function(generation)
		{
			let n = generation.getPopulation();
			let phase = generation.getState(date);
			people += n;
			if(!generation.isClone()) { citizens += generation.getHealthy(); }	// i malati non sono contenti
			if(phase == GenerationState.Scientists || phase == GenerationState.Clones || phase == GenerationState.Retirees) { workers += n; }
			else if(phase == GenerationState.Infants || phase == GenerationState.Students || phase == GenerationState.Researchers) { young += n; }
		});

		// vittoria
		let content = population.subsistence == 1 && population.happiness >= OutcomePhase.VICTORY_HAPPINESS;
		state.setVictoryStreak((citizens >= OutcomePhase.VICTORY_POPULATION && content) ? state.getVictoryStreak() + 1 : 0);
		if(state.getVictoryStreak() >= OutcomePhase.VICTORY_TURNS)
		{
			state.setOutcome(GameOutcome.Victory);
			return;
		}

		// sconfitta
		if(!state.isKitDelivered())
		{
			return;
		}
		let active = function(type) { return (state.getActiveList()[type] || []).length > 0; };
		let headquarterStanding = ctx.map.getStructure().some(function(el)
		{
			return el.getType() == StructureTypes.Building && el.isHeadquarter() && !el.isDestroyed();
		});
		let capsules = state.getStored("cryoCapsule");
		let cryoStanding = ctx.map.getStructure().some(function(el)
		{
			return el.getType() == StructureTypes.Building && el.getBuildingType() == "CryoCenter" && !el.isDestroyed();
		});
		let noLabor = state.getStored("roboWorker") <= 0 && workers == 0 && young == 0 && !active("CryoCenter");
		let colonistsArrived = population.registry.length > 0;
		let noColonists = colonistsArrived && people == 0 && !active("Nursery") && capsules <= 0 && !cryoStanding;
		if(!headquarterStanding || noLabor || noColonists)
		{
			state.setOutcome(GameOutcome.Defeat);
		}
	}
};

export { GameOutcome, OutcomePhase, RobotWearPhase, TurnConstructor, TurnEventType, Turn, WorkforcePhase, BuildingProductionPhase, ProductionQueuePhase, ResearchPhase, RobotPhase };
