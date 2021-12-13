'use strict';
const { homedir } = require('os');
const { join } = require('path');
const { writeFile, readFile, pathExists, ensureDir, copy } = require('fs-extra');
class State {
    constructor() {
        this.localFile = join(homedir(), '.spiritsInObjects/state.sio');
        this.saveFile = null;
        this.storage = {
            start: 0.81,
            end: 1.0
        };
        this.timeline = { bin: [], timeline: [] };
        this.visualize = {};
        this.lock = false;
        this.unsaved = true;
        this.start();
    }
    async start() {
        const stateDir = join(homedir(), '.spiritsInObjects');
        let dirExists;
        try {
            dirExists = await pathExists(stateDir);
        }
        catch (err) {
            throw err;
        }
        if (!dirExists) {
            try {
                await ensureDir(stateDir);
            }
            catch (err) {
                throw err;
            }
            try {
                this.save();
            }
            catch (err) {
                throw err;
            }
        }
        try {
        }
        catch (err) {
            throw err;
        }
    }
    getData() {
        const data = {
            storage: this.storage,
            visualize: this.visualize,
            timeline: this.timeline
        };
        return JSON.stringify(data, null, '\t');
    }
    async save(writeSave = false) {
        if (!this.lock) {
            this.lock = true;
            try {
                await writeFile(this.localFile, this.getData(), 'utf8');
            }
            catch (err) {
                console.error(err);
            }
            this.unsaved = true;
            if (writeSave && this.saveFile != null) {
                try {
                    await copy(this.localFile, this.saveFile);
                }
                catch (err) {
                    console.error(err);
                }
                this.unsaved = false;
            }
            this.lock = false;
        }
    }
    async restore() {
        let stateFile = this.saveFile != null ? this.saveFile : this.localFile;
        let raw;
        let fileExists = false;
        let parsed;
        try {
            fileExists = await pathExists(stateFile);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        if (!fileExists) {
            return false;
        }
        try {
            raw = await readFile(stateFile, 'utf8');
        }
        catch (err) {
            console.error(err);
        }
        if (raw) {
            try {
                parsed = JSON.parse(raw);
            }
            catch (err) {
                console.error(err);
                console.error(raw);
                await this.save();
                return false;
            }
            this.storage = parsed.storage;
            this.timeline = parsed.timeline;
            this.visualize = parsed.visualize;
        }
    }
    get(key) {
        if (typeof key !== 'undefined' && typeof this.storage[key] !== 'undefined') {
            return this.storage[key];
        }
        else if (typeof key === 'undefined') {
            return this.storage;
        }
        return null;
    }
    async set(key, value) {
        this.storage[key] = value;
        this.validate(key, value);
        await this.save();
    }
    validate(key, value) {
        if (key === 'start') {
            if (isNaN(value)) {
                this.storage[key] = 0.81;
            }
        }
        else if (key === 'end') {
            if (isNaN(value)) {
                this.storage[key] = 1.0;
            }
        }
    }
}
//# sourceMappingURL=index.js.map