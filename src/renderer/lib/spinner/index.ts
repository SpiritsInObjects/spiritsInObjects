'use strict';

const Spinners : any = {};

const spinnerTypes : any = {
    default : {
        lines: 13,
        length: 24,
        width: 14,
        radius: 30,
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
        top: '0', 
        left: '50%', 
        shadow: '0 0 1px transparent',
        position: 'absolute'
    },
    small : {
        lines: 9,
        length: 3,
        width: 4,
        radius: 5,
        scale: 1,
        corners: 1,
        speed: 1,
        rotate: 0,
        animation: 'spinner-line-fade-quick',
        direction: 1,
        color: '#3e518d',
        fadeColor: 'transparent',
        top: '50%',
        left: '50%',
        shadow: '0 0 1px transparent',
        zIndex: 2000000000,
        className: 'spinner',
        position: 'absolute'
    }
}


function showSpinner (id : string, type : string = 'default') {
    const SpinnerOptions : any = spinnerTypes[type];
    const target : HTMLElement = document.getElementById(id);
    if (typeof Spinners[id] === 'undefined') {
        //@ts-ignore
        Spinners[id] = new Spinner(SpinnerOptions) as any;
    }
    Spinners[id].spin(target);
}

function hideSpinner (id : string) {
    try {
        Spinners[id].stop()
    } catch (err) {
        //
    }
}