'use strict';
class AudioControl {
    constructor() {
        this.element = document.getElementById('audio');
        //private playButton : HTMLButtonElement = document.getElementById('playAudio') as HTMLButtonElement;
        this.playing = false;
    }
    file(filePath) {
        const source = new HTMLSourceElement();
        source.src = filePath;
        this.filePath = filePath;
        this.element.innerHTML = '';
        this.element.appendChild(source);
        this.element.addEventListener('loadeddata', this.onloadeddata.bind(this));
        this.element.load();
    }
    play() {
        if (!this.playing) {
            this.element.play();
            this.playing = true;
            //this.playButton.innerHTML = 'Pause Audio';
        }
        else {
            this.element.pause();
            this.playing = false;
            //this.playButton.innerHTML = 'Play Audio';
        }
    }
    onloadeddata() {
        //audio info
        //this.playButton.disabled = false;
    }
}
//# sourceMappingURL=index.js.map