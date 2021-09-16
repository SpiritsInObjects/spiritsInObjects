'use strict';

import { tmpdir } from 'os';
import { join } from 'path';
import { readdir, mkdir, unlink, copy, createWriteStream } from 'fs-extra';
import savePixels from 'save-pixels';
import ndarray from 'ndarray';

export class Timeline{
	private ffmpeg : any;
	private tmpDir : string = join(tmpdir(), 'siotimeline');
	private binDir : string = join(tmpdir(), 'siobin');

	constructor (ffmpeg : any) {
		this.ffmpeg = ffmpeg;
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

	public async exportFrame (id : string, data : any[], width : number, height : number) {
		const framePath : string = join(this.binDir, `${id}.png`);
		const nd : ndarray = ndarray(data, [width, height, 4], [4, width * 4, 1]);

		return new Promise((resolve : Function, reject: Function) => {
			const stream : any = createWriteStream(framePath);

			stream.on('finish', function() {
				stream.close(() => {
					resolve(true);
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

	public async copyFrame (id : string, filePath : string) {
		const framePath : string = join(this.binDir, `${id}.png`);
		try {
			await copy(filePath, framePath);
		} catch (err) {
			console.error(err);
			return false;
		}
	}

	public async images ( bin : any, timeline: string[] ) {
		let frameNumber : number = 0;
		let paddedNum : string;
		let framePath : string;
		let ext : string = 'png';
		let dirs : string[] = [ this.tmpDir ];

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

		for (let frame of timeline) {
			paddedNum = `${frameNumber}`.padStart(8, '0');
			framePath = join(this.tmpDir, `${paddedNum}.${ext}`);

			try {
				await copy(bin[frame], framePath);
			} catch (err) {
				console.error(err);
				return false;
			}

			frameNumber++;
		}
	}

}

module.exports = { Timeline };