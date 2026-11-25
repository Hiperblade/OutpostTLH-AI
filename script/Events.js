"use strict";

// eventi della colonia (incidenti, catastrofi, scoperte) - non ancora implementati.
// La generazione degli eventi diventerà una fase di Turn (vedi Turn.js):
//   - incidenti, catastrofi (distruzione o danneggiamento edifici, morti o feriti)
//   - scoperte (nuove risorse, rovine ecc.)
// in funzione dell'incuria (MaintenancePhase) e della data.

function EventTrigger(requirements)
{

}

let EventType = {

};

/**
 * @param {EventType} eventType
 * @param {number} date
 */
function Event(eventType, date)
{

}

function EventManagerConstructor()
{
	let historicalEvents = [];
	let minorEvents = [];

	/** @param {Event} event */
	let _addHistoricalEvent = function(event)
	{
		historicalEvents.push(event);
	};

	/** @param {Event} event */
	let _addEvent = function(event)
	{
		minorEvents.push(event);
	};

	this.addHistoricalEvent = _addHistoricalEvent;
	this.addEvent = _addEvent;
}

let EventManager = new EventManagerConstructor();

export { EventTrigger, EventType, Event, EventManagerConstructor, EventManager };
