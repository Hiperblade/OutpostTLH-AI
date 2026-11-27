"use strict";

import { describeBuildingIssue } from "./BuildingIssueText.js";
import { Cure } from "./Cure.js";
import { GenerationState } from "./Generations.js";
import { PopulationPhase, foodNeed } from "./TurnPopulation.js";
import { ImagesLib } from "./ImagesLib.js";
import { PrototypeLib } from "./PrototypeLib.js";
import { inherits } from "./SystemLib.js";
import { TextRepository } from "./TextRepository.js";
import { QueueData } from "./ViewQueueBase.js";

/**
 * @param {number} [perColonist] consumo per colono a turno (il cibo: 1); i coloni compaiono tra i consumi,
 *                               divisi tra cloni e coloni nati sul pianeta
 */
function ReportProductionMaterial(colonyState, material, image, perColonist)
{
	let productionBuildingList = [];
	PrototypeLib.getPriorityList().forEach(function(buildingType)
	{
		let buildingProtype = PrototypeLib.get(buildingType);
		let product = buildingProtype.getProduction();
		for (let listItem in product)
		{
			if(listItem == material)
			{
				productionBuildingList.push(buildingType);
			}
		}
	});
	let consumptionBuildingList = [];
	PrototypeLib.getPriorityList().forEach(function(buildingType)
	{
		let buildingProtype = PrototypeLib.get(buildingType);
		let product = buildingProtype.getConsumption();
		for (let listItem in product)
		{
			if(listItem == material)
			{
				consumptionBuildingList.push(buildingType);
			}
		}
	});

	this.getItemInfo = function()
	{
		// edifici a riposo (nessuno li usa) o disattivati dal giocatore, per tipo: non sono né attivi né fermi
		let resting = {};
		colonyState.getBuildingIssues().forEach(function(entry)
		{
			if(entry.issue.reason == "idle" || entry.issue.reason == "suspended")
			{
				let type = entry.building.getBuildingType();
				resting[type] = (resting[type] || 0) + 1;
			}
		});
		let separator = '<tr><td colspan="5" class="tableSeparator"></td></tr>';
		let cell = function(value, css) { return '<td class="tableDataRight' + (css ? ' ' + css : '') + '">' + value + '</td>'; };
		// riga di un tipo di edificio: attivi, fermi (in rosso), a riposo (in grigio) e quantità
		let row = function(label, active, stopped, rest, amount, negative)
		{
			return '<tr><td>' + label + '</td>' + cell(active) + cell(stopped, stopped > 0 ? 'colorError' : '') +
				cell(rest, rest > 0 ? 'colorResting' : '') + cell((negative ? '-' : '') + amount, negative ? 'colorError' : '') + '</tr>';
		};

		let text = "";
		text += '<table>';
		text += '<tr><td class="tableMainColumn">' + TextRepository.get("Buildings") + '</td><td class="tableDataColumn">' + TextRepository.get("Active") +
			'</td><td class="tableDataColumn">' + TextRepository.get("Idle") + '</td><td class="tableDataColumn">' + TextRepository.get("Resting") +
			'</td><td class="tableDataColumn">' + TextRepository.get("Production") + '</td></tr>';

		let totalProduction = 0;
		productionBuildingList.forEach(function(type)
		{
			let active = (colonyState.getActiveList()[type] || []).length;
			let stopped = (colonyState.getInactiveList()[type] || []).length;
			let rest = resting[type] || 0;
			let production = PrototypeLib.get(type).getProduction()[material] * active;
			totalProduction += production;
			if(active + stopped + rest > 0)
			{
				text += row(TextRepository.get(type), active, stopped, rest, production, false);
			}
		});

		let totalConsumption = 0;
		let pipes = { active: 0, stopped: 0, consumption: 0 };
		let haveConsumption = false;
		consumptionBuildingList.forEach(function(type)
		{
			let active = (colonyState.getActiveList()[type] || []).length;
			let stopped = (colonyState.getInactiveList()[type] || []).length;
			let rest = resting[type] || 0;
			let consumption = PrototypeLib.get(type).getConsumption()[material] * active;
			totalConsumption += consumption;
			if(PrototypeLib.get(type).createItem({ x: 0, y: 0 }).isPipe())
			{
				pipes.active += active;
				pipes.stopped += stopped;
				pipes.consumption += consumption;
			}
			else if(active + stopped + rest > 0)
			{
				if(!haveConsumption)
				{
					text += separator;
				}
				text += row(TextRepository.get(type), active, stopped, rest, consumption, true);
				haveConsumption = true;
			}
		});
		// consumo dei coloni (avviene a fine turno, insieme alla sussistenza)
		if(perColonist > 0)
		{
			let clones = 0, born = 0;
			colonyState.getPopulation().registry.forEach(function(generation)
			{
				if(generation.isClone()) { clones += generation.getPopulation(); }
				else { born += generation.getPopulation(); }
			});
			[["Population_clones", clones], ["Population_born", born]].forEach(function(entry)
			{
				if(entry[1] <= 0)
				{
					return;
				}
				if(!haveConsumption)
				{
					text += separator;
				}
				// i cloni mangiano la metà (arrotondato per eccesso)
				let consumption = (entry[0] == "Population_clones") ? Math.ceil(entry[1] * perColonist * PopulationPhase.CLONE_FOOD) : entry[1] * perColonist;
				totalConsumption += consumption;
				text += '<tr><td>' + TextRepository.get(entry[0]) + '</td>' + cell(entry[1]) + '<td></td><td></td>' + cell('-' + consumption, 'colorError') + '</tr>';
				haveConsumption = true;
			});
		}

		if(pipes.active + pipes.stopped > 0)
		{
			if(!haveConsumption)
			{
				text += separator;
			}
			text += row(TextRepository.get("Pipes"), pipes.active, pipes.stopped, 0, pipes.consumption, true);
		}

		text += separator;

		let surplus = totalProduction - totalConsumption;
		text += '<tr><td>' + TextRepository.get("Surplus") + '</td><td></td><td></td><td></td>' + cell(surplus, surplus < 0 ? 'colorError' : '') + '</tr>';

		// materiale perso: quello che nel turno avanza (anche dopo cantieri e produzioni) e non trova posto
		if(!colonyState.isMetaMaterial(material))
		{
			let net = colonyState.getProduced(material) - colonyState.getConsumed(material) - (perColonist ? foodNeed(colonyState.getPopulation().registry) * perColonist : 0);
			let lost = net - Math.max(0, colonyState.getCapacity(material) - colonyState.getStored(material));
			if(lost > 0)
			{
				text += '<tr><td>' + TextRepository.get("Lost") + '</td><td></td><td></td><td></td>' + cell(lost, 'colorError') + '</tr>';
			}
		}

		text += '<tr><td>' + TextRepository.get("Stored") + '</td><td></td><td></td><td></td>';
		let capacity = colonyState.getCapacity(material);
		let stored = (colonyState.getStored(material) || colonyState.getFullCapacity(material));
		if(stored >= capacity)
		{
			text += '<td class="tableDataRight colorError">' + stored + '/';
		}
		else
		{
			text += '<td class="tableDataRight">' + stored + '/';
		}
		if(colonyState.isMetaMaterial(material))
		{
			text += '(' + capacity + ')</td>';
		}
		else
		{
			text += capacity + '</td>';
		}
		text += '</tr>';

		text += '</table>';
		return text;
	};

	this.getName = function(){ return material; };
	this.getImageId = function(){ return image || material; };
}

