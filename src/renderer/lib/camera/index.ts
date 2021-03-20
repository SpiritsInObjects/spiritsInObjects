interface DeviceInfo {
    deviceId : string;
    label : string;
    kind : string
}

class Camera {
    private video : Video;
    private select : HTMLSelectElement;
    private stream : any;
    constructor (video : Video) {
        this.video = video;
        this.select = document.getElementById('videoSource') as HTMLSelectElement;
        this.select.onchange = this.getStream.bind(this);
        navigator.mediaDevices.enumerateDevices()
            .then(this.gotDevices.bind(this))
            .catch((err : Error) => { console.error(err) });
    }
    gotDevices(deviceInfos : DeviceInfo[]) {
        let deviceInfo : DeviceInfo;
        let option : HTMLOptionElement;
        for (let i = 0; i !== deviceInfos.length; ++i) {
            deviceInfo = deviceInfos[i];
            option = document.createElement('option');
            option.value = deviceInfo.deviceId;
            if (deviceInfo.kind === 'videoinput') {
                option.text = deviceInfo.label || 'camera ' + (this.select.length + 1);
                this.select.appendChild(option);
            }
            else {
                //console.log('Found another kind of device: ', deviceInfo);
            }
        }
    }
    getStream() {
        const constraints : MediaStreamConstraints = {
            //audio : {
            //    deviceId: false
            //},
            video: {
                deviceId: { 
                    exact: this.select.value 
                }
            }
        };
        if (typeof this.stream !== 'undefined') {
            this.stream.getTracks().forEach(function (track : any) {
                track.stop();
            });
        }
        navigator.mediaDevices.getUserMedia(constraints)
            .then(this.gotStream.bind(this))
            .catch((err : Error) => { 
                console.error(err) 
            });
    }
    gotStream(stream : MediaStream) {
        this.stream = stream; 
        this.video.stream(stream);
    }
}