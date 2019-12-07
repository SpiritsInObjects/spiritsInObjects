'use strict';

interface Spinner{
    stop : Function;
}

const Spinners : any = {};

function showSpinner (id : string) {
    const SpinnerOptions = {
        lines: 13,
        length: 38,
        width: 17,
        radius: 45,
        scale: 1,
        corners: 1,
        color: '#ffffff', 
        fadeColor: 'transparent',
        speed: 1,
        rotate: 0, // The rotation offset
        animation: 'spinner-line-fade-quick',
        direction: 1,
        zIndex: 2e9,
        className: 'spinner',
        top: '50%', 
        left: '50%', 
        shadow: '0 0 1px transparent',
        position: 'absolute'
    };
    const target = document.getElementById(id);
    Spinners[id] = new Spinner(SpinnerOptions).spin(target);
}

function hideSpinner (id : string) {
    try {
        Spinners[id].stop()
    } catch (err) {
        //
    }
}