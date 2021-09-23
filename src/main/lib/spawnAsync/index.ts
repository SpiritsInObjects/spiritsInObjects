'use strict';

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

/**
 * Execute a command asyncronously using a Promise so that it can
 * be awaited without the same locking behavior that execSync does.
 * 
 * @param {string} bin Path to binary
 * @param {array} args Array of arguments for command
 * 
 * @returns {object} Standard outputs or just error
 **/

export async function spawnAsync (bin : string, args : string[]) : Promise<any> {
	return new Promise((resolve : Function, reject : Function) => {
        const child : ChildProcessWithoutNullStreams = spawn(bin, args);
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