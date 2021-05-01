import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, unlink } from 'fs-extra';
import { spawnAsync } from '../spawnAsync';

interface ProcessOutput {
	stdout? : string;
	stderr? : string;
}

class Fluidsynth {
	public installed : boolean = false;
	private bin : string = 'fluidsynth';
	private soundFont : string = './dist/contrib/Scc1t2.sf2';

	constructor () {
		this.checkInstallation();
	}

	private async checkInstallation () {
		const args : string[] = [ '--help' ];
		let res : ProcessOutput;

		try {
			console.log(`${this.bin} ${args.join(' ')}`);
			res = await spawnAsync(this.bin, args);
		} catch (err) {
			if (err.errno === 'ENOENT') {
				this.installed = false;
				console.log(`Fluidsynth is not installed`);
			} else {
				console.error(err);
			}
		}

		if (res && res.stdout) {
			this.installed = true;
			console.log(`Fluidsynth is installed`);
		}
	}

	public async render (midiPath : string, outputPath : string, sampleRate : number = 25920) : Promise<any> {
		const args : string[] = [
			'--chorus', 'no',
			'--reverb', 'no',
			'--gain', '0.6', //?
			'-L', '1',
			'-r', `${sampleRate}`,
			'-F', outputPath, this.soundFont, midiPath
		];
		let res : ProcessOutput;

		if (!this.installed) {
			console.log(`Fluidsynth is not installed`)
			return
		}

		try {
			console.log(`${this.bin} ${args.join(' ')}`);
			res = await spawnAsync(this.bin, args);
		} catch (err) {
			console.error(`${this.bin} ${args.join(' ')}`);
			throw err;
		}

		return outputPath
	}
}

export const fluidsynth : Fluidsynth = new Fluidsynth();

module.exports.fluidsynth = fluidsynth;