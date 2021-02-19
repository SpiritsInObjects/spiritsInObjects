'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class UI {
    constructor(state) {
        this.startSelect = document.getElementById('startSelect');
        this.endSelect = document.getElementById('endSelect');
        this.theatre = document.getElementById('theatre');
        this.endMoving = false;
        this.startMoving = false;
        this.width = 1280;
        this.height = 720;
        this.min = 0;
        this.max = 720;
        this.start = 0.72;
        this.end = 1.0;
        this.state = state;
        this.startSelect.addEventListener('mousedown', this.beginMoveStart.bind(this), false);
        this.endSelect.addEventListener('mousedown', this.beginMoveEnd.bind(this), false);
        document.addEventListener('mousemove', this.moveStart.bind(this), false);
        document.addEventListener('mousemove', this.moveEnd.bind(this), false);
        document.addEventListener('mouseup', this.endMoveStart.bind(this), false);
        document.addEventListener('mouseup', this.endMoveEnd.bind(this), false);
        this.theatreHeight = this.theatre.offsetHeight;
        this.theatreWidth = this.theatre.offsetWidth;
    }
    beginMoveStart(evt) {
        this.startMoving = true;
    }
    endMoveStart(evt) {
        const scale = this.height / this.theatreHeight;
        const scaledWidth = this.width / scale;
        const start = (this.startSelect.offsetLeft - this.min) / scaledWidth;
        this.startMoving = false;
        this.start = start;
        this.state.set('start', start);
        this.state.save();
        if (this.onSelectionChange)
            this.onSelectionChange();
    }
    moveStart(evt) {
        let width;
        let leftX;
        let newLeftX;
        let maxX;
        let ratio;
        let scale;
        let scaledWidth;
        let percent;
        if (this.startMoving) {
            width = this.theatre.clientWidth;
            leftX = this.theatre.offsetLeft;
            maxX = this.endSelect.offsetLeft - 1;
            newLeftX = evt.pageX - leftX;
            if (newLeftX <= this.min) {
                newLeftX = this.min;
            }
            if (newLeftX >= maxX) {
                newLeftX = maxX;
            }
            ratio = newLeftX / width;
            this.startSelect.style.left = `${ratio * 100}%`;
            scale = this.height / this.theatreHeight;
            scaledWidth = this.width / scale;
            percent = Math.round(((this.startSelect.offsetLeft - this.min) / scaledWidth) * 100) + '%';
        }
    }
    beginMoveEnd(evt) {
        this.endMoving = true;
    }
    endMoveEnd(evt) {
        const scale = this.height / this.theatreHeight;
        const scaledWidth = this.width / scale;
        const end = (this.endSelect.offsetLeft - this.min) / scaledWidth;
        this.endMoving = false;
        this.end = end;
        this.state.set('end', end);
        this.state.save();
        if (this.onSelectionChange)
            this.onSelectionChange();
    }
    moveEnd(evt) {
        let width;
        let leftX;
        let newLeftX;
        let minX;
        let ratio;
        let scale;
        let scaledWidth;
        let percent;
        if (this.endMoving) {
            width = this.theatre.clientWidth;
            leftX = this.theatre.offsetLeft;
            minX = this.startSelect.offsetLeft + 1;
            newLeftX = evt.pageX - leftX;
            if (newLeftX <= minX) {
                newLeftX = minX;
            }
            if (newLeftX >= this.max) {
                newLeftX = this.max;
            }
            ratio = newLeftX / width;
            this.endSelect.style.left = `${ratio * 100}%`;
            scale = this.height / this.theatreHeight;
            scaledWidth = this.width / scale;
            percent = Math.round(((this.endSelect.offsetLeft - this.min) / scaledWidth) * 100) + '%';
        }
    }
    updateSliders(width, height) {
        let ratio;
        let scale;
        let scaledWidth;
        this.start = this.state.get('start');
        this.end = this.state.get('end');
        this.width = width;
        this.height = height;
        scale = this.height / this.theatreHeight;
        scaledWidth = this.width / scale;
        this.min = Math.round((this.theatreWidth - scaledWidth) / 2);
        this.max = this.min + Math.round(scaledWidth);
        ratio = (this.min + (scaledWidth * this.start)) / this.theatreWidth;
        this.startSelect.style.left = `${ratio * 100}%`;
        ratio = (this.min + (scaledWidth * this.end)) / this.theatreWidth;
        this.endSelect.style.left = `${ratio * 100}%`;
    }
    changePage(name) {
        //document.querySelector('.page')
    }
}
exports.default = UI;
//# sourceMappingURL=index.js.map