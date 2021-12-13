'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const os_1 = require("os");
const fs_extra_1 = require("fs-extra");
const { ipcRenderer } = require('electron');
const { dialog } = require('electron').remote;
const humanizeDuration = require('humanize-duration');
const videoExtensions = ['.avi', '.mp4', '.mkv', '.mpg', '.mpeg', '.mov', '.m4v', '.ogg', '.webm'];
const stillExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
const midiExtensions = ['.mid', '.midi'];
const audioExtensions = ['.mp3', '.aiff', '.aif', '.wav', '.wave'];
const videoFormatMap = {
    'prores3': '.mov',
    'h264': '.mp4'
};
let lastDir = '';
let startMoving = false;
let endMoving = false;
let audioContext;
let state;
let video;
let sonify;
let visualize;
let timeline;
let ui;
let avgMs = -1;
let timeAvg = -1;
let dnd;
let f;
let CANCEL = false;
let dropArea;
let fileSourceProxy;
let clickSelect;
let vFileSourceProxy;
let sonifyFrameBtn;
let sonifyVideo;
let sonifyBtn;
let cancelBtn;
let visualizeBtn;
let sonifyVisualizeBtn;
let visualizeExportBtn;
let timelineBtn;
let timelineExportBtn;
let syncBtn;
function bindGlobal(selector, event, handler) {
    const rootElement = document.querySelector('body');
    rootElement.addEventListener(event, function (evt) {
        let targetElement = evt.target;
        while (targetElement != null) {
            if (targetElement.matches(selector)) {
                handler(evt);
                return;
            }
            targetElement = targetElement.parentElement;
        }
    }, true);
}
async function confirm(message) {
    const config = {
        buttons: ['Yes', 'No'],
        message
    };
    const res = await dialog.showMessageBox(config);
    return res.response === 0;
}
class DragDrop {
    constructor() {
        this.active = false;
        this.overlay = document.getElementById('dragOverlay');
    }
    enter(evt) {
        let files;
        evt.preventDefault();
        if (this.containsFiles(evt)) {
            this.active = true;
            this.overlay.classList.add('show');
        }
    }
    over(evt) {
        evt.preventDefault();
    }
    leave(evt) {
        if (this.active)
            this.active = false;
        try {
            this.overlay.classList.remove('show');
        }
        catch (err) {
            console.error(err);
        }
    }
    async drop(evt) {
        let files;
        let loadFiles = [];
        let paths = [];
        if (this.active) {
            evt.preventDefault();
            files = evt.dataTransfer.files;
            for (let file of files) {
                loadFiles.push(new Promise((resolve, reject) => {
                    let fileReader = new FileReader();
                    fileReader.onload = (function (file) {
                        paths.push(file.path);
                        return resolve(file);
                    })(file);
                    fileReader.readAsDataURL(file);
                }));
            }
            try {
                await Promise.all(loadFiles);
            }
            catch (err) {
                console.error(err);
            }
            if (ui.currentPage === 'timeline') {
                timeline.addToBin(paths);
            }
            else {
                f.determineProcess(paths[0]);
            }
        }
        this.leave(evt);
    }
    containsFiles(evt) {
        if (evt.dataTransfer.types) {
            for (var i = 0; i < evt.dataTransfer.types.length; i++) {
                if (evt.dataTransfer.types[i] == "Files") {
                    return true;
                }
            }
        }
        return false;
    }
}
class Files {
    async select() {
        const options = {
            title: `Select video, image or audio file`,
            properties: [`openFile`],
            defaultPath: lastDir === '' ? (0, os_1.homedir)() : lastDir,
            filters: [
                {
                    name: 'All Files',
                    extensions: ['*']
                },
            ]
        };
        let files;
        let filePath;
        try {
            files = await dialog.showOpenDialog(options);
        }
        catch (err) {
            console.error(err);
        }
        if (!files || !files.filePaths || files.filePaths.length === 0) {
            return false;
        }
        filePath = files.filePaths[0];
        this.determineProcess(filePath);
    }
    async determineProcess(filePath) {
        let valid = true;
        let type = 'video';
        let ext;
        ext = (0, path_1.extname)(filePath.toLowerCase());
        if (videoExtensions.indexOf(ext) > -1 || stillExtensions.indexOf(ext) > -1) {
            valid = true;
        }
        if (!valid) {
            console.log(`File selection is not valid`);
            return false;
        }
        if (stillExtensions.indexOf(ext) > -1) {
            type = 'still';
        }
        else if (audioExtensions.indexOf(ext) > -1) {
            type = 'audio';
        }
        else if (midiExtensions.indexOf(ext) > -1) {
            type = 'midi';
        }
        if (type === 'video' || type === 'still') {
            ui.page('sonify');
            this.setSonify(filePath, type);
        }
        else if (type === 'audio' || type === 'midi') {
            ui.page('visualize');
            this.setVisualize(filePath, type);
        }
        lastDir = (0, path_1.dirname)(filePath);
    }
    async setSonify(filePath, type) {
        const elem = fileSourceProxy;
        let displayName;
        displayName = video.set(filePath, type);
        ipcRenderer.send('info', { filePath, type });
        state.set('filePath', filePath);
        state.set('type', type);
        elem.innerHTML = displayName;
    }
    async setVisualize(filePath, type) {
        const elem = vFileSourceProxy;
        let displayName;
        displayName = visualize.set(filePath, type);
        state.set('filePath', filePath);
        state.set('type', type);
        elem.innerHTML = displayName;
        document.getElementById('vInfo').classList.remove('hide');
        visualizeStart();
    }
    async saveAudio(filePath) {
        const options = {
            defaultPath: lastDir === '' ? (0, os_1.homedir)() : lastDir,
        };
        let savePath;
        try {
            savePath = await dialog.showSaveDialog(null, options);
        }
        catch (err) {
            console.error(err);
        }
        if (savePath) {
            savePath.filePath = await this.validatePathAudio(savePath.filePath);
            lastDir = (0, path_1.dirname)(savePath.filePath);
            ipcRenderer.send('save', { filePath, savePath });
        }
    }
    async validatePathAudio(savePath) {
        const saveExt = '.wav';
        const ext = (0, path_1.extname)(savePath);
        let proceed = false;
        let i;
        if (ext === '') {
            savePath += saveExt;
        }
        else if (ext.toLowerCase() !== saveExt) {
            try {
                proceed = await confirm(`Sonification file is a WAVE but has the extension "${ext}". Keep extension and continue?`);
            }
            catch (err) {
                console.error(err);
            }
            if (!proceed) {
                i = savePath.lastIndexOf(ext);
                if (i >= 0 && i + ext.length >= savePath.length) {
                    savePath = savePath.substring(0, i) + saveExt;
                }
            }
        }
        return savePath;
    }
    async saveVideo(filePath) {
        const options = {
            defaultPath: lastDir === '' ? (0, os_1.homedir)() : lastDir
        };
        let savePath;
        try {
            savePath = await dialog.showSaveDialog(null, options);
        }
        catch (err) {
            console.error(err);
        }
        if (savePath) {
            savePath.filePath = await this.validatePathVideo(savePath.filePath);
            lastDir = (0, path_1.dirname)(savePath.filePath);
            ipcRenderer.send('save', { filePath, savePath });
        }
    }
    async validatePathVideo(savePath) {
        const saveExt = videoFormatMap[visualize.format];
        const ext = (0, path_1.extname)(savePath);
        let proceed = false;
        let i;
        if (ext === '') {
            savePath += saveExt;
        }
        else if (ext.toLowerCase() !== saveExt) {
            try {
                proceed = await confirm(`The exported video is in a ${saveExt} wrapper but has the extension "${ext}". Keep extension and continue?`);
            }
            catch (err) {
                console.error(err);
            }
            if (!proceed) {
                i = savePath.lastIndexOf(ext);
                if (i >= 0 && i + ext.length >= savePath.length) {
                    savePath = savePath.substring(0, i) + saveExt;
                }
            }
        }
        return savePath;
    }
}
const audioCtx = new window.AudioContext();
const syncPreviewState = {
    rendered: false,
    rendering: false
};
function cancel() {
    CANCEL = true;
    ipcRenderer.send('cancel', {});
}
function onCancel(evt, args) {
    console.log('Cancellation confirmed');
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
    CANCEL = false;
}
async function confirmCancel() {
    let proceed = false;
    try {
        proceed = await confirm(`Are you sure you want to cancel?`);
    }
    catch (err) {
        console.log(err);
    }
    if (!proceed) {
        return false;
    }
    cancel();
}
function onInfo(evt, args) {
    let preview = video.onInfo(evt, args);
    if (!preview) {
        sonify = new Sonify(state, video.canvas, audioContext);
    }
    else {
        previewStart();
    }
    syncBtn.removeAttribute('disabled');
}
function previewProgress(frameNumber, ms) {
    let timeLeft;
    let timeStr;
    if (avgMs !== -1) {
        avgMs = (avgMs + ms) / 2.0;
    }
    else {
        avgMs = ms;
    }
    timeLeft = (video.frames - frameNumber) * avgMs;
    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    }
    else {
        timeAvg = timeLeft;
    }
    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(frameNumber / video.frames, `~${timeStr}`);
}
function onPreviewProgress(evt, args) {
    previewProgress(args.frameNumber, args.ms);
}
async function previewStart() {
    const filePath = state.get('filePath');
    const displayName = video.displayName;
    const width = video.width;
    const height = video.height;
    let proceed = false;
    try {
        proceed = await confirm(`To view the video ${displayName} a proxy must be rendered. Do you wish to proceed?`);
    }
    catch (err) {
        console.log(err);
    }
    if (!proceed) {
        return false;
    }
    timeAvg = -1;
    avgMs = -1;
    ui.overlay.show(`Rendering proxy of ${displayName}...`);
    ui.overlay.progress(0, `Determining time left...`);
    ipcRenderer.send('preview', { filePath, width, height });
}
function onPreview(evt, args) {
    video.previewFile(args.tmpVideo);
    setTimeout(() => {
        sonify = new Sonify(state, video.canvas, audioContext);
        ui.overlay.hide();
    }, 100);
}
function onSync(evt) {
    if (!syncPreviewState.rendering && !syncPreviewState.rendered) {
        syncPreviewStart();
    }
    else if (syncPreviewState.rendered) {
        if (!video.playing) {
            video.play();
        }
        else {
            video.pause();
        }
    }
}
function syncPreviewStart() {
    const sonifyState = state.get();
    const filePath = state.get('filePath');
    const displayName = video.displayName;
    const width = video.displayWidth;
    const height = video.displayHeight;
    const args = {
        state: sonifyState,
        save: false,
        filePath,
        width,
        height
    };
    timeAvg = -1;
    avgMs = -1;
    ui.overlay.show(`Rendering synchronized preview of ${displayName}...`);
    ui.overlay.progress(0, `Determining time left...`);
    ipcRenderer.send('sync_preview', args);
    syncPreviewState.rendering = true;
    syncPreviewState.rendered = false;
    showSpinner('syncSpinner', 'small');
    syncBtn.classList.add('rendering');
}
function onSyncPreview(evt, args) {
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
    video.previewFile(args.tmpVideo, true);
    syncPreviewState.rendering = false;
    syncPreviewState.rendered = true;
    syncBtn.classList.remove('rendering');
    video.play();
}
async function sonifyStart() {
    const sonifyState = state.get();
    const displayName = video.displayName;
    const args = {
        state: sonifyState,
        save: true
    };
    timeAvg = -1;
    avgMs = -1;
    ui.overlay.show(`Exporting frames from ${displayName}...`, true);
    ui.overlay.progress(0, `Determining time left...`);
    ipcRenderer.send('sonify', args);
}
async function onStartSonify() {
    ui.overlay.show(`Sonifying ${video.displayName}...`, true);
    ui.overlay.progress(0, `Determining time left...`);
}
function onSonifyProgress(evt, args) {
    let timeLeft;
    let timeStr;
    if (avgMs !== -1) {
        avgMs = (avgMs + args.ms) / 2.0;
    }
    else {
        avgMs = args.ms;
    }
    timeLeft = (args.frames - args.i) * avgMs;
    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    }
    else {
        timeAvg = timeLeft;
    }
    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(args.i / args.frames, `~${timeStr}`);
}
function onSonifyComplete(evt, args) {
    avgMs = -1;
    timeAvg = -1;
    ui.overlay.hide();
    f.saveAudio(args.tmpAudio);
}
function sonifyFrame() {
    const source = audioContext.createBufferSource();
    let buf = audioContext.createBuffer(1, video.height, video.samplerate);
    let mono = buf.getChannelData(0);
    let tmp;
    sonifyFrameBtn.classList.add('active');
    sonify = new Sonify(state, video.canvas, audioContext);
    tmp = sonify.sonifyCanvas();
    tmp = sonify.envelope(tmp, 100);
    mono.set(tmp, 0);
    source.buffer = buf;
    source.connect(audioContext.destination);
    source.start();
    setTimeout(() => {
        try {
            sonifyFrameBtn.classList.remove('active');
        }
        catch (err) {
        }
    }, 42);
}
async function visualizeStart() {
    let type = state.get('type');
    sonifyVisualizeBtn.removeAttribute('disabled');
    visualizeExportBtn.removeAttribute('disabled');
    document.getElementById('vDropMessage').classList.add('hide');
    if (type === 'midi') {
        await visualize.processMidi();
        visualize.decodeMidi(0);
    }
    else if (type === 'audio') {
        processAudio();
    }
}
function sonifyVisualizeFrame() {
    const source = audioContext.createBufferSource();
    let buf = audioContext.createBuffer(1, visualize.height, visualize.samplerate);
    let mono = buf.getChannelData(0);
    let tmp;
    sonifyVisualizeBtn.classList.add('active');
    tmp = visualize.sonify.sonifyCanvas();
    tmp = visualize.sonify.envelope(tmp, 100);
    mono.set(tmp, 0);
    source.buffer = buf;
    source.connect(audioContext.destination);
    source.start();
    setTimeout(() => {
        try {
            sonifyVisualizeBtn.classList.remove('active');
        }
        catch (err) {
        }
    }, 42);
}
async function visualizeExportStart(format) {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_start', (evt, args) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(true);
            }
            return reject('Failed to start');
        });
        ipcRenderer.send('visualize_start', { format });
    });
}
function visualizeExportProgress(frameNumber, ms) {
    const total = visualize.frames.length;
    let timeLeft;
    let timeStr;
    if (avgMs !== -1) {
        avgMs = (avgMs + ms) / 2.0;
    }
    else {
        avgMs = ms;
    }
    timeLeft = (total - frameNumber) * avgMs;
    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    }
    else {
        timeAvg = timeLeft;
    }
    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(frameNumber / total, `~${timeStr}`);
}
async function visualizeExportFrame(frameNumber, data, width, height) {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_frame', (evt, args) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                visualizeExportProgress(args.frameNumber, args.ms);
                return resolve(true);
            }
            return reject('Failed to export');
        });
        ipcRenderer.send('visualize_frame', { frameNumber, data, width, height });
    });
}
function onVisualizeProgress(evt, args) {
    visualizeExportProgress(args.frameNumber, args.ms);
}
async function visualizeExportEnd() {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_end', (evt, args) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(args.tmpVideo);
            }
            return reject('Failed to export');
        });
        ipcRenderer.send('visualize_end', {});
    });
}
async function visualizeExport() {
    const width = visualize.width;
    const height = visualize.height;
    const format = visualize.format;
    let frameData;
    let tmpVideo;
    CANCEL = false;
    if (visualize.frames.length > 0) {
        ui.overlay.show(`Exporting frames of ${visualize.displayName}...`, true);
        ui.overlay.progress(0, `Determining time left...`);
        avgMs = -1;
        timeAvg = -1;
        try {
            await visualizeExportStart(format);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        for (let i = 0; i < visualize.frames.length; i++) {
            frameData = visualize.exportFrame(i);
            try {
                await visualizeExportFrame(i, frameData.data, width, height);
            }
            catch (err) {
                console.error(err);
                ui.overlay.hide();
                return false;
            }
            if (CANCEL) {
                CANCEL = false;
                ui.overlay.hide();
                return false;
            }
        }
        avgMs = -1;
        timeAvg = -1;
        ui.overlay.show(`Exporting video of ${visualize.displayName}...`, true);
        ui.overlay.progress(0, `Determining time left...`);
        try {
            tmpVideo = await visualizeExportEnd();
        }
        catch (err) {
            console.error(err);
            ui.overlay.hide();
            return false;
        }
        avgMs = -1;
        timeAvg = -1;
        ui.overlay.hide();
        f.saveVideo(tmpVideo);
    }
}
async function visualizePreviewStart() {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_preview_start', (evt, args) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(true);
            }
            return reject('Failed to start preview');
        });
        ipcRenderer.send('visualize_preview_start', {});
    });
}
async function visualizePreviewEnd(options) {
    return new Promise((resolve, reject) => {
        ipcRenderer.once('visualize_preview_end', (evt, args) => {
            if (typeof args.success !== 'undefined' && args.success === true) {
                return resolve(args.tmpVideo);
            }
            return reject('Failed to export preview');
        });
        ipcRenderer.send('visualize_preview_end', { options });
    });
}
async function visualizePreview() {
    const oWidth = visualize.width;
    const oHeight = visualize.height;
    const width = visualize.displayWidth;
    const height = visualize.displayHeight;
    let frameData;
    let tmpVideo;
    CANCEL = false;
    if (visualize.frames.length > 0) {
        ui.overlay.show(`Exporting frames of ${visualize.displayName} for preview...`, true);
        ui.overlay.progress(0, `Determining time left...`);
        avgMs = -1;
        timeAvg = -1;
        try {
            await visualizePreviewStart();
        }
        catch (err) {
            console.error(err);
            return false;
        }
        for (let i = 0; i < visualize.frames.length; i++) {
            frameData = visualize.exportFrame(i);
            try {
                await visualizeExportFrame(i, frameData.data, oWidth, oHeight);
            }
            catch (err) {
                console.error(err);
                ui.overlay.hide();
                return false;
            }
            if (CANCEL) {
                CANCEL = false;
                ui.overlay.hide();
                return false;
            }
        }
        avgMs = -1;
        timeAvg = -1;
        ui.overlay.show(`Exporting video of ${visualize.displayName}...`, true);
        ui.overlay.progress(0, `Determining time left...`);
        try {
            tmpVideo = await visualizePreviewEnd({ width, height });
        }
        catch (err) {
            console.error(err);
            ui.overlay.hide();
            return false;
        }
        avgMs = -1;
        timeAvg = -1;
        ui.overlay.hide();
        visualize.onPreview(tmpVideo);
    }
}
function processAudio() {
    const visualizeState = state.get();
    ui.overlay.show(`Preparing audio file ${visualize.displayName}...`);
    ui.overlay.progress(0, `Determining time left...`);
    ipcRenderer.send('process_audio', { state: visualizeState });
    avgMs = -1;
    timeAvg = -1;
}
function processAudioProgress(frameNumber, ms) {
    let timeLeft;
    let timeStr;
    if (avgMs !== -1) {
        avgMs = (avgMs + ms) / 2.0;
    }
    else {
        avgMs = ms;
    }
    timeLeft = (visualize.frames.length - frameNumber) * avgMs;
    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    }
    else {
        timeAvg = timeLeft;
    }
    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(frameNumber / visualize.frames.length, `~${timeStr}`);
}
function onProcessAudioProgress(evt, args) {
    processAudioProgress(args.frameNumber, args.ms);
}
function timelineExport() {
    let tl = timeline.export();
    timelineExportBtn.blur();
    if (tl.length > 0) {
        ui.overlay.show(`Exporting ${tl.length} frame Timeline...`);
        ui.overlay.progress(0, `Determining time left...`);
        avgMs = -1;
        timeAvg = -1;
        ipcRenderer.send('timeline_export', { timeline: tl });
    }
}
function onTimelineExportProgress(evt, args) {
    timelineExportProgress(args.ms, args.frameNumber);
}
function timelineExportProgress(ms, frameNumber) {
    const total = timeline.timeline.length;
    let timeLeft;
    let timeStr;
    if (avgMs !== -1) {
        avgMs = (avgMs + ms) / 2.0;
    }
    else {
        avgMs = ms;
    }
    timeLeft = (total - frameNumber) * avgMs;
    if (timeAvg !== -1) {
        timeAvg = (timeAvg + timeLeft) / 2.0;
    }
    else {
        timeAvg = timeLeft;
    }
    timeStr = humanizeDuration(Math.round(timeAvg / 1000) * 1000);
    ui.overlay.progress(frameNumber / total, `~${timeStr}`);
}
function onTimelineExportComplete(evt, args) {
    ui.overlay.hide();
    if (args.success) {
        f.saveVideo(args.tmpVideo);
    }
}
function keyDown(evt) {
    if (ui.currentPage === 'sonify') {
        if (evt.code === 'Space') {
        }
        else if (evt.code === 'ArrowLeft') {
            video.prevFrame();
        }
        else if (evt.code === 'ArrowRight') {
            video.nextFrame();
        }
        else if (evt.code === 'KeyF') {
            sonifyFrame();
        }
        else if (evt.code === 'KeyI') {
        }
        else if (evt.code === 'KeyO') {
        }
    }
    else if (ui.currentPage === 'visualize') {
        if (evt.code === 'ArrowLeft') {
            visualize.prevFrame();
        }
        else if (evt.code === 'ArrowRight') {
            visualize.nextFrame();
        }
        else if (evt.code === 'KeyF') {
            sonifyVisualizeFrame();
        }
    }
    else if (ui.currentPage === 'timeline') {
        return false;
    }
    console.log(evt.code);
}
function onTimelineBin(bi, image) {
    ipcRenderer.send('bin', { bi, image });
}
function onTimelinePreview() {
    let settings = timeline.preview();
    if (settings.timeline.length > 0) {
        ipcRenderer.send('timeline_preview', settings);
    }
}
function onTimelinePreviewComplete(evt, args) {
    timeline.onPreviewComplete(args);
}
async function onProcessAudio(evt, args) {
    if (args.success === true) {
        await visualize.onProcessAudio(evt, args);
    }
    else {
        alert('Error processing audio file.');
    }
    ui.overlay.hide();
}
async function validateSaveFile(file) {
    const fileName = (0, path_1.basename)(file);
    const errorTitle = `Error loading saved file`;
    let errorMsg;
    let data;
    let json;
    let keys;
    let required = ['storage', 'timeline', 'visualize'];
    let filePath;
    let fileType;
    try {
        data = await (0, fs_extra_1.readFile)(file, 'utf8');
    }
    catch (err) {
        console.error(err);
        errorMsg = `Cannot load ${fileName}. It is failing to load from disk.`;
        dialog.showErrorBox(errorTitle, errorMsg);
        return false;
    }
    try {
        json = JSON.parse(data);
    }
    catch (err) {
        console.error(err);
        errorMsg = `Cannot load ${fileName}. It cannot be parsed.`;
        dialog.showErrorBox(errorTitle, errorMsg);
        return false;
    }
    keys = Object.keys(json);
    for (let key of required) {
        if (keys.indexOf(key) === -1) {
            errorMsg = `Cannot load ${fileName}. It is corrupted.`;
            dialog.showErrorBox(errorTitle, errorMsg);
            return false;
        }
    }
    state.saveFile = file;
    try {
        await state.restore();
        await timeline.restore();
    }
    catch (err) {
        console.error(err);
    }
    filePath = state.get('filePath');
    fileType = state.get('type');
    if (filePath != null) {
        if (fileType == 'video' || fileType == 'still') {
            f.setSonify(filePath, fileType);
            ui.page('sonify');
        }
    }
    return true;
}
async function determineSaveFile(file) {
    const fileName = (0, path_1.basename)(file);
    const ext = (0, path_1.extname)(fileName).toLowerCase();
    const errorTitle = `Error loading saved file`;
    let errorMsg;
    if (ext === '.sio') {
        try {
            await validateSaveFile(file);
        }
        catch (err) {
            console.error(err);
        }
    }
    else {
        errorMsg = `Cannot load ${fileName}. Please select a .sio file.`;
        dialog.showErrorBox(errorTitle, errorMsg);
    }
}
async function saveState(saveAs = false) {
    const options = {
        defaultPath: lastDir === '' ? (0, os_1.homedir)() : lastDir
    };
    let saveRes;
    let saveFile;
    let ext;
    if (state.saveFile == null || saveAs) {
        try {
            saveRes = await dialog.showSaveDialog(null, options);
            saveFile = saveRes.filePath;
        }
        catch (err) {
            console.error(err);
            return false;
        }
        ext = (0, path_1.extname)((0, path_1.basename)(saveFile)).toLowerCase();
        if (ext != '.sio') {
            saveFile += '.sio';
        }
        if (saveFile) {
            state.saveFile = saveFile;
        }
    }
    state.save(true);
    return false;
}
async function restoreState() {
    const options = {
        title: `Select a .sio save file`,
        properties: [`openFile`],
        defaultPath: lastDir === '' ? (0, os_1.homedir)() : lastDir,
        filters: [
            {
                name: 'All Files',
                extensions: ['*']
            },
        ]
    };
    let files;
    let filePath;
    try {
        files = await dialog.showOpenDialog(options);
    }
    catch (err) {
        console.error(err);
    }
    if (!files || !files.filePaths || files.filePaths.length === 0) {
        return false;
    }
    filePath = files.filePaths[0];
    try {
        await determineSaveFile(filePath);
    }
    catch (err) {
        console.error(err);
    }
}
function bindListeners() {
    dropArea = document.getElementById('dragOverlay');
    fileSourceProxy = document.getElementById('fileSourceProxy');
    clickSelect = document.getElementById('clickSelect');
    vFileSourceProxy = document.getElementById('vFileSourceProxy');
    sonifyFrameBtn = document.getElementById('sonifyFrame');
    sonifyVideo = document.getElementById('sonifyVideo');
    sonifyBtn = document.getElementById('sonifyBtn');
    syncBtn = document.getElementById('sync');
    visualizeBtn = document.getElementById('visualizeBtn');
    sonifyVisualizeBtn = document.getElementById('sonifyVisualizeBtn');
    visualizeExportBtn = document.getElementById('visualizeExportBtn');
    timelineBtn = document.getElementById('timelineBtn');
    timelineExportBtn = document.getElementById('tExport');
    cancelBtn = document.getElementById('cancel');
    sonifyBtn.addEventListener('click', function () { ui.page('sonify'); }, false);
    visualizeBtn.addEventListener('click', function () { ui.page('visualize'); }, false);
    sonifyVisualizeBtn.addEventListener('click', sonifyVisualizeFrame, false);
    visualizeExportBtn.addEventListener('click', visualizeExport, false);
    timelineBtn.addEventListener('click', function () { ui.page('timeline'); }, false);
    timelineExportBtn.addEventListener('click', timelineExport, false);
    clickSelect.addEventListener('click', f.select.bind(f), false);
    document.getElementById('vDropMessage').addEventListener('click', f.select.bind(f), false);
    document.getElementById('vInfo').addEventListener('click', f.select.bind(f), false);
    sonifyFrameBtn.addEventListener('click', sonifyFrame, false);
    sonifyVideo.addEventListener('click', sonifyStart, false);
    document.addEventListener('keydown', keyDown, false);
    cancelBtn.addEventListener('click', confirmCancel, false);
    syncBtn.addEventListener('click', onSync, false);
    ipcRenderer.on('sonify_complete', onSonifyComplete);
    ipcRenderer.on('sonify_sonify', onStartSonify);
    ipcRenderer.on('sonify_progress', onSonifyProgress);
    ipcRenderer.on('cancel', onCancel);
    ipcRenderer.on('visualize_progress', onVisualizeProgress);
    ipcRenderer.on('info', onInfo);
    ipcRenderer.on('preview_progress', onPreviewProgress);
    ipcRenderer.on('preview', onPreview);
    ipcRenderer.on('sync_preview', onSyncPreview);
    ipcRenderer.on('process_audio', onProcessAudio);
    ipcRenderer.on('progress_audio_progress', onProcessAudioProgress, false);
    ipcRenderer.on('timeline_export_complete', onTimelineExportComplete, false);
    ipcRenderer.on('timeline_export_progress', onTimelineExportProgress, false);
    ipcRenderer.on('timeline_preview_complete', onTimelinePreviewComplete, false);
    ipcRenderer.on('save_state', () => { saveState(false); }, false);
    ipcRenderer.on('save_state_as', () => { saveState(true); }, false);
    ipcRenderer.on('restore_state', restoreState, false);
}
(async function main() {
    dnd = new DragDrop();
    f = new Files();
    audioContext = new AudioContext();
    state = new State();
    try {
        await state.start();
    }
    catch (err) {
        console.error(err);
    }
    ui = new UI(state);
    video = new Video(state, ui);
    sonify = new Sonify(state, video.canvas, audioContext);
    visualize = new Visualize(state, audioContext);
    timeline = new Timeline(state, ui, onTimelineBin, onTimelinePreview);
    bindListeners();
})();
//# sourceMappingURL=index.js.map