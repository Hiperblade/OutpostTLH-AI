"use strict";

/**
 * Terreno di un sito: la morfologia iniziale della superficie, casella per casella.
 *
 * La mappa del terreno è un'immagine size.y x size.x (300x150) letta con la stessa corrispondenza
 * della minimappa: la casella (x, y) è il pixel (y, size.x - x).
 * Valori restituiti (detriti): 1 sgombro, 2 accidentato, 4 impervio, 8 inaccessibile.
 */
function SiteTerrainConstructor()
{
	const CLEAR = 1, ROUGH = 2, IMPERVIOUS = 4, INACCESSIBLE = 8;
	const COLORS = {};
	COLORS[CLEAR] = [0, 160, 0];
	COLORS[ROUGH] = [150, 150, 0];
	COLORS[IMPERVIOUS] = [140, 0, 0];
	COLORS[INACCESSIBLE] = [0, 0, 0];

	let _pixelOf = function(size, x, y)
	{
		return { px: y, py: Math.min(size.x - 1, size.x - x) };
	};

	let _matrix = function(size, fn)
	{
		let ret = [];
		for(let x = 0; x < size.x; x++)
		{
			ret[x] = [];
			for(let y = 0; y < size.y; y++)
			{
				ret[x][y] = fn(x, y);
			}
		}
		return ret;
	};

	/** classificazione di un colore della mappa del terreno */
	let _classify = function(r, g, b)
	{
		if(r < 40 && g < 40 && b < 40) { return INACCESSIBLE; }
		if(g > r * 1.5) { return CLEAR; }
		if(r > g * 1.5) { return IMPERVIOUS; }
		return ROUGH;
	};

	let _fromImage = function(image, size)
	{
		let canvas = document.createElement("canvas");
		canvas.width = size.y;
		canvas.height = size.x;
		let ctx = canvas.getContext("2d");
		ctx.drawImage(image, 0, 0, size.y, size.x);
		let data = ctx.getImageData(0, 0, size.y, size.x).data;
		return _matrix(size, function(x, y)
		{
			let p = _pixelOf(size, x, y);
			let i = (p.py * size.y + p.px) * 4;
			return _classify(data[i], data[i + 1], data[i + 2]);
		});
	};

	/** generatore pseudo-casuale riproducibile */
	let _random = function(seed)
	{
		let a = seed | 0;
		return function()
		{
			a = a + 0x6D2B79F5 | 0;
			let t = Math.imul(a ^ a >>> 15, 1 | a);
			t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		};
	};

	/** rumore a valori interpolati: zone continue invece di caselle sparse */
	let _noise = function(random, size, cell)
	{
		let gx = Math.ceil(size.x / cell) + 2, gy = Math.ceil(size.y / cell) + 2;
		let grid = [];
		for(let i = 0; i < gx * gy; i++) { grid.push(random()); }
		let smooth = function(t) { return t * t * (3 - 2 * t); };
		return function(x, y)
		{
			let fx = x / cell, fy = y / cell;
			let ix = Math.floor(fx), iy = Math.floor(fy);
			let tx = smooth(fx - ix), ty = smooth(fy - iy);
			let v = function(i, j) { return grid[i * gy + j]; };
			let top = v(ix, iy) * (1 - ty) + v(ix, iy + 1) * ty;
			let bottom = v(ix + 1, iy) * (1 - ty) + v(ix + 1, iy + 1) * ty;
			return top * (1 - tx) + bottom * tx;
		};
	};

	let _fromSeed = function(seed, size)
	{
		let random = _random(seed);
		let large = _noise(random, size, 18);
		let small = _noise(random, size, 5);
		let values = _matrix(size, function(x, y) { return 0.7 * large(x, y) + 0.3 * small(x, y); });

		// soglie per quantili: 35% sgombro, 30% accidentato, 25% impervio, 10% inaccessibile
		let sorted = [];
		values.forEach(function(row) { row.forEach(function(v) { sorted.push(v); }); });
		sorted.sort(function(a, b) { return a - b; });
		let q = function(p) { return sorted[Math.floor(p * (sorted.length - 1))]; };
		let t1 = q(0.35), t2 = q(0.65), t3 = q(0.90);
		return _matrix(size, function(x, y)
		{
			let v = values[x][y];
			return (v < t1) ? CLEAR : (v < t2) ? ROUGH : (v < t3) ? IMPERVIOUS : INACCESSIBLE;
		});
	};

	/** disegna la morfologia con i colori della mappa del terreno (per minimappa e anteprime) */
	let _render = function(morphology, size)
	{
		let canvas = document.createElement("canvas");
		canvas.width = size.y;
		canvas.height = size.x;
		let ctx = canvas.getContext("2d");
		let image = ctx.createImageData(size.y, size.x);
		for(let x = 0; x < size.x; x++)
		{
			for(let y = 0; y < size.y; y++)
			{
				let p = _pixelOf(size, x, y);
				let i = (p.py * size.y + p.px) * 4;
				let c = COLORS[morphology[x][y]];
				image.data[i] = c[0];
				image.data[i + 1] = c[1];
				image.data[i + 2] = c[2];
				image.data[i + 3] = 255;
			}
		}
		ctx.putImageData(image, 0, 0);
		return canvas;
	};

	this.fromImage = _fromImage;
	this.fromSeed = _fromSeed;
	this.render = _render;
}

// singleton
let SiteTerrain = new SiteTerrainConstructor();

export { SiteTerrain };
