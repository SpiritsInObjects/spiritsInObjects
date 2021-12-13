'use strict';

import { join as pathJoin } from 'path';
import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { is } from 'electron-util';
import unhandled from 'electron-unhandled';
import debug from 'electron-debug';
import contextMenu from 'electron-context-menu';
import { existsSync, pathExists, unlink, writeFile, copyFile, unlinkSync, rmdirSync } from 'fs-extra';
import getPixels from 'get-pixels';
import { WaveFile } from 'wavefile';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import nodeCleanup from 'node-cleanup';

import { ffmpeg } from './lib/ffmpeg';
import { SonifyNode } from './lib/sonifyNode';

import { createMenu } from './lib/menu';
import { Visualize } from './lib/visualize';
import { Timeline } from './lib/timeline';

const CACHE : any = {};
const TMP : any = {
	dirs : [],
	files : []
}
let CANCEL : boolean = false;
let CHILD : any = null;

unhandled();
contextMenu();

if (is.development && process.argv.indexOf('--prod') === -1) {
	debug();
}

app.setAppUserModelId('spiritsinobjects');

/**
 * Extract raw pixel data from an image using get-pixels.
 * Put into an async/await wrapper using Promises
 * 
 * @param {string} filePath 	Path to image being extracted
 * 
 * @returns {object} Data from get-pixels module
 **/
async function pixels (filePath : string) : Promise<any> {
	return new Promise((resolve : Function, reject : Function ) => {
		return getPixels(filePath, (err : Error, imageData : any) => {
			if (err) {
				return reject(err);
			}
			return resolve(imageData);
		});
	});
}

/**
 * Create a SHA1 hash.
 * 
 * @param {string} str 		Input data
 * 
 * @returns {string} Hash in hex format
 **/
function hashStr (str : string) : string {
	return createHash('sha1').update(str).digest('hex');
}

/**
 * Sonification process used for both export, preview
 * in the Sonify workspace. Exports all frames from a video
 * and sonifies them individually while placing all samples in
 * a single array.
 * 
 * @param {object} args 	Options provided by ipc
 * 
 * @returns {string} Path to resulting audio file
 **/
async function sonify (args : any) : Promise<string>  {
	const startTime : number = +new Date();

	let wav = new WaveFile();
	let tmp : any;
	let watcher : any;
	let sonify : SonifyNode;
	let filePath : string;
	let i : number = 0;
	let imageData : any;
	let arrBuffer : Float32Array;
	let endTime : number;
	let frameStart : number;
	let ms : number;
	let arr : Float32Array = new Float32Array(args.state.height * args.state.frames);
	let tmpExists : boolean = false;
	let tmpAudio : string;
	let normalAudio : string;
	let hash : string;
	let fileHash : string;
	let onProgress : Function;

	try {
		tmp = await ffmpeg.exportPath();
		tmpExists = true;
		TMP.dirs.push(tmp);
	} catch (err) {
		console.error(err);
	}

	sonify = new SonifyNode(args.state);

	if (args.state.type === 'video') {
		hash = hashStr(args.state.filePath + `_${args.state.start}_${args.state.end}`);
		fileHash = hashStr(args.state.filePath);

		if (typeof CACHE[hash] !== 'undefined') {
			//return cached audio
			endTime = +new Date();
			mainWindow.webContents.send('sonify_complete', { time : endTime - startTime, tmpAudio : CACHE[hash] });
			return;
		}

		frameStart = +new Date();
		onProgress = (obj : any) => {
			ms = ((+new Date()) - frameStart) / obj.frame;
			mainWindow.webContents.send('sonify_progress', { i : obj.frame, frames : args.state.frames, ms });
		};

		try {
			await ffmpeg.exportFrames(args.state.filePath, onProgress);
		} catch (err) {
			console.error(err);
			return;
		}

	}

	mainWindow.webContents.send('sonify_sonify', { });
	
	for (i = 0; i < args.state.frames; i++) {
		frameStart = +new Date();

		if (args.state.type === 'video') {
			try {
				//filePath = await ffmpeg.exportFrame(args.state.filePath, i);
				filePath = ffmpeg.exportFramePath(fileHash, i+1);
			} catch (err) {
				console.error(err);
				continue;
			}
		} else if (args.state.type === 'still' ) {
			filePath = args.state.filePath;
		}

		try {
			tmpExists = await pathExists(filePath);
		} catch (err) {
			console.error(err);
			continue;
		}

		if (!tmpExists) {
			console.warn(`Frame ${filePath} does not exist`);
			continue;
		}

		try {
			imageData = await pixels(filePath);
		} catch (err) {
			console.error(err);
			continue;
		}

		arrBuffer = sonify.sonify(imageData.data);

		ms = (+new Date()) - frameStart;

		mainWindow.webContents.send('sonify_progress', { i, frames : args.state.frames, ms });

		arr.set(arrBuffer, i * arrBuffer.length);

		if (args.state.type === 'video') {
			try {
				unlink(filePath);
			} catch (err) {
				console.error(err);
			}
		}

		arr.set(arrBuffer, i * arrBuffer.length);

		if (CANCEL) {
			mainWindow.webContents.send('cancel', { });
			CANCEL = false;
			return;
		}
	}

	console.log(`All frames exported and sonified for ${args.state.filePath}`);

	wav.fromScratch(1, args.state.samplerate, '32f', arr);

	console.log('Created wav from raw sample data');

	tmpAudio = pathJoin(tmpdir(), `${uuid()}_tmp_audio.wav`);
	normalAudio = pathJoin(tmpdir(), `${uuid()}_normal_audio.wav`);

	try {
		await writeFile(tmpAudio, wav.toBuffer());
		console.log(`Saved temporary audio file to ${tmpAudio}`);
	} catch (err) {
		console.error(err);
	}

	try {
		//await sox.postProcess(tmpAudio, normalAudio);
		//console.log(`Normalized audio file to ${normalAudio}`);
	} catch (err) {
		console.error(err);
		console.log('Normalization failed, using original temporary file.');
	}

	CACHE[hash] = tmpAudio;
	TMP.files.push(tmpAudio);

	endTime = +new Date();

	if (args.save) {
		mainWindow.webContents.send('sonify_complete', { time : endTime - startTime, tmpAudio }); // : normalAudio 
	} else {
		console.log(`Sonification complete: ${endTime - startTime}ms`);
	}

	return tmpAudio;
}

