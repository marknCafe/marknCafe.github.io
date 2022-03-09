import { FCNoForm } from './NoForm.js';
export class FCError extends FCNoForm {
    set reason (message) {
        const elm = this.form.querySelector('.reason');
        const messageList = message.split(/[\r\n]+/);
        const ite = messageList.values();
        let data = ite.next();
        while(data.done == false) {
            elm.appendChild(document.createTextNode(data.value.replace(/(?:^\s+|\s+$)/g, '')));
            data = ite.next();
            if (data.done == false) {
                elm.appendChild(document.createElement('br'));
            }
        }
    }
    get reason () {
        return this.parentNode.querySelector('.reason').innerText;
    }
    get elmReason () {
        return this.parentNode.querySelector('.reason');
    }
}