function ReportMetaMaterial(colonyState, metaMaterial, image)
{
	this.getItemInfo = function()
	{
		let text = "";
		text += '<table>';
		text += '<tr><td class="tableMainColumn">' + TextRepository.get("Materials") + '</td><td class="tableDataColumn">' + TextRepository.get("Production") + '</td><td class="tableDataColumn">' + TextRepository.get("Consumption") + '</td><td class="tableDataColumn">' + TextRepository.get("Stored") + '</td></tr>';

		let surplus = 0;
		let list = colonyState.getMaterialFromMetaMaterial(metaMaterial);
		for(let i = 0; i < list.length; i++)
		{
			text += '<tr><td>' + TextRepository.get(list[i]) + '</td><td class="tableDataRight">' + colonyState.getProduced(list[i]) + '</td><td class="tableDataRight colorError">' + colonyState.getConsumed(list[i]) + '</td><td class="tableDataRight">' + (colonyState.getStored(list[i]) || 0) + '</td></tr>';
			surplus += (colonyState.getProduced(list[i]) - colonyState.getConsumed(list[i]));
		}

		text += '<tr><td colspan="4" class="tableSeparator"></td></tr>';

		text += '<tr><td>' + TextRepository.get("Surplus") + '</td><td></td><td></td>';
		if(surplus < 0)
		{
			text += '<td class="tableDataRight colorError">' + surplus + '</td>';
		}
		else
		{
			text += '<td class="tableDataRight">' + surplus + '</td>';	// total
		}
		text += '</tr>';

		text += '<tr><td>' + TextRepository.get("Stored") + '</td><td></td><td></td>';
		let capacity = colonyState.getCapacity(metaMaterial);
		let stored = (colonyState.getStored(metaMaterial) || colonyState.getFullCapacity(metaMaterial));
		if(stored >= capacity)
		{
			text += '<td class="tableDataRight colorError">' + stored + '/' + capacity + '</td>';
		}
		else
		{
			text += '<td class="tableDataRight">' + stored + '/' + capacity + '</td>';
		}
		text += '</tr>';

		text += '</table>';
		return text;
	};

	this.getName = function(){ return metaMaterial; };
	this.getImageId = function(){ return image || metaMaterial; };
}

