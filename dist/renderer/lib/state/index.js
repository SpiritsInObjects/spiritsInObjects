'use strict';
const { homedir } = require('os');
const { join } = require('path');
const { outputFile, readFile, pathExists, ensureDir } = require('fs-extra');
class State {
    constructor() {
        this.localFile = join(homedir(), '.spiritsInObjects/state.sio');
        this.storage = {};
        this.startup();
        this.restore();
    }
    async startup() {
        const stateDir = join(homedir(), '.spiritsInObjects');
        let dirExists;
        try {
            dirExists = await pathExists(stateDir);
        }
        catch (err) {
            console.error(err);
        }
        if (!dirExists) {
            try {
                await ensureDir(stateDir);
            }
            catch (err) {
                console.error(err);
            }
        }
    }
    /**
     * Save the state as JSON to local file in the home directory
     */
    async save() {
        try {
            await outputFile(this.localFile, JSON.stringify(this.storage, null, '\t'), 'utf8');
        }
        catch (err) {
            console.error(err);
        }
    }
    /**
     * Restore the state from the saved JSON file to the state class
     */
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
                return false;
            }
        }
    }
    /**
     * Get the current state of a key or the entire storage object.
     *
     * @param key Name of key to retrieve.
     */
    get(key) {
        if (typeof key !== 'undefined' && typeof this.storage[key] !== 'undefined') {
            return this.storage[key];
        }
        return null;
    }
    /**
     * Set a value on the storage object.
     * @param key Name of key in storage object
     * @param value Value of key
     */
    set(key, value) {
        this.storage[key] = value;
    }
}
//# sourceMappingURL=index.js.map