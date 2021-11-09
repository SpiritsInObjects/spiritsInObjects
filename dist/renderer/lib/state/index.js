'use strict';
const { homedir } = require('os');
const { join } = require('path');
const { writeFile, readFile, pathExists, ensureDir } = require('fs-extra');
class State {
    constructor() {
        this.localFile = join(homedir(), '.spiritsInObjects/state.sio');
        this.storage = {
            start: 0.81,
            end: 1.0
        };
        this.lock = false;
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
    async save() {
        if (!this.lock) {
            this.lock = true;
            try {
                await writeFile(this.localFile, JSON.stringify(this.storage, null, '\t'), 'utf8');
            }
            catch (err) {
                console.error(err);
            }
            this.lock = false;
        }
    }
    async restore() {
        let raw;
        let fileExists = false;
        try {
            fileExists = await pathExists(this.localFile);
        }
        catch (err) {
            console.error(err);
            return false;
        }
        if (!fileExists) {
            return false;
        }
        try {
            raw = await readFile(this.localFile, 'utf8');
        }
        catch (err) {
            console.error(err);
        }
        if (raw) {
            try {
                this.storage = JSON.parse(raw);
            }
            catch (err) {
                console.error(err);
                console.error(raw);
                await this.save();
                return false;
            }
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