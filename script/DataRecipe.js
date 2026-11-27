"use strict";

import { RecipeLib, RecipeType } from "./RecipeLib.js";

//-----

RecipeLib.add(RecipeType.Production, "Robo-Worker", { discovery: ["Robotics"] }, 1, { labor: 1, productionUnit: 3, productionStandardStructure: 1, metalOre: 2 }, { roboWorker: 1 });
RecipeLib.add(RecipeType.Production, "Robo-Dozer",  { discovery: ["Robotics"] }, 2, { labor: 1, productionUnit: 2, productionStandardStructure: 1, metalOre: 4 }, { dozer: 1, fusionWaste: 2, toxicWaste: 1 });
RecipeLib.add(RecipeType.Production, "Robo-Miner",  { discovery: ["Robotics"] }, 3, { labor: 1, productionUnit: 3, productionStandardStructure: 1, metalOre: 6 }, { miner: 1, fusionWaste: 3, toxicWaste: 1 });
RecipeLib.add(RecipeType.Production, "Robo-Digger", { discovery: ["Robotics"] }, 3, { labor: 1, productionUnit: 2, productionStandardStructure: 1, metalOre: 4 }, { digger: 1, fusionWaste: 3, toxicWaste: 1 });

RecipeLib.add(RecipeType.Production, "MicrowaveSatellite",  { }, 3, { labor: 1, productionUnit: 3, productionStandardStructure: 1, ironBar: 2 }, { MicrowaveSatellite: 1 });

RecipeLib.add(RecipeType.Production, "RadioactiveBar", { technology: ["Tokamak"] }, 1, { labor: 1, productionUnit: 3, productionChemicalStructure: 1, radioactiveOre: 2 }, { radioactiveBar: 10, radioactiveWaste: 3 });

RecipeLib.add(RecipeType.Production, "Goods",   { technology: ["GoodsFactory"] }, 1, { labor: 1, goodsUnit: 10, productionStandardStructure: 1 },                   { goods: 10,  fusionWaste: 3 });
// componenti della navicella, preparati al cantiere dello spazioporto
RecipeLib.add(RecipeType.Production, "ShipHull",   { technology: ["SpacePort"] }, 10, { labor: 1, dockUnit: 1, productionUnit: 10, productionStandardStructure: 1, ironBar: 5 }, { shipHull: 1 });
RecipeLib.add(RecipeType.Production, "ShipEngine", { technology: ["SpacePort"] }, 8,  { labor: 1, dockUnit: 1, productionUnit: 10, productionChemicalStructure: 1, ironBar: 3 }, { shipEngine: 1 });
RecipeLib.add(RecipeType.Production, "ShipFuel",   { technology: ["SpacePort"] }, 5,  { labor: 1, dockUnit: 1, radioactiveBar: 4 }, { shipFuel: 1 });
RecipeLib.add(RecipeType.Production, "MediKit", { technology: ["PharmaceuticalIndustry"] }, 1, { labor: 1, pharmaceuticalUnit: 15, productionChemicalStructure: 1 }, { mediKit: 10, toxicWaste: 3 });

//-----

RecipeLib.add(RecipeType.Research, "ElectrostaticEnergy",	{ discovery: ["ElectrostaticDischarge"] },	2, { researchElaborationUnit: 1 },							{ technology: ["ElectrostaticCoil"] });
RecipeLib.add(RecipeType.Research, "GeothermalEnergy",		{ discovery: ["Resource_Fumarole"] },		2, { researchUnit: 10, researchStructureDeep: 1 },			{ technology: ["Geothermal"] });

RecipeLib.add(RecipeType.Research, "Metallurgy",			{ discovery: ["Resource_Metal"] },			6, { researchUnit: 4, researchStructureAuto: 1 },	{ theory: ["Extraction_Metal"] });
RecipeLib.add(RecipeType.Research, "Mineralogy",			{ discovery: ["Resource_Mineral"] },		6, { researchUnit: 4, researchStructureAuto: 1 },	{ theory: ["Extraction_Mineral"] });
RecipeLib.add(RecipeType.Research, "Chemistry",				{ theory: ["Extraction_Metal", "Extraction_Mineral"] },	14, { researchUnit: 4, researchStructureAuto: 1 },		{ theory: ["Chemistry"], technology: ["ChemicalFactory", "GoodsFactory"] });
RecipeLib.add(RecipeType.Research, "AdvancedMetallurgy",	{ theory: ["Extraction_Metal", "Extraction_Mineral"] },	5, { researchUnit: 5,  researchStructureUnderground: 1 },	{ theory: ["AdvancedMetallurgy"], technology: ["SmelterAdv", "RoboRemittanceAdv", "ResidentialAdv", "Depot"] });
RecipeLib.add(RecipeType.Research, "NuclearChemistry",		{ discovery: ["Resource_Radioactive"], theory: ["Chemistry"] },	3, { researchUnit: 5,  researchStructureUnderground: 1 },	{ theory: ["Extraction_Radioactive"] });

