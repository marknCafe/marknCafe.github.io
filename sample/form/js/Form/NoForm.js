import {FCBase} from './Base.js';
export class FCNoForm extends FCBase {
    constructor (elm) {
        if (elm instanceof HTMLElement == false) { throw new TypeError('HTMLElement'); }
        let form = elm.querySelector('form');
        let hasForm = form ? true : false;
        if (!hasForm) {
            form = elm.appendChild(document.createElement('form'));
        }
        super(elm);
        if (!hasForm) {
            elm.removeChild(form);
        }
    }
}