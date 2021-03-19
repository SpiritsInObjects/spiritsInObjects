"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fluidsynth = void 0;
const child_process_1 = require("child_process");
async function spawnAsync(bin, args) {
    return new Promise((resolve, reject) => {
        const child = child_process_1.spawn(bin, args);
        let stdout = '';
        let stderr = '';
        child.on('exit', (code) => {
            if (code === 0) {
                return resolve({ stdout, stderr });
            }
            else {
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
    constructor() {
        this.installed = false;
        this.bin = 'fluidsynth';
        this.checkInstallation();
    }
    async checkInstallation() {
        let res;
        try {
            res = await spawnAsync(this.bin, ['--help']);
        }
        catch (err) {
            if (err.errno === 'ENOENT') {
                this.installed = false;
            }
            else {
                console.error(err);
            }
        }
        if (res && res.stdout) {
            this.installed = true;
            console.log(`Fluidsynth is installed`);
        }
    }
}
exports.fluidsynth = new Fluidsynth();
module.exports.fluidsynth = exports.fluidsynth;
//# sourceMappingURL=index.js.map