function ReportMaintenance(colonyState, image)
{
	let material = "repairUnit";

	let productionBuildingList = [];
	PrototypeLib.getPriorityList().forEach(function(buildingType)
	{
		let buildingPrototype = PrototypeLib.get(buildingType);
		let product = buildingPrototype.getProduction();
		for (let listItem in product)
		{
			if(listItem == material)
			{
				productionBuildingList.push(buildingType);
			}
		}
	});
	let consumptionBuildingList = [];
	PrototypeLib.getPriorityList().forEach(function(buildingType)
	{
		let buildingPrototype = PrototypeLib.get(buildingType);
		let product = buildingPrototype.getConsumption();
		for (let listItem in product)
		{
			if(listItem == material)
			{
				consumptionBuildingList.push(buildingType);
			}
		}
	});

	this.getItemInfo = function()
	{
		let text = "";
		text += '<table>';
		text += '<tr><td class="tableMainColumn">' + TextRepository.get("Buildings") + '</td><td class="tableDataColumn">' + TextRepository.get("Active") + '</td><td class="tableDataColumn">' + TextRepository.get("Idle") + '</td><td class="tableDataColumn">' + TextRepository.get("Production") + '</td></tr>';

		let list;
		list = productionBuildingList;
		let i, active, idle;
		let totalProduction = 0;
		for(i = 0; i < list.length; i++)
		{
			active = (colonyState.getActiveList()[list[i]] || []).length;
			idle = (colonyState.getInactiveList()[list[i]] || []).length;
			let production = PrototypeLib.get(list[i]).getProduction()[material] * active;
			totalProduction += production;
			if(active + idle > 0)
			{
				text += '<tr><td>' + TextRepository.get(list[i]) + '</td><td class="tableDataRight">' + active + '</td>';
				if(idle > 0)
				{
					text += '<td class="tableDataRight colorError">' + idle + '</td>';
				}
				else
				{
					text += '<td class="tableDataRight">' + idle + '</td>';
				}
				text += '<td class="tableDataRight">' + production + '</td></tr>';
			}
		}

		text += '<tr><td colspan="4" class="tableSeparator"></td></tr>';

		list = consumptionBuildingList;
		let totalConsumption = 0;
		let activePipe = 0;
		let idlePipe = 0;
		let consumptionPipe = 0;
		for(i = 0; i < list.length; i++)
		{
			active = (colonyState.getActiveList()[list[i]] || []).length;
			idle = (colonyState.getInactiveList()[list[i]] || []).length;
			let consumption = PrototypeLib.get(list[i]).getConsumption()[material] * active;
			totalConsumption += consumption;
			if(PrototypeLib.get(list[i]).createItem({ x: 0, y: 0 }).isPipe())
			{
				activePipe += active;
				idlePipe += idle;
				consumptionPipe	+= consumption;
			}
			else
			{
				if(active + idle > 0)
				{
					text += '<tr><td>' + TextRepository.get(list[i]) + '</td><td class="tableDataRight">' + active + '</td>';
					if(idle > 0)
					{
						text += '<td class="tableDataRight colorError">' + idle + '</td>';
					}
					else
					{
						text += '<td class="tableDataRight">' + idle + '</td>';
					}
					text += '<td class="tableDataRight colorError">-' + consumption + '</td></tr>';
				}
			}
		}
		if(activePipe + idlePipe > 0)
		{
			text += '<tr><td>' + TextRepository.get("Pipes") + '</td><td class="tableDataRight">' + activePipe + '</td>';
			if(idlePipe > 0)
			{
				text += '<td class="tableDataRight colorError">' + idlePipe + '</td>';
			}
			else
			{
				text += '<td class="tableDataRight">' + idlePipe + '</td>';
			}
			text += '<td class="tableDataRight colorError">-' + consumptionPipe + '</td></tr>';

			//haveConsumption = true;
		}

		let consumed = colonyState.getConsumed(material);
		totalConsumption += consumed;
		text += '<tr><td>' + TextRepository.get("Consumption") + '</td><td></td><td></td><td class="tableDataRight colorError">-' + consumed + '</td></tr>';

		text += '<tr><td colspan="4" class="tableSeparator"></td></tr>';

		text += '<tr><td>' + TextRepository.get("Surplus") + '</td><td></td><td></td>';
		if(totalProduction <= totalConsumption)
		{
			text += '<td class="tableDataRight colorError">' + (totalProduction - totalConsumption) + '</td>';
		}
		else
		{
			text += '<td class="tableDataRight">' + (totalProduction - totalConsumption) + '</td>';	// total
		}
		text += '</tr>';

		text += '</table>';
		return text;
	};

	this.getName = function(){ return material; };
	this.getImageId = function(){ return image || material; };
}

