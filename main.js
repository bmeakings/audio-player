"use strict";

const {app, BrowserWindow, Menu, ipcMain, dialog} = require("electron");
const {autoUpdater} = require("electron-updater");

let win = null;
let installUpdate = false;

autoUpdater.autoDownload = false;

function createAppWindow()
{
	win = new BrowserWindow({
		show: false,
		width: 420,
		height: 380,
		minWidth: 420,
		minHeight: 380,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
		},
	});

	win.loadFile("index.html");
	win.webContents.openDevTools({mode: "detach"});

	win.once("ready-to-show", function()
	{
		win.show();
	});

	win.on("closed", function()
	{
		win = null;
	});
}

function createAppMenu()
{
	let menu = null;
	let menuTemplate = [];
	let fileSubMenu = [];
	let viewSubMenu = [];
	let helpSubMenu = [];
/*
	viewSubMenu.push({
		label: "Debugging Tools",
		click: function()
		{
			win.webContents.toggleDevTools();
		},
	});

	if (process.platform != "darwin")
	{
		helpSubMenu.push({
			label: "About",
			role: "about",
		});

		helpSubMenu.push({
			label: "Check for Update",
			click: function()
			{
				autoUpdater.checkForUpdates();
			},
		});
	}

	if (process.platform == "darwin")
	{
		menuTemplate.push({
			label: app.getName(),
			submenu: [
				{
					label: "About",
					role: "about",
				},
				{
					label: "Check for Update",
					click: function()
					{
						autoUpdater.checkForUpdates();
					},
				},
			],
		});
	}

	if (fileSubMenu.length > 0)
		menuTemplate.push({label: "File", submenu: fileSubMenu});

	if (viewSubMenu.length > 0)
		menuTemplate.push({label: "View", submenu: viewSubMenu});

	if (helpSubMenu.length > 0)
		menuTemplate.push({label: "Help", submenu: helpSubMenu});
*/
	menu = Menu.buildFromTemplate(menuTemplate);

	Menu.setApplicationMenu(menu);
}

app.on("ready", function()
{
	createAppWindow();
	createAppMenu();
});

app.on("window-all-closed", function()
{
	app.quit();
});

ipcMain.on("exitApp", function()
{
	win.close();
})

/*
 * app updater events
 */

ipcMain.on("check_updates", function()
{
	autoUpdater.checkForUpdates();
});

ipcMain.on("download_update", function()
{
	installUpdate = false;

	autoUpdater.downloadUpdate();
	win.webContents.send("update_downloading", false);
});

ipcMain.on("install_update", function()
{
	installUpdate = true;

	autoUpdater.downloadUpdate();
	win.webContents.send("update_downloading", true);
});

autoUpdater.on("error", function(error)
{
	win.webContents.send("update_error", error);
});

autoUpdater.on("checking-for-update", function()
{
	win.webContents.send("update_checking", false);
});

autoUpdater.on("update-available", function()
{
	win.webContents.send("update_notify", true);
});

autoUpdater.on("update-not-available", function()
{
	win.webContents.send("update_notify", false);
});

autoUpdater.on("update-downloaded", function()
{
	if (!installUpdate)
		return;

	app.removeAllListeners("window-all-closed");
	win.close();

	setTimeout(function()
	{
		autoUpdater.quitAndInstall();
	}, 5000);
});

autoUpdater.on("download-progress", function(progress)
{
	win.webContents.send("update_progress", progress);
});
