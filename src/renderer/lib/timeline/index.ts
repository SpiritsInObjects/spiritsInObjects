'use strict';

const electronPrompt = require('electron-prompt');
const { extname } = require('path');
const uuid = require('uuid').v4;

class Timeline {
	private ui : any;

	private canvas : HTMLCanvasElement = document.getElementById('tCanvas') as HTMLCanvasElement;
	private ctx : CanvasRenderingContext2D = this.canvas.getContext('2d');
	private display : HTMLImageElement = document.getElementById('tCanvasDisplay') as HTMLImageElement;
	private binElement : HTMLElement = document.getElementById('tBin');
	private timelineElement : HTMLElement = document.getElementById('tElement');
	public stillLoader : HTMLImageElement;

	private createBtn : HTMLButtonElement = document.getElementById('tCreate') as HTMLButtonElement;
	private addBtn : HTMLButtonElement = document.getElementById('tAdd') as HTMLButtonElement;
	private removeBtn : HTMLButtonElement = document.getElementById('tRemove') as HTMLButtonElement;
	private importBtn : HTMLButtonElement = document.getElementById('tAddBin') as HTMLButtonElement;
	private addTimelineBtn : HTMLButtonElement = document.getElementById('tAddTimeline') as HTMLButtonElement;
	public prev : HTMLButtonElement = document.getElementById('tPrevFrame') as HTMLButtonElement;
    public next : HTMLButtonElement = document.getElementById('tNextFrame') as HTMLButtonElement;

	public timeline : any[] = [];
	private bin : BinImage[] = [];
	private lastDir : string = '';
	private stepSize : number = 1;

	private endTC : Timecode;

	private audioContext : AudioContext = new AudioContext();
	private state : any;
	private sonify : Sonify;

