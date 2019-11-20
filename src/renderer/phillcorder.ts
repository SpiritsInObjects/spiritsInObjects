declare const samprate: any;
declare const Recorder: any;
declare const masterBuffer: AudioBuffer;

var createDownloadLink = function (buffer : AudioBuffer) {
    
    var worker = new Worker('../contrib/recorderWorker.js');
    // get it started and send some config data...
    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: samprate,
        numChannels: 1
      }
    });

    // pass it your full buffer...
    worker.postMessage({
      command: 'record',
      buffer: [
          buffer.getChannelData(0)
      ]
    });

    // ask it to export your WAV...
    worker.postMessage({
      command: 'exportWAV',
      type: 'audio/wav'
    });

    // force a download when it's done
    worker.onmessage = function(e){
        Recorder.forceDownload(e.data, 'SomeFileName.wav');
    };
};

(function () {
  $('#createDownload').on('click', function () {
		createDownloadLink(masterBuffer);
	});
})()