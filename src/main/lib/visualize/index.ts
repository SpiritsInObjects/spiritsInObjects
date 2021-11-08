'use strict';

import savePixels from 'save-pixels';
import { tmpdir } from 'os';
import { v4 as uuid } from 'uuid';
import { join as pathJoin } from 'path';
import { mkdir, rmdir, createWriteStream, unlink } from 'fs-extra';
import ndarray from 'ndarray';
import type { NdArray } from 'ndarray';

/* class representing visualization features */
export class Visualize {
	private ffmpeg : any;
	private tmp : string;
	private format : string;

	/**
	 * @constructor
	 * 
	 * Initialize the Visualize class with ffmpeg included 
	 * as member class.
	 * 
	 * @param {object} ffmpeg 		ffmpeg class
	 **/
	constructor (ffmpeg : any) {
		this.ffmpeg = ffmpeg;
	}

	/**
	 * Resample audio file for a specific height. Multiply the height by
	 * the framerate for the samplerate.
	 * 
	 * @param {object} state 			Options provided by ipc
	 * @param {object} info 			Info provided by ffprobe
	 * @param {string} tmpAudio     	Target audio file to create
	 * @param {Function} onProgress 	Callback on progress
	 * 
	 * @returns {boolean} Whether audio was successfully processed
	 **/
	public async processAudio (state : any, info : any, tmpAudio : string, onProgress : Function) : Promise<boolean> {
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
			await this.ffmpeg.resampleAudio(filePath, tmpAudio, samplerate, stream.channels, onProgress);
		} catch (err) {
			throw err;
		}

		return true;
	}

	/**
	 * Create a new image from raw image data created in Canvas on the renderer.
	 * 
	 * @param {number} frameNumber 		Frame to assign to new image
	 * @param {array} data 				Raw image data
	 * @param {number} width 			Width of image
	 * @param {number} height 			Height of image
	 * 
	 * @returns {boolean} Whether export was successful
	 **/
	public async exportFrame (frameNumber : number, data : any[], width : number, height : number) : Promise<boolean> {
		const paddedNum = `${frameNumber}`.padStart(8, '0');
		const framePath = pathJoin(this.tmp, `${paddedNum}.png`);
		const nd : NdArray = ndarray(data, [width, height, 4], [4, width*4, 1]);

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

	/**
	 * Create a directory to save new frames in and set the
	 * format of the video being created.
	 * 
	 * @param {string} format		Format of video
	 * 
	 * @returns {boolean} Whether directory was created
	 **/
	public async startExport (format : string) : Promise<boolean> {
		this.tmp = pathJoin(tmpdir(), uuid());
		this.format = format;

		try {
			await mkdir(this.tmp);
		} catch (err) {
			throw err;
		}

		return true;
	}

	/**
	 * Create a directory to save new frames in for a 
	 * preview
	 * 
	 * @returns {boolean} Whether directory was created
	 **/
	public async startPreview () : Promise<boolean> {
		this.tmp = pathJoin(tmpdir(), uuid());

		try {
			await mkdir(this.tmp);
		} catch (err) {
			throw err;
		}

		return true;
	}

	/**
	 * Invoked at the end of the export process to stitch
	 * frames into new video.
	 * 
	 * @param {Function} onProgress 	Callback for export process
	 * 
	 * @returns {string} Path to created video
	 **/
	public async endExport (onProgress : Function) : Promise<string> {
		const inputPath : string = pathJoin(this.tmp, `%8d.png`);
		let tmpVideo : string;
		let ext : string;
		
		if (this.format === 'prores3') {
			ext = 'mov';
		} else if (this.format === 'h264') {
			ext = 'mp4';
		}

		tmpVideo = `${this.tmp}.${ext}`;

		try {
			await this.ffmpeg.exportVideo(inputPath, tmpVideo, null, this.format, onProgress);
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

	/**
	 * Invoked at the end of the preview export process to stitch
	 * frames into new video.
	 * 
	 * @param {object} options			Options required by the ffmpeg.exportPreview() method
	 * @param {Function} onProgress 	Callback for export process
	 * 
	 * @returns {string} Path to created preview video
	 **/
	public async endPreview (options : any, onProgress : Function) {
		const inputPath : string = pathJoin(this.tmp, `%8d.png`);
		const ext : string = 'mp4';
		let tmpVideo : string;

		tmpVideo = `${this.tmp}.${ext}`;

		try {
			await this.ffmpeg.exportPreview(inputPath, tmpVideo, options, onProgress)
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