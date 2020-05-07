'use strict';

import { StatsBase } from "fs-extra";

export default class UI {
    private state : State;

    private startSelect : HTMLElement = document.getElementById('startSelect');
    private endSelect : HTMLElement = document.getElementById('endSelect');
    private theatre : HTMLElement = document.getElementById('theatre');

    private endMoving : boolean = false;
    private startMoving : boolean = false;

    private width : number = 1280;
    private height : number = 720;

    private min : number = 0;
    private max : number = 720;

    private theatreHeight : number;
    private theatreWidth : number;

    private start : number = 0.72;
    private end : number = 1.0;

    constructor (state : State) {
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

    private beginMoveStart (evt: MouseEvent) {
        this.startMoving = true;
    }

    private endMoveStart (evt: MouseEvent) {
        const scale : number = this.height / this.theatreHeight;
        const scaledWidth : number = this.width / scale;
        const start : number = (this.startSelect.offsetLeft - this.min) / scaledWidth;

        this.startMoving = false;

        this.start = start;
        this.state.set('start', start);
        this.state.save();
    }

    private moveStart (evt : MouseEvent) {
        let width : number;
        let leftX : number;
        let newLeftX : number;
        let maxX : number;
        let ratio : number;
        let scale : number;
        let scaledWidth : number;
        let percent : string;

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
            percent = Math.round( ((this.startSelect.offsetLeft - this.min) / scaledWidth) * 100) + '%';
        }
    }

    private beginMoveEnd (evt: MouseEvent) {
        this.endMoving = true;
    }

    private endMoveEnd (evt: MouseEvent) {
        const scale : number = this.height / this.theatreHeight;
        const scaledWidth : number = this.width / scale;
        const end : number = (this.endSelect.offsetLeft - this.min) / scaledWidth;

        this.endMoving = false;
        
        this.end = end;
        this.state.set('end', end);
        this.state.save();
    }

    private moveEnd (evt : MouseEvent) {
        let width : number;
        let leftX : number;
        let newLeftX : number;
        let minX : number;
        let ratio : number;
        let scale : number;
        let scaledWidth : number;
        let percent : string;

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
            percent = Math.round( ((this.endSelect.offsetLeft - this.min) / scaledWidth) * 100) + '%';
        }
    }

    public updateSliders (width : number, height : number) {
        let ratio : number;
        let scale : number;
        let scaledWidth : number;
        
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
}