RecipeLib.add(RecipeType.Research, "Physics",				{ },										5, { researchUnit: 15, researchStructureSurface: 1 },		{ theory: ["Physics"] });
RecipeLib.add(RecipeType.Research, "QuantumPhysics",		{ theory: ["Physics", "AdvancedMetallurgy", "Chemistry", "AI"] },	25, { researchUnit: 50, researchStructureSurface: 2, researchStructureUnderground: 2, researchStructureDeep: 2, researchStructureSurfaceAdv: 1, researchStructureUndergroundAdv: 1, researchStructureDeepAdv: 1 },	{ technology: ["EnvironmentalControlAdv", "SpacePort"] });

RecipeLib.add(RecipeType.Research, "NuclearPhysics",		{ theory: ["Extraction_Radioactive"] },		5, { researchUnit: 10, researchStructureDeep: 1 },			{ technology: ["Tokamak"] });
RecipeLib.add(RecipeType.Research, "ParticlePhysics",		{ technology: ["Tokamak"] },				5, { researchUnit: 10, researchStructureDeep: 2, researchStructureDeepAdv: 1 },			{ technology: ["TokamakAdv"] });

RecipeLib.add(RecipeType.Research, "Hydroponics",			{ technology: ["Agridome"] },				3, { researchUnit: 5, researchStructureSurface: 1 },		{ technology: ["AgridomeAdv"] });
RecipeLib.add(RecipeType.Research, "Aquaponics",			{ technology: ["AgridomeAdv"] },			4, { researchUnit: 5, researchStructureSurface: 1 },		{ technology: ["AgridomeIntensive"] });
RecipeLib.add(RecipeType.Research, "Farming",				{ technology: ["AgridomeIntensive"] },		5, { researchUnit: 10, researchStructureUnderground: 1, researchStructureDeep: 2 },	{ technology: ["VerticalFarm"] });
RecipeLib.add(RecipeType.Research, "VerticalFarming",		{ technology: ["VerticalFarm"] },			8, { researchUnit: 10, researchStructureUnderground: 2, researchStructureDeep: 2 },	{ technology: ["VerticalFarmAdv"] });

RecipeLib.add(RecipeType.Research, "Medicine",				{ },										6, { researchUnit: 4, researchStructureAuto: 1 },	{ technology: ["MedicalStructure", "CryoCenter"], theory: ["Medicine"] });
RecipeLib.add(RecipeType.Research, "AdvancedMedicine",		{ theory: ["Medicine"] },					3, { researchUnit: 5, researchStructureDeep: 1 },			{ technology: ["MedicalStructureAdv", "MedicalResearchCenter"] });
// studi medici: solo nel Centro di ricerca medico (researchStructureMedical)
RecipeLib.add(RecipeType.Research, "Virus",					{ theory: ["Medicine"], technology: ["MedicalResearchCenter"] },	6, { researchUnit: 10, researchStructureMedical: 1 },	{ theory: ["Virus"] });
RecipeLib.add(RecipeType.Research, "Triage",				{ theory: ["Virus"] },						3, { researchUnit: 8, researchStructureMedical: 1 },		{ theory: ["Triage"] });
RecipeLib.add(RecipeType.Research, "AlienPathogen",			{ theory: ["Virus"], discovery: ["Alien_Nest"] },	6, { researchUnit: 15, researchStructureMedical: 1 },	{ theory: ["AlienPathogen"], technology: ["EpidemicResponseCore"] });
// vaccino: 3 turni con il Centro di ricerca medico a pieno personale (4 passi a turno)
RecipeLib.add(RecipeType.Research, "Vaccine",				{ theory: ["Medicine"], discovery: ["Alien_Nest"] },	3, { researchUnit: 5, researchStructureMedical: 1 },	{ theory: ["Vaccine"] });
RecipeLib.add(RecipeType.Research, "Pharmacology",			{ theory: ["Medicine"] },					6, { researchUnit: 4, researchStructureAuto: 1 },	{ technology: ["PharmaceuticalIndustry"] });
RecipeLib.add(RecipeType.Research, "Embryology",			{ theory: ["Medicine"] },					3, { researchUnit: 5, researchStructureUnderground: 1 },	{ technology: ["Nursery"] });

