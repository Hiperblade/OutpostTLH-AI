"use strict";

import { imagesList } from "./DataImagesLib.js";
import { Typology } from "./Enums.js";

/**
 * Tipi di pianeta: colore usato dai segnaposto e numero di giacimenti di ciascuna risorsa nel sito.
 */
let PlanetTypes = {};
PlanetTypes[Typology.Vulcanic] = { color: "#c0392b", resources: { Metal: 50, Mineral: 30, Radioactive: 20, Fumarole: 20 } };
PlanetTypes[Typology.Asteroid] = { color: "#8a8a8a", resources: { Metal: 90, Mineral: 30, Radioactive: 10, Fumarole: 0 } };
PlanetTypes[Typology.Ice] = { color: "#a9cce3", resources: { Metal: 40, Mineral: 60, Radioactive: 5, Fumarole: 5 } };
PlanetTypes[Typology.Desert] = { color: "#d4ac0d", resources: { Metal: 50, Mineral: 60, Radioactive: 15, Fumarole: 5 } };
PlanetTypes[Typology.Jungle] = { color: "#27ae60", resources: { Metal: 60, Mineral: 40, Radioactive: 5, Fumarole: 10 } };
PlanetTypes[Typology.Rock] = { color: "#a04000", resources: { Metal: 70, Mineral: 40, Radioactive: 10, Fumarole: 10 } };
PlanetTypes[Typology.Stone] = { color: "#7f8c8d", resources: { Metal: 60, Mineral: 50, Radioactive: 10, Fumarole: 5 } };

/**
 * Catalogo dei pianeti e dei loro siti.
 *
 * pianeta: { id, name, typology, image? }
 *   image: { fileName, cols, rows }  foglio di animazione (fotogrammi quadrati in griglia), opzionale
 * sito: { id, name, photo?, terrain }
 *   photo: { fileName }              foto del sito, 300x150, opzionale
 *   terrain: { fileName }            mappa del terreno 300x150 (verde = sgombro, giallo = accidentato,
 *                                    rosso = impervio, nero = inaccessibile; 1 pixel = 1 casella)
 *   terrain: { seed }                terreno generato (segnaposto finché non c'è una mappa disegnata)
 *
 * Pianeti e siti hanno le loro immagini (images/planets/ e images/planets/Sites/); il terreno dei siti è
 * ancora generato dal seed: per un terreno disegnato basta aggiungere terrain.fileName.
 */
