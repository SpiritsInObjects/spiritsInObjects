'use strict';
const Spinners = {};
const spinnerTypes = {
    default: {
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
    small: {
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
};
function showSpinner(id, type = 'default') {
    const SpinnerOptions = spinnerTypes[type];
    const target = document.getElementById(id);
    if (typeof Spinners[id] === 'undefined') {
        Spinners[id] = new Spinner(SpinnerOptions);
    }
    Spinners[id].spin(target);
}
function hideSpinner(id) {
    try {
        Spinners[id].stop();
    }
    catch (err) {
    }
}
//# sourceMappingURL=index.js.map