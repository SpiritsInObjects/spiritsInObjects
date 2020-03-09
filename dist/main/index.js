'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const electron_1 = require("electron");
const electron_updater_1 = require("electron-updater");
const electron_util_1 = require("electron-util");
const electron_unhandled_1 = __importDefault(require("electron-unhandled"));
const electron_debug_1 = __importDefault(require("electron-debug"));
const electron_context_menu_1 = __importDefault(require("electron-context-menu"));
const fs_extra_1 = require("fs-extra");
const get_pixels_1 = __importDefault(require("get-pixels"));
const ffmpeg_1 = require("./lib/ffmpeg");
const sonify_1 = require("./lib/sonify");
//import config from './config';
const menu_js_1 = require("./menu.js");
electron_unhandled_1.default();
electron_context_menu_1.default();
if (electron_util_1.is.development) {
    electron_debug_1.default();
}
electron_1.app.setAppUserModelId('spiritsinobjects');
if (!electron_util_1.is.development) {
    const FOUR_HOURS = 1000 * 60 * 60 * 4;
    setInterval(() => {
        electron_updater_1.autoUpdater.checkForUpdates();
    }, FOUR_HOURS);
}
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
//autoUpdater.checkForUpdates();
let mainWindow;
const BrowserOptions = {
    title: electron_1.app.name,
    show: false,
    width: 1000,
    height: 800,
    backgroundColor: 'rgb(220, 225, 220)',
    webPreferences: {
        nodeIntegration: true
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
    //const monoBuffer : Float32Array = new Float32Array(args.state.frames * args.state.samplerate);
    let tmp;
    let watcher;
    let video;
    let filePath;
    let i = 0;
    let imageData;
    let arrBuffer;
    let endTime;
    let frameStart;
    let ms;
    console.log(args.state);
    try {
        tmp = await ffmpeg_1.ffmpeg.exportPath();
    }
    catch (err) {
        console.error(err);
    }
    video = new sonify_1.SonifyNode(args.state);
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
            imageData = await pixels(filePath);
        }
        catch (err) {
            console.error(err);
            continue;
        }
        try {
            arrBuffer = video.sonify(imageData.data);
        }
        catch (err) {
            console.error(err);
        }
        ms = (+new Date()) - frameStart;
        console.log(`progress : ${i / args.state.frames}`);
        mainWindow.webContents.send('sonify_progress', { i, frames: args.state.frames, ms, samples: arrBuffer });
        //monoBuffer.set(arrBuffer, i * arrBuffer.length);
        fs_extra_1.writeFileSync('./buffer.json', JSON.stringify(arrBuffer, null, '\t'), 'utf8');
        process.exit();
        try {
            fs_extra_1.unlink(filePath);
        }
        catch (err) {
            console.error(err);
        }
    }
    endTime = +new Date();
    mainWindow.webContents.send('sonify_complete', { time: endTime - startTime });
    //console.dir(monoBuffer);
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
(async () => {
    const menu = menu_js_1.createMenu();
    await electron_1.app.whenReady();
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow = await createMainWindow();
})();
//# sourceMappingURL=index.js.map