let PlanetCatalog = [
	{ id: "ignis", name: "Ignis", typology: Typology.Vulcanic, image: { fileName: "planets/Planet_Vulcanic.png", cols: 1, rows: 1 }, sites: [
		{ id: "1", name: "Caldera", photo: { fileName: "planets/Sites/Site_Vulcanic_1.BMP" }, terrain: { seed: 101 } },
		{ id: "2", name: "Colate", photo: { fileName: "planets/Sites/Site_Vulcanic_2.BMP" }, terrain: { seed: 102 } },
		{ id: "3", name: "Fumarole", photo: { fileName: "planets/Sites/Site_Vulcanic_3.BMP" }, terrain: { seed: 103 } },
		{ id: "4", name: "Crateri", photo: { fileName: "planets/Sites/Site_Vulcanic_4.BMP" }, terrain: { seed: 104 } },
		{ id: "5", name: "Lava", photo: { fileName: "planets/Sites/Site_Vulcanic_5.BMP" }, terrain: { seed: 105 } } ] },
	{ id: "ceres", name: "Ceres", typology: Typology.Asteroid, image: { fileName: "planets/Planet_Asteroid.png", cols: 1, rows: 1 }, sites: [
		{ id: "1", name: "Cratere maggiore", photo: { fileName: "planets/Sites/Site_Asteroid_1.BMP" }, terrain: { seed: 201 } },
		{ id: "2", name: "Faglia", photo: { fileName: "planets/Sites/Site_Asteroid_2.BMP" }, terrain: { seed: 202 } },
		{ id: "3", name: "Polo", photo: { fileName: "planets/Sites/Site_Asteroid_3.BMP" }, terrain: { seed: 203 } },
		{ id: "4", name: "Regolite", photo: { fileName: "planets/Sites/Site_Asteroid_4.BMP" }, terrain: { seed: 204 } },
		{ id: "5", name: "Massi", photo: { fileName: "planets/Sites/Site_Asteroid_5.BMP" }, terrain: { seed: 205 } } ] },
	{ id: "glacies", name: "Glacies", typology: Typology.Ice, image: { fileName: "planets/Planet_ice.png", cols: 1, rows: 1 }, sites: [
		{ id: "1", name: "Banchisa", photo: { fileName: "planets/Sites/Site_Ice_1.BMP" }, terrain: { seed: 301 } },
		{ id: "2", name: "Crepacci", photo: { fileName: "planets/Sites/Site_Ice_2.BMP" }, terrain: { seed: 302 } },
		{ id: "3", name: "Altopiano", photo: { fileName: "planets/Sites/Site_Ice_3.BMP" }, terrain: { seed: 303 } },
		{ id: "4", name: "Ghiacciaio", photo: { fileName: "planets/Sites/Site_Ice_4.BMP" }, terrain: { seed: 304 } },
		{ id: "5", name: "Geyser", photo: { fileName: "planets/Sites/Site_Ice_5.BMP" }, terrain: { seed: 305 } } ] },
	{ id: "arida", name: "Arida", typology: Typology.Desert, image: { fileName: "planets/Planet_Desert.png", cols: 1, rows: 1 }, sites: [
		{ id: "1", name: "Dune", photo: { fileName: "planets/Sites/Site_Desert_1.png" }, terrain: { seed: 401 } },
		{ id: "2", name: "Canyon", photo: { fileName: "planets/Sites/Site_Desert_2.BMP" }, terrain: { seed: 402 } },
		{ id: "3", name: "Piana", photo: { fileName: "planets/Sites/Site_Desert_3.BMP" }, terrain: { seed: 403 } },
		{ id: "4", name: "Oasi", photo: { fileName: "planets/Sites/Site_Desert_4.BMP" }, terrain: { seed: 404 } },
		{ id: "5", name: "Erg", photo: { fileName: "planets/Sites/Site_Desert_5.BMP" }, terrain: { seed: 405 } } ] },
	{ id: "silva", name: "Silva", typology: Typology.Jungle, image: { fileName: "planets/Planet_Jungle.png", cols: 1, rows: 1 }, sites: [
		{ id: "1", name: "Foresta", photo: { fileName: "planets/Sites/Site_Jungle_1.BMP" }, terrain: { seed: 501 } },
		{ id: "2", name: "Delta", photo: { fileName: "planets/Sites/Site_Jungle_2.BMP" }, terrain: { seed: 502 } },
		{ id: "3", name: "Rilievi", photo: { fileName: "planets/Sites/Site_Jungle_3.BMP" }, terrain: { seed: 503 } },
		{ id: "4", name: "Palude", photo: { fileName: "planets/Sites/Site_Jungle_4.BMP" }, terrain: { seed: 504 } },
		{ id: "5", name: "Radura", photo: { fileName: "planets/Sites/Site_Jungle_5.BMP" }, terrain: { seed: 505 } } ] },
	{ id: "saxum", name: "Saxum", typology: Typology.Rock, image: { fileName: "planets/Planet_Rock.png", cols: 1, rows: 1 }, sites: [
		{ id: "1", name: "Mesa", photo: { fileName: "planets/Sites/Site_Rock_1.BMP" }, terrain: { seed: 601 } },
		{ id: "2", name: "Gola", photo: { fileName: "planets/Sites/Site_Rock_2.BMP" }, terrain: { seed: 602 } },
		{ id: "3", name: "Pendici", photo: { fileName: "planets/Sites/Site_Rock_3.BMP" }, terrain: { seed: 603 } },
		{ id: "4", name: "Falesie", photo: { fileName: "planets/Sites/Site_Rock_4.BMP" }, terrain: { seed: 604 } },
		{ id: "5", name: "Altopiano", photo: { fileName: "planets/Sites/Site_Rock_5.BMP" }, terrain: { seed: 605 } } ] },
	{ id: "lapis", name: "Lapis", typology: Typology.Stone, image: { fileName: "planets/Planet_Stone.png", cols: 1, rows: 1 }, sites: [
		{ id: "1", name: "Pietraia", photo: { fileName: "planets/Sites/Site_Stone_1.BMP" }, terrain: { seed: 701 } },
		{ id: "2", name: "Conca", photo: { fileName: "planets/Sites/Site_Stone_2.BMP" }, terrain: { seed: 702 } },
		{ id: "3", name: "Cresta", photo: { fileName: "planets/Sites/Site_Stone_3.BMP" }, terrain: { seed: 703 } },
		{ id: "4", name: "Monoliti", photo: { fileName: "planets/Sites/Site_Stone_4.BMP" }, terrain: { seed: 704 } },
		{ id: "5", name: "Valle", photo: { fileName: "planets/Sites/Site_Stone_5.BMP" }, terrain: { seed: 705 } } ] }
];

/** id dell'immagine registrata per un file del catalogo */
let catalogImageId = function(fileName) { return "Catalog_" + fileName; };

// le immagini del catalogo vengono caricate con tutte le altre
PlanetCatalog.forEach(function(planet)
{
	let files = [];
	if(planet.image) { files.push(planet.image.fileName); }
	planet.sites.forEach(function(site)
	{
		if(site.photo) { files.push(site.photo.fileName); }
		if(site.terrain.fileName) { files.push(site.terrain.fileName); }
	});
	files.forEach(function(fileName) { imagesList.push({ id: catalogImageId(fileName), fileName: fileName }); });
});

export { PlanetTypes, PlanetCatalog, catalogImageId };
