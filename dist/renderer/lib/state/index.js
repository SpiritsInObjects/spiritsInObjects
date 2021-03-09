'use strict';
const { homedir } = require('os');
const { join } = require('path');
const { writeFile, readFile, pathExists, ensureDir } = require('fs-extra');
class State {
    constructor() {
        this.localFile = join(homedir(), '.spiritsInObjects/state.sio');
        this.storage = {
            start: 0.72,
            end: 1.0
        };
    }
    /**
     * Start the state storage file and in-memory object
     **/
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
            await this.restore();
        }
        catch (err) {
            throw err;
        }
    }
    /**
     * Save the state as JSON to local file in the home directory
     */
    async save() {
        try {
            await writeFile(this.localFile, JSON.stringify(this.storage, null, '\t'), 'utf8');
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
                //overwrite bad state file
                await this.save();
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
        else if (typeof key === 'undefined') {
            return this.storage;
        }
        return null;
    }
    /**
     * Set a value on the storage object.
     * @param key Name of key in storage object
     * @param value Value of key
     */
    async set(key, value) {
        this.storage[key] = value;
        this.validate(key, value);
        await this.save();
    }
    /**
     * Validate input and set to defaults or erase if invalid.
     * @param key Name of key in storage object
     * @param value Value of key
     **/
    validate(key, value) {
        if (key === 'start') {
            if (isNaN(value)) {
                this.storage[key] = 0.72;
            }
        }
        else if (key === 'stop') {
            if (isNaN(value)) {
                this.storage[key] = 1.0;
            }
        }
    }
}
//# sourceMappingURL=index.js.map