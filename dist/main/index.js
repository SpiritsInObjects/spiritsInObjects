'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const electron_1 = require("electron");
const electron_util_1 = require("electron-util");
const electron_unhandled_1 = __importDefault(require("electron-unhandled"));
const electron_debug_1 = __importDefault(require("electron-debug"));
const electron_context_menu_1 = __importDefault(require("electron-context-menu"));
const fs_extra_1 = require("fs-extra");
const get_pixels_1 = __importDefault(require("get-pixels"));
const wavefile_1 = require("wavefile");
const os_1 = require("os");
const ffmpeg_1 = require("./lib/ffmpeg");
const sonifyNode_1 = require("./lib/sonifyNode");
//import config from './lib/config';
const menu_1 = require("./lib/menu");
electron_unhandled_1.default();
electron_context_menu_1.default();
if (electron_util_1.is.development) {
    electron_debug_1.default();
}
electron_1.app.setAppUserModelId('spiritsinobjects');
async function pixels(filePath) {
    return new Promise((resolve, reject) => {
        return get_pixels_1.default(filePath, (err, imageData) => {
            if (err) {
                return reject(err);
            }
            return resolve(imageData);
        });
    });
}
let mainWindow;
const BrowserOptions = {
    title: electron_1.app.name,
    show: false,
    width: 1000,
    height: 800,
    backgroundColor: 'rgb(220, 225, 220)',
    webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true
    }
};
const createMainWindow = async () => {
    const win = new electron_1.BrowserWindow(BrowserOptions);
    win.on('ready-to-show', () => {
        win.show();
    });
    win.on('closed', () => {
        mainWindow = undefined;
        electron_1.app.quit();
    });
    await win.loadFile(path_1.join(__dirname, '../views/index.html'));
    return win;
};
// Prevent multiple instances of the app
if (!electron_1.app.requestSingleInstanceLock()) {
    electron_1.app.quit();
}
electron_1.app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.show();
    }
});
electron_1.app.on('window-all-closed', () => {
    if (!electron_util_1.is.macos) {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', async () => {
    if (!mainWindow) {
        mainWindow = await createMainWindow();
    }
});
electron_1.ipcMain.on('sonify', async (evt, args) => {
    const startTime = +new Date();
    let wav = new wavefile_1.WaveFile();
    let tmp;
    let watcher;
    let sonify;
    let filePath;
    let i = 0;
    let imageData;
    let arrBuffer;
    let endTime;
    let frameStart;
    let ms;
    let arr = new Float32Array(args.state.height * args.state.frames);
    let tmpExists = false;
    let tmpAudio;
    let normalAudio;
    console.log(args.state);
    try {
        tmp = await ffmpeg_1.ffmpeg.exportPath();
        tmpExists = true;
    }
    catch (err) {
        console.error(err);
    }
    sonify = new sonifyNode_1.SonifyNode(args.state);
    for (i = 0; i < args.state.frames; i++) {
        frameStart = +new Date();
        try {
            filePath = await ffmpeg_1.ffmpeg.exportFrame(args.state.files[0], i);
        }
        catch (err) {
            console.error(err);
            continue;
        }
        try {
            tmpExists = await fs_extra_1.pathExists(filePath);
        }
        catch (err) {
            console.error(err);
            continue;
        }
        if (!tmpExists) {
            console.warn(`Frame ${filePath} does not exist`);
            continue;
        }
        try {
            imageData = await pixels(filePath);
        }
        catch (err) {
            console.error(err);
            continue;
        }
        arrBuffer = sonify.sonify(imageData.data);
        ms = (+new Date()) - frameStart;
        //console.log(`progress : ${i / args.state.frames}`);
        mainWindow.webContents.send('sonify_progress', { i, frames: args.state.frames, ms });
        arr.set(arrBuffer, i * arrBuffer.length);
        try {
            fs_extra_1.unlink(filePath);
        }
        catch (err) {
            console.error(err);
        }
        arr.set(arrBuffer, i * arrBuffer.length);
    }
    console.log(`All frames exported and sonified for ${args.state.files[0]}`);
    wav.fromScratch(1, args.state.samplerate, '32f', arr);
    console.log('Created wav from raw sample data');
    tmpAudio = path_1.join(os_1.tmpdir(), 'tmp_audio.wav');
    normalAudio = path_1.join(os_1.tmpdir(), 'normal_audio.wav');
    try {
        await fs_extra_1.writeFile(tmpAudio, wav.toBuffer());
        console.log(`Saved temporary audio file to ${tmpAudio}`);
    }
    catch (err) {
        console.error(err);
    }
    try {
        //await sox.postProcess(tmpAudio, normalAudio);
        //console.log(`Normalized audio file to ${normalAudio}`);
    }
    catch (err) {
        console.error(err);
        console.log('Normalization failed, using original tmp file.');
    }
    endTime = +new Date();
    mainWindow.webContents.send('sonify_complete', { time: endTime - startTime, tmpAudio }); // : normalAudio 
});
electron_1.ipcMain.on('info', async (evt, args) => {
    let res;
    try {
        res = await ffmpeg_1.ffmpeg.info(args.filePath);
    }
    catch (err) {
        console.error(err);
    }
    mainWindow.webContents.send('info', res);
});
electron_1.ipcMain.on('save', async (evt, args) => {
    if (args.savePath && !args.savePath.canceled) {
        try {
            await fs_extra_1.copyFile(args.filePath, args.savePath.filePath);
            console.log(`Saved file as ${args.savePath.filePath}`);
        }
        catch (err) {
            console.error(err);
        }
    }
});
(async () => {
    const menu = menu_1.createMenu();
    await electron_1.app.whenReady();
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow = await createMainWindow();
})();
//# sourceMappingURL=index.js.map