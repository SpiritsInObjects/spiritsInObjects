'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnAsync = void 0;
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
exports.spawnAsync = spawnAsync;
module.exports.spawnAsync = spawnAsync;
//# sourceMappingURL=index.js.map