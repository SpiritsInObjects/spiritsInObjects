'use strict';

import { spawn } from 'child_process';

export async function spawnAsync (bin : string, args : string[]) {
	return new Promise((resolve : Function, reject : Function) => {
        const child : any = spawn(bin, args);
        let stdout : string = '';
        let stderr : string = '';
        child.on('exit', (code : number) => {
            if (code === 0) {
                return resolve({ stdout, stderr });
            } else {
                console.error(`Process exited with code: ${code}`);
                console.error(stderr);
                return reject(stderr);
            }
        });
        child.stdout.on('data', (data : string) => {
            stdout += data;
        });
        child.stderr.on('data', (data : string) => {
            stderr += data;
        });
        return child;
	});
}

export async function killSubprocess (sub : any) {
    return new Promise(( resolve : Function, reject : Function) => {
        sub.on('close', () => {
            return resolve(null);
        });
        return sub.kill();
    });
}

module.exports.spawnAsync = spawnAsync;
module.exports.killSubprocess = killSubprocess;