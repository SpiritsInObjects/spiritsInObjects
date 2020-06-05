'use strict'

const { homedir } = require('os');
const { join } = require('path');
const { writeFile, readFile, pathExists, ensureDir } = require('fs-extra')

interface StateStorage {
    [key: string]: any;
    files? : string[];
    camera? : string;
    start? : number;
    end? : number;
    framerate? : number;
    frames? : number;
    width? : number;
    height? : number;
    samplerate? : number;

    visualize? : string[];
    vHeight? : number;
    vWidth? : number;
}

class State {
    private localFile : string = join( homedir(), '.spiritsInObjects/state.sio' );
    private storage : StateStorage = {
        start : 0.72,
        end : 1.0
    } as StateStorage;
    
    constructor () {
        
    }

    /**
     * Start the state storage file and in-memory object
     **/
    public async start () {
        const stateDir : string = join(homedir(), '.spiritsInObjects');
        let dirExists : boolean;
        try {
            dirExists = await pathExists(stateDir)
        } catch (err) {
            throw err
        }
        if (!dirExists) {
            try {
                await ensureDir(stateDir)
            } catch (err) {
                throw err
            }
            try {
                this.save()
            } catch (err) {
                throw err
            }
        }
        try {
            await this.restore()
        } catch (err) {
            throw err
        }
    }

    /**
     * Save the state as JSON to local file in the home directory
     */
    public async save () {
        try {
            await writeFile(this.localFile, JSON.stringify(this.storage, null, '\t'), 'utf8');
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Restore the state from the saved JSON file to the state class
     */
    public async restore () {
        let raw : string;
        let fileExists : boolean = false;

        try {
            fileExists = await pathExists(this.localFile);
        } catch (err) {
            console.error(err);
            return false;
        }

        if (!fileExists) {
            return false;
        }

        try {
            raw = await readFile(this.localFile, 'utf8');
        } catch (err) {
            console.error(err);
        }
        if (raw) {
            try {
                this.storage = JSON.parse(raw) as StateStorage;
            } catch (err) {
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
    public get (key? : string) : any {
        if (typeof key !== 'undefined' && typeof this.storage[key] !== 'undefined') {
            return this.storage[key];
        } else if (typeof key === 'undefined') {
            return this.storage;
        }
        return null;
    }

    /**
     * Set a value on the storage object.
     * @param key Name of key in storage object
     * @param value Value of key
     */
    public set (key: string, value : any) {
        this.storage[key] = value;
    }
}