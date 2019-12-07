'use strict';

import { join as pathJoin } from 'path';
import { app, BrowserWindow, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import { is } from 'electron-util';
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
//import config from './config';
import { createMenu } from './menu.js';

unhandled();
contextMenu();

if (is.development) {
	debug();
}

app.setAppUserModelId('spiritsinobjects');

if (!is.development) {
	  	const FOUR_HOURS = 1000 * 60 * 60 * 4;
 	setInterval(() => {
 		autoUpdater.checkForUpdates();
 	}, FOUR_HOURS);
}


//autoUpdater.checkForUpdates();

let mainWindow : any;

const BrowserOptions = {
	title: app.name,
	show: false,
	width: 1000,
	height: 800,
	backgroundColor: 'rgb(220, 225, 220)',
	webPreferences : {
		nodeIntegration: true
	}
};

const createMainWindow = async () => {
	const win = new BrowserWindow(BrowserOptions);

	win.on('ready-to-show', () => {
		win.show();
	});

	win.on('closed', () => {
		mainWindow = undefined;
	});

	await win.loadFile(pathJoin(__dirname, '../views/index.html'));

	return win;
};

// Prevent multiple instances of the app
if (!app.requestSingleInstanceLock()) {
	app.quit();
}

app.on('second-instance', () => {
	if (mainWindow) {
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}

		mainWindow.show();
	}
});

app.on('window-all-closed', () => {
	if (!is.macos) {
		app.quit();
	}
});

app.on('activate', async () => {
	if (!mainWindow) {
		mainWindow = await createMainWindow();
	}
});

(async () => {
	const menu = createMenu();
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
})();