	private exts : string[] = [ '.png', '.jpeg', '.jpg' ];
	private keys : string[] = [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
								'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
								'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ];

	private playing : any = {};

	private selected : number;
	private selectedBin : string;
	private onBin : Function;

	private currentHash : number = 0;
	private renderingPreview : boolean = false;
	private displayingPreview : boolean = false;
	private onPreview : Function;

	private silence : any = {
		sampleRate : 0
	};
	private blank : any = {
		width : 0,
		height: 0
	};

	constructor (ui : any, onBin : Function, onPreview : Function) {
		this.ui = ui;
		this.bindListeners();
		this.state = {
			get : () => { return false }
		};
		this.onBin = onBin;
		this.onPreview = onPreview;
	}

	private bindListeners () {
		this.binElement.addEventListener('click', this.openBin.bind(this));
		this.importBtn.addEventListener('click', this.open.bind(this));
		this.createBtn.addEventListener('click', this.create.bind(this));
		this.addTimelineBtn.addEventListener('click', this.addTimeline.bind(this));
		this.next.addEventListener('click', this.nextFrame.bind(this));
		this.prev.addEventListener('click', this.prevFrame.bind(this));
		this.addBtn.addEventListener('click', (function (){ this.expandTimeline(); }).bind(this));
		this.removeBtn.addEventListener('click', (function (){ this.contractTimeline(); }).bind(this));

		document.addEventListener('keydown', this.keyDown.bind(this), false);
		document.addEventListener('keyup', this.keyUp.bind(this), false);

		this.bindGlobal('.frame', 'click', this.clickFrame.bind(this));
		this.bindGlobal('#tBin tbody tr', 'click', this.clickBinImage.bind(this));
		this.bindGlobal('#tBin tbody tr', 'dblclick', this.dblclickBinImage.bind(this));
	}

	private bindGlobal (selector : string, event : string, handler : Function) {
		const rootElement : HTMLElement = document.querySelector('body');
			rootElement.addEventListener(event, function (evt : Event) {
				let targetElement : any = evt.target;
				while (targetElement != null) {
					if (targetElement.matches(selector)) {
						handler(evt);
						return;
					}
					targetElement = targetElement.parentElement;
				}
			},
			true
		);
	}

	private hash () : number {
		const str : string = this.timeline.length > 0 ? this.timeline.join('') : '';
	    let hash : number = 0;
	    let char : any;

	    if (str.length == 0) {
	        return hash;
	    }

	    for (let i = 0; i < str.length; i++) {
	        char = str.charCodeAt(i);
	        hash = ((hash<<5)-hash)+char;
	        hash = hash & hash; // Convert to 32bit integer
	    }
	    return hash;
	}

	private addClass ( elem : HTMLElement, className : string ) {
		try{
			elem.classList.add(className);
		} catch (err) {
			//
		}
	}

	private removeClass ( elem : HTMLElement, className : string ) {
		try{
			elem.classList.remove(className);
		} catch (err) {
			//
		}
	}

	private clickFrame (evt : Event) {
        //@ts-ignore
        const x : number = parseInt(evt.target.getAttribute('x'), 10);
        let bi : BinImage = null;
        let id : string;

		this.selectFrame(x);

		if ( this.timeline[x] != null) {
			id = this.timeline[x].id;
			bi = this.getById(id);
		}

		if (bi != null) {
			this.displayFrame(bi.file);
			this.selectBinImage(bi.id);
		} else {
			this.stopDisplay();
		}

    }

    private clickBinImage (evt : Event) {
    	let id : string;
    	let tr : any = evt.target;
    	let bi : BinImage;

    	if (tr.nodeName === 'TD') {
    		tr = tr.parentElement;
    	}

    	id = tr.id;
		bi = this.getById(id);
    	this.selectBinImage(id);

		if (bi) {
			this.displayFrame(bi.file);
		}
    }

    private dblclickBinImage (evt : Event) {
    	let id : string;
    	let tr : any = evt.target;
    	let bi : BinImage;

    	if (tr.nodeName === 'TD') {
    		tr = tr.parentElement;
    	}

    	id = tr.id;
    	bi = this.getById(id);
    	this.selectBinImage(id);

		if (bi) {
			this.displayFrame(bi.file);
			this.assignFrame(this.selectedBin, this.selected);
			if (this.selected + 1 <= this.timeline.length - 1) {
				this.selectFrame(this.selected + 1);
			}
		}
    }

    private selectBinImage (id : string) {
    	const binImages = document.querySelectorAll('#tBin tbody tr');
    	[].forEach.call(binImages, (el : HTMLElement) => {
			el.classList.remove('selected');
		});
   		this.selectedBin = id;

    	document.getElementById(id).classList.add('selected');
    }

    private selectFrame (x : number) {
    	const frames = document.querySelectorAll('.frame');
    	[].forEach.call(frames, (el : HTMLElement) => {
			el.classList.remove('selected');
		});
    	this.selected = x;
		document.querySelector(`.frame[x="${x}"]`).classList.add('selected');
    }

    private nextFrame () {
		let bi : BinImage = null;
		let id : string;

		if (this.selected < this.timeline.length - 1) {
			this.selectFrame(this.selected + 1);

			if ( this.timeline[this.selected] != null) {
				id = this.timeline[this.selected].id;
				bi = this.getById(id);
			}

			if (bi != null) {
				this.displayFrame(bi.file);
				this.selectBinImage(bi.id);
			} else {
				this.stopDisplay();
			}
		}
    }

	private prevFrame () {
		let bi : BinImage = null;
		let id : string;
		if (this.selected > 0) {
			this.selectFrame(this.selected - 1);

			if ( this.timeline[this.selected] != null) {
				id = this.timeline[this.selected].id;
				bi = this.getById(id);
			}

			if (bi != null) {
				this.displayFrame(bi.file);
				this.selectBinImage(bi.id);
			} else {
				this.stopDisplay();
			}
		}
	}

	private keyDown (evt : KeyboardEvent) {
		let key : string = null;

		if (this.ui.currentPage !== 'timeline') {
			return false;
		}

		//console.log(evt.code);
		if (evt.code === 'Backspace') {
			return this.deleteFrame();
		} else if (evt.code === 'ArrowRight') {
			return this.nextFrame();
		} else if (evt.code === 'ArrowLeft') {
			return this.prevFrame();
		}
		
		key = this.codeToKey(evt.code, evt.shiftKey);

    	if (key) {
    		this.playFrame(key);
    	}
	}

	private keyUp (evt : KeyboardEvent) {
		let key : string = null;

		if (this.ui.currentPage !== 'timeline') {
			return false;
		}

		key = this.codeToKey(evt.code, evt.shiftKey);

    	if (key) {
    		this.stopFrame(key);
    	}
	}

	private codeToKey (code : string, shiftKey : boolean) : string {
		let key : string = null;

		if (code.indexOf('Key') === 0) {
    		key = code.replace('Key', '');
    		if (!shiftKey) {
    			key = key.toLowerCase();
    		}
    	} else if (code.indexOf('Digit') === 0) {
    		key = code.replace('Digit', '');
    	}

    	return key;
	}

	private openBin () {
		if (this.bin.length === 0) {
			return this.open();
		}
		return false;
	}

	private async open () {
		let selectionType : string = 'multiSelections'
        const options : any = {
            title: `Select video, image or audio file`,
            properties: [ selectionType ],
            defaultPath: this.lastDir === '' ? homedir() : this.lastDir,
            filters: [
                {
                    name: 'All Files',
                    extensions: ['*']
                },
            ]
        };
        let files : any;
        
        try {
        	//@ts-ignore
            files = await dialog.showOpenDialog(options);
        } catch (err ) {
            console.error(err);
        }

        if (!files || !files.filePaths || files.filePaths.length === 0) {
            return false;
        }

        this.addToBin(files.filePaths);
	}

	private validate ( files : string[] ) {
		let valid : boolean = false;
		let fileName : string;
		let ext : string;

		for (let file of files) {
			//@ts-ignore
        	fileName = basename(file);
        	ext = extname(fileName.toLowerCase());
        	if (this.exts.indexOf(ext) !== -1) {
        		valid = true;
        	} else {
        		valid = false;
        		this.error('Error loading files', `The file ${fileName} cannot be used in the timeline. Please make a new selection.`);
        		break;
        	}
        }

		return valid;
	}

	public async addToBin ( files : string[] ) {
		let bi : BinImage;
		let key : string;
		let index : number;
		let image : any = null;
		let count : number = 0;

		if ( !this.validate(files) ) {
        	return false;
        }

        this.ui.overlay.show(`Importing ${files.length} images to Bin...`);
		for (let file of files) {
			this.ui.overlay.progress(count / files.length, `${basename(file)}`);
			count++;
			if ( this.inBin(file) ) {
				continue;
			}

			index = this.bin.length;
			key = typeof this.keys[index] !== 'undefined' ? this.keys[index] : null;

			bi = {
				id : uuid(),
				file,
				//@ts-ignore
				name : basename(file),
				index,
				key,
				samples : null
			}

			try {
				bi.samples = await this.preProcess(file);
			} catch (err) {
				console.error(err);
			}

			if (this.canvas.width > this.blank.width || this.canvas.height > this.blank.height) {
				this.generateBlank(this.canvas.width, this.canvas.height);
			}

			if (bi.samples.length * 24 > this.silence.sampleRate) {
				this.generateSilence(bi.samples.length);
			}

			if (extname(file.toLowerCase()) !== '.png') {
				image = await this.imageData(file);
			} else {
				image = null;
			}

			this.bin.push(bi);
			this.onBin(bi, image);
		}
		this.ui.overlay.progress(1.0, `Cleaning up...`);
		this.layoutBin();
	}

	private inBin (filePath : string) : boolean {
		let match : BinImage = this.bin.find((item : BinImage) => {
			if (item.file === filePath) {
				return true;
			}
			return false;
		});
		return match != null;
	}

	private getByKey (key : string) : BinImage {
		let match : BinImage = this.bin.find((item : BinImage) => {
			if (item.key === key) {
				return true;
			}
			return false;
		});
		return match;
	}

	private getById (id : string) : BinImage {
		let match : BinImage = this.bin.find((item : BinImage) => {
			if (item.id === id) {
				return true;
			}
			return false;
		});
		return match;
	}

	private getByIndex (x : number) {
		let match : BinImage = this.bin.find((el : BinImage) => {
			if (el.index === x) {
				return true;
			}
			return false;
		});
		return match;
	}

	private layoutBin ( ) {
		const container : HTMLElement = this.binElement.querySelector('table tbody');
		let row : HTMLElement;
		let key : HTMLElement;
		let name : HTMLElement;

		container.innerHTML = '';

		for (let file of this.bin) {
			row = document.createElement('tr');
			key = document.createElement('td');
			name = document.createElement('td');

			if (file.key) {
				key.innerText = file.key;
			}

			row.setAttribute('id', file.id);
			name.innerText = file.name;

			row.appendChild(key);
			row.appendChild(name);

			container.appendChild(row);
		}
		
		this.ui.overlay.hide();
	}

	public async create () {
		const options : any = {
			title: 'New timeline',
			label: 'Number of frames:',
			value: '255',
			customStylesheet : 'dist/css/style.css',
			inputAttrs: {
				type: 'number'
			},
			type: 'input'
		};

		let res : string;
		let confirmRes : any;
		let len : number;

		this.selected = 0;

		if (this.timeline.length > 0) {
			try{
				confirmRes = await this.confirm();
			} catch (err) {
				console.error(err);
				return false;
			}
			
			if (confirmRes.response === 0) {
				return false;
			}
		}

		try {
			res = await electronPrompt(options);
		} catch (err) {
			console.error(err);
			return false;
		}

		if (res === null) {
			return false;
		}

		len = parseInt(res, 10);

		this.timeline = [];
		for (let i = 0; i < len; i++) {
			this.timeline.push(null);
		}

		this.layout();
	}

	private async confirm () : Promise <any>{
		const options = {
			type: 'question',
			buttons: ['Cancel', 'Yes, please'],
			defaultId: 0,
			title: 'New timeline',
			message: 'Are you sure you want to create a new timeline?',
			detail: 'This will erase your current timeline'
		};
		//@ts-ignore
		return dialog.showMessageBox(null, options);
	}

	private error (title : string, message : string) {
		//@ts-ignore
		dialog.showErrorBox(title, message)
	}

	private layout ( ) {
		const len : number = this.timeline.length;
		const container : HTMLElement = document.getElementById('tWrapper');
		let frame : HTMLElement;
		let between : HTMLElement;
		let bi : BinImage;

		container.innerHTML = '';

		this.endTC = new Timecode(len, 24, false);
		(document.getElementById('tEndTimecode') as HTMLInputElement).value = this.endTC.toString();

		for (let i = 0; i < len; i++) {
			frame = document.createElement('div');
			frame.classList.add('frame');
			frame.setAttribute('draggable', 'true');
			frame.setAttribute('x', String(i));

			if (i === this.selected){
				frame.classList.add('selected');
			}

			if (this.timeline[i] != null) {
				bi = this.getById(this.timeline[i].id);
				frame.innerText = bi.key;
			}

			between = document.createElement('div');
			between.classList.add('btw');
			between.setAttribute('x', String(i));

			container.appendChild(frame);
			container.appendChild(between);
		}

		this.addBtn.classList.remove('hide');
		this.removeBtn.classList.remove('hide');
	}

	private async preProcess ( filePath : string ) {
		return new Promise (async (resolve : Function, reject : Function) => {
			this.stillLoader = new Image();
	        this.stillLoader.onload = (function () {
	        	const width : number = this.stillLoader.naturalWidth;
				const height : number = this.stillLoader.naturalHeight;
				let buffer : Float32Array;
				this.canvas.width = width;
        		this.canvas.height = height;
				this.ctx.drawImage(this.stillLoader, 0, 0, width, height);
				this.sonify = new Sonify(this.state, this.canvas, this.audioContext);
				buffer = this.sonify.sonifyCanvas();
				return resolve(buffer);
	        }).bind(this)
	        this.stillLoader.setAttribute('src', filePath);
		});
	}

	private async imageData ( filePath : string ) {
		return new Promise (async (resolve : Function, reject : Function) => {
			this.stillLoader = new Image();
	        this.stillLoader.onload = (function () {
	        	const width : number = this.stillLoader.naturalWidth;
				const height : number = this.stillLoader.naturalHeight;
				let imageData : ImageData;
				this.canvas.width = width;
        		this.canvas.height = height;
				this.ctx.drawImage(this.stillLoader, 0, 0, width, height);
				imageData = this.ctx.getImageData(0, 0, width, height);
				return resolve( { data : imageData.data, width, height } );
	        }).bind(this)
	        this.stillLoader.setAttribute('src', filePath);
		});
	}

	public playFrame ( key : string ) {
		let bi : BinImage;
		let buf : any;
		let mono : any;

		if (typeof this.playing[key] !== 'undefined') {
			return false;
		}

		bi = this.getByKey(key);

		if (bi != null) {
			this.displayFrame(bi.file);
			this.selectBinImage(bi.id);

			this.playing[key] = this.audioContext.createBufferSource();
			buf = this.audioContext.createBuffer(1, bi.samples.length, bi.samples.length * 24);
			mono = buf.getChannelData(0);
			mono.set(bi.samples, 0);
			this.playing[key].buffer = buf;
			this.playing[key].loop = true;
			this.playing[key].connect(this.audioContext.destination);
			this.playing[key].start();
		}
	}

	public stopFrame ( key : string ) {
		if (typeof this.playing[key] !== 'undefined') {
			this.playing[key].stop();
			delete this.playing[key];
		}
		//this.stopDisplay();
		return false;
	}

	public displayFrame ( filePath: string) {
		this.display.setAttribute('src', filePath);
		try {
			this.display.classList.remove('hide');
		} catch (err) {
			//
		}
	}

	public stopDisplay () {
		try {
			this.display.classList.add('hide');
		} catch (err) {
			//
		}
		this.display.setAttribute('src', '#');
	}

	private addTimeline () {
		let bi : BinImage;
		if (this.selectedBin != null) {
			bi = this.getById(this.selectedBin);
			this.assignFrame(this.selectedBin, this.selected);
			if (this.selected + 1 <= this.timeline.length - 1) {
				this.selectFrame(this.selected + 1);
			}
		}
		//console.log(`${this.selected} = ${bi.id}`)
	}

	public assignFrame (id : string, x : number, count : number = 1) {
		for (let i = 0; i < count; i++) {
			this.timeline[x + i] = { id };
		}
		this.layout();
	}

	public deleteFrame (  ) {
		if (this.timeline.length === 0) {
			return false;
		}
		this.timeline[this.selected] = null;
		this.selected--;
		this.layout();
	}

	private expandTimeline (steps : number = 1) {
		for (let i = 0; i < steps; i++) {
			this.timeline.push(null);
		}
		this.layout();
	}

	private contractTimeline (steps : number = 1) {
		for (let i = 0; i < steps; i++) {
			if (this.timeline.length > 0) {
				this.timeline.pop();
			}
		}
		this.layout();
	}

	private generateBlank (width : number, height : number) {
		const blank : BinImage = {
			id : 'blank',
			file : null,
			name : null,
			index : -1,
			key : null,
			samples : null
		};
		const image : any = {
			width,
			height
		};
		let imageData : ImageData;

		this.canvas.width = width;
        this.canvas.height = height;
        this.ctx.fillStyle = "#000000";
		this.ctx.fillRect(0, 0, width, height);

		imageData = this.ctx.getImageData(0, 0, width, height);
		image.data = imageData.data;

		this.blank.width = width;
		this.blank.height = height;

		this.onBin(blank, image);
	}

	private generateSilence (sampleLength : number) {
		const silence : BinImage = {
			id : 'silence',
			file : null,
			name : null,
			index : -1,
			key : null,
			samples : new Float32Array(sampleLength)
		};
		const image : any = null;

		for (let i = 0; i < sampleLength; i++) {
			silence.samples[i] = 0.0;
		}

		this.silence.sampleRate = sampleLength * 24;

		this.onBin(silence, image);
	}

	public moveFrame () {

	}

	public expandFrame () {

	}

	public contractFrame () {

	}

	public export () : string[] {
		const timeline : string[] = this.timeline.map((step : TimelineStep) => (step && step.id) ? step.id : null );
		return timeline;
	}

	public preview () {
		const timeline : string[] = this.timeline.map((step : TimelineStep) => (step && step.id) ? step.id : null );
		return timeline;
	}

	private checkPreview () {
		let newHash : number = this.hash();
		if (this.currentHash !== newHash) {
			this.currentHash = newHash;
			if (!this.renderingPreview) {
				this.renderingPreview = true;
				this.onPreview();
			}
		}
	}

	public onPreviewComplete (args : any) {
		console.dir(args);
	}

	play () {

	}
}
