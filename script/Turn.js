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
	let _advance = function(map)
	{
		if(map.getState().getOutcome() != null)
		{
			// partita conclusa: il tempo non avanza più
			return _report(_project(map).ctx);
		}
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
	ColonistsRevived: "COLONISTS_REVIVED"
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

/**
 * Edifici con personale pronti a lavorare, nell'ordine in cui ricevono la manodopera di Lavoratori
 * e cloni: prima la precedenza Alta, poi Normale, poi Bassa; a pari precedenza l'ordine dei tipi.
 */
let _staffedBuildings = function(ctx, demand)
{
	let list = [];
	ctx.networks.forEach(function(graph)
	{
		_productionOrder().forEach(function(buildingType, order)
		{
			let prototype = PrototypeLib.get(buildingType);
			if(prototype.getStaffLabor() <= 0 || graph[buildingType] == undefined || _isIdle(prototype, demand))
			{
				return;
			}
			graph[buildingType].forEach(function(building)
			{
				if(building.isOperative() && !_isSuspended(ctx.state, building))
				{
					list.push({ building: building, prototype: prototype, order: order });
				}
			});
		});
	});
	return list.sort(function(a, b) { return (a.building.getStaffPriority() - b.building.getStaffPriority()) || (a.order - b.order); });
};

/** sospeso dal giocatore: le nascite valgono per tutta la colonia, gli altri edifici uno per uno */
let _isSuspended = function(state, building)
{
	return (building.getBuildingType() == "Nursery") ? state.areBirthsSuspended() : building.isSuspended();
};

/** edificio attivo: consumi, produzione (in proporzione al rendimento del personale), capacità e smaltimento */
let _runBuilding = function(state, building, prototype, ratio)
{
	state.delMaterials(prototype.getConsumption());
	if(ratio < 1)
	{
		state.setBuildingIssue(building, { reason: "understaffed", missing: [], ratio: ratio });
	}
	state.addMaterials(_scaled(prototype.getProduction(), ratio));
	state.addMaterials(prototype.getProductionWaste());
	state.addCapacity(prototype.getCapacity());
	_dispose(state, prototype.getDisposal());
	state.addToActiveList(building);
};

let _stopBuilding = function(state, building, prototype, missing)
{
	state.addToInactiveList(building);
	state.setBuildingIssue(building, { reason: "inactive", missing: missing, noSpace: !state.haveSpace(prototype.getProductionWaste()) });
};

let _canRun = function(state, prototype)
{
	return state.haveMaterials(prototype.getConsumption()) && state.haveSpace(prototype.getProductionWaste());
};

/** produzione e consumi degli edifici, in ordine di priorità; costi dei cantieri */
let BuildingProductionPhase = {
	project: function(ctx)
	{
		let state = ctx.state;
		let demand = _demand(ctx);
		// la manodopera di Lavoratori e cloni va prima al personale, per precedenza, ed è riservata subito:
		// cantieri e produzione usano il resto. Il personale di un edificio che non può funzionare
		// (energia o materiali mancanti) passa agli edifici con personale elaborati dopo.
		let staffing = new Map();
		let available = Math.max(0, state.getRemainder("workerLabor"));
		let reserved = 0;
		_staffedBuildings(ctx, demand).forEach(function(entry)
		{
			let points = Math.min(entry.prototype.getStaffLabor(), available);
			available -= points;
			reserved += points;
			staffing.set(entry.building, points);
		});
		if(reserved > 0)
		{
			state.delMaterials({ workerLabor: reserved });
		}
		let released = 0;
		let sites = [];
		ctx.networks.forEach(function(graph)
		{
			let connected = BuildingGraph.hasHeadquarter(graph);
			_productionOrder().forEach(function(buildingType)
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
						// senza materiali, energia o personale l'edificio resta inattivo; con personale
						// insufficiente funziona e produce in proporzione ai punti lavoro ricevuti
						// laboratori e industrie senza studi o produzioni da servire restano a riposo,
						// come gli edifici sospesi dal giocatore
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
						let need = prototype.getStaffLabor();
						let staff = staffing.get(building) || 0;
						if(!_canRun(state, prototype))
						{
							released += staff;
							_stopBuilding(state, building, prototype, _missing(state, prototype.getConsumption()));
							return;
						}
						if(staff < need)
						{
							let extra = Math.min(need - staff, released);
							released -= extra;
							staff += extra;
						}
						if(need > 0 && staff <= 0)
						{
							_stopBuilding(state, building, prototype, ["workerLabor"]);
							return;
						}
						_runBuilding(state, building, prototype, (need > 0) ? staff / need : 1);
					}
					// le parti delle strutture composite sono costruite dall'edificio principale
					else if(building.underConstruction() && !building.getFrozen())
					{
						// i cantieri pagano dopo la produzione di tutti gli edifici (es. le barre delle Fonderie)
						sites.push({ building: building, prototype: prototype });
					}
					else if(building.getIntegrity() == 0)
					{
						state.addToDestroyedList(building);
					}
				});
			});
		});

		// la manodopera riservata e non usata torna disponibile
		if(released > 0)
		{
			state.addMaterials({ workerLabor: released });
		}

		// cantieri: senza materiali o manodopera restano fermi questo turno; avanzano dei punti
		// lavoro ricevuti, al massimo Work.UNITS_PER_TURN
		sites.forEach(function(site)
		{
			let building = site.building;
			let points = Math.min(Work.UNITS_PER_TURN, -building.getProgressState(), _laborAvailable(state));
			let cost = Object.assign({ labor: Math.max(1, points) }, site.prototype.getBuildingCost());
			if(points > 0 && _canPay(state, cost))
			{
				_pay(state, cost);
				state.addToBuildList(building, points);
			}
			else
			{
				state.setBuildingIssue(building, { reason: "stalled", missing: _missing(state, cost) });
			}
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
	// produzione: ogni passo paga i materiali e riceve fino a Work.UNITS_PER_TURN punti di manodopera
	let materials = Object.assign({}, cost);
	delete materials.labor;
	while(value < item.getRemainTime())
	{
		let points = Math.min(Work.UNITS_PER_TURN, item.getRemainTime() - value, _laborAvailable(state));
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
			list.forEach(function(robot) { robot.wear += share; });
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
