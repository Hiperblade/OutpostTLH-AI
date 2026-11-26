"use strict";

import { PipeType, TerrainLayer } from "./Enums.js";
import { AreaTypes, PrototypeLib } from "./PrototypeLib.js";

 
// parametri dei prototipi: vedi BasePrototype in PrototypeLib.js

//-------------------------------------------------------------
// landing

PrototypeLib.add("LandingModule", TerrainLayer.Surface, 1, {}, { production: { controlUnit: 4 },
	builder: "LandingPoint",
	ports: "nesw",
	headquarter: true,
	canPlace: function(position, map)
		{
			// serve un'area 3x3 senza risorse, lontana dal bordo
			if((position.x <= 1) || (position.y <= 1) ||
				(position.x >= map.getSize().x - 1) || (position.y >= map.getSize().y - 1))
			{
				return false;
			}
			for(let dx = -1; dx <= 1; dx++)
			{
				for(let dy = -1; dy <= 1; dy++)
				{
					if(map.findResource({ x: position.x + dx, y: position.y + dy }) != null)
					{
						return false;
					}
				}
			}
			return true;
		},
	onPlaced: function(item, map)
		{
			map.getState().delKnowledge({ technology: [ "LandingModule" ] });
			// il kit di atterraggio: satellite e RoboWorker per avviare i cantieri
			map.getState().createMaterials({ MicrowaveSatellite: 1, roboWorker: 10 });
		},
	onCompleted: function(item, map)
		{
			let position = item.getPosition();
			map.addPipe(PipeType.NorthEastSouthWest, TerrainLayer.Surface, { x: position.x - 1, y: position.y } );
			map.addPipe(PipeType.NorthEastSouthWest, TerrainLayer.Surface, { x: position.x - 1, y: position.y + 1} );
			map.addPipe(PipeType.NorthEastSouthWest, TerrainLayer.Surface, { x: position.x, y: position.y - 1} );
			map.addPipe(PipeType.NorthEastSouthWest, TerrainLayer.Surface, { x: position.x + 1, y: position.y - 1} );

			map.addBuilding("CommandCenter", { x: position.x - 1, y: position.y - 1 } );
			map.addBuilding("SupportModule", { x: position.x + 1, y: position.y } );
			map.addBuilding("CargoModule", { x: position.x, y: position.y + 1 } );
			map.addBuilding("LaunchModule", { x: position.x + 1, y: position.y + 1 } );

			map.getState().addKnowledge({ technology: [
				"MicrowavePlant",
					//"ElectrostaticCoil",
					//"Geothermal",
					//"Tokamak",
					//"TokamakAdv",
				"Capacitor",			
					//"CommandCenter",
				"MaintenanceCenter",
				"RoboRemittance",
					//"RoboRemittanceAdv",
				"RoboCommander",
					//"RoboCommanderAdv",
				"EnvironmentalControl",
					//"EnvironmentalControlAdv",
				"Agridome",
					//"AgridomeAdv",
					//"AgridomeIntensive",
					//"VerticalFarm",
					//"VerticalFarmAdv",
				"Residential",
					//"ResidentialAdv",
					//"Nursery",
					//"MedicalStructure",
					//"MedicalStructureAdv",
				"School",
				"Univesity",
					//"UnivesityAdv",
					//"RecreationalFacility",
					//"Park",
				"Warehouse",
				"WasteTreatment",
				"Smelter",
					//"SmelterAdv",
				"StorageArea",
					//"GoodsFactory",
				"IndustrialFactory",
					//"ChemicalFactory",
					//"PharmaceuticalIndustry",
					//"SpacePort",
				"AutoLab",
				"HotLab",
					//"HotLabAdv",
				"Lab",
					//"LabAdv",
				"DeepLab"
				] });

			// robot di cantiere (niente scorte di cibo né capsule: le prepara il Centro Criogenico)
			map.getState().createMaterials({ dozer: 3, digger: 1, miner: 2 });
			map.getState().setKitDelivered();
		}
	});

PrototypeLib.add("SupportModule", TerrainLayer.Surface, 2, {}, { production: { power: 200 }, ports: "se" });

PrototypeLib.add("LaunchModule", TerrainLayer.Surface, 2, {}, {
	builder: "LandingPoint",
	ports: "sw",
	onCompleted: function(item, map)
		{
			item.setFrozen(true);
		}
	});

