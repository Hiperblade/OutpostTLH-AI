"use strict";

import { TextRepository } from "./TextRepository.js";

/** descrizione per il giocatore del motivo per cui un edificio non funziona */
function describeBuildingIssue(issue)
{
	if(issue == null)
	{
		return "";
	}
	let text = TextRepository.get("Issue_" + issue.reason);
	let missing = issue.missing.map(function(name) { return TextRepository.get(name == "labor" ? "Manodopera" : name); });
	if(issue.noSpace)
	{
		missing.push(TextRepository.get("Issue_noSpace"));
	}
	if(missing.length > 0)
	{
		text += ". " + TextRepository.get("Revival_lacks").replace("%s", missing.join(", "));
	}
	return text;
}

export { describeBuildingIssue };
