"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Visualize = void 0;
class Visualize {
    constructor(sox) {
        this.sox = sox;
    }
    async processAudio(state, info, tmpAudio) {
        const filePath = state.filePath;
        const fps = typeof state.fps !== 'undefined' ? state.fps : 24;
        const height = state.vHeight;
        const samplerate = height * fps;
        const stream = info.streams.find((stream) => {
            if (typeof stream.codec_type !== 'undefined' && stream.codec_type === 'audio') {
                return true;
            }
            return false;
        });
        if (!stream) {
            throw new Error('No audio stream found');
        }
        try {
            await this.sox.resample(filePath, tmpAudio, samplerate, stream.channels);
        }
        catch (err) {
            throw err;
        }
        return true;
    }
}
exports.Visualize = Visualize;
module.exports = { Visualize };
//# sourceMappingURL=index.js.map