'use strict';

import { tmpdir } from 'os';
import { join } from 'path';
import { readdir, mkdir, unlink, copy, createWriteStream, writeFile } from 'fs-extra';
import savePixels from 'save-pixels';
import ndarray from 'ndarray';
import type { NdArray } from 'ndarray';
import { WaveFile } from 'wavefile';
import { v4 as uuid } from 'uuid';

/* class representing Timeline composer features */
export class Timeline{
	private ffmpeg : any;
	public tmpDir : string = join(tmpdir(), 'siotimeline');
	public binDir : string = join(tmpdir(), 'siobin');
	private cancelled : boolean = false;

	/**
	 * @constructor
	 * 
	 * Create Timeline class and assign ffmpeg as private member class
	 * 
	 * @param {object} ffmpeg 	ffmpeg class
	 **/
	constructor (ffmpeg : any) {
		this.ffmpeg = ffmpeg;
		this.initDirs();
	}

	/**
	 * Initialize temporary directories used by Timeline class
	 * for storing exported frames, audio and video.
	 * 
	 * @returns {boolean} Whether initialization process is successful
	 **/
	private async initDirs () : Promise<boolean> {
		let dirs : string[] = [ this.tmpDir, this.binDir ];

		for (let dir of dirs) {
			try {
				await this.makeTmp(dir);
			} catch (err) {
				console.error(err);
				return false;
			}

			try {
				await this.emptyTmp(dir);
			} catch (err) {
				console.error(err);
				return false;
			}
		}

		return true;
	}

	/**
	 * Creates a temporary directory.
	 * 
	 * @param {string} dir 		Path of directory
	 * 
	 * @returns {boolean} 	Wheter creation is successful
	 **/
	private async makeTmp (dir : string) : Promise<boolean> {
		try {
			await mkdir(dir, { recursive: true });
		} catch (err) {
			console.error(err);
			return false;
		}
		return true;
	}

	/**
	 * Erase all files in a directory.
	 * 
	 * @param {string} dir 		Path of dir to empty
	 * 
	 * @returns {boolean} Whether erasing directory was successful
	 **/
	private async emptyTmp (dir : string) : Promise<boolean> {
		let files : string[];

		try {
			files = await readdir(dir);
		} catch (err) {
			throw err;
			return false;
		}

		for (const file of files) {
			try {
				await unlink( join(dir, file) );
			} catch (err) {
				throw err;
				return false;
			}
		}
		return true;
	}

	/**
	 * Export a frame using data from the canvas in the renderer process.
	 * This is used to normalize JPEG files as PNG so the export
	 * is done using all of the same file type.
	 * 
	 * @param {string} id 		UUID of file to export
	 * @param {array} data 		Raw pixel data of the image
	 * @param {number} width 	Width of image to create
	 * @param {number} height   Height of image to create
	 * 
	 * @returns {string} Path of newly-created file
	 **/
	public async exportFrame (id : string, data : any[], width : number, height : number) : Promise<string> {
		const framePath : string = join(this.binDir, `${id}.png`);
		const nd : NdArray = ndarray(data, [width, height, 4], [4, width * 4, 1]);

		return new Promise((resolve : Function, reject: Function) => {
			const stream : any = createWriteStream(framePath);

			stream.on('finish', function() {
				stream.close(() => {
					resolve(framePath);
				});
			});

			stream.on('error', async (err : Error) => {
				try {
					await unlink(framePath);
				} catch (err) {
					console.error(err);
				}
				reject(err);
			});

			savePixels(nd, 'PNG').pipe(stream);
		});
	}

	/**
	 * Copy frame from original location to a tmp directory.
	 * This ensures that files are accessible for Timeline export
	 * even if original drive is disconnected. Also makes the 
	 * stitching process simpler by having all files named by UUID
	 * rather than original path name.
	 * 
	 * @param {string} id  			UUID of file to copy
	 * @param {string} filePath 	Path of original file
	 * 
	 * @returns {string} Path of newly-copied file
	 **/
	public async copyFrame (id : string, filePath : string) : Promise<string> {
		const framePath : string = join(this.binDir, `${id}.png`);
		try {
			await copy(filePath, framePath);
		} catch (err) {
			console.error(err);
		}
		return framePath;
	}

	/**
	 * Export audio from a sonified image as a standard 96kHz sample.
	 * 
	 * @param {string} id 		UUID of file that was sampled
	 * @param {array} samples   Samples to create WAVE file from
	 * 
	 * @returns {string} Path to new audio file
	 **/
	public async exportAudio (id : string, samples: Float32Array) : Promise<string> {
		const audioPath : string = join(this.binDir, `${id}-raw.wav`);
		const resamplePath : string = join(this.binDir, `${id}.wav`);
		const wav : any = new WaveFile();

		wav.fromScratch(1, samples.length * 24, '32f', samples);

		try {
			await writeFile(audioPath, wav.toBuffer());
		} catch (err) {
			console.error(err);
		}

		try {
			await this.ffmpeg.resampleAudio(audioPath, resamplePath,  96000, 1);
		} catch (err) {
			console.error(err);
		}

		try {
			await unlink(audioPath);
		} catch (err) {
			console.error(err);
		}

		return resamplePath;
	}

