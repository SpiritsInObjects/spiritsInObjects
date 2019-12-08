"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Camera {
    constructor() {
        this.element = document.createElement('video');
        this.element.setAttribute('playsinline', 'true');
        this.element.setAttribute('webkit-playsinline', 'true');
        this.select = document.getElementById('videoSource');
        this.select.onchange = this.getStream.bind(this);
        navigator.mediaDevices.enumerateDevices()
            .then(this.gotDevices.bind(this))
            .then(this.getStream.bind(this))
            .catch((err) => { console.error(err); });
    }
    gotDevices(deviceInfos) {
        let deviceInfo;
        let option;
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
        const constraints = {
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
            this.stream.getTracks().forEach(function (track) {
                track.stop();
            });
        }
        navigator.mediaDevices.getUserMedia(constraints)
            .then(this.gotStream.bind(this))
            .catch((err) => { console.error(err); });
    }
    gotStream(stream) {
        this.stream = stream;
        if (typeof this.element.srcObject !== 'undefined') {
            this.element.srcObject = stream;
        }
        else {
            this.element.src = stream;
        }
    }
}
exports.Camera = Camera;
//# sourceMappingURL=index.js.map