let mainWindow : any;
let visualize : Visualize;
let timeline : Timeline;

const BrowserOptions = {
	title: app.name,
	show: false,
	width: 1000,
	height: 1000,
	resizable: false,
	backgroundColor: '#a7abb4',
	webPreferences : {
		webSecurity : true,
		nodeIntegration: true,
		enableRemoteModule: true,
		contextIsolation : false
	}
};

/**
 * Create the main window of the application.
 * 
 * @returns {object} The BrowserWindow class
 **/
const createMainWindow = async () => {
	const win = new BrowserWindow(BrowserOptions);

	win.on('ready-to-show', () => {
		win.show();
	});

	win.on('closed', () => {
		mainWindow = undefined;
		app.quit();
	});

	//for linux
	win.setResizable(false);

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

/**
 * COMMON FUNCTIONS
 **/

ipcMain.on('save', async (evt : Event, args : any) => {
	if (args.savePath && !args.savePath.canceled) {
		try {
			await copyFile(args.filePath, args.savePath.filePath);
			console.log(`Saved file as ${args.savePath.filePath}`);
		} catch (err) {
			console.error(err);
		}
	}
});

/**
 * SONIFY FUNCTIONS
 **/

ipcMain.on('sonify', async (evt : Event, args : any) => {;
	return sonify(args);
});

ipcMain.on('cancel', async (evt : Event, args : any) => {
	let cancelled : boolean = false;
	CANCEL = true;
	try {
		cancelled = await ffmpeg.cancel();
	} catch (err) {
		console.error(err);
	}
	if ( cancelled ) {
		mainWindow.webContents.send('cancel', { });
	}
});

ipcMain.on('info', async (evt : Event, args : any) => {
	let res : any = {};
	if (args.type === 'video') {
		try {
			res = await ffmpeg.info(args.filePath);
		} catch (err) {
			console.error(err)
		}
	} else if (args.type === 'still') {
		try {
			res = await ffmpeg.info(args.filePath); //for now
		} catch (err) {
			console.error(err)
		}
		res.frames = 1;
	}
	res.type = args.type;
	mainWindow.webContents.send('info', res);
});

ipcMain.on('preview', async (evt : Event, args : any) => {
	const filePath : string = args.filePath;
	const pathHash : string = hashStr(filePath);
	const tmpVideo : string = pathJoin(tmpdir(), `${pathHash}_tmp_video.mkv`);
	const frameStart : number = +new Date();
	const width : number = args.width;
	const height : number = args.height;
	let tmpExists : boolean = false;
	let info : any = {};
	let success : boolean = false;

	function onProgress (obj : any) {
		const ms : number = ((+new Date()) - frameStart) / obj.frame;
		mainWindow.webContents.send('preview_progress', { ms, frameNumber : obj.frame });
	}

	TMP.files.push(tmpVideo);

	try {
		tmpExists = await pathExists(tmpVideo);
	} catch (err) {
		console.error(err);
	}

	if (tmpExists) {
		success = true;
		mainWindow.webContents.send('preview', { tmpVideo, success });
		return;
	}

	try {
		await ffmpeg.exportPreview(args.filePath, tmpVideo, { width, height, forceScale : true }, onProgress);
		success = true;
	} catch (err) {
		console.error(err);
		success = false;
	}

	mainWindow.webContents.send('preview', { tmpVideo, success });
});

ipcMain.on('sync_preview', async (evt : Event, args : any) => {
	const filePath : string = args.filePath;
	const pathHash : string = hashStr(filePath);
	const tmpVideo : string = pathJoin(tmpdir(), `${pathHash}_tmp_sync_video.mkv`);
	const frameStart : number = +new Date();
	const width : number = args.width;
	const height : number = args.height;
	let tmpExists : boolean = false;
	let info : any = {};
	let success : boolean = false;
	let tmpAudio : string;

	function onProgress (obj : any) {
		const ms : number = ((+new Date()) - frameStart) / obj.frame;
		mainWindow.webContents.send('preview_progress', { ms, frameNumber : obj.frame });
	}

	TMP.files.push(tmpVideo);

	try {
		tmpExists = await pathExists(tmpVideo);
	} catch (err) {
		console.error(err);
	}

	if (tmpExists) {
		success = true;
		mainWindow.webContents.send('sync_preview', { tmpVideo, success });
		return;
	}

	try {
		tmpAudio = await sonify(args);
	} catch (err) {
		console.error(err);
		success = false;
	}

	TMP.files.push(tmpAudio);

	try {
		await ffmpeg.exportPreview(args.filePath, tmpVideo, { width, height, forceScale : true, audio : tmpAudio }, onProgress);
		success = true;
	} catch (err) {
		console.error(err);
		success = false;
	}

	mainWindow.webContents.send('sync_preview', { tmpVideo, success });
});

/**
 * VISUALIZE FUNCTIONS
 **/

ipcMain.on('process_audio', async (evt : Event, args : any) => {
	const tmpAudio : string = pathJoin(tmpdir(), `${uuid()}_tmp_audio.wav`);
	const frameStart = +new Date();
	let info : any = {};
	let success : boolean = false;

	function onProgress (obj : any) {
		const ms : number = ((+new Date()) - frameStart) / obj.frame;
		mainWindow.webContents.send('process_audio_progress', { ms, frameNumber : obj.frame });
	}

	try {
		info = await ffmpeg.info(args.state.filePath);
		success = true;
	} catch (err) {
		console.error(err)
		success = false;
	}

	try {
		await visualize.processAudio(args.state, info, tmpAudio, onProgress);
		success = true;
	} catch (err) {
		console.error(err);
		success = false;
	}

	TMP.files.push(tmpAudio);

	mainWindow.webContents.send('process_audio', { tmpAudio, success });
});

ipcMain.on('visualize_start', async (evt : Event, args : any) => {
	let success : boolean = false;
	try {
		await visualize.startExport(args.format);
		success = true;
	} catch (err) {
		console.error(err);
	}
	mainWindow.webContents.send('visualize_start', { success });
});

ipcMain.on('visualize_frame', async (evt : Event, args : any) => {
	const ms : number = +new Date();
	let success : boolean = false;
	try {
		await visualize.exportFrame(args.frameNumber, args.data, args.width, args.height);
		success = true;
	} catch (err) {
		console.error(err);
	}
	mainWindow.webContents.send('visualize_frame', { success, ms : (+new Date()) - ms, frameNumber : args.frameNumber });
});

ipcMain.on('visualize_end', async (evt : Event, args : any) => {
	const frameStart : number = +new Date();
	let success : boolean = false;
	let tmpVideo : string;

	const onProgress : Function = (obj : any) => {
		const ms : number = ((+new Date()) - frameStart) / obj.frame;
		mainWindow.webContents.send('visualize_progress', { ms, frameNumber : obj.frame });
	};

	try {
		tmpVideo = await visualize.endExport(onProgress);
		success = true;
	} catch (err) {
		console.error(err);
	}

	TMP.files.push(tmpVideo);

	mainWindow.webContents.send('visualize_end', { success, tmpVideo });
});

ipcMain.on('visualize_preview_start', async (evt : Event, args : any) => {
	let success : boolean = false;
	try {
		await visualize.startPreview();
		success = true;
	} catch (err) {
		console.log(err);
	}
	mainWindow.webContents.send('visualize_preview_start', { success });
});

ipcMain.on('visualize_preview_end', async (evt : Event, args : any) => {
	const frameStart : number = +new Date();
	const options : PreviewOptions = {
		width : args.options.width,
		height : args.options.height,
		forceScale : true,
		sequence : true
	}
	let success : boolean = false;
	let tmpVideo : string;

	const onProgress : Function = (obj : any) => {
		const ms : number = ((+new Date()) - frameStart) / obj.frame;
		mainWindow.webContents.send('visualize_progress', { ms, frameNumber : obj.frame });
	};

	try {
		tmpVideo = await visualize.endPreview(options, onProgress);
		success = true;
	} catch (err) {
		console.error(err);
	}

	TMP.files.push(tmpVideo);

	mainWindow.webContents.send('visualize_preview_end', { success, tmpVideo });
});

/**
 * TIMELINE FUNCTIONS
 **/

ipcMain.on('bin', async (evt : Event, args : any) => {
	const { bi, image } : any = args;
	const ms = +new Date();
	let tmpAudio : string;
	let tmpImage : string;

	if (bi.id !== 'blank') {
		tmpAudio = await timeline.exportAudio(bi.id, bi.samples);
		TMP.files.push(tmpAudio);
	}

	if (bi.id !== 'silence') {
		if (image) {
			tmpImage = await timeline.exportFrame(bi.id, image.data, image.width, image.height);
		} else {
			tmpImage = await timeline.copyFrame(bi.id, bi.file);
		}
		TMP.files.push(tmpImage);
	}

	mainWindow.webContents.send('bin_complete', { id : bi.id, ms : (+new Date()) - ms });
});

ipcMain.on('timeline_export', async (evt : Event, args : any) => {
	const frameStart = +new Date();
	const id : string = uuid();
	let success : boolean = false;
	let tmpVideo : string = pathJoin(tmpdir(), `timeline_${id}.mov`);

	function onProgress (obj : any) {
		const ms : number = ((+new Date()) - frameStart) / obj.frame;
		mainWindow.webContents.send('timeline_export_progress', { ms, frameNumber : obj.frame });
	}

	try {
		success = await timeline.export(args.timeline, tmpVideo, onProgress);
	} catch (err) {
		console.error(err);
		return mainWindow.webContents.send('timeline_export_complete', { success })
	}

	TMP.files.push(tmpVideo);

	mainWindow.webContents.send('timeline_export_complete', { success, tmpVideo })
});

ipcMain.on('timeline_preview', async (evt : Event, args : any) => {
	const id : string = uuid();
	let success : boolean = false;
	let tmpVideo : string = pathJoin(tmpdir(), `timeline_preview.mp4`);

	try {
		success = await timeline.preview(args, tmpVideo);
	} catch (err) {
		console.error(err);
		return mainWindow.webContents.send('timeline_export_complete', { success });
	}

	if (TMP.files.indexOf(tmpVideo) === -1) {
		TMP.files.push(tmpVideo);
	}
	mainWindow.webContents.send('timeline_preview_complete', { success, tmpVideo });
});


/**
 * Function that gets called on exit events that can be caught by the
 * main process. Deletes files and directories listed in the TMP object.
 **/
nodeCleanup((exitCode : any, signal : string) => {
	let exists : boolean = false;
	console.log(`Cleaning up on exit code ${exitCode}...`);
	for (let dir of TMP.dirs){
		try {
			rmdirSync(dir, { recursive: true });
			console.log(`Removed directory ${dir}`);
		} catch (err) {
			console.error(err);
		}
	}
	for (let file of TMP.files){
		try {
			exists = existsSync(file);
		} catch (err) {
			console.error(err);
		}
		if (exists) {
			try {
				unlinkSync(file);
				console.log(`Removed ${file}`);
			} catch (err) {
				console.error(err);
			}
		}
	}
	console.log(`Exiting spiritsInObjects...`)
});

/**
 * Save a file storing current state to be restored.
 **/
async function saveState () {
	mainWindow.webContents.send('save_state', { });
}

/**
 * Save a file storing current state to be restored.
 * Force save dialog
 **/
async function saveStateAs () {
	mainWindow.webContents.send('save_state_as', { });
}

/**
 * Load state from file.
 **/
async function restoreState () {
	mainWindow.webContents.send('restore_state', { });
}

(async () => {
	const menu = createMenu(saveState, restoreState, saveStateAs);
	await app.whenReady();
	Menu.setApplicationMenu(menu);
	mainWindow = await createMainWindow();
	visualize = new Visualize(ffmpeg);
	timeline = new Timeline(ffmpeg);

	try {
		await ffmpeg.exportPath();
	} catch (err) {
		console.error(err);
	}

	TMP.dirs.push(timeline.tmpDir);
	TMP.dirs.push(timeline.binDir);
})();