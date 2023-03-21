"use strict";

const { app, BrowserWindow, Menu, ipcMain, dialog } = require("electron");

let win = null;

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
});