// il modulo cargo ospita anche i robot del kit, con spazio per i primi robot prodotti
PrototypeLib.add("CargoModule", TerrainLayer.Surface, 2, {}, { capacity: { genericStorage: 200, roboticStorage: 30 },
	builder: "LandingPoint",
	ports: "nw",
	onCompleted: function(item, map)
		{
			item.setFrozen(true);
		}
	});

//-------------------------------------------------------------
// produzione elettrica

PrototypeLib.add("MicrowavePlant", TerrainLayer.Surface, 1, { MicrowaveSatellite: 1 }, { production: { power: 500 } });
PrototypeLib.add("ElectrostaticCoil", TerrainLayer.Surface, 3, {}, { production: { power: 100 } });
PrototypeLib.add("Geothermal", TerrainLayer.Deep, 10, {}, { requiredResource: "Fumarole", production: { power: 2000 } });

PrototypeLib.add("StorageArea", TerrainLayer.Deep, 2, {}, { consumption: { power: 10 }, capacity: { radioactiveStorage: 100 } });
PrototypeLib.add("Tokamak", TerrainLayer.Surface, 4, {}, { consumption: { radioactiveBar: 1 }, production: { power: 1000 },
	parts: [ { type: "TokamakReactor" } ] });
PrototypeLib.add("TokamakReactor", TerrainLayer.Underground, 1000, {});

PrototypeLib.add("TokamakAdv", TerrainLayer.Surface, 8, { ironBar: 1 }, { consumption: { radioactiveBar: 1 }, production: { power: 1500 },
	parts: [ { type: "TokamakReactorAdv" } ] });
PrototypeLib.add("TokamakReactorAdv", TerrainLayer.Underground, 1000, {});

PrototypeLib.add("Capacitor", TerrainLayer.Surface, 2, {}, { capacity: { power: 1000 } });

//-------------------------------------------------------------
// logistica

PrototypeLib.addPipe(PipeType.NorthEastSouthWest, TerrainLayer.Surface, 1, {}, { consumption: { power: 1 } });
PrototypeLib.addPipe(PipeType.NorthSouth, TerrainLayer.Surface, 1, {}, { consumption: { power: 1 } });
PrototypeLib.addPipe(PipeType.EastWest, TerrainLayer.Surface, 1, {}, { consumption: { power: 1 } });
PrototypeLib.addPipe(PipeType.Down, TerrainLayer.Surface, 3, {}, { consumption: { power: 1 },
	canPlace: function(position, map)
		{
			return (map.findBuilding(position, TerrainLayer.Underground) == null) &&
				(map.findResource(position, TerrainLayer.Underground) == null);
		},
	onPlaced: function(item, map)
		{
			map.addPipe(PipeType.Up, TerrainLayer.Underground, item.getPosition());
		},
	onDestroyed: function(item, map)
		{
			let building = map.findBuilding(item.getPosition(), TerrainLayer.Underground);
			if(building != null)
			{
				building.destroy();
			}
		}
	});

PrototypeLib.addPipe(PipeType.NorthEastSouthWest, TerrainLayer.Underground, 1, {}, { consumption: { power: 1 } });
PrototypeLib.addPipe(PipeType.NorthSouth, TerrainLayer.Underground, 1, {}, { consumption: { power: 1 } });
PrototypeLib.addPipe(PipeType.EastWest, TerrainLayer.Underground, 1, {}, { consumption: { power: 1 } });
PrototypeLib.addPipe(PipeType.Down, TerrainLayer.Underground, 6, {}, { consumption: { power: 1 },
	canPlace: function(position, map)
		{
			return (map.findBuilding(position, TerrainLayer.Deep) == null) &&
				(map.findResource(position, TerrainLayer.Deep) == null);
		},
	onPlaced: function(item, map)
		{
			map.addPipe(PipeType.Up, TerrainLayer.Deep, item.getPosition());
		},
	onDestroyed: function(item, map)
		{
			let building = map.findBuilding(item.getPosition(), TerrainLayer.Deep);
			if(building != null)
			{
				building.destroy();
			}
		}
	});
PrototypeLib.addPipe(PipeType.Up, TerrainLayer.Underground, 3, {}, { consumption: { power: 1 },
	onCompleted: function(item, map)
		{
			map.discoveryNearTiles(item.getPosition(), item.getLayer());
		},
	onDestroyed: function(item, map)
		{
			let building = map.findBuilding(item.getPosition(), TerrainLayer.Surface);
			if(building != null)
			{
				building.destroy();
			}
		}
	});

