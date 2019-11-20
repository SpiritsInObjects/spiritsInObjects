'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const electron_1 = require("electron");
/// const {autoUpdater} = require('electron-updater');
const electron_util_1 = require("electron-util");
const electron_unhandled_1 = __importDefault(require("electron-unhandled"));
const electron_debug_1 = __importDefault(require("electron-debug"));
const electron_context_menu_1 = __importDefault(require("electron-context-menu"));
//import config from './config';
const menu_js_1 = require("./menu.js");
electron_unhandled_1.default();
electron_context_menu_1.default();
if (process.argv.indexOf('-d') !== -1 || process.argv.indexOf('--dev')) {
    electron_debug_1.default();
}
// Note: Must match `build.appId` in package.json
electron_1.app.setAppUserModelId('spiritsinobjects');
// Uncomment this before publishing your first version.
// It's commented out as it throws an error if there are no published versions.
// if (!is.development) {
// 	const FOUR_HOURS = 1000 * 60 * 60 * 4;
// 	setInterval(() => {
// 		autoUpdater.checkForUpdates();
// 	}, FOUR_HOURS);
//
// 	autoUpdater.checkForUpdates();
// }
// Prevent window from being garbage collected
let mainWindow;
const createMainWindow = async () => {
    const win = new electron_1.BrowserWindow({
        title: electron_1.app.getName(),
        show: false,
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });
    win.on('ready-to-show', () => {
        win.show();
    });
    win.on('closed', () => {
        // Dereference the window
        // For multiple windows store them in an array
        mainWindow = undefined;
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
(async () => {
    const menu = menu_js_1.createMenu();
    await electron_1.app.whenReady();
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow = await createMainWindow();
})();
//# sourceMappingURL=index.js.map