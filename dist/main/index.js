'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const electron_updater_1 = require("electron-updater");
const electron_util_1 = require("electron-util");
const electron_unhandled_1 = __importDefault(require("electron-unhandled"));
const electron_debug_1 = __importDefault(require("electron-debug"));
const electron_context_menu_1 = __importDefault(require("electron-context-menu"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const ffprobe_static_1 = __importDefault(require("ffprobe-static"));
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
    });
    await win.loadFile(path_1.join(__dirname, '../views/index.html'));
    return win;
};
async function execAsync(cmd) {
    return new Promise((resolve, reject) => {
        return child_process_1.exec(cmd, (err, stdio, stderr) => {
            if (err) {
                return reject(err);
            }
            return resolve(stdio + stderr);
        });
    });
}
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
electron_1.ipcMain.on('ffmpeg', async (evt, args) => {
    let cmd = `${ffmpeg_static_1.default.path} `;
});
electron_1.ipcMain.on('ffprobe', async (evt, args) => {
    const cmd = `${ffprobe_static_1.default.path} -v quiet -print_format json -show_format -show_streams "${args.filePath}"`;
    let res;
    try {
        res = await execAsync(cmd);
    }
    catch (err) {
        console.error(err);
    }
    mainWindow.webContents.send('ffprobe', JSON.parse(res));
});
(async () => {
    const menu = menu_js_1.createMenu();
    await electron_1.app.whenReady();
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow = await createMainWindow();
})();
//# sourceMappingURL=index.js.map