function ReportHumans(colonyState, image)
{
	let _percent = function(value) { return Math.round((value || 0) * 100) + "%"; };
	let _row = function(label, value, error) { return '<tr><td class="tableMainColumn">' + label + '</td><td class="tableDataColumn"></td><td class="tableDataColumn"></td><td class="tableDataRight' + (error ? ' colorError' : '') + '">' + value + '</td></tr>'; };
	let _ratio = function(label, entry) { return _row(label, entry.available + "/" + entry.needed, entry.available < entry.needed); };
	let _separator = '<tr><td colspan="4" class="tableSeparator"></td></tr>';

	this.getItemInfo = function()
	{
		let population = colonyState.getPopulation();
		let text = '<table>';
		text += _row(TextRepository.get("subsistence"), _percent(population.subsistence), population.subsistence < 1);
		text += _row(TextRepository.get("wellness"), _percent(population.wellness), population.wellness < 1);
		text += _row(TextRepository.get("happiness"), _percent(population.happiness), false);
		text += _separator;

		let date = colonyState.getDate();
		let habitability = colonyState.getHabitability();
		// capsule, poi cloni, poi i coloni nati sul pianeta riuniti per fase di vita
		if(habitability != null)
		{
			text += _row(TextRepository.get("cryoCapsule"), habitability.capsules, false);
			if(habitability.pendingRevival > 0)
			{
				text += _row(TextRepository.get("PendingRevival"), habitability.pendingRevival, false);
			}
		}
		let stages = [GenerationState.Infants, GenerationState.Students, GenerationState.Researchers, GenerationState.Scientists, GenerationState.Retirees];
		let byStage = {};
		let clones = 0;
		let born = 0;
		population.registry.forEach(function(generation)
		{
			if(generation.isClone())
			{
				clones += generation.getPopulation();
				return;
			}
			let stage = generation.getState(date);
			byStage[stage] = (byStage[stage] || 0) + generation.getPopulation();
			born += generation.getPopulation();
		});
		text += _row(TextRepository.get("clones"), clones, false);
		text += _row(TextRepository.get("BornColonists"), born, false);
		let sick = Cure.sick(colonyState);
		// le fasi di vita dei coloni nati, come dettaglio del totale
		stages.forEach(function(stage)
		{
			if(byStage[stage] > 0)
			{
				text += _row('<span class="tableIndentation">' + TextRepository.get(stage) + '</span>', byStage[stage], false);
			}
		});
		// i malati fanno parte dei coloni nati: dettaglio rientrato come le fasi di vita
		if(born > 0)
		{
			text += _row('<span class="tableIndentation">' + TextRepository.get("SickColonists") + '</span>', sick, sick > 0);
		}
		if((colonyState.getActiveList()["Nursery"] || []).length > 0 || colonyState.getBirthProgress() > 0)
		{
			text += _row(TextRepository.get("BirthProgress"), Math.round(100 * colonyState.getBirthProgress() / PopulationPhase.BIRTH_COST) + "%", false);
		}

		if(habitability != null)
		{
			text += _separator;
			text += '<tr><td colspan="4">' + TextRepository.get("Habitability") + '</td></tr>';
			text += _ratio(TextRepository.get("habitatUnit"), habitability.habitat);
			text += _ratio(TextRepository.get("residentialUnit"), habitability.housing);
			text += _ratio(TextRepository.get("foodUnit"), habitability.food);
			if(habitability.medical.needed > 0)
			{
				let cover = Math.min(1, habitability.medical.available / habitability.medical.needed);
				text += _row(TextRepository.get("medicalUnit") + " (" + TextRepository.get("MedicalCover") + " " + Math.round(cover * 100) + "%)",
					habitability.medical.available + "/" + habitability.medical.needed, cover < 1);
			}
			text += _row(TextRepository.get("cryoRevival"), habitability.revivalCapacity, habitability.capsules > 0 && habitability.revivalCapacity == 0);
			if(born > 0)
			{
				text += _separator;
				text += '<tr><td colspan="4">' + TextRepository.get("Cures") + '</td></tr>';
				text += _row(TextRepository.get("mediKit"), colonyState.getStored("mediKit"), sick > 0 && colonyState.getStored("mediKit") == 0);
				text += _row(TextRepository.get("CureCapacity"), Cure.capacity(colonyState), sick > 0 && Cure.capacity(colonyState) == 0);
				text += _row(TextRepository.get("AutoCure"), TextRepository.get(colonyState.isAutoCure() ? "Yes" : "No"), false);
				if(colonyState.getPendingCures() > 0)
				{
					text += _row(TextRepository.get("PendingCures"), colonyState.getPendingCures(), false);
				}
			}
		}
		text += '</table>';
		return text;
	};

	this.getName = function(){ return "Humans"; };
	this.getImageId = function(){ return image || "Humans"; }
}