PrototypeLib.addPipe(PipeType.NorthEastSouthWest, TerrainLayer.Deep, 2, {}, { consumption: { power: 2 } });
PrototypeLib.addPipe(PipeType.NorthSouth, TerrainLayer.Deep, 2, {}, { consumption: { power: 2 } });
PrototypeLib.addPipe(PipeType.EastWest, TerrainLayer.Deep, 2, {}, { consumption: { power: 2 } });
PrototypeLib.addPipe(PipeType.Up, TerrainLayer.Deep, 6, {}, { consumption: { power: 2 },
	onCompleted: function(item, map)
		{
			map.discoveryNearTiles(item.getPosition(), item.getLayer());
		},
	onDestroyed: function(item, map)
		{
			let building = map.findBuilding(item.getPosition(), TerrainLayer.Underground);
			if(building != null)
			{
				building.destroy();
			}
		}
	});

//-------------------------------------------------------------
// gestionali

PrototypeLib.add("CommandCenter", TerrainLayer.Surface, 3, {}, { consumption: { power: 10 }, production: { repairUnit: 500, researchElaborationUnit: 4 },
	ports: "nesw",
	headquarter: true
	});
PrototypeLib.add("MaintenanceCenter", TerrainLayer.Surface, 3, { metalOre: 5 }, { consumption: { power: 20 }, production: { repairUnit: 1000, emergencyTeamUnit: 1 } });

//-------------------------------------------------------------
// gestione robot

PrototypeLib.add("RoboRemittance", TerrainLayer.Surface, 2, {}, { consumption: { power: 5 }, capacity: { roboticStorage: 10 } });
PrototypeLib.add("RoboRemittanceAdv", TerrainLayer.Surface, 2, { ironBar: 1 }, { consumption: { power: 5 }, capacity: { roboticStorage: 20 } });

PrototypeLib.add("RoboCommander", TerrainLayer.Surface, 3, {}, { consumption: { power: 25 }, production: { controlUnit: 8 } });
PrototypeLib.add("RoboCommanderAdv", TerrainLayer.Surface, 4, { ironBar: 1 }, { consumption: { power: 30 }, production: { controlUnit: 16 } });

//-------------------------------------------------------------
// risorse

PrototypeLib.addResource("Metal", TerrainLayer.Surface, "#22BBFF");
PrototypeLib.addResource("Mineral", TerrainLayer.Underground, "#AAAAFF");
PrototypeLib.addResource("Radioactive", TerrainLayer.Deep, "#77FF77");
PrototypeLib.addResource("Fumarole", TerrainLayer.Deep, "#FF9900");

PrototypeLib.addMine("Metal", TerrainLayer.Surface, 2, {}, { requiredResource: "Metal", consumption: { power: 5 }, production: { metalOre: 10 }, capacity: { metalOre: 50 },
	parts: [ { type: "Mine" } ] });

PrototypeLib.addMine("Mineral", TerrainLayer.Underground, 2, {}, { requiredResource: "Mineral", consumption: { power: 5 }, production: { cristalOre: 2, mineralOre: 10 }, capacity: { cristalOre: 10, mineralOre: 40 },
	parts: [ { type: "MineDeep" } ] });

PrototypeLib.addMine("Radioactive", TerrainLayer.Deep, 2, {}, { requiredResource: "Radioactive", consumption: { power: 5 }, production: { radioactiveOre: 2 }, capacity: { radioactiveOre: 4 } });

// pozzi delle miniere sui layer inferiori
PrototypeLib.add("Mine", TerrainLayer.Underground, 1000, {});
PrototypeLib.add("MineDeep", TerrainLayer.Deep, 1000, {});

//-------------------------------------------------------------
// sussistenza

PrototypeLib.add("EnvironmentalControl", TerrainLayer.Surface, 5, {}, { consumption: { power: 80 }, production: { habitatUnit: 50, habitatResidentialUnit: 20 } } );
PrototypeLib.add("EnvironmentalControlAdv", TerrainLayer.Surface, 10, { ironBar: 1 }, { consumption: { power: 80 }, production: { habitatUnit: 100, habitatResidentialUnit: 50 } } );