RecipeLib.add(RecipeType.Research, "ComputerScience",		{ },										8, { researchUnit: 10, researchStructureSurface: 2 },		{ theory: ["ComputerScience"] });
// superintelligenza
RecipeLib.add(RecipeType.Research, "AdvancedNeuralNetworks",	{ theory: ["AI"] },							10, { researchUnit: 40, researchStructureSurfaceAdv: 1 },	{ theory: ["NeuralNetworks"], technology: ["Mainframe"] });
RecipeLib.add(RecipeType.Research, "ArtificialConsciousness",	{ theory: ["NeuralNetworks"] },				15, { researchUnit: 60, researchStructureUndergroundAdv: 1, computeUnit: 1 },	{ theory: ["ArtificialConsciousness"] });
RecipeLib.add(RecipeType.Research, "Superintelligence",		{ theory: ["ArtificialConsciousness"] },	20, { researchUnit: 100, researchStructureDeepAdv: 1, computeUnit: 2 },	{ theory: ["Superintelligence"] });
// terraformazione
RecipeLib.add(RecipeType.Research, "Terraforming",				{ theory: ["Chemistry", "Physics"] },	10, { researchUnit: 40, researchStructureSurface: 2, researchStructureUnderground: 1 },	{ theory: ["Terraforming"], technology: ["Terraformer"] });
RecipeLib.add(RecipeType.Research, "AdvancedTerraforming",		{ theory: ["Terraforming", "AdvancedMetallurgy"] },	15, { researchUnit: 50, researchStructureSurfaceAdv: 1 },	{ technology: ["TerraformerAdv"] });
RecipeLib.add(RecipeType.Research, "AI",					{ theory: ["ComputerScience"] },			8, { researchUnit: 10, researchStructureSurface: 2 },		{ theory: ["AI"], technology: ["HotLabAdv", "LabAdv", "DeepLabAdv", "RoboCommanderAdv", "UnivesityAdv"] });

RecipeLib.add(RecipeType.Research, "HumanScience",		{ },										4, { researchUnit: 12, researchStructureSurface: 1 },		{ theory: ["HumanScience"] });
RecipeLib.add(RecipeType.Research, "Psicology",			{ theory: ["HumanScience"] },				8, { researchUnit: 20, researchStructureSurface: 1 },		{ theory: ["Psicology"] });
RecipeLib.add(RecipeType.Research, "Sociology",			{ theory: ["Psicology"] },					8, { researchUnit: 20, researchStructureSurface: 1 },		{ theory: ["Sociology"], technology: ["RecreationalFacility"] });
RecipeLib.add(RecipeType.Research, "SocialControl",		{ theory: ["Sociology"] },					20,{ researchUnit: 40, researchStructureSurface: 2 },		{ technology: ["Park"] });
//-----

	//productionWaste: { toxicWaste: 2 }
//, mineralOre: 20, cristalOre: 1
		/*

		productionStandardStructure
		productionChemicalStructure


		var productionUnit = colonyState.getRemainder("productionUnit");
		var productionStructure = colonyState.getRemainder("productionStructureSurface");
		var productionStructure = colonyState.getRemainder("productionStructureSurfaceAdv");
		var productionStructure = colonyState.getRemainder("productionStructureUnderground");
		var productionStructure = colonyState.getRemainder("productionStructureUndergroundAdv");
		var productionStructure = colonyState.getRemainder("productionStructureDeep");
		var productionStructure = colonyState.getRemainder("productionStructureDeepAdv");
		*/



//ResearchLib.add("ElectrostaticEnergy", { discovery: ["ElectrostaticDischarge"] }, 3, { researchUnit: 5, researchStructureUnderground: 1 }, { technology: ["ElectrostaticCoil"] });
/*
var cost = { researchUnit: 10, researchStructureUnderground: 1 };

var researchUnit = colonyState.getRemainder("researchUnit");
var researchStructure = colonyState.getRemainder("researchStructureSurface");
var researchStructure = colonyState.getRemainder("researchStructureSurfaceAdv");
var researchStructure = colonyState.getRemainder("researchStructureUnderground");
var researchStructure = colonyState.getRemainder("researchStructureUndergroundAdv");
var researchStructure = colonyState.getRemainder("researchStructureDeep");
var researchStructure = colonyState.getRemainder("researchStructureDeepAdv");
*/
