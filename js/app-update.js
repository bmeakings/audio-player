"use strict";

function setUpdateMsg(linkMsg, linkFunc)
{
	const lnk = $("#updateStatusLink");

	lnk.html(linkMsg);

	if (typeof linkFunc == "function")
		lnk.click(linkFunc);
	else
		lnk.off("click");

	return lnk;
}

function showUpdateInstallMsg()
{
	$("#updateAvailableMsg").hide();
	$("#updateButtonsArea").find("button").prop("disabled", true);
	$("#updateInstallMsg").removeClass("hidden");
}

function showUpdateDialogue()
{
	let dlg, btnArea;

	dlg = ocsui.createModalDialogue("", "Update Available", "", "", {
		width: "300px",
		height: "160px",
		top: "20%",
	}, true, true);

	ocsui.tag("p", {id: "updateAvailableMsg", class: "pageHelp"},
		"A new version of this app is available and will be installed the next " +
		"time this app is run. Do you want to install the update and restart now?" +
	"", dlg);

	ocsui.tag("p", {id: "updateInstallMsg", class: "pageHelp hidden"},
		'<img src="./imgs/throbber.gif" style="float:left; margin-right:10px;"> ' +
		"Installing update, please wait. This application will restart when done" +
		'<div class="clearfix"></div>' +
	"", dlg);

	btnArea = ocsui.createButtonArea(dlg, "updateButtonsArea", "bottomButtonArea");

	ocsui.addButton("", "No", "floatL", btnArea, function()
	{
		ipc.send("download_update");
		ocsui.closeModalDialogue();
	});

	ocsui.addButton("", "Yes", "floatR", btnArea, function()
	{
		ipc.send("install_update");
		// ocsui.closeModalDialogue();
	});
}

function checkForUpdates()
{
	ipc.send("check_updates");
}

function startAppUpdate()
{
	ipc.on("update_checking", function()
	{
		setUpdateMsg("Checking for updates&hellip;");
	});

	ipc.on("update_notify", function(ev, updateAvailable)
	{
		if (updateAvailable)
		{
			setUpdateMsg("New version available", function()
			{
				showUpdateDialogue();
			});

			showUpdateDialogue();
		}
		else
		{
			setUpdateMsg("No updates available");
		}
	});

	ipc.on("update_downloading", function(ev, install)
	{
		if (install)
		{
			setUpdateMsg("Downloading update&hellip;");
			showUpdateInstallMsg();
		}
		else
		{
			setUpdateMsg("Update will be installed later");
		}
	});

	ipc.on("update_error", function(error)
	{
		setUpdateMsg("Unable to check for updates");
		console.log(error);
	});

	ipc.on("update_progress", function(ev, progress)
	{
		console.log(progress);
	});

	checkForUpdates();
}
