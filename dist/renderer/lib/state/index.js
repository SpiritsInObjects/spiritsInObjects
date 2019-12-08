'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const path_1 = require("path");
class State {
    constructor() {
        this.localFile = path_1.join(os_1.homedir(), '');
        this.files = [];
        this.camera = null;
        this.start = .7;
        this.end = 1.0;
    }
    async save() {
    }
    async restore() {
    }
    async saveFile(filePath) {
    }
    async restoreFile(filePath) {
    }
}
//# sourceMappingURL=index.js.map