/** stato degli obiettivi della partita */
function ReportObjectives(colonyState, image)
{
	this.getItemInfo = function()
	{
		let status = colonyState.getObjectiveStatus();
		let mission = colonyState.getMission();
		let head = "";
		if(mission)
		{
			head += '<p><b>' + mission.name + '</b></p>';
			if(mission.turnLimit > 0)
			{
				head += '<p>' + TextRepository.get("TurnsLeft") + ': ' + Math.max(0, mission.turnLimit - colonyState.getDate()) + '</p>';
			}
		}
		if(status.length == 0)
		{
			return head + '<p>' + TextRepository.get("NoObjectives") + '</p>';
		}
		let percent = function(value, target) { return Math.floor(100 * value / Math.max(1, target)) + "%"; };
		let text = head + '<table>';
		status.forEach(function(entry)
		{
			let detail;
			switch(entry.type)
			{
				case "happyPopulation":
					detail = TextRepository.get("ObjectiveStatus_happyPopulation").replace("%v", entry.value).replace("%t", entry.target)
						.replace("%s", entry.streak).replace("%n", entry.turns).replace("%h", Math.round(entry.happiness * 100));
					break;
				case "shipLaunch":
					detail = TextRepository.get("ObjectiveStatus_shipLaunch").replace("%v", entry.value).replace("%t", entry.target) + " " +
						["shipHull", "shipEngine", "shipFuel"].map(function(name) { return TextRepository.get(name) + " " + colonyState.getStored(name); }).join(", ");
					break;
				case "superintelligence":
					detail = TextRepository.get("ObjectiveStatus_superintelligence").replace("%v",
						["AdvancedNeuralNetworks", "ArtificialConsciousness", "Superintelligence"].filter(function(name) { return colonyState.isCompletedKnowledge(name); }).length);
					break;
				case "terraforming":
					detail = TextRepository.get("ObjectiveStatus_terraforming").replace("%v", entry.value).replace("%t", entry.target).replace("%p", percent(entry.value, entry.target));
					break;
				default:
					detail = "";
			}
			text += '<tr><td class="tableMainColumn ' + (entry.done ? 'notification_info' : '') + '">' + (entry.done ? "\u2713 " : "") + TextRepository.get("Objective_" + entry.type) + '</td></tr>';
			text += '<tr><td class="tableIndentation">' + detail + '</td></tr>';
		});
		text += '</table>';
		return text;
	};

	this.getName = function(){ return "Objectives"; };
	this.getImageId = function(){ return image || "SpaceShip"; }
}

