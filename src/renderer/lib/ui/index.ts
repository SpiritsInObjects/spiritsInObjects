'use strict';

/* class representation features of UI overlay element */
class Overlay {
    private elem : HTMLElement = document.getElementById('overlay');
    private msg : HTMLElement = document.getElementById('overlayMsg');
    private cancel : HTMLElement = document.getElementById('cancel');
    private progressBar : HTMLElement = document.getElementById('overlayProgressBar');
    private progressMsg : HTMLElement = document.getElementById('overlayProgressMsg');

    /**
     * @constructor
     **/
    constructor () {
    }

    /**
     * Show the overlay with an optional message to display
     * 
     * @param {string} msg Message to display
     **/
    public show (msg : string = '', cancel : boolean = false) {
        showSpinner('overlaySpinner');
        this.msg.innerText = msg;
        this.elem.classList.add('show');
        if (cancel) {
            try {
                this.cancel.classList.remove('hide');
            } catch (err) {

            }
        } else {
            try {
                this.cancel.classList.add('hide');
            } catch (err) {

            }
        }
    }

    /**
     * Hide the overlay element
     **/
    public hide () {
        try {
            this.elem.classList.remove('show');
        } catch (err) {
            console.error(err);
        }
        this.msg.innerText = '';
        hideSpinner('overlaySpinner');
    }

    /**
     * Update the progress bar
     * 
     * @param {float} percent Percentage of progress bar to fill
     * @param {string} msg Message to display
     **/
    public progress (percent : number, msg : string) {
        this.progressMsg.innerText = msg;
        this.progressBar.style.width = `${percent * 100}%`;
    }
}

/* class representing select UI features that fall outside the scope of other classes */
export default class UI {
    private state : State;

    private startSelect : HTMLElement = document.getElementById('startSelect');
    private endSelect : HTMLElement = document.getElementById('endSelect');
    private startDisplay : HTMLElement = this.startSelect.querySelector('.after');
    private endDisplay : HTMLElement = this.endSelect.querySelector('.after');
    private theatre : HTMLElement = document.getElementById('theatre');

    private endMoving : boolean = false;
    private startMoving : boolean = false;

    private width : number = 1280;
    private height : number = 720;

    private min : number = 0;
    private max : number = 996;

    private theatreHeight : number;
    private theatreWidth : number;

    private start : number = 0.81;
    private end : number = 1.0;

    public onSelectionChange : Function;
    public overlay : Overlay;

    public currentPage : string = 'timeline';

    /**
     * @constructor
     * 
     * Initialize the UI class
     * 
     * @param {object} state     The shared State object
     **/
    constructor (state : State) {
        this.state = state;

        this.overlay = new Overlay();

        /*this.startSelect.addEventListener('mousedown', this.beginMoveStart.bind(this), false);
        this.endSelect.addEventListener('mousedown', this.beginMoveEnd.bind(this), false);

        document.addEventListener('mousemove', this.moveStart.bind(this), false);
        document.addEventListener('mousemove', this.moveEnd.bind(this), false);
        document.addEventListener('mouseup', this.endMoveStart.bind(this), false);
        document.addEventListener('mouseup', this.endMoveEnd.bind(this), false);*/

        this.theatreHeight = this.theatre.offsetHeight;
        this.theatreWidth = this.theatre.offsetWidth;
    }

    /**
     * Callback of the mousedown event on the start element
     * 
     * @param {object} evt     MouseEvent of mousedown action
     **/
    private beginMoveStart (evt: MouseEvent) {
        this.startMoving = true;
        this.startSelect.classList.add('active');
    }

    /**
     * Callback of the mouseup event on the document element (for start element)
     * 
     * @param {object} evt     MouseEvent of mouseup action
     **/
    private endMoveStart (evt: MouseEvent) {
        const scale : number = this.height / this.theatreHeight;
        const scaledWidth : number = this.width / scale;
        const start : number = (this.startSelect.offsetLeft - this.min) / scaledWidth;

        if (this.startMoving) {
            this.startMoving = false;
            try {
                this.startSelect.classList.remove('active');
            } catch (err) {
                //
            }

            this.start = start;
            this.state.set('start', start);
            if (this.onSelectionChange) this.onSelectionChange();
        }
    }

