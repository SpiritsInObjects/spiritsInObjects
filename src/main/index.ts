'use strict';

import { join as pathJoin } from 'path';
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { is } from 'electron-util';
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
import watch from 'node-watch';
import { pathExists, unlink, writeFileSync } from 'fs-extra';
import getPixels from 'get-pixels';
import { WaveFile } from 'wavefile';

import { ffmpeg } from './lib/ffmpeg';
import { SonifyNode } from './lib/sonify';

//import config from './lib/config';
import { createMenu } from './lib/menu';
import { fstat, writeFile } from 'fs';

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

async function pixels (filePath : string) {
	return new Promise((resolve : Function, reject : Function ) => {
		return getPixels(filePath, (err : Error, imageData : any) => {
			if (err) {
				return reject(err);
			}
			return resolve(imageData);
		});
	});
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
		app.quit();
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

ipcMain.on('sonify', async (evt : Event, args : any) => {
	const startTime : number = +new Date();
	//const monoBuffer : Float32Array = new Float32Array(args.state.frames * args.state.samplerate);
	let wav = new WaveFile();
	let tmp : any;
	let watcher : any;
	let video : SonifyNode;
	let filePath : string;
	let i : number = 0;
	let imageData : any;
	let arrBuffer : Float32Array;
	let endTime : number;
	let frameStart : number;
	let ms : number;
	
	console.log(args.state)

	try {
		tmp = await ffmpeg.exportPath();
	} catch (err) {
		console.error(err);
	}

	video = new SonifyNode(args.state);

	let arr : Float32Array = new Float32Array(args.state.samplerate);
	
	for (i = 0; i < args.state.frames; i++) {
		frameStart = +new Date();
		try {
			filePath = await ffmpeg.exportFrame(args.state.files[0], i);
		} catch (err) {
			console.error(err);
			continue;
		}
		try {
			imageData = await pixels(filePath);
		} catch (err) {
			console.error(err);
			continue;
		}
		try {
			arrBuffer = video.sonify(imageData.data);
		} catch (err) {
			console.error(err);
		}
		ms = (+new Date()) - frameStart;
		console.log(`progress : ${i / args.state.frames}`);
		mainWindow.webContents.send('sonify_progress', { i, frames : args.state.frames, ms }); //samples : arrBuffer
		//monoBuffer.set(arrBuffer, i * arrBuffer.length);

		try {
			unlink(filePath);
		} catch (err) {
			console.error(err);
		}

		if (i === 24) {
			writeFileSync('./buffer.json', JSON.stringify(arr, null, '\t'), 'utf8');
			wav.fromScratch(1, args.state.samplerate, '8', arr);
			writeFileSync('./buffer.wav', wav.toBuffer());
			process.exit();
		}
		arr.set(arrBuffer, i * arrBuffer.length);
	}
	endTime = +new Date();
	mainWindow.webContents.send('sonify_complete', { time : endTime - startTime });
	//console.dir(monoBuffer);
});

ipcMain.on('info', async (evt : Event, args : any) => {
	let res : any;
	try {
		res = await ffmpeg.info(args.filePath)
	} catch (err) {
		console.error(err)
	}
	mainWindow.webContents.send('info', res);
});

(async () => {
	const menu = createMenu();
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
})();