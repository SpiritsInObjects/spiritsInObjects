'use strict';

const { extname } = require('path');
const uuid = require('uuid').v4;
const { lstat, readdir } = require('fs-extra');
const { platform } = require('os');
const Swal = require('../contrib/sweetalert2.min.js');

class Timeline {
	private ui : any;

	private canvas 			: HTMLCanvasElement = document.getElementById('tCanvas') as HTMLCanvasElement;
	private ctx 			: CanvasRenderingContext2D = this.canvas.getContext('2d');
	private display 		: HTMLImageElement = document.getElementById('tCanvasDisplay') as HTMLImageElement;
	private theatre 		: HTMLElement = document.getElementById('tTheatre');
	private binElement 		: HTMLElement = document.getElementById('tBin');
	private timelineElement : HTMLElement = document.getElementById('tElement');
	private previewVideo 	: HTMLVideoElement = document.getElementById('tPreviewVideo') as HTMLVideoElement;
	private stepSizeElement : HTMLInputElement = document.getElementById('tStepSize') as HTMLInputElement;
	private promptElement 	: HTMLElement = document.getElementById('prompt');
	private counter  		: HTMLInputElement = document.getElementById('tCurrentFrame') as HTMLInputElement;

	public stillLoader 		: HTMLImageElement;

	private loopBtn 		: HTMLButtonElement = document.getElementById('tLoop') as HTMLButtonElement;
	private playBtn 		: HTMLButtonElement = document.getElementById('tSync') as HTMLButtonElement;
	private createBtn 		: HTMLButtonElement = document.getElementById('tCreate') as HTMLButtonElement;
	private addBtn 			: HTMLButtonElement = document.getElementById('tAdd') as HTMLButtonElement;
	private removeBtn 		: HTMLButtonElement = document.getElementById('tRemove') as HTMLButtonElement;
	private importBtn 		: HTMLButtonElement = document.getElementById('tAddBin') as HTMLButtonElement;
	private addTimelineBtn 	: HTMLButtonElement = document.getElementById('tAddTimeline') as HTMLButtonElement;
	public prev 			: HTMLButtonElement = document.getElementById('tPrevFrame') as HTMLButtonElement;
    public next 			: HTMLButtonElement = document.getElementById('tNextFrame') as HTMLButtonElement;

	public timeline : any[] = [];
	public bin : BinImage[] = [];
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
	private onPreview : Function;

	private previewState : any = {
		hash : 0,
		displaying : false,
		rendering : false,
		playing : false,
		loop : false
	};
	private previewInterval : any;

	private dragState : any = {
		dragging : false,
		target : null,
		frame : false,
		group : false
	};

	private selectState : any = {
		active : false,
		start : -1,
		end : -1
	};

	private silence : any = {
		sampleRate : 0
	};

	private blank : any = {
		width : 0,
		height: 0
	};

	private copyState : any = {
		timeline : [],
		cut : false,
		cutLocation : 0
	};

	constructor (ui : any, onBin : Function, onPreview : Function) {
		this.ui = ui;
		this.onBin = onBin;
		this.onPreview = onPreview;
		
		this.state = {
			get : () => { return false }
		};

		this.bindListeners();
	}

