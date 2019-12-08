'use strict';

interface Spinner {
    stop(): any;
    spin( element : HTMLElement): any;
}

interface SpinnerConstructor {
    new (options: any): Spinner;
}

var Spinner: SpinnerConstructor;
const Spinners : any = {};

function showSpinner (id : string) {
    const SpinnerOptions : any = {
        lines: 13,
        length: 38,
        width: 17,
        radius: 45,
        scale: 1,
        corners: 1,
        color: '#ffffff', 
        fadeColor: 'transparent',
        speed: 1,
        rotate: 0,
        animation: 'spinner-line-fade-quick',
        direction: 1,
        zIndex: 2e9,
        className: 'spinner',
        top: '50%', 
        left: '50%', 
        shadow: '0 0 1px transparent',
        position: 'absolute'
    };
    const target : HTMLElement = document.getElementById(id);
    Spinners[id] = new Spinner(SpinnerOptions).spin(target);
}

function hideSpinner (id : string) {
    try {
        Spinners[id].stop()
    } catch (err) {
        //
    }
}