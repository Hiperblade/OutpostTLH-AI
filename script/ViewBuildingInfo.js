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
function InitializeBuildingInfoView(onChangePosition, onClearCurrentItem, getIssue, onChangePriority)
{
	BuildingInfoView = new BuildingInfoViewConstructor(onChangePosition, onClearCurrentItem, getIssue, onChangePriority);
	return BuildingInfoView;
}

function BuildingInfoViewConstructor(onChangePosition, onClearCurrentItem, getIssue, onChangePriority)
{
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
		// sospensione delle nascite dell'Asilo
		$("#buildingInfoDataSuspend").on("click", function()
		{
			if(currentItem == null || !currentItem.setSuspended)
			{
				return;
			}
			currentItem.setSuspended(!currentItem.isSuspended());
			if(onChangePriority)
			{
				onChangePriority(currentItem);
			}
			_refresh();
		});
		_hide();
	};

	/** il comando delle nascite c'è solo per l'Asilo */
	let _refreshSuspend = function()
	{
		let element = $("#buildingInfoDataSuspend");
		if(currentItem == null || !currentItem.isSuspended || !currentItem.getBuildingType || currentItem.getBuildingType() != "Nursery")
		{
			element.hide();
			return;
		}
		element.text(TextRepository.get(currentItem.isSuspended() ? "Births_suspended" : "Births_active"));
		element.attr("title", TextRepository.get("BirthsHint"));
		element.show();
	};

	/** il comando della precedenza c'è solo per gli edifici con personale */
	let _refreshPriority = function()
	{
		let element = $("#buildingInfoDataPriority");
		let staffed = currentItem != null && currentItem.getStaffPriority && currentItem.getBuildingType &&
			PrototypeLib.get(currentItem.getBuildingType()).getStaff() > 0;
		if(!staffed)
		{
			element.hide();
			return;
		}
		element.text(TextRepository.get("StaffPriority") + ": " + TextRepository.get(PRIORITY_TEXT[currentItem.getStaffPriority()]));
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