	private bindListeners () {
		this.bindListener('click', this.binElement, this.openBin);
		this.bindListener('click', this.importBtn, this.open);
		this.bindListener('click', this.createBtn, this.create);
		this.bindListener('click', this.addTimelineBtn, this.addTimeline);
		this.bindListener('click', this.next, this.nextFrame);
		this.bindListener('click', this.prev, this.prevFrame);
		//this.bindListener('click', this.addBtn, function (){ this.expandTimeline(); });
		//this.bindListener('click', this.removeBtn, function (){ this.contractTimeline(); });
		this.bindListener('click', this.playBtn, this.playPreview);
		this.bindListener('click', this.loopBtn, this.toggleLoop);

		this.bindListener('ended', this.previewVideo, this.previewEnded);

		this.bindListener('change', this.stepSizeElement, this.changeStepSize);

		this.bindListener('keydown', document, this.keyDown);
		
		this.bindListener('keyup', document, this.keyUp);

		this.bindGlobal('.frame', 'click', this.clickFrame.bind(this));
		this.bindGlobal('.frame', 'dblclick', this.dblclickFrame.bind(this));
		this.bindGlobal('#tBin tbody tr', 'click', this.clickBinImage.bind(this));
		this.bindGlobal('#tBin tbody tr', 'dblclick', this.dblclickBinImage.bind(this));

		/** Drag and Drop **/
		this.bindGlobal('#tBin tbody tr', 'dragstart', this.binDragStart.bind(this));
		this.bindGlobal('.frame', 'dragenter', this.binDragEnter.bind(this));
		this.bindGlobal('#tWrapper', 'dragleave', this.binDragLeave.bind(this));

		this.bindGlobal('#tBin tbody tr', 'drop', this.binDragEnd.bind(this));
		this.bindGlobal('#tBin tbody tr', 'dragend', this.binDragEnd.bind(this));

		this.bindGlobal('.frame', 'dragstart', this.frameDragStart.bind(this));
		this.bindGlobal('.group', 'dragstart', this.groupDragStart.bind(this));

		this.bindListener('drop', document, this.binDragEnd);
		this.bindListener('drop', document, this.frameDragEnd.bind(this));
		this.bindListener('drop', document, this.groupDragEnd.bind(this));

		this.bindGlobal('.frame', 'dragenter', this.groupDragEnter.bind(this));
		this.bindGlobal('.frame', 'dragleave', this.groupDragLeave.bind(this));

		/** Selection UI **/

		this.bindGlobal('.frame', 'click', this.clickSelect.bind(this));
	}

