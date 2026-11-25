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
 * I contenuti attuali sono segnaposto: i pianeti si disegnano come sfere colorate e i siti usano terreni
 * generati. Per la grafica definitiva basta aggiungere image, photo e terrain.fileName (percorsi sotto images/).
 */
let PlanetCatalog = [
	{ id: "ignis", name: "Ignis", typology: Typology.Vulcanic, sites: [
		{ id: "1", name: "Caldera", photo: { fileName: "planets/Site_vulcanic_1.png" }, terrain: { seed: 101 } },
		{ id: "2", name: "Colate", terrain: { seed: 102 } },
		{ id: "3", name: "Fumarole", terrain: { seed: 103 } } ] },
	{ id: "ceres", name: "Ceres", typology: Typology.Asteroid, sites: [
		{ id: "1", name: "Cratere maggiore", terrain: { seed: 201 } },
		{ id: "2", name: "Faglia", terrain: { seed: 202 } },
		{ id: "3", name: "Polo", terrain: { seed: 203 } } ] },
	{ id: "glacies", name: "Glacies", typology: Typology.Ice, sites: [
		{ id: "1", name: "Banchisa", terrain: { seed: 301 } },
		{ id: "2", name: "Crepacci", terrain: { seed: 302 } },
		{ id: "3", name: "Altopiano", terrain: { seed: 303 } } ] },
	{ id: "arida", name: "Arida", typology: Typology.Desert, sites: [
		{ id: "1", name: "Dune", terrain: { seed: 401 } },
		{ id: "2", name: "Canyon", terrain: { seed: 402 } },
		{ id: "3", name: "Piana", terrain: { seed: 403 } } ] },
	{ id: "silva", name: "Silva", typology: Typology.Jungle, sites: [
		{ id: "1", name: "Foresta", terrain: { seed: 501 } },
		{ id: "2", name: "Delta", terrain: { seed: 502 } },
		{ id: "3", name: "Rilievi", terrain: { seed: 503 } } ] },
	{ id: "saxum", name: "Saxum", typology: Typology.Rock, sites: [
		{ id: "1", name: "Mesa", terrain: { seed: 601 } },
		{ id: "2", name: "Gola", terrain: { seed: 602 } },
		{ id: "3", name: "Pendici", terrain: { seed: 603 } } ] },
	{ id: "lapis", name: "Lapis", typology: Typology.Stone, sites: [
		{ id: "1", name: "Pietraia", terrain: { seed: 701 } },
		{ id: "2", name: "Conca", terrain: { seed: 702 } },
		{ id: "3", name: "Cresta", terrain: { seed: 703 } } ] }
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
