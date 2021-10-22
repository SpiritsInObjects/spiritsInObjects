
interface Midi {

}

interface Tone {
    
}

declare module 'smpte-timecode';

interface Timecode {
	
}

interface TimelineStep {
	id : string;
}

interface BinImage {
	id : string;
	file : string;
	name : string;
	index : number;
	key : string;
	samples : any;
}

interface PromptConfig{
	title : string;
	label : string;
	input : string;
	inputValue : string;
	inputLabel : string;
	inputPlaceholder : string;
}