PrototypeLib.add("Agridome", TerrainLayer.Surface, 3, {}, { consumption: { power: 5 }, production: { foodUnit: 10 }, capacity: { foodUnit: 50 } });
PrototypeLib.add("AgridomeAdv", TerrainLayer.Surface, 4, { ironBar: 1 }, { consumption: { power: 5 }, production: { foodUnit: 20 }, capacity: { foodUnit: 50 } });
PrototypeLib.add("AgridomeIntensive", TerrainLayer.Surface, 5, {}, { consumption: { power: 15 }, production: { foodUnit: 40 }, capacity: { foodUnit: 50 } });

PrototypeLib.add("VerticalFarm", TerrainLayer.Deep, 8, {}, { consumption: { power: 15 }, production: { foodUnit: 50 }, capacity: { foodUnit: 100 } });
PrototypeLib.add("VerticalFarmAdv", TerrainLayer.Deep, 8, { ironBar: 1 }, { consumption: { power: 20 }, production: { foodUnit: 70 }, capacity: { foodUnit: 100 } });

PrototypeLib.add("Residential", TerrainLayer.Underground, 4, {}, { consumption: { power: 15, habitatResidentialUnit: 2 }, production: { residentialUnit: 16 } });
PrototypeLib.add("ResidentialAdv", TerrainLayer.Underground, 5, { ironBar: 1 }, { consumption: { power: 25, habitatResidentialUnit: 4 }, production: { residentialUnit: 32 } });

// asilo: 4 unità a turno; un gruppo di 5 bambini ogni 8 unità (2 turni a pieno personale), vedi PopulationPhase
PrototypeLib.add("Nursery", TerrainLayer.Underground, 20, {}, { staff: 3, consumption: { power: 20 }, production: { nurseryUnit: 4 } });

// capsule criogeniche: ne prepara una a turno con i minerali (CapsulePhase), fino a 10; risveglia fino a 5 cloni a turno, senza personale
PrototypeLib.add("CryoCenter", TerrainLayer.Underground, 6, {}, { consumption: { power: 50 }, production: { cryoRevival: 5 }, capacity: { cryoCapsule: 10 } });

// strutture mediche: unità mediche per il Benessere e cure (1 Kit Medico per malato), fino a "cures" a turno
PrototypeLib.add("MedicalStructure", TerrainLayer.Underground, 10, {}, { staff: 3, cures: 1, consumption: { power: 20, pharmaceuticalUnit: 5 }, production: { medicalUnit: 15 } });
PrototypeLib.add("MedicalStructureAdv", TerrainLayer.Underground, 10, { ironBar: 1 }, { staff: 3, cures: 3, consumption: { power: 30, pharmaceuticalUnit: 10 }, production: { medicalUnit: 30 } });

PrototypeLib.add("School", TerrainLayer.Underground, 6, {}, { staff: 3, consumption: { power: 20 }, production: { educationUnit: 80 } });
PrototypeLib.add("Univesity", TerrainLayer.Underground, 8, {}, { staff: 3, consumption: { power: 30 }, production: { highEducationUnit: 30 } });
PrototypeLib.add("UnivesityAdv", TerrainLayer.Underground, 8, { ironBar: 1 }, { staff: 3, consumption: { power: 30 }, production: { highEducationUnit: 60 } });

PrototypeLib.add("RecreationalFacility", TerrainLayer.Underground, 15, {}, { staff: 3, consumption: { power: 80 }, production: { recreationalUnit: 60 } });

PrototypeLib.add("Park", TerrainLayer.Deep, 4, {}, { staff: 3, consumption: { power: 80 }, production: { recreationalUnit: 120 },
	imageId: "Park_mini",
	areaType: AreaTypes.Four,
	parts: [
		{ type: "Park_w", dx: 0, dy: -1 },
		{ type: "Park_n", dx: 1, dy: -1 },
		{ type: "Park_e", dx: 1, dy: 0 }
	] });
PrototypeLib.add("Park_w", TerrainLayer.Deep, 1, {});
PrototypeLib.add("Park_n", TerrainLayer.Deep, 1, {});
PrototypeLib.add("Park_e", TerrainLayer.Deep, 1, {});

//-------------------------------------------------------------
// produzione

// smaltimento degli scarti di fusione e tossici (gli scarti radioattivi si possono solo stoccare)
PrototypeLib.add("WasteTreatment", TerrainLayer.Surface, 4, {}, { consumption: { power: 30 }, disposal: { fusionWaste: 10, toxicWaste: 10 } });

PrototypeLib.add("Warehouse", TerrainLayer.Surface, 2, {}, { consumption: { power: 5 }, capacity: { genericStorage: 100 } });

