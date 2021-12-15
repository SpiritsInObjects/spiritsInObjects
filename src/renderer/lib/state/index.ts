'use strict'

const { homedir } = require('os');
const { join } = require('path');
const { writeFile, readFile, pathExists, ensureDir, copy } = require('fs-extra')

interface StateStorage {
    [key: string]: any;
    filePath? : string[];
    type? : string;
    camera? : string;
    start? : number;
    end? : number;
    framerate? : number;
    frames? : number;
    width? : number;
    height? : number;
    samplerate? : number;

    vHeight? : number;
    vWidth? : number;

    page? : string;
}

/* class representing the state class */
class State {
    private localFile : string = join( homedir(), '.spiritsInObjects/state.sio' );
    public saveFile : string = null;
    private storage : StateStorage = {
        start : 0.81,
        end : 1.0
    } as StateStorage;
    public timeline : any = { bin : [], timeline : [] };
    public visualize : any = {    
        resolution : '1080',
        type : 'midi',
        style : 'simple',
        waves : 'square',
        soundtrackType : 'variable density full',
        soundtrackFull : true,
        offset : false,
        format : 'prores3',

        filePath : null
    };
    private lock : boolean = false;
    private unsaved : boolean = true;
    
    /**
     * @constructor
     * 
     * Initializes the State class
     **/
    constructor () {
        this.start();
    }

    /**
     * Start the state storage file and in-memory object
     **/
    public async start () {
        const stateDir : string = join(homedir(), '.spiritsInObjects');
        let dirExists : boolean;
        try {
            dirExists = await pathExists(stateDir);
        } catch (err) {
            throw err;
        }
        if (!dirExists) {
            try {
                await ensureDir(stateDir);
            } catch (err) {
                throw err;
            }
            try {
                this.save();
            } catch (err) {
                throw err;
            }
        }
        //check for error
        try {
            //await this.restore();
        } catch (err) {
            throw err;
        }
    }

    /**
     * Retrieve a stringified object containing all
     * state data for saving to disk.
     **/
    private getData () {
        const data : any = {
            storage : this.storage,
            visualize : this.visualize,
            timeline : this.timeline
        };
        return JSON.stringify(data, null, '\t');
    }

    /**
     * Save the state as JSON to local file in the home directory
     */
    public async save ( writeSave : boolean = false) {
        if (!this.lock) {
            this.lock = true;
            try {
                await writeFile(this.localFile, this.getData(), 'utf8');
            } catch (err) {
                console.error(err);
            }
            this.unsaved = true;

            if (writeSave && this.saveFile != null) {
                try {
                    await copy(this.localFile, this.saveFile);
                } catch (err) {
                    console.error(err);
                }
                this.unsaved = false;
            }

            this.lock = false;
        }
    }

    /**
     * Restore the state from the saved JSON file to the state class
     * 
     * @returns {boolean} Whether file is restored from state
     */
    public async restore () : Promise<boolean> {
        let stateFile : string = this.saveFile != null ? this.saveFile : this.localFile;
        let raw : string;
        let fileExists : boolean = false;
        let parsed : any;

        try {
            fileExists = await pathExists(stateFile);
        } catch (err) {
            console.error(err);
            return false;
        }

        if (!fileExists) {
            return false;
        }

        try {
            raw = await readFile(stateFile, 'utf8');
        } catch (err) {
            console.error(err);
        }
        if (raw) {
            try {
                parsed = JSON.parse(raw);
            } catch (err) {
                console.error(err);
                console.error(raw);
                //overwrite bad state file
                await this.save();
                return false;
            }
            this.storage = parsed.storage as StateStorage;
            this.timeline = parsed.timeline;
            this.visualize = parsed.visualize;
        }
    }

    /**
     * Get the current state of a key or the entire storage object.
     * 
     * @param {string} key     Name of key to retrieve.
     * 
     * @returns {object} Return all storage data or null
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
     * 
     * @param {string} key     Name of key in storage object
     * @param {any} value      Value of key
     */
    public async set (key: string, value : any) {
        this.storage[key] = value;
        this.validate(key, value);
        await this.save();
    }

    /**
     * Validate input and set to defaults or erase if invalid.
     * 
     * @param {string} key     Name of key in storage object
     * @param {any} value      Value of key
     **/
     private validate (key: string, value: any) {
        if (key === 'start') {
            if (isNaN(value)) {
                this.storage[key] = 0.81;
            }
        } else if (key === 'end') {
            if (isNaN(value)) {
                this.storage[key] = 1.0;
            }
        }
     }
}