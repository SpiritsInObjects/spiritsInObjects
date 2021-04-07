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
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const ffmpeg_1 = require("./lib/ffmpeg");
const sonifyNode_1 = require("./lib/sonifyNode");
//import config from './lib/config';
const menu_1 = require("./lib/menu");
const sox_1 = require("./lib/sox");
const visualize_1 = require("./lib/visualize");
const CACHE = {};
let CANCEL = false;
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
function hashStr(str) {
    return crypto_1.createHash('sha1').update(str).digest('hex');
}
let mainWindow;
let visualize;
const BrowserOptions = {
    title: electron_1.app.name,
    show: false,
    width: 1000,
    height: 1000,
    resizable: false,
    backgroundColor: '#a7abb4',
    webPreferences: {
        webSecurity: false,
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
    //for linux
    win.setResizable(false);
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
    let hash;
    let fileHash;
    try {
        tmp = await ffmpeg_1.ffmpeg.exportPath();
        tmpExists = true;
    }
    catch (err) {
        console.error(err);
    }
    sonify = new sonifyNode_1.SonifyNode(args.state);
    if (args.state.type === 'video') {
        hash = hashStr(args.state.filePath + `_${args.state.start}_${args.state.end}`);
        fileHash = hashStr(args.state.filePath);
        if (typeof CACHE[hash] !== 'undefined') {
            //return cached audio
            endTime = +new Date();
            mainWindow.webContents.send('sonify_complete', { time: endTime - startTime, tmpAudio: CACHE[hash] });
            return;
        }
        try {
            await ffmpeg_1.ffmpeg.export(args.state.filePath);
        }
        catch (err) {
            console.error(err);
            return;
        }
    }
    for (i = 0; i < args.state.frames; i++) {
        frameStart = +new Date();
        if (args.state.type === 'video') {
            try {
                //filePath = await ffmpeg.exportFrame(args.state.filePath, i);
                filePath = ffmpeg_1.ffmpeg.exportFramePath(fileHash, i + 1);
            }
            catch (err) {
                console.error(err);
                continue;
            }
        }
        else if (args.state.type === 'still') {
            filePath = args.state.filePath;
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
        mainWindow.webContents.send('sonify_progress', { i, frames: args.state.frames, ms });
        arr.set(arrBuffer, i * arrBuffer.length);
        if (args.state.type === 'video') {
            try {
                fs_extra_1.unlink(filePath);
            }
            catch (err) {
                console.error(err);
            }
        }
        arr.set(arrBuffer, i * arrBuffer.length);
        if (CANCEL) {
            mainWindow.webContents.send('cancel', {});
            CANCEL = false;
            return false;
        }
    }
    console.log(`All frames exported and sonified for ${args.state.filePath}`);
    wav.fromScratch(1, args.state.samplerate, '32f', arr);
    console.log('Created wav from raw sample data');
    tmpAudio = path_1.join(os_1.tmpdir(), `${uuid_1.v4()}_tmp_audio.wav`);
    normalAudio = path_1.join(os_1.tmpdir(), `${uuid_1.v4()}_normal_audio.wav`);
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
    CACHE[hash] = tmpAudio;
    endTime = +new Date();
    mainWindow.webContents.send('sonify_complete', { time: endTime - startTime, tmpAudio }); // : normalAudio 
});
electron_1.ipcMain.on('cancel', async (evt, args) => {
    CANCEL = true;
});
electron_1.ipcMain.on('info', async (evt, args) => {
    let res = {};
    if (args.type === 'video') {
        try {
            res = await ffmpeg_1.ffmpeg.info(args.filePath);
        }
        catch (err) {
            console.error(err);
        }
    }
    else if (args.type === 'still') {
        try {
            res = await ffmpeg_1.ffmpeg.info(args.filePath); //for now
        }
        catch (err) {
            console.error(err);
        }
        res.frames = 1;
    }
    res.type = args.type;
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
electron_1.ipcMain.on('process_audio', async (evt, args) => {
    const tmpAudio = path_1.join(os_1.tmpdir(), `${uuid_1.v4()}_tmp_audio.wav`);
    let info = {};
    try {
        info = await ffmpeg_1.ffmpeg.info(args.state.filePath);
    }
    catch (err) {
        console.error(err);
    }
    try {
        await visualize.processAudio(args.state, info, tmpAudio);
    }
    catch (err) {
        console.error(err);
    }
    mainWindow.webContents.send('process_audio', { tmpAudio });
});
electron_1.ipcMain.on('visualize_start', async (evt, args) => {
    let success = false;
    try {
        await visualize.startExport();
        success = true;
    }
    catch (err) {
        console.error(err);
    }
    mainWindow.webContents.send('visualize_start', { success });
});
electron_1.ipcMain.on('visualize_frame', async (evt, args) => {
    const ms = +new Date();
    let success = false;
    try {
        await visualize.exportFrame(args.frameNumber, args.data, args.width, args.height);
        success = true;
    }
    catch (err) {
        console.error(err);
    }
    mainWindow.webContents.send('visualize_frame', { success, ms: (+new Date()) - ms, frameNumber: args.frameNumber });
});
electron_1.ipcMain.on('visualize_end', async (evt, args) => {
    let success = false;
    let tmpVideo;
    try {
        tmpVideo = await visualize.endExport();
        success = true;
    }
    catch (err) {
        console.error(err);
    }
    mainWindow.webContents.send('visualize_end', { success, tmpVideo });
});
(async () => {
    const menu = menu_1.createMenu();
    await electron_1.app.whenReady();
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow = await createMainWindow();
    visualize = new visualize_1.Visualize(sox_1.sox, ffmpeg_1.ffmpeg);
})();
//# sourceMappingURL=index.js.map