'use strict';

import { join as pathJoin } from 'path';
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { exec } from 'child_process';
import { autoUpdater } from 'electron-updater';
import { is } from 'electron-util';
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

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

async function execAsync (cmd : string) {
	return new Promise((resolve : Function, reject : Function) => {
		return exec(cmd, (err: Error, stdio : string, stderr : string) => {
			if (err) {
				return reject(err);
			}
			return resolve(stdio + stderr);
		})
	})
}

async function ffprobeInfo (filePath : string) : Promise<any> {
	const cmd : string = `${ffprobe.path} -v quiet -print_format json -show_format -show_streams "${filePath}"`;
	let res : any;
	try {
		res = await execAsync(cmd)
	} catch (err) {
		console.error(err)
	}
	return JSON.parse(res)
}

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

ipcMain.on('ffmpeg', async (evt : Event, args : any) => {
	let cmd : string = `${ffmpeg.path} `
});

ipcMain.on('ffprobe', async (evt : Event, args : any) => {
	let res : any;
	try {
		res = await ffprobeInfo(args.filePath)
	} catch (err) {
		console.error(err)
	}
	mainWindow.webContents.send('ffprobe', res);
});

(async () => {
	const menu = createMenu();
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
})();