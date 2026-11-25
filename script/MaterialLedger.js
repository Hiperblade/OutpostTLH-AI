"use strict";

/**
 * Material ledger: il registro dei materiali della colonia.
 *
 * Per ogni materiale tiene produzione e consumo del turno, quantità immagazzinata e capacità.
 * Un materiale può appartenere a un "pool" di stoccaggio (meta-materiale, es. genericStorage):
 * in quel caso la capacità è condivisa tra tutti i membri del pool.
 *
 * Ciclo di un turno:
 *   resetTurn() -> produce/spend/addCapacity... -> closeTurn()
 */
function MaterialLedger()
{
	/** @type {Map<string, {produced:number, consumed:number, stored:number, capacity:number, pool:string|null}>} */
	let records = new Map();
	/** @type {Map<string, {capacity:number, members:string[]}>} */
	let pools = new Map();
	/** nomi di materiali e pool, in ordine di registrazione */
	let names = [];

	let _record = function(name)
	{
		let rec = records.get(name);
		if(rec === undefined && !pools.has(name))
		{
			rec = { produced: 0, consumed: 0, stored: 0, capacity: 0, pool: null };
			records.set(name, rec);
			names.push(name);
		}
		return rec;
	};

	let _forEach = function(amounts, fn)
	{
		for(let name in amounts)
		{
			if(amounts.hasOwnProperty(name))
			{
				fn(name, amounts[name]);
			}
		}
	};

	let _poolStored = function(poolName)
	{
		let pool = pools.get(poolName);
		let ret = 0;
		if(pool !== undefined)
		{
			pool.members.forEach(function(member) { ret += _record(member).stored; });
		}
		return ret;
	};

	/** quantità disponibile in questo turno (stock + prodotto - consumato) */
	let _available = function(name)
	{
		let rec = _record(name);
		if(rec === undefined)
		{
			return _poolStored(name);
		}
		return rec.stored + rec.produced - rec.consumed;
	};

	let _capacity = function(name)
	{
		if(pools.has(name))
		{
			return pools.get(name).capacity;
		}
		let rec = _record(name);
		return (rec.pool !== null) ? pools.get(rec.pool).capacity : rec.capacity;
	};

	let _freeCapacity = function(name)
	{
		if(pools.has(name))
		{
			return pools.get(name).capacity - _poolStored(name);
		}
		let rec = _record(name);
		if(rec.pool !== null)
		{
			return pools.get(rec.pool).capacity - _poolStored(rec.pool);
		}
		return rec.capacity - rec.stored;
	};

	//-----------------------------------------
	// configurazione

	/** il materiale name condividerà la capacità del pool poolName */
	let _joinPool = function(name, poolName)
	{
		let rec = _record(name);
		if(poolName == null || rec === undefined)
		{
			return;
		}
		if(!pools.has(poolName))
		{
			if(records.has(poolName))
			{
				throw new Error("MaterialLedger: '" + poolName + "' è già un materiale, non può diventare un pool");
			}
			pools.set(poolName, { capacity: 0, members: [] });
			names.push(poolName);
		}
		let pool = pools.get(poolName);
		pool.members.push(name);
		pool.capacity += rec.capacity;
		rec.capacity = 0;
		rec.pool = poolName;
	};

	//-----------------------------------------
	// operazioni del turno

	let _canAfford = function(amounts)
	{
		let ret = true;
		_forEach(amounts, function(name, value)
		{
			if(_available(name) < value) { ret = false; }
		});
		return ret;
	};

	let _hasRoomFor = function(amounts)
	{
		let ret = true;
		_forEach(amounts, function(name, value)
		{
			let rec = _record(name);
			if(rec.produced - rec.consumed + value > _freeCapacity(name)) { ret = false; }
		});
		return ret;
	};

	let _spend = function(amounts)
	{
		_forEach(amounts, function(name, value) { _record(name).consumed += value; });
	};

	let _produce = function(amounts)
	{
		_forEach(amounts, function(name, value) { _record(name).produced += value; });
	};

	let _addCapacity = function(amounts)
	{
		_forEach(amounts, function(name, value)
		{
			if(pools.has(name))
			{
				pools.get(name).capacity += value;
				return;
			}
			let rec = _record(name);
			if(rec.pool !== null)
			{
				pools.get(rec.pool).capacity += value;
			}
			else
			{
				rec.capacity += value;
			}
		});
	};

	/** azzera produzione, consumo e capacità del turno (lo stock resta) */
	let _resetTurn = function()
	{
		records.forEach(function(rec)
		{
			rec.produced = 0;
			rec.consumed = 0;
			rec.capacity = 0;
		});
		pools.forEach(function(pool) { pool.capacity = 0; });
	};

	/** consolida il turno: il surplus va in magazzino nei limiti della capacità, il deficit lo consuma */
	let _closeTurn = function()
	{
		records.forEach(function(rec, name)
		{
			let surplus = rec.produced - rec.consumed;
			if(surplus > 0)
			{
				let free = _freeCapacity(name);
				if(free > 0)
				{
					rec.stored += Math.min(surplus, free);
				}
			}
			else
			{
				rec.stored = Math.max(0, rec.stored + surplus);
			}
		});
	};

	//-----------------------------------------
	// modifiche dirette allo stock (eventi, inizializzazione)

	let _createStock = function(amounts)
	{
		_forEach(amounts, function(name, value) { _record(name).stored += value; });
	};

	let _destroyStock = function(amounts)
	{
		_forEach(amounts, function(name, value)
		{
			let rec = _record(name);
			rec.stored = Math.max(0, rec.stored - value);
		});
	};

	let _setStock = function(amounts)
	{
		_forEach(amounts, function(name, value) { _record(name).stored = value; });
	};

	//-----------------------------------------
	// lettura

	let _get = function(name, field)
	{
		let rec = _record(name);
		if(rec === undefined)
		{
			// pool: produzione, consumo e stock sono la somma dei membri
			let ret = 0;
			pools.get(name).members.forEach(function(member) { ret += _record(member)[field]; });
			return ret;
		}
		return rec[field];
	};

	//-----------------------------------------

	this.joinPool = _joinPool;
	this.isPooled = function(name) { let rec = _record(name); return rec !== undefined && rec.pool !== null; };
	this.isPool = function(name) { return pools.has(name); };
	this.getPool = function(name) { let rec = _record(name); return rec === undefined ? null : rec.pool; };
	this.getPoolMembers = function(poolName) { return pools.has(poolName) ? pools.get(poolName).members : undefined; };
	this.getPools = function() { return Array.from(pools.keys()); };
	this.getNames = function() { return names; };

	this.canAfford = _canAfford;
	this.hasRoomFor = _hasRoomFor;
	this.spend = _spend;
	this.produce = _produce;
	this.addCapacity = _addCapacity;
	this.resetTurn = _resetTurn;
	this.closeTurn = _closeTurn;

	this.createStock = _createStock;
	this.destroyStock = _destroyStock;
	this.setStock = _setStock;

	this.getAvailable = _available;
	this.getProduced = function(name) { return _get(name, "produced"); };
	this.getConsumed = function(name) { return _get(name, "consumed"); };
	this.getStored = function(name) { return _get(name, "stored"); };
	this.getCapacity = _capacity;
	this.getFreeCapacity = _freeCapacity;
	this.getPoolStored = _poolStored;
}

export { MaterialLedger };
