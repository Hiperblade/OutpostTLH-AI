"use strict";

/**
 * Produttività in punti lavoro per turno.
 *   colono (Lavoratore) 4, robot 4, Pensionato 2, clone 1.
 * Tempi di costruzione, produzione e ricerca sono espressi in punti: un cantiere o un elemento
 * di coda riceve al massimo UNITS_PER_TURN punti per passo (un colono a tempo pieno).
 * Il personale degli edifici è in coloni: servono staff * COLONIST punti, solo da coloni e cloni.
 */
const Work = {
	UNITS_PER_TURN: 4,
	COLONIST: 4,
	RETIREE: 2,
	ROBOT: 4,
	CLONE: 1
};

export { Work };
