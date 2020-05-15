'use strict';

class AudioControl {
	private element : HTMLAudioElement = document.getElementById('audio') as HTMLAudioElement;
	//private playButton : HTMLButtonElement = document.getElementById('playAudio') as HTMLButtonElement;
	private playing : boolean = false;
	private filePath : string;

	constructor () {

	}

	public file (filePath : string) {
		const source : HTMLSourceElement = new HTMLSourceElement();
		source.src = filePath;
		this.filePath = filePath;
		this.element.innerHTML = '';
		this.element.appendChild(source);
		this.element.addEventListener('loadeddata', this.onloadeddata.bind(this));
		this.element.load();
	}

	public play () {
        if (!this.playing) {
            this.element.play();
            this.playing = true;
            //this.playButton.innerHTML = 'Pause Audio';
        } else {
            this.element.pause();
            this.playing = false;
            //this.playButton.innerHTML = 'Play Audio';
        }
	}

	private onloadeddata () {
		//audio info
		//this.playButton.disabled = false;
	}
}