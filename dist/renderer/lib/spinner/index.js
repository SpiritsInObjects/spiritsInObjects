'use strict';
var Spinner;
const Spinners = {};
function showSpinner(id) {
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
    const target = document.getElementById(id);
    Spinners[id] = new Spinner(SpinnerOptions).spin(target);
}
function hideSpinner(id) {
    try {
        Spinners[id].stop();
    }
    catch (err) {
        //
    }
}
//# sourceMappingURL=index.js.map