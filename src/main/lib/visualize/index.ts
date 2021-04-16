'use strict';

import savePixels from 'save-pixels';
import { tmpdir } from 'os';
import { v4 as uuid } from 'uuid';
import { join as pathJoin } from 'path';
import { mkdir, rmdir, createWriteStream, unlink } from 'fs-extra';
import ndarray from 'ndarray';

export class Visualize {
	private ffmpeg : any;
	private tmp : string;

	constructor (ffmpeg : any) {
		this.ffmpeg = ffmpeg;
	}

	public async processAudio (state : any, info : any, tmpAudio : string) {
		const filePath   : string = state.filePath;
		const fps        : number = typeof state.fps !== 'undefined' ? state.fps : 24;
		const height     : number = state.vHeight;
		const samplerate : number = height * fps;

		const stream : any = info.streams.find( (stream : any) => {
			if (typeof stream.codec_type !== 'undefined' && stream.codec_type === 'audio') {
				return true;
			}
			return false;
		});

		if (!stream) {
			throw new Error('No audio stream found');
		}

		try {
			await this.ffmpeg.resample(filePath, tmpAudio, samplerate, stream.channels);
		} catch (err) {
			throw err;
		}

		return true
	}

	public async exportFrame (frameNumber : number, data : any[], width : number, height : number) {
		const paddedNum = `${frameNumber}`.padStart(8, '0');
		const framePath = pathJoin(this.tmp, `${paddedNum}.png`);
		const nd : ndarray = ndarray(data, [width, height, 4], [4, width*4, 1]);

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

	public async startExport () {
		this.tmp = pathJoin(tmpdir(), uuid());
		try {
			await mkdir(this.tmp);
		} catch (err) {
			throw err;
		}
		return true;
	}

	public async endExport (onProgress : Function) {
		const inputPath : string = pathJoin(this.tmp, `%8d.png`);
		const tmpVideo : string = `${this.tmp}.mp4`;

		try {
			await this.ffmpeg.exportVideo(inputPath, tmpVideo, onProgress);
		} catch (err) {
			throw err;
		}

		try {
			//@ts-ignore
			await rmdir(this.tmp, { recursive : true });
		} catch (err) {
			throw err;
		}

		this.tmp = null;

		return tmpVideo;
	}
}

module.exports = { Visualize }