	private bindListener (event : string, element : HTMLElement|Document, func : Function) {
		element.addEventListener(event, func.bind(this), false);
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

	private progress (percent : number) {
		let index : number;
		if (this.timeline && this.timeline.length > 0) {
			index = Math.round(percent * this.timeline.length);
			if (typeof this.timeline[index] !== 'undefined') {
				this.removeClassAll('.frame.progress', 'progress');
				this.addClass(document.querySelector(`.frame[x="${index}"]`), 'progress');
			}
		}
	}

	private hash () : number {
		let str : string = '';
	    let hash : number = 0;
	    let char : any;

	    if (this.timeline.length > 0) {
	    	str = this.timeline.map( (el : any) : string => {
	    		if (el == null) {
	    			return 'null';
	    		} else {
	    			return el.id;
	    		}
	    	}).join('');
	    }

	    this.timeline.length > 0 ? this.timeline.join('') : '';

	    if (str.length === 0) {
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

	private addClassAll ( selector : string, className : string) {
		const elems : NodeListOf<Element> = document.querySelectorAll(selector);
		[].forEach.call(elems, (el : HTMLElement) => {
			this.addClass(el, className);
		});
	}

	private removeClass ( elem : HTMLElement, className : string ) {
		try{
			elem.classList.remove(className);
		} catch (err) {
			//
		}
	}

	private removeClassAll ( selector : string, className : string) {
		const elems : NodeListOf<Element> = document.querySelectorAll(selector);
		[].forEach.call(elems, (el : HTMLElement) => {
			this.removeClass(el, className);
		});
	}

	private changeStepSize () {
		let val : number = parseInt(this.stepSizeElement.value, 10);
		if (val < 1) {
			this.stepSizeElement.value = String(1);
			val = 1;
		}
		this.stepSize = val;
		this.addTimelineBtn.innerHTML = `Add ${val} Frame${val === 1 ? '' : 's'} to Timeline`;
	}

	private clickFrame (evt : Event) {
		const x : number = parseInt((evt.target as HTMLElement).getAttribute('x'), 10);
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

		if (!this.selectState.active) {
			this.clearSelect();
		}
	}

	private dblclickFrame (evt : Event) {
        const x : number = parseInt((evt.target as HTMLElement).getAttribute('x'), 10);
        let bi : BinImage = null;
        let id : string;

		this.selectFrame(x);

		if ( this.timeline[x] != null) {
			id = this.timeline[x].id;
			bi = this.getById(id);
		}

		if (bi != null) {
			this.playFrame(bi.key, false);
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
		let startFrame : number = this.selected;
		let nullFill : number = 0;
		let stepSize : number = this.stepSize;

		if (tr.nodeName === 'TD') {
			tr = tr.parentElement;
		}

		id = tr.id;
		bi = this.getById(id);
		this.selectBinImage(id);

		if (bi) {
			if (this.selectState.start !== -1) {
				startFrame = this.selectState.start;
				stepSize = (this.selectState.end - this.selectState.start) + 1; //inclusive length
			}
			this.displayFrame(bi.file);
			this.assignFrame(this.selectedBin, startFrame, stepSize);
			if (startFrame + stepSize <= this.timeline.length - 1) {
				this.selectFrame(startFrame + stepSize);
			} else {
				this.selectFrame(this.timeline.length - 1);
			}
		}

		if (!this.selectState.active && this.selectState.start !== -1) {
			this.clearSelect();
		}
    }

    private selectBinImage (id : string) {
    	this.removeClassAll('#tBin tbody tr.selected', 'selected');
    	this.addClass(document.getElementById(id), 'selected');
   		this.selectedBin = id;
    }

    private selectFrame (x : number) {
    	this.removeClassAll('.frame.selected', 'selected');
		this.addClass(document.querySelector(`.frame[x="${x}"]`), 'selected');
    	this.changeSelected(x);
    }

    private selectFrameGroup (x : number, size : number, id : string = null) {
    	let bi : BinImage = null;
    	let frame : HTMLElement;
    	
    	if (id != null) {
    		bi = this.getById(this.selectedBin);
    	}

    	this.removeClassAll('.frame.group', 'group');

    	for (let i = 0; i < this.timeline.length; i++) {
    		frame = document.querySelector(`.frame[x="${i}"]`);
			if (frame && i >= x && i <= x + size - 1) {
				this.addClass(frame, 'group');
				if (bi != null && bi.key != null) {
					frame.innerText = bi.key;
				} else {
					frame.innerText = '?';
				}
			} else {
				if (this.timeline[i] != null) {
					frame.innerText = this.getById(this.timeline[i].id).key;
				} else {
					frame.innerText = '';
				}
			}
    	}
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

		//console.dir(evt);
		console.log(evt.code);

		if (evt.ctrlKey || evt.metaKey){
			if (evt.code === 'KeyC') {
				return this.copy();
			} else if (evt.code === 'KeyX') {
				return this.cut();
			} else if (evt.code === 'KeyV') {
				return this.paste();
			}
		}

		if (evt.code === 'Backspace') {
			return this.deleteFrame();
		} else if (evt.code === 'ArrowRight') {
			return this.nextFrame();
		} else if (evt.code === 'ArrowLeft') {
			return this.prevFrame();
		} else if (evt.code === 'Space') {
			return this.playPreview();
		} else if (evt.code === 'ShiftRight' || evt.code === 'ShiftLeft') {
			return this.startSelect();
		}
		
		key = this.codeToKey(evt.code, evt.shiftKey);

    	if (key) {
    		this.playFrame(key, true);
    	}
	}

	private keyUp (evt : KeyboardEvent) {
		let key : string = null;

		if (this.ui.currentPage !== 'timeline') {
			return false;
		}

		if (evt.code === 'ShiftRight' || evt.code === 'ShiftLeft') {
			return this.endSelect();
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
		const properties : string [] = platform() === 'darwin' ? ['openFile', 'openDirectory', 'multiSelections'] : ['multiSelections'];
        const options : any = {
            title: `Select image files or a folder of images`,
            properties,
            defaultPath: this.lastDir === '' ? homedir() : this.lastDir
        };
        let files : any;

        this.importBtn.blur();
        
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
		let stat : any;
		let baseDir : string;
		let dirFiles : string[];

		if (files.length === 1) {
			baseDir = files[0];
			try{
				stat = await lstat(baseDir);
			} catch (err) {
				console.error(err);
			}

			if (stat.isDirectory()) {
				try {
					dirFiles = await readdir(baseDir);
				} catch (err) {
					console.error(err);
				}
				if (dirFiles) {
					files = dirFiles.filter( (fileName : string) => {
						if (fileName.indexOf('.') === 0) {
							return false;
						}
						return true;
					});
					files = files.map( (fileName : string) => {
						return join(baseDir, fileName);
					});
				}
			}
		}

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

			row.setAttribute('id', file.id);
			row.setAttribute('draggable', 'true');

			if (file.key != null) {
				key.innerText = file.key;
			}

			name.innerText = file.name;
			name.classList.add('name');

			row.appendChild(key);
			row.appendChild(name);

			container.appendChild(row);
		}

		if (this.bin.length > 0) {
			this.removeClass(this.binElement.querySelector('table'), 'hide');
		}
		
		this.ui.overlay.hide();
	}

	public async create () {
		const options : any = {
			title: 'New Timeline',
  			input: 'text',
  			inputValue: '255',
  			inputLabel: 'Length of your timeline (frames)',
  			inputPlaceholder: '255'
		};

		let res : string;
		let confirmRes : any;
		let len : number;

		this.changeSelected(0);
		this.createBtn.blur();

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
			res = await this.prompt(options);
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

		if (len > 0) {
			this.playBtn.removeAttribute('disabled');
		} else {
			this.playBtn.setAttribute('disabled', 'disabled');
		}

		this.removeClass(this.addBtn,'hide');
		this.removeClass(this.removeBtn, 'hide');

		this.layout();
	}

	private async prompt (options : PromptConfig) : Promise<string>{
		let res : any;

		try {
			//@ts-ignore
			res = await Swal.fire(options);
		} catch (err) {
			console.error(err);
		}

		return res.value;
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
				this.counter.value = String(i);
			}

			if (this.timeline[i] != null) {
				bi = this.getById(this.timeline[i].id);
				frame.innerText = bi.key;
			}

			if (this.selectState.start !== -1 && (this.selectState.active || this.selectState.start !== this.selectState.end) ) {
				if (i >= this.selectState.start && i <= this.selectState.end) {
					frame.classList.add('group');
				}
			}

			between = document.createElement('div');
			between.classList.add('btw');
			between.setAttribute('x', String(i));

			container.appendChild(frame);
			container.appendChild(between);
		}
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

	public playFrame ( key : string, loop : boolean = false) {
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
			if (loop) {
				this.playing[key].loop = true;
			}
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
		if (this.previewState.displaying) {
			this.addClass(this.previewVideo, 'hide');
			this.previewState.displaying = false;
		}
		this.display.setAttribute('src', filePath);
		this.removeClass(this.display, 'hide')
	}

	public stopDisplay () {
		this.addClass(this.display, 'hide');
		this.display.setAttribute('src', '#');
	}

	private addTimeline () {
		let bi : BinImage;
		this.addTimelineBtn.blur();
		if (this.selectedBin != null) {
			bi = this.getById(this.selectedBin);
			this.assignFrame(this.selectedBin, this.selected, this.stepSize);
			if (this.selected + this.stepSize <= this.timeline.length - 1) {
				this.selectFrame(this.selected + this.stepSize);
			} else {
				this.selectFrame(this.timeline.length - 1);
			}
		}
		if (!this.selectState.active && this.selectState.start !== -1) {
			this.clearSelect();
		}
		//console.log(`${this.selected} = ${bi.id}`)
	}

	public assignFrame (id : string, x : number, count : number = 1) {
		for (let i = 0; i < count; i++) {
			if (typeof this.timeline[x + i] !== 'undefined') {
				if (id != null) {
					this.timeline[x + i] = { id };
				} else {
					this.timeline[x + i] = null;
				}
				
			}
		}
		this.layout();
	}

	public deleteFrame (  ) {
		if (this.timeline.length === 0) {
			return false;
		}
		this.timeline[this.selected] = null;
		this.changeSelected(this.selected - 1);
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

	public preview () : any {
		const timeline : string[] = this.timeline.map((step : TimelineStep) => (step && step.id) ? step.id : null );
		const width : number = this.theatre.clientWidth;
		const height : number = this.theatre.clientHeight;
		return { timeline, width, height };
	}

	public playPreview () {
		if (this.previewState.playing) {
			this.pause();
		} else {
			this.checkPreview();
		}
	}

	private previewEnded () {
		this.pause();
	}

	private checkPreview () {
		let newHash : number = this.hash();
		if (this.previewState.hash !== newHash) {
			this.previewState.hash = newHash;
			if (!this.previewState.rendering) {
				this.previewState.rendering = true;
				this.stopDisplay();
				this.playBtn.setAttribute('disabled', 'disabled');
				showSpinner('tSyncSpinner', 'small');
				this.addClass(this.playBtn, 'rendering');
				this.onPreview();
			}
		} else if (this.previewState.hash === newHash && this.previewState.hash !== 0) {
			if (this.previewState.playing) {
				this.pause();
			} else {
				this.play();
			}
		}
	}

	public onPreviewComplete (args : any) {
		const source : HTMLSourceElement = document.createElement('source') as HTMLSourceElement;
		this.previewState.rendering = false;
		this.previewVideo.innerHTML = '';
		source.setAttribute('src', `${args.tmpVideo}?hash=${this.previewState.hash}`);
		this.previewVideo.appendChild(source);
		this.previewVideo.load();
		hideSpinner('tSyncSpinner');
		this.playBtn.removeAttribute('disabled');
		this.removeClass(this.playBtn, 'rendering');
		this.play();
	}

	private toggleLoop () {
		this.loopBtn.blur();
		if (this.previewState.loop) {
			this.previewState.loop = false;
			this.loopBtn.innerText = 'Loop: OFF';
			this.previewVideo.removeAttribute('loop');
		} else {
			this.previewState.loop = true;
			this.loopBtn.innerText = 'Loop: ON';
			this.previewVideo.setAttribute('loop', 'loop');
		}
	}
	private startInterval () {
		this.previewInterval = setInterval(this.previewIntervalFunction.bind(this), 41);
	}

	private previewIntervalFunction () {
    	const time : number = this.previewVideo.currentTime / this.previewVideo.duration;
    	let x : number = Math.floor(time * this.timeline.length);
    	x = x === -0 ? 0 : x; //catch -0 values (thanks Javascript!)
		this.removeClassAll('.frame.playing', 'playing');
		this.addClass(document.querySelector(`.frame[x="${x}"]`), 'playing');
		this.counter.value = String(x);
	}

	public play () {
		if (!this.previewState.displaying) {
			this.stopDisplay();
			this.removeClass(this.previewVideo, 'hide');
			this.previewState.displaying = true;
		}

		this.previewState.playing = true;
		this.addClass(this.playBtn, 'playing');
		this.previewVideo.play();
		this.startInterval();
	}

	public pause () {
		this.previewVideo.pause();
		this.previewState.playing = false;
		this.removeClass(this.playBtn, 'playing');
		try {
			clearInterval(this.previewInterval);
		} catch (err) {
			//
		}
		this.removeClassAll('.frame.playing', 'playing');
		this.counter.value = String(this.selected);
	}

	private binDragStart (evt: DragEvent) {
		const id : string = (evt.target as HTMLElement).getAttribute('id');
		const bi : BinImage = this.getById(id);
		const canvas : HTMLCanvasElement = document.createElement('canvas');
  		canvas.width = canvas.height = 50;
		const ctx : CanvasRenderingContext2D = canvas.getContext('2d');

		ctx.font = '12px serif';
		ctx.textAlign = 'left';
		ctx.fillText(bi.key != null ? bi.key : '?', 25, 10);
		ctx.stroke();
  		evt.dataTransfer.setDragImage(canvas, 25, 25);

		//evt.dataTransfer.setData("text/plain", bi.key != null ? bi.key : '?');
		this.selectBinImage(bi.id);
		this.displayFrame(bi.file);
		this.dragState.dragging = true;
	}

	private binDragEnter (evt : DragEvent) {
		let x : number;
		if (this.dragState.dragging) {
			x = parseInt((evt.target as HTMLElement).getAttribute('x'), 10);
			this.dragState.target = x;
			if (this.dragState.group) {

			} else {
				this.selectFrameGroup(x, this.stepSize, this.selectedBin);
			}
		}
	}

	private binDragLeave (evt : DragEvent) {
		if ((evt.target as HTMLElement).id === 'tWrapper' && this.dragState.dragging) {
			this.dragState.target = null;
			this.layout();
		}
	}

	private binDragEnd (evt: DragEvent) {
		let selectAfter : number = 0;
		if (this.dragState.dragging && this.dragState.target != null) {
			console.log('binDragEnd');
			selectAfter = this.dragState.target + this.stepSize;
			if (selectAfter >= this.timeline.length) {
				selectAfter = this.timeline.length - 1;
			}
			this.selectFrame(selectAfter);
			this.assignFrame(this.selectedBin, this.dragState.target, this.stepSize);
		}
		this.dragState.target = null;
		this.dragState.dragging = false;
	}

	private startSelect () {
		if (typeof this.timeline[this.selected] !== 'undefined') {
			console.log('startSelect')
			console.log(this.selected);
			this.selectState.start = this.selected;
			this.selectState.end = this.selected;
			this.selectState.active = true;
		} else {
			this.selectState.start = -1;
		}
		this.layout();
	}

	private clickSelect (evt : MouseEvent) {
		let target : HTMLElement;
		let x : number;
		if (this.selectState.active && this.selectState.start !== -1) {
			console.log('clickSelect')
			target = evt.target as HTMLElement;
			x = parseInt( target.getAttribute('x'), 10 );
			if (x !== this.selectState.start) {
				if (x < this.selectState.start) {
					this.selectState.end = this.selectState.start + 0;
					this.selectState.start = x;
					this.selectFrame(x);
				} else if (x > this.selectState.start) {
					this.selectState.end = x;
				}
			} else {
				this.selectState.end = -1;
			}
			this.layout();
		}
	}

	private endSelect () {
		console.log('endSelect');
		this.selectState.active = false;
		if (this.selectState.end !== -1) {
			this.layout();
		}
	}

	private clearSelect () {
		console.log('clearSelect');
		this.selectState.start = -1;
		this.selectState.end = -1;
		this.selectState.active = false;
		this.layout();
	}

	private copy () {
		console.log('copy');
		this.copyState.cut = false;
		if (this.selectState.start !== -1) {
			//copy selected 
			this.copyState.timeline = [ ];
			for (let x = this.selectState.start; x < this.selectState.end + 1; x++) {
				this.copyState.timeline.push(this.timeline[x]);
			}
		} else {
			//copy single selected frame
			this.copyState.timeline = [ this.timeline[this.selected] ];
		}
		console.log(this.copyState.timeline);
	}

	private cut () {
		console.log('cut');
		let stepSize : number;
		this.copy();
		this.copyState.cut = true;
		if (this.selectState.start !== -1) {
			stepSize = (this.selectState.end - this.selectState.start) + 1;
			this.assignFrame(null, this.selectState.start, stepSize);
			this.copyState.cutLocation = this.selectState.start;
		} else {
			this.assignFrame(null, this.selected, 1);
			this.copyState.cutLocation = this.selected;
		}
		this.layout();
	}

	private paste () {
		console.log('paste');
		let startFrame : number = 0;
		let frame : string;

		if (this.selectState.start !== -1) {
			startFrame = this.selectState.start;
		} else {
			startFrame = this.selected;
		}

		for (let i = 0; i < this.copyState.timeline.length; i++) {
			if (startFrame + i === this.timeline.length) {
				break;
			}
			frame = this.copyState.timeline[i] != null ? this.copyState.timeline[i].id : null;
			this.assignFrame(frame, startFrame + i, 1);
		}

		this.clearSelect();
	}

	private frameDragStart (evt : DragEvent) {
		const target : HTMLElement = evt.target as HTMLElement;
		let x : number;

		if (!target || !target.classList.contains('frame')) {
			return false;
		}
		if (target.classList.contains('group')) {
			return false;
		}

		x = parseInt(target.getAttribute('x'), 10);
		this.dragState.frame = true;
		this.dragState.group = false;
		this.copyState.cutLocation = x;
		this.copyState.timeline = [ this.timeline[x] ];
	}

	//override frame select
	private groupDragStart (evt : DragEvent) {
		const target : HTMLElement = evt.target as HTMLElement;
		let x: number;

		if (!target || !target.classList.contains('frame')) {
			return false;
		}
		if (!target.classList.contains('group')) {
			return false;
		}
		x = this.selectState.start;

		this.dragState.group = true;
		this.dragState.frame = false;
		this.copyState.cutLocation = x;
		this.copyState.timeline = [];

		for (let i = this.selectState.start; i < this.selectState.end + 1; i++) {
			this.copyState.timeline.push(this.timeline[i]);
		}
	}

	private frameDragEnd (evt : DragEvent) {
		const target : HTMLElement = evt.target as HTMLElement;
		let x : number;
		let id : string;
		if (this.dragState.frame && !this.dragState.group) {
			console.log('frameDragEnd');
			if (target.classList.contains('frame')) {
				x = parseInt(target.getAttribute('x'), 10);
				this.assignFrame(null, this.copyState.cutLocation, 1);
				id = this.copyState.timeline[0] == null ? null : this.copyState.timeline[0].id;
				this.assignFrame(id, x, 1);
				this.changeSelected(x);
				this.layout();
			}
			this.dragState.frame = false;
			this.dragState.group = false;
			this.copyState.cut = false;
			this.copyState.cutLocation = -1;
			this.copyState.timeline = [];
		}
	}

	private groupDragEnter (evt : DragEvent) {
		const target : HTMLElement = evt.target as HTMLElement;
		let x : number;
		//console.log('groupDragEnter');
		if (this.dragState.group && !this.dragState.frame) {
			x = parseInt(target.getAttribute('x'), 10);
			this.removeClassAll('.frame.selected', 'selected');
			for (let i = 0; i < this.copyState.timeline.length; i++) {
				this.addClass(document.querySelector(`.frame[x="${x + i}"]`), 'selected');
			}
		}
	}

	private groupDragLeave (evt : DragEvent) {
		//const target : HTMLElement = evt.target as HTMLElement;
		//let x : number;
		//console.log('groupDragLeave');
		if (this.dragState.group && !this.dragState.frame) {
			this.removeClassAll('.frame.selected', 'selected');
		}
	}

	private groupDragEnd (evt : DragEvent) {
		const target : HTMLElement = evt.target as HTMLElement;
		let x : number;
		let id : string;
		if (this.dragState.group && !this.dragState.frame) {
			if (this.selectState.start !== -1) {
				x = parseInt(target.getAttribute('x'), 10);
				for (let i = 0; i < this.copyState.timeline.length; i++) { 
					id = this.copyState.timeline[i] == null ? null : this.copyState.timeline[i].id;
					this.assignFrame(null, this.copyState.cutLocation + i, 1);
					this.assignFrame(id, x + i, 1);
				}
				this.changeSelected(x + this.copyState.timeline.length);
				this.clearSelect();
				this.layout();
			} 
			this.dragState.group = false;
			this.dragState.frame = false;
			this.copyState.cut = false;
			this.copyState.timeline = [];
		}
	}

	private changeSelected (x : number) {
		this.selected = x;
		this.counter.value = String(x);
	}
}
