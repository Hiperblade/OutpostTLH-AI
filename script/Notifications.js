"use strict";

/**
 * Pannello delle notifiche, in basso al centro dell'area di gioco (al posto dei popup di sistema).
 *
 *   Notifications.show(items, options)
 *     items    [{ text, level }]  level: "info" (verde), "warning" (giallo), "danger" (rosso)
 *     options  { sticky, actions } sticky: niente chiusura automatica (vittoria, sconfitta);
 *                                 actions: [{ label, onClick }] pulsanti sotto le notifiche
 *
 * Un nuovo gruppo sostituisce quello aperto. Il pannello si chiude con il pulsante o da solo dopo
 * AUTO_CLOSE millisecondi; con il mouse sopra il conto alla rovescia si ferma.
 */
function NotificationsConstructor()
{
	const AUTO_CLOSE = 5000;
	const BOTTOM_MARGIN = 70;	// sopra la barra degli strumenti

	let panel = null;
	let list = null;
	let timer = null;
	let sticky = false;

	let _escape = function(text)
	{
		return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	};

	let _create = function()
	{
		if(panel !== null)
		{
			return;
		}
		panel = document.createElement("div");
		panel.className = "notificationPanel";
		panel.style.display = "none";
		let close = document.createElement("div");
		close.className = "notificationClose";
		close.title = "Chiudi";
		close.textContent = "×";
		close.addEventListener("click", _hide);
		list = document.createElement("div");
		list.className = "notificationList";
		panel.appendChild(close);
		panel.appendChild(list);
		panel.addEventListener("mouseenter", function() { _stopTimer(); });
		panel.addEventListener("mouseleave", function() { _startTimer(); });
		document.body.appendChild(panel);
	};

	/** al centro in basso dell'area di gioco visibile (la mappa o la schermata iniziale) */
	let _place = function()
	{
		let area = document.getElementById("mainScreen");
		if(area == null || area.offsetParent === null)
		{
			area = document.getElementById("creationScreen");
		}
		let rect = (area != null && area.offsetParent !== null) ? area.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
		let height = Math.min(rect.height, window.innerHeight - rect.top);
		panel.style.left = Math.round(window.scrollX + rect.left + rect.width / 2) + "px";
		panel.style.top = Math.round(window.scrollY + rect.top + height - BOTTOM_MARGIN) + "px";
	};

	let _stopTimer = function()
	{
		if(timer !== null)
		{
			window.clearTimeout(timer);
			timer = null;
		}
	};

	let _startTimer = function()
	{
		_stopTimer();
		if(!sticky && panel !== null && panel.style.display != "none")
		{
			timer = window.setTimeout(_hide, AUTO_CLOSE);
		}
	};

	let _hide = function()
	{
		_stopTimer();
		if(panel !== null)
		{
			panel.style.display = "none";
		}
	};

	let _show = function(items, options)
	{
		items = (items || []).filter(function(item) { return item && item.text; });
		if(items.length == 0)
		{
			return;
		}
		_create();
		sticky = !!(options && options.sticky);
		list.innerHTML = items.map(function(item)
		{
			return '<div class="notification notification_' + (item.level || "info") + '">' + _escape(item.text) + '</div>';
		}).join("");
		((options && options.actions) || []).forEach(function(action)
		{
			let button = document.createElement("div");
			button.className = "creationButton notificationAction";
			button.textContent = action.label;
			button.addEventListener("click", function() { _hide(); action.onClick(); });
			list.appendChild(button);
		});
		panel.style.display = "block";
		_place();
		_startTimer();
	};

	this.show = _show;
	this.hide = _hide;
	this.AUTO_CLOSE = AUTO_CLOSE;
}

// singleton
let Notifications = new NotificationsConstructor();

export { Notifications };