	/**
	 * Populates directory with frames in the order
	 * that they appear in the timeline sequence. Copies
	 * images from bin to a numbered temporary file.
	 * 
	 * @param {array} timeline 		List of UUIDs of frames
	 * 
	 * @returns {boolean} Whether files were successfully copied
	 **/
	public async images ( timeline: string[] ) : Promise <boolean> {
		let frameNumber : number = 0;
		let paddedNum : string;
		let binPath : string;
		let framePath : string;
		let ext : string = 'png';

		for (let frame of timeline) {
			if (frame == null) {
				frame = 'blank';
			}
			paddedNum = `${frameNumber}`.padStart(8, '0');
			framePath = join(this.tmpDir, `${paddedNum}.${ext}`);
			binPath = join(this.binDir, `${frame}.${ext}`);

			try {
				await copy(binPath, framePath);
			} catch (err) {
				console.error(err);
				return false;
			}

			frameNumber++;
			if (this.cancelled) {
				this.cancelled = false;
				return false;
			}
		}

		return true;
	}

	/**
	 * Populates directory with audio samples in the order they
	 * are to be stitched together. Copies samples from bin similar to
	 * images() method.
	 * 
	 * @param {array} timeline 	List of UUIDs of samples
	 *  
	 * @returns {boolean} Whether files were successfully copied
	 **/
	public async audio ( timeline: string[] ) : Promise <string[]> {
		let frameNumber : number = 0;
		let paddedNum : string;
		let binPath : string;
		let framePath : string;
		let ext : string = 'wav';
		let fileList : string[] = [];

		for (let frame of timeline) {
			if (frame == null) {
				frame = 'silence';
			}
			paddedNum = `${frameNumber}`.padStart(8, '0');
			framePath = join(this.tmpDir, `${paddedNum}.${ext}`);
			binPath = join(this.binDir, `${frame}.${ext}`);

			try {
				await copy(binPath, framePath);
			} catch (err) {
				console.error(err);
				return;
			}

			fileList.push(framePath);

			frameNumber++;
			if (this.cancelled) {
				this.cancelled = false;
				return;
			}
		}

		return fileList;
	}

	/**
	 * Exports Timeline as a prores video with audio.
	 * 
	 * @param {array} timeline 			List of UUIDs representing the timeline sequence
	 * @param {string} tmpVideo 		Path of video to create
	 * @param {Function} onProgress 	Callback for export progress
	 * 
	 * @returns {boolean} Whether export process was successful
 	 **/
	public async export (timeline : string[], tmpVideo : string, onProgress : Function) : Promise <boolean> {
		const id : string = uuid();
		const tmpAudio : string = join(this.tmpDir, `${id}.wav`);
		const framesPath : string = join(this.tmpDir, `%08d.png`);
		let success : boolean = false;
		let audioList : string[];

		try {
			await this.emptyTmp(this.tmpDir);
		} catch (err) {
			console.error(err);
			return false;
		}

		success = await this.images(timeline);
		if (!success) return success;

		audioList = await this.audio(timeline);
		if (!audioList) {
			success = false;
			return success;
		}

		await this.ffmpeg.concatAudio(audioList, tmpAudio, onProgress);

		await this.ffmpeg.exportVideo(framesPath, tmpVideo, tmpAudio, 'prores3', onProgress);

		await unlink(tmpAudio);

		return success;

	}

	/**
	 * Generate a preview of a timeline for playback within the app.
	 * 
	 * @param {object} args 	Arguments from ipc containing timeline
	 * @param {string} tmpVideo	Path to temporary video
	 * 
	 * @returns {boolean} Whether preview generation was successful
	 **/
	public async preview (args : any, tmpVideo : string) : Promise <boolean> {
		const id : string = uuid();
		const timeline : string[] = args.timeline;
		const tmpAudio : string = join(this.tmpDir, `preview_${id}.wav`);
		const framesPath : string = join(this.tmpDir, `%08d.png`);
		const options :PreviewOptions = {
			width : args.width,
			height : args.height,
			audio : tmpAudio,
			forceScale : true,
			sequence : true
		};
		let success : boolean = false;
		let audioList : string[];

		try {
			await this.emptyTmp(this.tmpDir);
		} catch (err) {
			console.error(err);
			return false;
		}

		success = await this.images(timeline);
		if (!success) return success;

		audioList = await this.audio(timeline);
		if (!audioList) {
			success = false;
			return success;
		}

		await this.ffmpeg.concatAudio(audioList, tmpAudio, () => {});

		await this.ffmpeg.exportPreview(framesPath, tmpVideo, options);

		//await unlink(tmpAudio);

		return success;

	}

	/**
	 * Cancel timeline generation
	 **/
	public cancel () {
		this.cancelled = true;
	}

}

module.exports = { Timeline };