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
const node_cleanup_1 = __importDefault(require("node-cleanup"));
const ffmpeg_1 = require("./lib/ffmpeg");
const sonifyNode_1 = require("./lib/sonifyNode");
const menu_1 = require("./lib/menu");
const visualize_1 = require("./lib/visualize");
const timeline_1 = require("./lib/timeline");
const CACHE = {};
const TMP = {
    dirs: [],
    files: []
};
let CANCEL = false;
let CHILD = null;
(0, electron_unhandled_1.default)();
(0, electron_context_menu_1.default)();
if (electron_util_1.is.development && process.argv.indexOf('--prod') === -1) {
    (0, electron_debug_1.default)();
}
electron_1.app.setAppUserModelId('spiritsinobjects');
async function pixels(filePath) {
    return new Promise((resolve, reject) => {
        return (0, get_pixels_1.default)(filePath, (err, imageData) => {
            if (err) {
                return reject(err);
            }
            return resolve(imageData);
        });
    });
}
function hashStr(str) {
    return (0, crypto_1.createHash)('sha1').update(str).digest('hex');
}
async function sonify(args) {
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
    let onProgress;
    try {
        tmp = await ffmpeg_1.ffmpeg.exportPath();
        tmpExists = true;
        TMP.dirs.push(tmp);
    }
    catch (err) {
        console.error(err);
    }
    sonify = new sonifyNode_1.SonifyNode(args.state);
    if (args.state.type === 'video') {
        hash = hashStr(args.state.filePath + `_${args.state.start}_${args.state.end}`);
        fileHash = hashStr(args.state.filePath);
        if (typeof CACHE[hash] !== 'undefined') {
            endTime = +new Date();
            mainWindow.webContents.send('sonify_complete', { time: endTime - startTime, tmpAudio: CACHE[hash] });
            return;
        }
        frameStart = +new Date();
        onProgress = (obj) => {
            ms = ((+new Date()) - frameStart) / obj.frame;
            mainWindow.webContents.send('sonify_progress', { i: obj.frame, frames: args.state.frames, ms });
        };
        try {
            await ffmpeg_1.ffmpeg.exportFrames(args.state.filePath, onProgress);
        }
        catch (err) {
            console.error(err);
            return;
        }
    }
    mainWindow.webContents.send('sonify_sonify', {});
    for (i = 0; i < args.state.frames; i++) {
        frameStart = +new Date();
        if (args.state.type === 'video') {
            try {
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
            tmpExists = await (0, fs_extra_1.pathExists)(filePath);
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
                (0, fs_extra_1.unlink)(filePath);
            }
            catch (err) {
                console.error(err);
            }
        }
        arr.set(arrBuffer, i * arrBuffer.length);
        if (CANCEL) {
            mainWindow.webContents.send('cancel', {});
            CANCEL = false;
            return;
        }
    }
    console.log(`All frames exported and sonified for ${args.state.filePath}`);
    wav.fromScratch(1, args.state.samplerate, '32f', arr);
    console.log('Created wav from raw sample data');
    tmpAudio = (0, path_1.join)((0, os_1.tmpdir)(), `${(0, uuid_1.v4)()}_tmp_audio.wav`);
    normalAudio = (0, path_1.join)((0, os_1.tmpdir)(), `${(0, uuid_1.v4)()}_normal_audio.wav`);
    try {
        await (0, fs_extra_1.writeFile)(tmpAudio, wav.toBuffer());
        console.log(`Saved temporary audio file to ${tmpAudio}`);
    }
    catch (err) {
        console.error(err);
    }
    try {
    }
    catch (err) {
        console.error(err);
        console.log('Normalization failed, using original temporary file.');
    }
    CACHE[hash] = tmpAudio;
    TMP.files.push(tmpAudio);
    endTime = +new Date();
    if (args.save) {
        mainWindow.webContents.send('sonify_complete', { time: endTime - startTime, tmpAudio });
    }
    else {
        console.log(`Sonification complete: ${endTime - startTime}ms`);
    }
    return tmpAudio;
}
let mainWindow;
let visualize;
let timeline;
const isWindows = (process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE));
const isMac = process.platform === 'darwin';
const iconPath = isWindows ? (0, path_1.join)(__dirname, '../icons/icon.ico') : (isMac ? (0, path_1.join)(__dirname, '../icons/icon.icns') : (0, path_1.join)(__dirname, '../icons/icon.png'));
const iconImage = electron_1.nativeImage.createFromPath(iconPath);
if (electron_1.app && electron_1.app.dock) {
    electron_1.app.dock.setIcon(iconImage);
}
const BrowserOptions = {
    title: electron_1.app.name,
    show: false,
    width: 1000,
    height: 1000,
    resizable: false,
    backgroundColor: '#a7abb4',
    icon: iconPath,
    webPreferences: {
        webSecurity: true,
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: false
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
    win.setResizable(false);
    await win.loadFile((0, path_1.join)(__dirname, '../views/index.html'));
    return win;
};
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
electron_1.ipcMain.on('save', async (evt, args) => {
    if (args.savePath && !args.savePath.canceled) {
        try {
            await (0, fs_extra_1.copyFile)(args.filePath, args.savePath.filePath);
            console.log(`Saved file as ${args.savePath.filePath}`);
        }
        catch (err) {
            console.error(err);
        }
    }
});
electron_1.ipcMain.on('sonify', async (evt, args) => {
    ;
    return sonify(args);
});
electron_1.ipcMain.on('cancel', async (evt, args) => {
    let cancelled = false;
    CANCEL = true;
    try {
        cancelled = await ffmpeg_1.ffmpeg.cancel();
    }
    catch (err) {
        console.error(err);
    }
    if (cancelled) {
        mainWindow.webContents.send('cancel', {});
    }
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
            res = await ffmpeg_1.ffmpeg.info(args.filePath);
        }
        catch (err) {
            console.error(err);
        }
        res.frames = 1;
    }
    res.type = args.type;
    mainWindow.webContents.send('info', res);
});
electron_1.ipcMain.on('preview', async (evt, args) => {
    const filePath = args.filePath;
    const pathHash = hashStr(filePath);
    const tmpVideo = (0, path_1.join)((0, os_1.tmpdir)(), `${pathHash}_tmp_video.mkv`);
    const frameStart = +new Date();
    const width = args.width;
    const height = args.height;
    let tmpExists = false;
    let info = {};
    let success = false;
    function onProgress(obj) {
        const ms = ((+new Date()) - frameStart) / obj.frame;
        mainWindow.webContents.send('preview_progress', { ms, frameNumber: obj.frame });
    }
    TMP.files.push(tmpVideo);
    try {
        tmpExists = await (0, fs_extra_1.pathExists)(tmpVideo);
    }
    catch (err) {
        console.error(err);
    }
    if (tmpExists) {
        success = true;
        mainWindow.webContents.send('preview', { tmpVideo, success });
        return;
    }
    try {
        await ffmpeg_1.ffmpeg.exportPreview(args.filePath, tmpVideo, { width, height, forceScale: true }, onProgress);
        success = true;
    }
    catch (err) {
        console.error(err);
        success = false;
    }
    mainWindow.webContents.send('preview', { tmpVideo, success });
});
electron_1.ipcMain.on('sync_preview', async (evt, args) => {
    const filePath = args.filePath;
    const pathHash = hashStr(filePath);
    const tmpVideo = (0, path_1.join)((0, os_1.tmpdir)(), `${pathHash}_tmp_sync_video.mkv`);
    const frameStart = +new Date();
    const width = args.width;
    const height = args.height;
    let tmpExists = false;
    let info = {};
    let success = false;
    let tmpAudio;
    function onProgress(obj) {
        const ms = ((+new Date()) - frameStart) / obj.frame;
        mainWindow.webContents.send('preview_progress', { ms, frameNumber: obj.frame });
    }
    TMP.files.push(tmpVideo);
    try {
        tmpExists = await (0, fs_extra_1.pathExists)(tmpVideo);
    }
    catch (err) {
        console.error(err);
    }
    if (tmpExists) {
        success = true;
        mainWindow.webContents.send('sync_preview', { tmpVideo, success });
        return;
    }
    try {
        tmpAudio = await sonify(args);
    }
    catch (err) {
        console.error(err);
        success = false;
    }
    TMP.files.push(tmpAudio);
    try {
        await ffmpeg_1.ffmpeg.exportPreview(args.filePath, tmpVideo, { width, height, forceScale: true, audio: tmpAudio }, onProgress);
        success = true;
    }
    catch (err) {
        console.error(err);
        success = false;
    }
    mainWindow.webContents.send('sync_preview', { tmpVideo, success });
});
electron_1.ipcMain.on('process_audio', async (evt, args) => {
    const tmpAudio = (0, path_1.join)((0, os_1.tmpdir)(), `${(0, uuid_1.v4)()}_tmp_audio.wav`);
    const frameStart = +new Date();
    let info = {};
    let success = false;
    function onProgress(obj) {
        const ms = ((+new Date()) - frameStart) / obj.frame;
        mainWindow.webContents.send('process_audio_progress', { ms, frameNumber: obj.frame });
    }
    try {
        info = await ffmpeg_1.ffmpeg.info(args.state.filePath);
        success = true;
    }
    catch (err) {
        console.error(err);
        success = false;
    }
    try {
        await visualize.processAudio(args.state, info, tmpAudio, onProgress);
        success = true;
    }
    catch (err) {
        console.error(err);
        success = false;
    }
    TMP.files.push(tmpAudio);
    mainWindow.webContents.send('process_audio', { tmpAudio, success });
});
electron_1.ipcMain.on('visualize_start', async (evt, args) => {
    let success = false;
    try {
        await visualize.startExport(args.format);
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
    const frameStart = +new Date();
    let success = false;
    let tmpVideo;
    const onProgress = (obj) => {
        const ms = ((+new Date()) - frameStart) / obj.frame;
        mainWindow.webContents.send('visualize_progress', { ms, frameNumber: obj.frame });
    };
    try {
        tmpVideo = await visualize.endExport(onProgress);
        success = true;
    }
    catch (err) {
        console.error(err);
    }
    TMP.files.push(tmpVideo);
    mainWindow.webContents.send('visualize_end', { success, tmpVideo });
});
electron_1.ipcMain.on('visualize_preview_start', async (evt, args) => {
    let success = false;
    try {
        await visualize.startPreview();
        success = true;
    }
    catch (err) {
        console.log(err);
    }
    mainWindow.webContents.send('visualize_preview_start', { success });
});
electron_1.ipcMain.on('visualize_preview_end', async (evt, args) => {
    const frameStart = +new Date();
    const options = {
        width: args.options.width,
        height: args.options.height,
        forceScale: true,
        sequence: true
    };
    let success = false;
    let tmpVideo;
    const onProgress = (obj) => {
        const ms = ((+new Date()) - frameStart) / obj.frame;
        mainWindow.webContents.send('visualize_progress', { ms, frameNumber: obj.frame });
    };
    try {
        tmpVideo = await visualize.endPreview(options, onProgress);
        success = true;
    }
    catch (err) {
        console.error(err);
    }
    TMP.files.push(tmpVideo);
    mainWindow.webContents.send('visualize_preview_end', { success, tmpVideo });
});
electron_1.ipcMain.on('bin', async (evt, args) => {
    const { bi, image } = args;
    const ms = +new Date();
    let tmpAudio;
    let tmpImage;
    if (bi.id !== 'blank') {
        tmpAudio = await timeline.exportAudio(bi.id, bi.samples);
        TMP.files.push(tmpAudio);
    }
    if (bi.id !== 'silence') {
        if (image) {
            tmpImage = await timeline.exportFrame(bi.id, image.data, image.width, image.height);
        }
        else {
            tmpImage = await timeline.copyFrame(bi.id, bi.file);
        }
        TMP.files.push(tmpImage);
    }
    mainWindow.webContents.send('bin_complete', { id: bi.id, ms: (+new Date()) - ms });
});
electron_1.ipcMain.on('timeline_export', async (evt, args) => {
    const frameStart = +new Date();
    const id = (0, uuid_1.v4)();
    let success = false;
    let tmpVideo = (0, path_1.join)((0, os_1.tmpdir)(), `timeline_${id}.mov`);
    function onProgress(obj) {
        const ms = ((+new Date()) - frameStart) / obj.frame;
        mainWindow.webContents.send('timeline_export_progress', { ms, frameNumber: obj.frame });
    }
    try {
        success = await timeline.export(args.timeline, tmpVideo, onProgress);
    }
    catch (err) {
        console.error(err);
        return mainWindow.webContents.send('timeline_export_complete', { success });
    }
    TMP.files.push(tmpVideo);
    mainWindow.webContents.send('timeline_export_complete', { success, tmpVideo });
});
electron_1.ipcMain.on('timeline_preview', async (evt, args) => {
    const id = (0, uuid_1.v4)();
    let success = false;
    let tmpVideo = (0, path_1.join)((0, os_1.tmpdir)(), `timeline_preview.mp4`);
    try {
        success = await timeline.preview(args, tmpVideo);
    }
    catch (err) {
        console.error(err);
        return mainWindow.webContents.send('timeline_export_complete', { success });
    }
    if (TMP.files.indexOf(tmpVideo) === -1) {
        TMP.files.push(tmpVideo);
    }
    mainWindow.webContents.send('timeline_preview_complete', { success, tmpVideo });
});
(0, node_cleanup_1.default)((exitCode, signal) => {
    let exists = false;
    console.log(`Cleaning up on exit code ${exitCode}...`);
    for (let dir of TMP.dirs) {
        try {
            (0, fs_extra_1.rmdirSync)(dir, { recursive: true });
            console.log(`Removed directory ${dir}`);
        }
        catch (err) {
            console.error(err);
        }
    }
    for (let file of TMP.files) {
        try {
            exists = (0, fs_extra_1.existsSync)(file);
        }
        catch (err) {
            console.error(err);
        }
        if (exists) {
            try {
                (0, fs_extra_1.unlinkSync)(file);
                console.log(`Removed ${file}`);
            }
            catch (err) {
                console.error(err);
            }
        }
    }
    console.log(`Exiting spiritsInObjects...`);
});
process.on('uncaughtException', (err) => {
    console.error(err);
});
async function saveState() {
    mainWindow.webContents.send('save_state', {});
}
async function saveStateAs() {
    mainWindow.webContents.send('save_state_as', {});
}
async function restoreState() {
    mainWindow.webContents.send('restore_state', {});
}
(async () => {
    const menu = (0, menu_1.createMenu)(saveState, restoreState, saveStateAs);
    await electron_1.app.whenReady();
    electron_1.Menu.setApplicationMenu(menu);
    mainWindow = await createMainWindow();
    visualize = new visualize_1.Visualize(ffmpeg_1.ffmpeg);
    timeline = new timeline_1.Timeline(ffmpeg_1.ffmpeg);
    try {
        await ffmpeg_1.ffmpeg.exportPath();
    }
    catch (err) {
        console.error(err);
    }
    TMP.dirs.push(timeline.tmpDir);
    TMP.dirs.push(timeline.binDir);
})();
//# sourceMappingURL=index.js.map