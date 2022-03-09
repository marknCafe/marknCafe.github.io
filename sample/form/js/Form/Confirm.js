import {FCBase} from './Base.js';
export class FCConfirm extends FCBase {
/* フォームの確認画面を管理するためのクラス。 */
    constructor (elm) {
        super(elm);
        this.clearConfirmValues();
    }
    setConfirmValue (key, value) { //setConfirmValue
        const cnKV = `.fccl-${key}.v-${value}`;
        try {
            const nodeList = this.form.querySelectorAll(cnKV);
            if (nodeList.length > 0) {
                nodeList.forEach(elm => this.#viewElement(elm) );
                return;
            }
        } catch (e) {
            console.log(e);
        }
        this.form.querySelectorAll(`.fcc-${key}`).forEach( elm => {
            elm.innerHTML = '';
            elm.appendChild(document.createTextNode(value));
            this.#viewElement(elm);
        });
    }
    #hideElement (elm) {
        elm.style.display = 'none';
    }
    #viewElement (elm) {
        elm.style.display = '';
    }
    setConfirmValues (data) { //setConfirmValue
        if (data instanceof FormData) {
            this.#setConfirmValuesFormData(data);
        } else {
            this.#setConfirmValuesList(data);
        }
    }
    #setConfirmValuesFormData (data) {
        for (const key of data.keys()) {
            data.getAll(key).forEach( value => this.setConfirmValue(key, value) );
        }
    }
    #setConfirmValuesList (data) {
        for (const key in data) {
            this.setConfirmValue(key, data[key]);
        }
    }
    clearConfirmValues () {
        this.form.querySelectorAll('[class^="fccl-"],[class*=" fccl-"]')
                .forEach( node => this.#hideElement(node) );
        this.form.querySelectorAll('[class^="fcc-"], [class*=" fcc-"]')
                .forEach( node => node.innerHTML = '' );
    }
}