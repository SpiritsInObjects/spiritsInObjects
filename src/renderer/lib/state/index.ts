'use strict'

const { homedir } = require('os');
const { join } = require('path');
const { outputFile, readFile } = require('fs-extra')

interface StateStorage {
    files? : string[];
    camera? : string;
    start? : number;
    end? : number;
}

class State {
    private localFile : string = join( homedir(), '.spiritsInObjects/state.sio' )
    
    public files : string[] = [];
    public camera : string = null;
    public start : number = .72;
    public end : number = 1.0;
    public framerate : number = 24;

    constructor () {

    }

    public async save () {
        const storage : StateStorage = {
            files:  this.files,
            camera : this.camera,
            start : this.start,
            end : this.end
        }
        try {
            await outputFile(this.localFile, JSON.stringify(storage), 'utf8')
        } catch (err) {
            console.error(err)
        }
    }

    public async restore () {
        let storage : StateStorage;
        let raw : string;
        try {
            raw = await readFile(this.localFile, 'utf8')
        } catch (err) {
            console.error(err)
        }
        if (raw) {
            storage = JSON.parse(raw)
            this.files =  this.files;
            this.camera = this.camera;
            this.start = this.start;
            this.end = this.end;
        }
    }

    public async saveFile (filePath : string) {

    }
    public async restoreFile (filePath : string) {

    }
}