import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, unlink } from 'fs-extra';

interface ProcessOutput {
	stdout : string;
	stderr : string;
}

async function spawnAsync (bin : string, args : string[]) : Promise<ProcessOutput> {
	return new Promise((resolve : Function, reject : Function) => {
        const child = spawn(bin, args);
        let stdout = '';
        let stderr = '';
        child.on('exit', (code) => {
            if (code === 0) {
                return resolve({ stdout, stderr });
            } else {
                console.error(`Process exited with code: ${code}`);
                console.error(stderr);
                return reject(stderr);
            }
        });
        child.stdout.on('data', (data) => {
            stdout += data;
        });
        child.stderr.on('data', (data) => {
            stderr += data;
        });
        return child;
	});
}

class Fluidsynth {
	public installed : boolean = false;
	private bin : string = 'fluidsynth';
	constructor () {
		this.checkInstallation();
	}
	async checkInstallation () {
		let res : ProcessOutput;
		try {
			res = await spawnAsync(this.bin, [ '--help' ]);
		} catch (err) {
			if (err.errno === 'ENOENT') {
				this.installed = false;
			} else {
				console.error(err);
			}
		}
		if (res && res.stdout) {
			this.installed = true;
			console.log(`Fluidsynth is installed`);
		}
	}
}

export const fluidsynth : Fluidsynth = new Fluidsynth();

module.exports.fluidsynth = fluidsynth;