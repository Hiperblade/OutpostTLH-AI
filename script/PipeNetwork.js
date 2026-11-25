"use strict";

import { StructureTypes, TerrainLayer } from "./Enums.js";

/**
 * Pipe network: quali edifici sono collegati tra loro tramite tubi (ed edifici con porte).
 *
 * Interfaccia:
 *   PipeNetwork.networksOf(structure) -> BuildingGraph[]
 *
 * Regole di collegamento (nord = x+1, sud = x-1, est = y+1, ovest = y-1):
 *   - due elementi con porte adiacenti sullo stesso layer sono collegati se le porte si fronteggiano
 *     (es. A sud di B: A.haveNorth() && B.haveSouth());
 *   - un elevatore con porta "su" (non distrutto) collega la rete del layer inferiore all'elemento
 *     con porta "giù" nella stessa posizione del layer superiore;
 *   - un edificio senza porte appartiene alla prima rete con Headquarter che ha una porta rivolta verso di lui.
 * Le reti senza Headquarter e gli edifici non collegati finiscono tutti in un'unica rete "orfana",
 * sempre ultima nell'elenco.
 */
function PipeNetworkConstructor()
{
	const LAYER_ORDER = [TerrainLayer.Surface, TerrainLayer.Underground, TerrainLayer.Deep];
	const LAYER_ABOVE = {};
	LAYER_ABOVE[TerrainLayer.Underground] = TerrainLayer.Surface;
	LAYER_ABOVE[TerrainLayer.Deep] = TerrainLayer.Underground;

	// direzioni: spostamento e porte che devono fronteggiarsi (from -> to)
	const DIRECTIONS = [
		{ dx: 1, dy: 0, from: "haveNorth", to: "haveSouth" },
		{ dx: -1, dy: 0, from: "haveSouth", to: "haveNorth" },
		{ dx: 0, dy: 1, from: "haveEast", to: "haveWest" },
		{ dx: 0, dy: -1, from: "haveWest", to: "haveEast" }
	];

	let _key = function(layer, x, y) { return layer + "|" + x + "|" + y; };

	let _networksOf = function(structure)
	{
		let buildings = structure.filter(function(el) { return el.getType() == StructureTypes.Building; });
		let pipes = buildings.filter(function(el) { return el.isPipe(); });
		let others = buildings.filter(function(el) { return !el.isPipe(); });

		// union-find sugli elementi con porte
		let parent = pipes.map(function(el, i) { return i; });
		let find = function(i) { while(parent[i] != i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
		let union = function(a, b) { a = find(a); b = find(b); if(a != b) { parent[Math.max(a, b)] = Math.min(a, b); } };

		let byCell = new Map();
		pipes.forEach(function(el, i) { byCell.set(_key(el.getLayer(), el.getPosition().x, el.getPosition().y), i); });
		let at = function(layer, x, y) { let i = byCell.get(_key(layer, x, y)); return (i === undefined) ? -1 : i; };

		pipes.forEach(function(el, i)
		{
			let p = el.getPosition();
			// stesso layer: basta guardare verso nord ed est, gli altri lati sono simmetrici
			[DIRECTIONS[0], DIRECTIONS[2]].forEach(function(d)
			{
				let j = at(el.getLayer(), p.x + d.dx, p.y + d.dy);
				if(j >= 0 && el[d.from]() && pipes[j][d.to]())
				{
					union(i, j);
				}
			});
			// elevatori
			let above = LAYER_ABOVE[el.getLayer()];
			if(above !== undefined && el.haveUp() && !el.isDestroyed())
			{
				let j = at(above, p.x, p.y);
				if(j >= 0 && pipes[j].haveDown())
				{
					union(i, j);
				}
			}
		});

		// raggruppamento, nell'ordine: layer dall'alto, poi ordine della struttura
		let groups = new Map();
		let order = pipes.map(function(el, i) { return i; }).sort(function(a, b)
		{
			return (LAYER_ORDER.indexOf(pipes[a].getLayer()) - LAYER_ORDER.indexOf(pipes[b].getLayer())) || (a - b);
		});
		order.forEach(function(i)
		{
			let root = find(i);
			if(!groups.has(root)) { groups.set(root, []); }
			groups.get(root).push(i);
		});

		let headquarterNetworks = [];
		let orphanPipes = [];
		groups.forEach(function(members)
		{
			let elements = members.map(function(i) { return pipes[i]; });
			if(elements.some(function(el) { return el.isHeadquarter(); }))
			{
				headquarterNetworks.push({ pipes: elements, cells: members, buildings: [] });
			}
			else
			{
				orphanPipes = orphanPipes.concat(elements);
			}
		});

		// edifici senza porte: alla prima rete con Headquarter che ha una porta rivolta verso di loro
		let orphanBuildings = [];
		others.forEach(function(el)
		{
			let p = el.getPosition();
			let network = headquarterNetworks.find(function(net)
			{
				return DIRECTIONS.some(function(d)
				{
					let j = at(el.getLayer(), p.x + d.dx, p.y + d.dy);
					return j >= 0 && net.cells.indexOf(j) >= 0 && pipes[j][d.to]();
				});
			});
			if(network !== undefined) { network.buildings.push(el); }
			else { orphanBuildings.push(el); }
		});

		let ret = headquarterNetworks.map(function(net) { return BuildingGraph.of(net.pipes.concat(net.buildings)); });
		let orphan = orphanPipes.concat(orphanBuildings);
		if(orphan.length > 0)
		{
			ret.push(BuildingGraph.of(orphan));
		}
		return ret;
	};

	this.networksOf = _networksOf;
}

// singleton
let PipeNetwork = new PipeNetworkConstructor();

//-----------------------------------------------------------------------------

/**
 * Rete di edifici collegati: oggetto indicizzato per tipo di edificio
 * (graph[buildingType] = [edifici di quel tipo]).
 */
function BuildingGraph()
{
}

/** @param {Building[]} buildings */
BuildingGraph.of = function(buildings)
{
	let graph = new BuildingGraph();
	buildings.forEach(function(building)
	{
		let buildingType = building.getBuildingType();
		if(!graph.hasOwnProperty(buildingType))
		{
			graph[buildingType] = [];
		}
		graph[buildingType].push(building);
	});
	return graph;
};

/**
 * @param {BuildingGraph} graph
 * @param {function(Building)} fn
 */
BuildingGraph.forEachBuilding = function(graph, fn)
{
	for(let buildingType in graph)
	{
		if(graph.hasOwnProperty(buildingType))
		{
			graph[buildingType].forEach(fn);
		}
	}
};

/** @param {BuildingGraph} graph */
BuildingGraph.countAll = function(graph)
{
	let ret = 0;
	BuildingGraph.forEachBuilding(graph, function() { ret++; });
	return ret;
};

/** @param {BuildingGraph} graph */
BuildingGraph.countPipes = function(graph)
{
	let ret = 0;
	BuildingGraph.forEachBuilding(graph, function(building) { if(building.isPipe()) { ret++; } });
	return ret;
};

/** @param {BuildingGraph} graph */
BuildingGraph.getHeadquarter = function(graph)
{
	let ret = null;
	BuildingGraph.forEachBuilding(graph, function(building) { if(ret === null && building.isHeadquarter()) { ret = building; } });
	return ret;
};

/** @param {BuildingGraph} graph */
BuildingGraph.hasHeadquarter = function(graph)
{
	return (BuildingGraph.getHeadquarter(graph) != null);
};

export { PipeNetworkConstructor, PipeNetwork, BuildingGraph };
