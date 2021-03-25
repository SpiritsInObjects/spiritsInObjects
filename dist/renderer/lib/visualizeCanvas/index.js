'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
/* Mothball */
class Visualize {
    constructor(filePath) {
        this.viewElement = document.getElementById('visualize');
        this.type = 'midi'; //or audio
        this.frame = 0;
        this.filePath = filePath;
        this.fileName = path_1.basename(filePath);
        this.ext = path_1.extname(this.fileName);
        if (this.ext.toLowerCase() === '.mid') {
            this.type = 'midi';
            //
        }
        else if (this.ext.toLowerCase() === '.wav'
            || this.ext.toLowerCase() === '.mp3'
            || this.ext.toLowerCase() === '.ogg') {
            this.type = 'audio';
            //
        }
    }
    render(frameNo) {
        if (this.type === 'midi') {
            this.renderMidi(frameNo);
        }
        else if (this.type === 'audio') {
            this.renderAudio(frameNo);
        }
        this.frame++;
    }
}
//# sourceMappingURL=index.js.map