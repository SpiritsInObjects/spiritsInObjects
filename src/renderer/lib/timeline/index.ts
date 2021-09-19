'use strict';

const electronPrompt = require('electron-prompt');
const { extname } = require('path');
const uuid = require('uuid').v4;

interface TimelineStep {
	file : string;
	audio : string;
	ref : string;
}

interface BinImage {
	id : string;
	file : string;
	name : string;
	index : number;
	ref : string;
}

class Timeline {
	private canvas : HTMLCanvasElement = document.getElementById('tCanvas') as HTMLCanvasElement;
	private binElement : HTMLElement = document.getElementById('tBin');
	private timelineElement : HTMLElement = document.getElementById('tElement');

	private createBtn : HTMLButtonElement = document.getElementById('tCreate') as HTMLButtonElement;
	private addBtn : HTMLButtonElement = document.getElementById('tAdd') as HTMLButtonElement;

	private timeline : any[] = [];
	private bin : BinImage[] = [];
	private samples : any = {};
	private length : number = 0;
	private current : number = 0;
	private lastDir : string = '';
	private stepSize : number = 1;


	private exts : string[] = [ '.png', '.jpeg', '.jpg' ];
	private keys : string[] = [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
								'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
								'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ];

	//playButton
	//exportButton

	constructor () {
		this.bindListeners();
	}

	private bindListeners () {
		this.binElement.addEventListener('click', this.openBin.bind(this));
		this.createBtn.addEventListener('click', this.create.bind(this));
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

	public addToBin ( files : string[] ) {
		let bi : BinImage;
		let ref : string;
		let index : number;

		if ( !this.validate(files) ) {
        	return false;
        }

		for (let file of files) {
			if ( this.inBin(file) ) {
				continue;
			}
			index = this.bin.length;
			ref = typeof this.keys[index] !== 'undefined' ? this.keys[index] : null;
			bi = {
				id : uuid(),
				file,
				//@ts-ignore
				name : basename(file),
				index,
				ref
			}
			this.bin.push(bi);
		}

		this.layoutBin();
	}

	private inBin (filePath : string) {
		let match : BinImage = this.bin.find((item : BinImage) => {
			if (item.file === filePath) {
				return true;
			}
			return false;
		});
		return match != null;
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

			if (file.ref) {
				key.innerText = file.ref;
			}

			row.setAttribute('id', file.id);
			name.innerText = file.name;

			row.appendChild(key);
			row.appendChild(name);

			container.appendChild(row);
		}
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

		if (this.timeline.length > 0) {
			try{
				confirmRes = await this.confirm();
				console.log('got here');
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

		this.layout(len);
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

	private layout ( len : number ) {
		const container : HTMLElement = document.getElementById('tWrapper');
		let frame : HTMLElement;
		let between : HTMLElement;

		container.innerHTML = '';
		this.timeline = [];

		for (let i = 0; i < len; i++) {
			this.timeline.push(null);
			frame = document.createElement('div');
			frame.classList.add('frame');
			frame.setAttribute('draggable', 'true');
			frame.setAttribute('x', String(i));

			between = document.createElement('div');
			between.classList.add('btw');
			between.setAttribute('x', String(i));

			container.appendChild(frame);
			container.appendChild(between);
		}
	}

	public addFrame () {

	}

	public moveFrame () {

	}

	public expandFrame () {

	}

	public contractFrame () {

	}

	export () {

	}

	preview () {

	}

	play () {

	}
}
