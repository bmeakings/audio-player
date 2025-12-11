'use strict';

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const musicMetadata = require('music-metadata');
const cliOpts = process.argv;

let appWindow = null;

function createAppWindow() {
	const showConsole = (cliOpts.indexOf('--console') > -1);

	appWindow = new BrowserWindow({
		show: false,
		width: 420,
		height: 380,
		minWidth: 420,
		minHeight: 380,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
		},
	});

	appWindow.loadFile(path.join(__dirname, 'index.html'));

	if (showConsole)
		appWindow.webContents.openDevTools({mode: 'detach'});

	appWindow.once('ready-to-show', () => {
		appWindow.show();
	});

	appWindow.on('closed', () => {
		appWindow = null;
	});
}

function createAppMenu() {
	let menu = null;
	let menuTemplate = [];

	menu = Menu.buildFromTemplate(menuTemplate);

	Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
	ipcMain.on('window-title', (event, title) => {
		const webContents = event.sender;
		const win = BrowserWindow.fromWebContents(webContents);

		win.setTitle(title);
	});

	ipcMain.on('resize-window', (event, width, height) => {
		appWindow.setSize(width, height);
	});

	ipcMain.on('centre-window', (event) => {
		appWindow.center();
	});

	ipcMain.on('set-full-screen', (event, fs) => {
		const webContents = event.sender;
		const win = BrowserWindow.fromWebContents(webContents);

		win.setFullScreen(fs);
	});

	ipcMain.handle('get-music-metadata', (event, file) => {
		return musicMetadata.parseFile(file);
	});

	ipcMain.on('exit-app', () => {
		appWindow.close();
	});

	createAppWindow();
	createAppMenu();
});

app.on('window-all-closed', () => {
	app.quit();
});