    /**
     * Callback of the mousemove event on the document element (for start element)
     * 
     * @param {object} evt     MouseEvent of mousemove action
     **/
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
            this.setStartSelect(ratio);

            scale = this.height / this.theatreHeight;
            scaledWidth = this.width / scale;
            percent = Math.round( ((this.startSelect.offsetLeft - this.min) / scaledWidth) * 100) + '%';
        }
    }

    /**
     * Callback of the mousedown event on the end element
     * 
     * @param {object} evt     MouseEvent of mousedown action
     **/
    private beginMoveEnd (evt: MouseEvent) {
        this.endMoving = true;
        this.endSelect.classList.add('active');
    }

    /**
     * Callback of the mouseup event on the document element (for end element)
     * 
     * @param {object} evt MouseEvent of mouseup action
     **/
    private endMoveEnd (evt: MouseEvent) {
        const scale : number = this.height / this.theatreHeight;
        const scaledWidth : number = this.width / scale;
        const end : number = (this.endSelect.offsetLeft - this.min) / scaledWidth;
        if (this.endMoving) {
            this.endMoving = false;
            try {
                this.endSelect.classList.remove('active');
            } catch (err) {
                //
            }
        
            this.end = end;
            this.state.set('end', end);
            if (this.onSelectionChange) this.onSelectionChange();
        }
    }

    /**
     * Callback of the mousemove event on the document element (for end element)
     * 
     * @param {object} evt MouseEvent of mousemove action
     **/
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
            this.setEndSelect(ratio);

            scale = this.height / this.theatreHeight;
            scaledWidth = this.width / scale;
            percent = Math.round( ((this.endSelect.offsetLeft - this.min) / scaledWidth) * 100) + '%';
        }
    }

    /**
     * Reposition slider elements on theatre based on the scaled
     * size of the original video
     * 
     * @param {integer} width Actual width of video (to scale)
     * @param {integer} height Actual height of video (to scale)
     **/
    public updateSliders (width : number, height : number) {
        let ratio : number;
        let scale : number;
        let scaledWidth : number;

        this.theatreHeight = this.theatre.offsetHeight;
        this.theatreWidth = this.theatre.offsetWidth;
        
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
        this.setStartSelect(ratio);

        ratio = (this.min + (scaledWidth * this.end)) / this.theatreWidth;
        if (ratio > 1) {
            ratio = 1;
        }
        this.setEndSelect(ratio);
    }

    /**
     * Remove class from all elements matching selector if it exists on
     * the element.
     * 
     * @param {string} selector CSS selector of elements to match
     * @param {string} className Class to remove
     **/
    public removeClass (selector : string, className : string) {
        document.querySelectorAll(selector).forEach((page : HTMLElement) => {
            if (page.classList.contains(className)) {
                page.classList.remove(className);
            }
        });
    }

    /**
     * Switch to a specific "page" or screen or workspace within the app
     * and save the state in this.currentPage to allow behavior of app
     * to change when a particular page is detected.
     * 
     * @param {string} name Name of page
     **/
    public page (name : string) {
        const btnElement : HTMLElement = document.querySelector(`#${name}Btn`);
        const targetElement : HTMLElement = document.querySelector(`#${name}`);

        if ( !btnElement.classList.contains('active') ) {
            this.removeClass('.pageBtn', 'active');
            btnElement.classList.add('active');
        }
        if ( !targetElement.classList.contains('show') ) {
            this.removeClass('.page', 'show');
            targetElement.classList.add('show');
            this.state.set('page', name);
        }
        
        this.currentPage = name;
    }

    /**
     * Move the start slider to position and add text to
     * display element
     * 
     * @param {number} ratio     Ratio of theatre element to move start slider to
     **/
    public setStartSelect (ratio : number) {
        this.startSelect.style.left = `${ratio * 100}%`;
        this.startDisplay.innerText = `${Math.floor(ratio * 100)}%`;
    }

    /**
     * Move the end slider to position and add text to
     * display element
     * 
     * @param {number} ratio     Ratio of theatre element to move end slider to
     **/
    public setEndSelect (ratio : number) {
        this.endSelect.style.left = `${ratio * 100}%`;
        this.endDisplay.innerText = `${Math.floor(ratio * 100)}%`;
    }
}