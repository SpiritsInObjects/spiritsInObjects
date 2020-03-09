'use strict'

const { homedir } = require('os');
const { join } = require('path');
const { outputFile, readFile, pathExists } = require('fs-extra')

interface StateStorage {
    files? : string[];
    camera? : string;
    start? : number;
    end? : number;
    framerate? : number;
    frames? : number;
    width? : number;
    height? : number;
    samplerate? : number;
}

class State {
    private localFile : string = join( homedir(), '.spiritsInObjects/state.sio' )
    
    public files : string[] = [];
    public camera : string = null;
    public start : number = .72;
    public end : number = 1.0;
    public framerate : number = 24;
    public frames : number = 0;
    public width : number = 0;
    public height : number = 0;
    public samplerate : number = 0;

    constructor () {
        this.restore();
    }

    /**
     * Save the state as JSON to local file in the home directory
     */
    public async save () {
        const storage : StateStorage = {
            files:  this.files,
            camera : this.camera,
            start : this.start,
            end : this.end,
            framerate : this.framerate,
            frames : this.frames,
            width : this.width,
            samplerate : this.samplerate
        };
        try {
            await outputFile(this.localFile, JSON.stringify(storage, null, '\t'), 'utf8');
        } catch (err) {
            console.error(err);
        }
    }

    /**
     * Restore the state from the saved JSON file to the state class
     */
    public async restore () {
        let storage : StateStorage;
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
                storage = JSON.parse(raw) as StateStorage;
            } catch (err) {
                console.log(err);
                console.log(raw);
                return false;
            }
            this.files = storage.files;
            this.camera = storage.camera;
            this.start = storage.start;
            this.end = storage.end;
            this.framerate = storage.framerate;
            this.frames = storage.frames;
            this.width = storage.width;
            this.height = storage.height;
            this.samplerate = storage.samplerate;
        }
    }

    /**
     * Get the current state as an object.
     */
    public get () : StateStorage {
        return {
            files:  this.files,
            camera : this.camera,
            start : this.start,
            end : this.end,
            framerate : this.framerate,
            frames : this.frames,
            width : this.width,
            height : this.height,
            samplerate : this.samplerate
        };
    }
}