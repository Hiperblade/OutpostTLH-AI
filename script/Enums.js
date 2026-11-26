"use strict";

/** precedenza degli edifici con personale: prima Alta, poi Normale, poi Bassa */
let StaffPriority = {
	High: 0,
	Normal: 1,
	Low: 2
};

// enumerazioni condivise del dominio (nessuna dipendenza)

let Typology = {
	Vulcanic: "vulcanic",
	Asteroid: "asteroid",
	Ice: "ice",
	Desert: "desert",
	Jungle: "jungle",
	Rock: "rock",
	Stone: "stone"
};

let TerrainLayer = {
	Surface: "surface",
	Underground: "underground",
	Deep: "deep"
};

let Morphology = {
	Razed: "razed",
	Clear: "clear",
	Rough: "rough",
	Impervious: "impervious",
	Inaccessible: "inaccessible",
	Undiscovery: "undiscovered"
};

let StructureTypes = {
	Resource: "resource",
	Building: "building",
	Robot: "robot"
};

let PipeType = {
	NorthEastSouthWest: "nesw",
	NorthSouth: "ns",
	EastWest: "ew",
	Up: "u",
	Down: "d"
};

/** porte di ogni tipo di tubo: gli elevatori si collegano anche in orizzontale */
let PipePorts = {
	nesw: "nesw",
	ns: "ns",
	ew: "ew",
	u: "neswu",
	d: "neswd"
};

let RobotTypes = {
	Dozer: "RoboDozer",
	Digger: "RoboDigger",
	Miner: "RoboMiner"
};

export { StaffPriority, Typology, TerrainLayer, Morphology, StructureTypes, PipeType, PipePorts, RobotTypes };
