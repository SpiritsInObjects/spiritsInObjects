'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.killSubprocess = exports.spawnAsync = void 0;
const child_process_1 = require("child_process");
/**
 * Execute a command asyncronously using a Promise so that it can
 * be awaited without the same locking behavior that execSync does.
 *
 * @param {string} bin Path to binary
 * @param {array} args Array of arguments for command
 *
 * @returns {object} Standard outputs or just error
 **/
async function spawnAsync(bin, args) {
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(bin, args);
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
exports.spawnAsync = spawnAsync;
async function killSubprocess(sub) {
    return new Promise((resolve, reject) => {
        sub.on('close', () => {
            return resolve(null);
        });
        return sub.kill();
    });
}
exports.killSubprocess = killSubprocess;
module.exports.spawnAsync = spawnAsync;
module.exports.killSubprocess = killSubprocess;
//# sourceMappingURL=index.js.map