'use strict';

const electronPrompt = require('electron-prompt');

interface TimelineStep {
	image : string;
	audio : string;
	ref ? : string;
}

class Timeline {
	private canvas : HTMLCanvasElement = document.getElementById('tCanvas') as HTMLCanvasElement;
	private binElement : HTMLElement = document.getElementById('tBin');
	private timelineElement : HTMLElement = document.getElementById('tElement');

	private createBtn : HTMLButtonElement = document.getElementById('tCreate') as HTMLButtonElement;
	private addBtn : HTMLButtonElement = document.getElementById('tAdd') as HTMLButtonElement;

	private timeline : TimelineStep[] = [];
	private length : number = 0;
	private current : number = 0;
	private lastDir : string = '';

	//playButton
	//exportButton

	constructor () {
		this.bindListeners();
	}

	private bindListeners () {
		this.binElement.addEventListener('click', this.openFiles.bind(this));
		this.createBtn.addEventListener('click', this.create.bind(this));
	}

	private async openFiles () {
        const options : any = {
            title: `Select video, image or audio file`,
            properties: [`openFile`],
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

        for (let file of files.filePaths) {
        	console.log(files.filePaths);
        }
        
	}

	public async create () {
		const options : any = {
			title: 'New timeline',
			label: 'Number of frames:',
			value: '0',
			customStylesheet : 'dist/css/style.css',
			inputAttrs: {
				type: 'number'
			},
			type: 'input'
		};

		let res : string;
		let confirmRes : number;
		let len : number;

		//if (this.timeline.length > 0) {
			try{
				confirmRes = await this.confirm();
			} catch (err) {
				console.error(err);
				return false;
			}
			console.log('got here');
			console.log(confirmRes);
		//}

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

	private confirm () : Promise <number> {
		const options = {
			type: 'question',
			buttons: ['Cancel', 'Yes, please'],
			defaultId: 0,
			title: 'New timeline',
			message: 'Are you sure you want to create a new timeline?',
			detail: 'This will erase your current timeline'
		};
		return new Promise( (resolve, reject) => {
			//@ts-ignore
			return dialog.showMessageBox(null, options, ( res ) => {
				console.log('got to callback')
				return resolve(res);
			});
		});
	}

	private layout ( len : number ) {
		const container : HTMLElement = document.getElementById('tWrapper');

		container.innerHTML = '';
		this.timeline = [];

		for (let i = 0; i < len; i++) {

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
