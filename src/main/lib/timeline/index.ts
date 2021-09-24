'use strict';

import { tmpdir } from 'os';
import { join } from 'path';
import { readdir, mkdir, unlink, copy, createWriteStream, writeFile } from 'fs-extra';
import savePixels from 'save-pixels';
import ndarray from 'ndarray';
import type { NdArray } from 'ndarray';
import { WaveFile } from 'wavefile';
import { v4 as uuid } from 'uuid';

export class Timeline{
	private ffmpeg : any;
	public tmpDir : string = join(tmpdir(), 'siotimeline');
	public binDir : string = join(tmpdir(), 'siobin');
	private cancelled : boolean = false;

	constructor (ffmpeg : any) {
		this.ffmpeg = ffmpeg;
		this.initDirs();
	}

	private async initDirs () {
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
	}

	private async makeTmp (dir : string) {
		try {
			await mkdir(dir, { recursive: true });
		} catch (err) {
			console.error(err);
		}
	}

	private async emptyTmp (dir : string) {
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
	}

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

	public async copyFrame (id : string, filePath : string) : Promise<string> {
		const framePath : string = join(this.binDir, `${id}.png`);
		try {
			await copy(filePath, framePath);
		} catch (err) {
			console.error(err);
		}
		return framePath;
	}

	public async exportAudio (id : string, samples: Float32Array) : Promise<string> {
		const audioPath : string = join(this.binDir, `${id}.wav`);
		const wav : any = new WaveFile();

		wav.fromScratch(1, samples.length * 24, '32f', samples);

		try {
			await writeFile(audioPath, wav.toBuffer());
		} catch (err) {
			console.error(err);
		}

		return audioPath;
	}

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

	public async preview (args : any, tmpVideo : string) : Promise <boolean> {
		const id : string = uuid();
		const timeline : string[] = args.timeline;
		const tmpAudio : string = join(this.tmpDir, `preview_${id}.wav`);
		const framesPath : string = join(this.tmpDir, `%08d.png`);
		const options :PreviewOptions = {
			width : args.width,
			height : args.height,
			audio : tmpAudio,
			forceScale : true
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

		await this.ffmpeg.exportPreview (framesPath, tmpVideo, options);

		await unlink(tmpAudio);

		return success;

	}

	public cancel () {
		this.cancelled = true;
	}

}

module.exports = { Timeline };