/** storico delle notifiche di fine turno, dalla più recente */
function ReportNotifications(colonyState, image)
{
	this.getItemInfo = function()
	{
		let list = colonyState.getNotifications();
		if(list.length == 0)
		{
			return '<p>' + TextRepository.get("NoNotifications") + '</p>';
		}
		let escape = function(text) { return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;"); };
		let text = '<table>';
		for(let i = list.length - 1; i >= 0; i--)
		{
			text += '<tr><td class="tableDataColumn">' + TextRepository.get("Summary_turn").replace("%s", list[i].date) + '</td>' +
				'<td class="notification_' + (list[i].level || "info") + '">' + escape(list[i].text) + '</td></tr>';
		}
		text += '</table>';
		return text;
	};

	this.getName = function(){ return "Notifications"; };
	this.getImageId = function(){ return image || "Pipes"; }
}

/** edifici che non funzionano in questo turno, raggruppati per tipo e motivo */
function ReportStoppedBuildings(colonyState, image)
{
	this.getItemInfo = function()
	{
		let groups = {};
		colonyState.getBuildingIssues().forEach(function(entry)
		{
			let key = entry.building.getBuildingType() + "|" + describeBuildingIssue(entry.issue);
			if(groups[key] === undefined)
			{
				groups[key] = { type: entry.building.getBuildingType(), text: describeBuildingIssue(entry.issue), count: 0 };
			}
			groups[key].count++;
		});
		let list = Object.keys(groups).map(function(key) { return groups[key]; });
		if(list.length == 0)
		{
			return '<p>' + TextRepository.get("NoStoppedBuildings") + '</p>';
		}
		let text = '<table>';
		list.forEach(function(group)
		{
			text += '<tr><td class="tableMainColumn">' + TextRepository.get(group.type) + '</td><td class="tableDataRight">' + group.count + '</td></tr>';
			text += '<tr><td colspan="2" class="tableIndentation colorError">' + group.text + '</td></tr>';
		});
		text += '</table>';
		return text;
	};

	this.getName = function(){ return "StoppedBuildings"; };
	this.getImageId = function(){ return image || "Pipes"; }
}

function ReportQueueData(colonyState)
{
	let queue = [];
	let available = [];

	queue.push(new ReportObjectives(colonyState, "SpaceShip"));
	queue.push(new ReportNotifications(colonyState, "Pipes"));
	queue.push(new ReportStoppedBuildings(colonyState, "Pipes"));
	queue.push(new ReportMaintenance(colonyState, "Pipes"));
	queue.push(new ReportProductionMaterial(colonyState, "power", "Power" ));
	queue.push(new ReportHumans(colonyState, "Humans"));
	queue.push(new ReportProductionMaterial(colonyState, "foodUnit", "Hydroponics", 1));
	queue.push(new ReportProductionMaterial(colonyState, "ironBar", "Smelter"));
	queue.push(new ReportProductionMaterial(colonyState, "pharmaceuticalUnit", "PharmaceuticalIndustry"));
	queue.push(new ReportProductionMaterial(colonyState, "goodsUnit", "GoodsFactory"));
	queue.push(new ReportMetaMaterial(colonyState, "roboticStorage", "Pipes"));
	queue.push(new ReportMetaMaterial(colonyState, "genericStorage", "Pipes"));
	queue.push(new ReportMetaMaterial(colonyState, "radioactiveStorage", "PipesWaste"));

	QueueData.call(this, queue, available);

	this.getInfo = function(item)
	{
		let text = "";
		text += '<div class="queueInfo">';
		text += '<div class="queueInfoTitle">';
		text += '<img class="queueInfoTitleImage" src="' + ImagesLib.getFileName(item.getImageId()) + '">';
		text += '<div class="queueInfoTitleData">';
		text += '<div class="queueInfoTitleName">' + TextRepository.get(item.getName()) + '</div>';
		text += '<div class="queueInfoTitleDescription">' + TextRepository.get(item.getName() + "Description") + '</div>';
		text += '</div>';
		text += '</div>';

		text += '<div class="queueInfoDetails">';

		text += item.getItemInfo();

		text += '</div>';
		text += '</div>';
		return text;
	};

	this.isSortable = function() { return false; };
	this.getTitle = function() { return "ReportTitle"; };
	this.getQueueTitle = function() { return "ReportBase"; };
	this.getAvailableTitle = function() { return "ReportEvents"; };
}
inherits(ReportQueueData, QueueData);

export { ReportObjectives, ReportNotifications, ReportProductionMaterial, ReportMetaMaterial, ReportMaintenance, ReportHumans, ReportStoppedBuildings, ReportQueueData };
