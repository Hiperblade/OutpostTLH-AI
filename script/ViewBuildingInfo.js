"use strict";

import { describeBuildingIssue } from "./BuildingIssueText.js";
import { ImagesLib } from "./ImagesLib.js";
import { StaffPriority } from "./Enums.js";
import { AreaTypes, PrototypeLib } from "./PrototypeLib.js";
import { TextRepository } from "./TextRepository.js";

let BuildingInfoView;

/**
 * @param {function(Building)} getIssue motivo per cui un edificio non funziona (o null)
 * @param {function(Building)} onChangePriority la precedenza del personale dell'edificio è cambiata
 */
function InitializeBuildingInfoView(onChangePosition, onClearCurrentItem, getIssue, onChangePriority, getColony, onAction)
{
	BuildingInfoView = new BuildingInfoViewConstructor(onChangePosition, onClearCurrentItem, getIssue, onChangePriority, getColony, onAction);
	return BuildingInfoView;
}

/** @param {function(): ColonyState} getColony stato della colonia, per gli interruttori validi per tutta la colonia */
/** @param {function(string, Building)} onAction comando di un edificio (es. "launch" allo Spazioporto) */
function BuildingInfoViewConstructor(onChangePosition, onClearCurrentItem, getIssue, onChangePriority, getColony, onAction)
{
	// comandi degli edifici: tipo di edificio -> { action, text, hint }
	const BUILDING_ACTIONS = {
		SpacePort: { action: "launch", text: "Launch_command", hint: "Launch_hint" }
	};
	// interruttori di tutta la colonia, mostrati nel pannello degli edifici interessati
	const COLONY_SWITCHES = {
		Nursery: { get: function(c) { return !c.areBirthsSuspended(); }, set: function(c, on) { c.setBirthsSuspended(!on); }, on: "Births_active", off: "Births_suspended", hint: "BirthsHint" },
		MedicalStructure: { get: function(c) { return c.isAutoCure(); }, set: function(c, on) { c.setAutoCure(on); }, on: "AutoCure_on", off: "AutoCure_off", hint: "AutoCureHint" }
	};
	COLONY_SWITCHES.MedicalStructureAdv = COLONY_SWITCHES.MedicalStructure;
	let _colonySwitch = function()
	{
		return (currentItem != null && currentItem.getBuildingType && getColony) ? COLONY_SWITCHES[currentItem.getBuildingType()] : undefined;
	};

	const PRIORITY_TEXT = ["StaffPriority_high", "StaffPriority_normal", "StaffPriority_low"];
	let currentItem;

	let _initialize = function()
	{
		// precedenza del personale: Normale -> Alta -> Bassa -> Normale
		$("#buildingInfoDataPriority").on("click", function()
		{
			if(currentItem == null || !currentItem.getStaffPriority)
			{
				return;
			}
			let next = { [StaffPriority.Normal]: StaffPriority.High, [StaffPriority.High]: StaffPriority.Low, [StaffPriority.Low]: StaffPriority.Normal };
			currentItem.setStaffPriority(next[currentItem.getStaffPriority()]);
			if(onChangePriority)
			{
				onChangePriority(currentItem);
			}
			_refresh();
		});
		// comando dell'edificio (lancio della navicella)
		$("#buildingInfoDataAction").on("click", function()
		{
			let command = (currentItem != null && currentItem.getBuildingType) ? BUILDING_ACTIONS[currentItem.getBuildingType()] : undefined;
			if(command !== undefined && onAction)
			{
				onAction(command.action, currentItem);
				_refresh();
			}
		});
		// interruttore di tutta la colonia (nascite, cure automatiche)
		$("#buildingInfoDataSuspend").on("click", function()
		{
			let colonySwitch = _colonySwitch();
			if(colonySwitch === undefined)
			{
				return;
			}
			colonySwitch.set(getColony(), !colonySwitch.get(getColony()));
			if(onChangePriority)
			{
				onChangePriority(currentItem);
			}
			_refresh();
		});
		_hide();
	};

	/** l'interruttore c'è solo per gli edifici che ne hanno uno (Asilo, Strutture Mediche) */
	let _refreshSuspend = function()
	{
		let element = $("#buildingInfoDataSuspend");
		let colonySwitch = _colonySwitch();
		if(colonySwitch === undefined)
		{
			element.hide();
			return;
		}
		element.text(TextRepository.get(colonySwitch.get(getColony()) ? colonySwitch.on : colonySwitch.off));
		element.attr("title", TextRepository.get(colonySwitch.hint));
		element.show();
	};

	/** il comando della precedenza c'è solo per gli edifici con personale */
	let _refreshPriority = function()
	{
		let element = $("#buildingInfoDataPriority");
		let prototype = (currentItem != null && currentItem.getStaffPriority && currentItem.getBuildingType) ? PrototypeLib.get(currentItem.getBuildingType()) : null;
		// la precedenza vale per gli edifici che consumano energia, materiali o personale, e per i cantieri
		let applies = prototype != null && !currentItem.isPipe() && (currentItem.underConstruction() ||
			prototype.getStaff() > 0 || Object.keys(prototype.getConsumption()).length > 0);
		if(!applies)
		{
			element.hide();
			return;
		}
		let text = TextRepository.get("StaffPriority") + ": " + TextRepository.get(PRIORITY_TEXT[currentItem.getStaffPriority()]);
		// precedenza ereditata da chi usa ciò che l'edificio produce
		let effective = getColony ? getColony().getEffectivePrecedence(currentItem) : null;
		if(effective !== null && effective < currentItem.getStaffPriority())
		{
			text += " (" + TextRepository.get("InheritedPrecedence").replace("%s", TextRepository.get(PRIORITY_TEXT[effective])) + ")";
		}
		element.text(text);
		element.attr("title", TextRepository.get("StaffPriorityHint"));
		element.show();
	};

	let _refresh = function()
	{
		let buildingInfoImage = $("#buildingInfoImage");
		let issue = (currentItem != null && currentItem.getPosition && getIssue) ? getIssue(currentItem) : null;
		$("#buildingInfoDataStatus").text(describeBuildingIssue(issue)).toggle(issue != null);
		_refreshPriority();
		_refreshSuspend();
		let command = (currentItem != null && currentItem.getBuildingType && !currentItem.underConstruction()) ? BUILDING_ACTIONS[currentItem.getBuildingType()] : undefined;
		$("#buildingInfoDataAction").text(command ? TextRepository.get(command.text) : "").attr("title", command ? TextRepository.get(command.hint) : "").toggle(command !== undefined);
		if(currentItem == null)
		{
			$("#buildingInfoDataTitle").html("");
			buildingInfoImage.hide();
			$("#buildingInfoDataBar").hide();
			$("#buildingInfoMicroTail").attr("src", ImagesLib.getFileName("microTile"));
			return;
		}

		let protoType;
		if(currentItem.getBuildingType)
		{
			protoType = PrototypeLib.get(currentItem.getBuildingType());

			$("#buildingInfoDataTitle").html(TextRepository.get(currentItem.getBuildingType()));

			buildingInfoImage.attr("src", ImagesLib.getFileName(protoType.getBuildingImageId()));
			buildingInfoImage.show();

			let barValue;
			if(currentItem.underConstruction())
			{
				barValue = (Math.floor(100 * (protoType.getBuildingTime() + currentItem.getProgressState()) / protoType.getBuildingTime()));
			}
			else
			{
				barValue = (Math.floor(100 * currentItem.getIntegrity() / 1000));
			}
			$("#buildingInfoDataBarValue").css("width", barValue + "%");
			$("#buildingInfoDataBar").show();

			$("#buildingInfoMicroTail").attr("src", ImagesLib.getFileName("microTile_" + protoType.getAreaType()));
		}
		else
		{
			$("#buildingInfoDataBar").hide();

			if(currentItem.image != undefined)
			{
				buildingInfoImage.attr("src", ImagesLib.getFileName(currentItem.image));
				buildingInfoImage.show();

				$("#buildingInfoDataTitle").html(TextRepository.get(currentItem.buildingType));
				$("#buildingInfoMicroTail").attr("src", ImagesLib.getFileName("microTile_" + AreaTypes.One));
			}
			else
			{
				protoType = PrototypeLib.get(currentItem.buildingType);
				buildingInfoImage.attr("src", ImagesLib.getFileName(protoType.getBuildingImageId()));
				buildingInfoImage.show();
				$("#buildingInfoDataTitle").html(TextRepository.get(currentItem.buildingType));
				$("#buildingInfoMicroTail").attr("src", ImagesLib.getFileName("microTile_" + protoType.getAreaType()));
			}
		}
	};

	let _goto = function()
	{
		if(currentItem != null)
		{
			if(onChangePosition && currentItem.getPosition)
			{
				let tmp = currentItem.getPosition();
				onChangePosition({ x: tmp.x, y: tmp.y });
			}
			if(onClearCurrentItem && !currentItem.getPosition)
			{
				onClearCurrentItem();
			}
		}
	};

	let _hide = function()
	{
		currentItem = null;
		_refresh();
	};

	let _show = function(item)
	{
		currentItem = item;
		// se si tratta di un edificio esteso seleziono il modulo principale
		if(currentItem && currentItem.getMainBuilding)
		{
			currentItem = currentItem.getMainBuilding();
		}
		_refresh();
	};

	_initialize();

	//-----------------------------------------

	this.goto = _goto;
	this.show = _show;
	this.hide = _hide;
	this.refresh = _refresh;

	//-----------------------------------------
}

export { BuildingInfoView, InitializeBuildingInfoView, BuildingInfoViewConstructor };
