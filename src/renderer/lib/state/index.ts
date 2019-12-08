'use strict'

import { homedir } from 'os'
import { join as pathJoin } from 'path'
import { writeFile, readFile } from 'fs-extra'

class State {
    private localFile : string = pathJoin( homedir(), '' )
    
    private files : string[] = [];
    private camera : string = null;
    private start : number = .7;
    private end : number = 1.0;


    constructor () {

    }

    public async save () {

    }

    public async restore () {

    }

    public async saveFile (filePath : string) {

    }
    public async restoreFile (filePath : string) {

    }
}