PrototypeLib.add("Smelter", TerrainLayer.Surface, 6, {}, { consumption: { power: 40, metalOre: 5 }, production: { ironBar: 3 }});
PrototypeLib.add("SmelterAdv", TerrainLayer.Surface, 7, { ironBar: 1 }, { consumption: { power: 40, metalOre: 10 }, production: { ironBar: 8 }});

PrototypeLib.add("GoodsFactory", TerrainLayer.Surface, 10, {}, { staff: 5, consumption: { power: 40, mineralOre: 4, metalOre: 2 }, production: { goodsUnit: 30 }});
PrototypeLib.add("PharmaceuticalIndustry", TerrainLayer.Surface, 20, {}, { staff: 5, consumption: { power: 40, mineralOre: 10, cristalOre: 4 }, production: { pharmaceuticalUnit: 60 }});

PrototypeLib.add("IndustrialFactory", TerrainLayer.Surface, 12, {}, { consumption: { power: 40 }, production: { productionUnit: 40, productionStandardStructure: 1 } });
PrototypeLib.add("ChemicalFactory", TerrainLayer.Surface, 15, {}, { staff: 5, consumption: { power: 80 }, production: { productionUnit: 80, productionChemicalStructure: 1  } });

//-------------------------------------------------------------
// ricerca

PrototypeLib.add("HotLab", TerrainLayer.Surface, 4, {}, { staff: 5, consumption: { power: 20 }, production: { researchUnit: 32, researchStructureSurface: 12 } });
PrototypeLib.add("HotLabAdv", TerrainLayer.Surface, 8, { ironBar: 1 }, { staff: 5, consumption: { power: 80 }, production: { researchUnit: 128, researchStructureSurface: 24, researchStructureSurfaceAdv: 4 } });
PrototypeLib.add("Lab", TerrainLayer.Underground, 6, {}, { staff: 5, consumption: { power: 25 }, production: { researchUnit: 40, researchStructureUnderground: 8 } });
PrototypeLib.add("LabAdv", TerrainLayer.Underground, 8, { ironBar: 1 }, { staff: 5, consumption: { power: 50 }, production: { researchUnit: 60, researchStructureUnderground: 16, researchStructureUndergroundAdv: 4 } });
PrototypeLib.add("DeepLab", TerrainLayer.Deep, 10, {}, { staff: 5, consumption: { power: 100 }, production: { researchUnit: 80, researchStructureDeep: 4 } });
PrototypeLib.add("DeepLabAdv", TerrainLayer.Deep, 10, { ironBar: 1 }, { staff: 5, consumption: { power: 150 }, production: { researchUnit: 120, researchStructureDeep: 8, researchStructureDeepAdv: 4 } });

// fase di preparazione: ricerca senza coloni
PrototypeLib.add("AutoLab", TerrainLayer.Surface, 4, {}, { consumption: { power: 30 }, production: { researchUnit: 16, researchStructureAuto: 4 } });

//-------------------------------------------------------------
// speciali

PrototypeLib.add("SpacePort", TerrainLayer.Surface, 4, {}, { consumption: { power: 200 }, production: {  },
	imageId: "SpacePort_mini",
	areaType: AreaTypes.Four,
	parts: [
		{ type: "SpacePort_w", dx: 0, dy: -1 },
		{ type: "SpacePort_n", dx: 1, dy: -1 },
		{ type: "SpacePort_e", dx: 1, dy: 0 },
		{ type: "SpacePort_u", dx: 0, dy: 0 },
		{ type: "SpacePort_u_w", dx: 0, dy: -1 },
		{ type: "SpacePort_u_n", dx: 1, dy: -1 },
		{ type: "SpacePort_u_e", dx: 1, dy: 0 }
	] });

PrototypeLib.add("SpacePort_w", TerrainLayer.Surface, 1, {});
PrototypeLib.add("SpacePort_n", TerrainLayer.Surface, 1, {});
PrototypeLib.add("SpacePort_e", TerrainLayer.Surface, 1, {});
PrototypeLib.add("SpacePort_u", TerrainLayer.Underground, 1, {});
PrototypeLib.add("SpacePort_u_w", TerrainLayer.Underground, 1, {});
PrototypeLib.add("SpacePort_u_n", TerrainLayer.Underground, 1, {});
PrototypeLib.add("SpacePort_u_e", TerrainLayer.Underground, 1, {});
