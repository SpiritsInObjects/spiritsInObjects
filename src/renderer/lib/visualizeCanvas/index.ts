'use strict'

import { basename, extname } from 'path';

class Visualize {
    private viewElement : HTMLCanvasElement = document.getElementById('visualize') as HTMLCanvasElement;
    public type : string = 'midi'; //or audio
    public filePath : string;
    public fileName : string;
    private ext : string;
    private frame : number = 0;

    constructor (filePath : string) {
        this.filePath = filePath;
        this.fileName = basename(filePath);
        this.ext = extname(this.fileName);
        if (this.ext.toLowerCase() === '.mid') {
            this.type = 'midi';
            //
        } else if (this.ext.toLowerCase() === '.wav' 
                || this.ext.toLowerCase() === '.mp3' 
                || this.ext.toLowerCase() === '.ogg') {
            this.type = 'audio';
            //
        }
    }

    public render (frameNo? : number) {
        if (this.type === 'midi') {
            this.renderMidi(frameNo);
        } else if (this.type === 'audio') {
            this.renderAudio(frameNo);
        }
        this.frame++;
    }

    private renderMidi(frameNo : number) {

    }

    private renderAudio(frameNo : number) {

    }
}