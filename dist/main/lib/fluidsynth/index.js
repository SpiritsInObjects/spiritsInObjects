"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fluidsynth = void 0;
const spawnAsync_1 = require("../spawnAsync");
class Fluidsynth {
    constructor() {
        this.installed = false;
        this.bin = 'fluidsynth';
        this.soundFont = './dist/contrib/Scc1t2.sf2';
        this.checkInstallation();
    }
    async checkInstallation() {
        const args = ['--help'];
        let res;
        try {
            console.log(`${this.bin} ${args.join(' ')}`);
            res = await spawnAsync_1.spawnAsync(this.bin, args);
        }
        catch (err) {
            if (err.errno === 'ENOENT') {
                this.installed = false;
                console.log(`Fluidsynth is not installed`);
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
    async render(midiPath, outputPath, sampleRate = 25920) {
        const args = [
            '--chorus', 'no',
            '--reverb', 'no',
            '--gain', '0.6',
            '-L', '1',
            '-r', `${sampleRate}`,
            '-F', outputPath, this.soundFont, midiPath
        ];
        let res;
        if (!this.installed) {
            console.log(`Fluidsynth is not installed`);
            return;
        }
        try {
            console.log(`${this.bin} ${args.join(' ')}`);
            res = await spawnAsync_1.spawnAsync(this.bin, args);
        }
        catch (err) {
            console.error(`${this.bin} ${args.join(' ')}`);
            throw err;
        }
        return outputPath;
    }
}
exports.fluidsynth = new Fluidsynth();
module.exports.fluidsynth = exports.fluidsynth;
//# sourceMappingURL=index.js.map