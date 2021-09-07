'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class Overlay {
    constructor() {
        this.elem = document.getElementById('overlay');
        this.msg = document.getElementById('overlayMsg');
        this.progressBar = document.getElementById('overlayProgressBar');
        this.progressMsg = document.getElementById('overlayProgressMsg');
    }
    show(msg = '') {
        showSpinner('overlaySpinner');
        this.msg.innerText = msg;
        this.elem.classList.add('show');
    }
    hide() {
        try {
            this.elem.classList.remove('show');
        }
        catch (err) {
            console.error(err);
        }
        this.msg.innerText = '';
        hideSpinner('overlaySpinner');
    }
    progress(percent, msg) {
        this.progressMsg.innerText = msg;
        this.progressBar.style.width = `${percent * 100}%`;
    }
}
class UI {
    constructor(state) {
        this.startSelect = document.getElementById('startSelect');
        this.endSelect = document.getElementById('endSelect');
        this.startDisplay = this.startSelect.querySelector('.after');
        this.endDisplay = this.endSelect.querySelector('.after');
        this.theatre = document.getElementById('theatre');
        this.endMoving = false;
        this.startMoving = false;
        this.width = 1280;
        this.height = 720;
        this.min = 0;
        this.max = 996;
        this.start = 0.81;
        this.end = 1.0;
        this.currentPage = 'timeline';
        this.state = state;
        this.overlay = new Overlay();
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
        this.startSelect.classList.add('active');
    }
    endMoveStart(evt) {
        const scale = this.height / this.theatreHeight;
        const scaledWidth = this.width / scale;
        const start = (this.startSelect.offsetLeft - this.min) / scaledWidth;
        if (this.startMoving) {
            this.startMoving = false;
            try {
                this.startSelect.classList.remove('active');
            }
            catch (err) {
                //
            }
            this.start = start;
            this.state.set('start', start);
            if (this.onSelectionChange)
                this.onSelectionChange();
        }
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
            this.startDisplay.innerText = `${Math.floor(ratio * 100)}%`;
            scale = this.height / this.theatreHeight;
            scaledWidth = this.width / scale;
            percent = Math.round(((this.startSelect.offsetLeft - this.min) / scaledWidth) * 100) + '%';
        }
    }
    beginMoveEnd(evt) {
        this.endMoving = true;
        this.endSelect.classList.add('active');
    }
    endMoveEnd(evt) {
        const scale = this.height / this.theatreHeight;
        const scaledWidth = this.width / scale;
        const end = (this.endSelect.offsetLeft - this.min) / scaledWidth;
        if (this.endMoving) {
            this.endMoving = false;
            try {
                this.endSelect.classList.remove('active');
            }
            catch (err) {
                //
            }
            this.end = end;
            this.state.set('end', end);
            if (this.onSelectionChange)
                this.onSelectionChange();
        }
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
            this.endDisplay.innerText = `${Math.floor(ratio * 100)}%`;
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
        if (ratio < 0) {
            ratio = 0;
        }
        this.startSelect.style.left = `${ratio * 100}%`;
        ratio = (this.min + (scaledWidth * this.end)) / this.theatreWidth;
        if (ratio > 1) {
            ratio = 1;
        }
        this.endSelect.style.left = `${ratio * 100}%`;
    }
    removeClass(selector, className) {
        document.querySelectorAll(selector).forEach((page) => {
            if (page.classList.contains(className)) {
                page.classList.remove(className);
            }
        });
    }
    page(name) {
        const btnElement = document.querySelector(`#${name}Btn`);
        const targetElement = document.querySelector(`#${name}`);
        if (!btnElement.classList.contains('active')) {
            this.removeClass('.pageBtn', 'active');
            btnElement.classList.add('active');
        }
        if (!targetElement.classList.contains('show')) {
            this.removeClass('.page', 'show');
            targetElement.classList.add('show');
            this.state.set('page', name);
        }
        this.currentPage = name;
    }
}
exports.default = UI;
//# sourceMappingURL=index.js.map