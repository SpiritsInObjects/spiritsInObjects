declare module 'lib/menu';
declare module 'ffmpeg-static';
declare module 'ffprobe-static';
declare module 'get-pixels';
declare module 'save-pixels';
declare module 'lib/spawnAsync';

interface StdErr {
    frame : number;
    fps : number;
    time : string;
    speed : number;
    size : string;
    remaining? : number;
    progress? : number;
    estimated? : number;
}

interface PreviewOptions{
    width : number;
    height : number;
    audio? : string;
    forceScale? : boolean;
    sequence? : boolean;
}

interface ProcessOutput {
	stdout? : string;
	stderr? : string;
}
