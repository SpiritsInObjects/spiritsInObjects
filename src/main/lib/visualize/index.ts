
export class Visualize {
	private sox : any;

	constructor (sox : any) {
		this.sox = sox;
	}

	async processAudio (state : any, info : any, tmpAudio : string) {
		const filePath : string = state.filePath;
		const fps : number = typeof state.fps !== 'undefined' ? state.fps : 24;
		const height : number = state.vHeight;
		const samplerate : number = height * fps;

		const stream : any = info.streams.find((stream : any) => {
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
		} catch (err) {
			throw err;
		}

		return true
	}
}

module.exports = { Visualize }