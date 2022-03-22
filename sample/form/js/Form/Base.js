/* Form/Base.js | (c) marknCafe | https://github.com/marknCafe/Form/blob/main/LICENSE */
import { FCNotExistsExeption, FCFailedOpenIDBExeption } from './Exeption.js';
import { FCTimer, FCPromiseTimer, FCTimerState } from './Utility.js';
export { FCNotExistsExeption, FCFailedOpenIDBExeption, FCTimer, FCPromiseTimer, FCTimerState };

export class FCBase {
    static #regexType = /email|number|password|range|search|tel|text|url/i;

    #enabledSubmit = false;
    #view = parentNode => parentNode.style.display = '';
    #hide = parentNode => parentNode.style.display = 'none';
    #eventList = new FCEventList();
    #onblurOuter = undefined;
    #onclickOuter = undefined;
    #oninputOuter = undefined;
    #onkeydownOuter = undefined;
    #successedOnsubmit = false;
    #promiseTimeout = 30000;
    #promiseTimer = new FCPromiseTimer();
    #list = (() => {
        let div = document.createElement('div');
        div.appendChild(document.createElement('form'));
        return new FCElementCollection(div);
    })();

    constructor (parentNode) {
        this.#list = new FCElementCollection(parentNode);
        this.#eventList = new FCEventList();
        this.#promiseTimer = new FCPromiseTimer();

        this.form.addEventListener('submit', event => this.#execOnSubmit(event), false);

        this.#onblurOuter = this.#genCBFnBlurOuter();
        this.#onclickOuter = this.#genCBFnClickOuter();
        this.#oninputOuter = this.#genCBFnInputOuter();
        this.#onkeydownOuter = this.#genCBFnKeydownOuter();

        this.#initErrorEvent();
        FCOnError.addList(this, this.#eventList.errorList);
        FCOnError.setOnError();

        this.#addEventFormItems();
    }

    #execOnSubmit (event) {
        if (this.#successedOnsubmit) {
            this.#successedOnsubmit = false;
            if (this.#enabledSubmit) { return true; }
        }
        const fc = this;
        const promises = [];
        const eventList = this.#eventList;
        eventList.submitList.forEach(func => {
            const promise = func(event, fc);
            if (promise instanceof Promise == false) {
                FCOnError.exec(new TypeError('onsubmit handler is not Promise instance.'));
            }
            promises.push(promise);
        });

        const timer = this.#promiseTimer;
        timer.delay = this.#promiseTimeout;
        timer.start([promises, 'execOnSubmit']);

        Promise.allSettled(promises)
        .then(result => {
            timer.clear();
            const resRejected = result.find(data => data.status == 'rejected');
            if (resRejected) {
                throw resRejected.reason;
            }
            const resSuccess = !result.some(data => data.value == false);
            if (fc.#enabledSubmit == false) {
                eventList.afterSubmit.forEach(func => func(resSuccess, this));
            } else if (resSuccess) {
                fc.#successedOnsubmit = true;
                fc.form.submit();
            }
        })
        .catch(reason => {
            timer.clear();
            FCOnError.exec(reason);
        });
        event.preventDefault();
        return false;
    }

    get form () { return this.#list.form; }
    get parentNode () { return this.#list.parentNode; }
    set enabledSubmit (bool) {
        this.#enabledSubmit = bool ? true : false;
    }
    set callbackFnView (func = parentNode => {}) {
        if (func instanceof Function == false) { throw new TypeError('callbackFnView'); }
        this.#view = func;
    }
    set callbackFnHide (func = parentNode => {}) {
        if (func instanceof Function == false) { throw new TypeError('callbackFnHide'); }
        this.#hide = func;
    }
    set promiseTimeout (sec) {
        if (Number.isInteger(sec) == false) { throw new TypeError('promiseTimeout, type'); }
        if (sec < 0) { throw new TypeError('promiseTimeout, range'); }
        this.#promiseTimeout = sec * 1000;
    }
    get promiseTimeout () { return this.#promiseTimeout / 1000; }
    get promiseTimeoutMiriSec () { return this.#promiseTimeout; }

    view () {
        this.#eventList.beforeView.forEach((func, index) => func(this) );
        this.#view(this.#list.parentNode);
        this.#eventList.afterView.forEach((func, index) => func(this) );
    }
    hide () {
        this.#eventList.beforeHide.forEach((func, index) => func(this) );
        this.#hide(this.#list.parentNode);
        this.#eventList.afterHide.forEach((func, index) => func(this) );
    }
    getFormData () { return new FormData(this.form); }

    addItem (element) {
        if (this.#list.addItem(element) == false) {
            return false;
        }
        this.get(element.name).forEach(elm => {
            elm.removeEventListener('blur', this.#onblurOuter);
            elm.removeEventListener('click', this.#onclickOuter);
            elm.removeEventListener('input', this.#oninputOuter);
            elm.removeEventListener('keydown', this.#onkeydownOuter);
        });
        this.addEventFormItem(element.name, {
            blur : this.#onblurOuter,
            click : this.#onclickOuter,
            input : this.#oninputOuter,
            keydown : this.#onkeydownOuter
        });
        return true;
    }
    getItem (name) { return this.#list.getItem(name); }
    keys () { return this.#list.keys(); }
    values (getValue = false) { return this.#list.values(getValue); }
    entries (getValue = false) { return this.#list.entries(getValue); }
    has (name) { return this.#list.has(name); }
    forEach (func, getValue = false) {
        this.#list.forEach(func, getValue);
    }
    getValues (name) { return this.#list.getValues(name); }
    isEmpty (name) { return this.#list.isEmpty(name); }
    clearValue (name) { return this.#list.clearValue(name); }
    clearValues() { return this.#list.clearValues(); }
    setValue (name, value) { this.#list.setValue(name, value); }
    setValues (data) { this.#list.setValues(data); }
    getCollectedFormData () { return this.#list.getCollectedFormData(); }
    querySelector (selectors) { return this.#list.parentNode.querySelector(selectors); }
    querySelectorAll(selectors) { return this.#list.parentNode.querySelectorAll(selectors); }

    addEventList (type = '', func) {
        this.#eventList.addEventList(type, func);
    }
    removeEventList (type = '', func) {
        this.#eventList.removeEventList(type, func);
    }
    addEventFormItem (name, eventHandlerList = new FCEventHandlerList()) {
        this.#list.genNodeListByName(name)
        .forEach(elm => this.#addEventFormItem(elm, eventHandlerList));
    }
    #addEventFormItem (elm, {blur, click, keydown, input} = new FCEventHandlerList()) {
        if (blur) elm.addEventListener('blur', blur, false);
        const tagName = elm.tagName;
        const isInput = tagName == 'INPUT' ? true : false;
        if (isInput && FCBase.#regexType.test(elm.type) || tagName =='TEXTAREA') {
            if (keydown) elm.addEventListener('keydown', keydown, false);
            if (input) elm.addEventListener('input', input, false);
        } else if (isInput && FCElementCollection.regexTypeCR.test(elm.type) || tagName == 'SELECT') {
            if (click) elm.addEventListener('click', click, false);
        }
    }
    #addEventFormItems () {
        const cbFnList = new FCEventHandlerList();
        cbFnList.blur = this.#onblurOuter;
        cbFnList.click = this.#onclickOuter;
        cbFnList.keydown = this.#onkeydownOuter;
        cbFnList.input = this.#oninputOuter;
        this.forEach((nodeList, name) => {
            nodeList.forEach(elm => this.#addEventFormItem(elm, cbFnList));
        });
    }
    #genCBFnBlurOuter () {
        return event => this.#eventList.blurList.forEach(func => func(event, this));
    }
    #genCBFnClickOuter () {
        return event => this.#eventList.clickList.forEach(func => func(event, this));
    }
    #genCBFnInputOuter () {
        return event => this.#eventList.inputList.forEach(func => func(event, this));
    }
    #genCBFnKeydownOuter () {
        return event => this.#eventList.keydownList.forEach(func => func(event, this));
    }
    #initErrorEvent () {
        this.addEventList('error', () => this.#promiseTimer.clear() );
    }
}

export class FCEventHandlerList {
    #blur = undefined;
    #click = undefined;
    #keydown = undefined;
    #input = undefined;

    set blur (cbFn) {
        if (cbFn instanceof Function == false) { throw TypeError('blur'); }
        this.#blur = cbFn;
    }
    get blur () { return this.#blur; }
    set click (cbFn) {
        if (cbFn instanceof Function == false) { throw TypeError('click'); }
        this.#click = cbFn;
    }
    get click () { return this.#click; }
    set keydown (cbFn) {
        if (cbFn instanceof Function == false) { throw TypeError('keydown'); }
        this.#keydown = cbFn;
    }
    get keydown () { return this.#keydown; }
    set input (cbFn) {
        if (cbFn instanceof Function == false) { throw TypeError('input'); }
        this.#input = cbFn;
    }
    get input () { return this.#input; }
}

class FCEventList {
    static #DefaultCBFunc () {};
    #list = new Map();

    constructor () {
        const list = new Map();
        list.set(FCEventType.blur, []);
        list.set(FCEventType.click, []);
        list.set(FCEventType.input, []);
        list.set(FCEventType.keydown, []);
        list.set(FCEventType.error, []);
        list.set(FCEventType.submit, []);
        list.set(FCEventType.afterSubmit, []);
        list.set(FCEventType.beforeView, []);
        list.set(FCEventType.afterView, []);
        list.set(FCEventType.beforeHide, []);
        list.set(FCEventType.afterHide, []);
        this.#list = list;
    }
    get blurList () { return this.#list.get(FCEventType.blur); }
    get clickList () { return this.#list.get(FCEventType.click); }
    get inputList () { return this.#list.get(FCEventType.input); }
    get keydownList () { return this.#list.get(FCEventType.keydown); }
    get errorList () { return this.#list.get(FCEventType.error); }

    get submitList () { return this.#list.get(FCEventType.submit); }

    get afterSubmit () { return this.#list.get(FCEventType.afterSubmit); }
    get beforeView () { return this.#list.get(FCEventType.beforeView); }
    get afterView () { return this.#list.get(FCEventType.afterView); }
    get beforeHide () { return this.#list.get(FCEventType.beforeHide); }
    get afterHide () { return this.#list.get(FCEventType.afterHide); }

    addEventList (type = '', func = FCEventList.#DefaultCBFunc) {
        if (func instanceof Function == false) { throw new TypeError('addEvent, func'); }
        if (func === FCEventList.#DefaultCBFunc) { throw new TypeError('addEvent, func'); }
        if (this.#list.has(type) == false) { throw new FCNotExistsExeption('addEventList, type'); }
        this.#list.get(type).push(func);
    }
    removeEventList (type = '', func) {
        if (this.#list.has(type) == false) { throw new FCNotExistsExeption('removeEventList, type'); }
        const list = this.#list.get(type);
        const i = list.indexOf(func);
        if (i >= 0) { list.splice(i); }
    }
}
class FCEventType {
    static get blur () { return 'blur'; };
    static get click () { return 'click'; };
    static get input () { return 'input'; };
    static get keydown () { return 'keydown'; };
    static get error () { return 'error'; };
    static get submit () { return 'submit'; };
    static get afterSubmit () { return 'afterSubmit'; }
    static get beforeView () { return 'beforeView'; }
    static get afterView () { return 'afterView'; }
    static get beforeHide () { return 'beforeHide'; }
    static get afterHide () { return 'afterHide'; }
}

class FCElementCollection {
    static #regexTypeCR = /^checkbox|radio$/i;
    static get regexTypeCR () { return FCElementCollection.#regexTypeCR; }
    #map = new Map();
    #parentNode = undefined;
    #form = document.createElement('form');

    constructor (parentNode) {
        this.#map = new Map();
        this.#setForm(parentNode);
        this.#collectItem();
    }
    #setForm (parentNode) {
        if (parentNode instanceof HTMLElement == false) { throw new TypeError('"elm" is not HTMLElement'); }
        this.#parentNode = parentNode;
        const elmForm = parentNode.querySelector('form');
        if (elmForm instanceof HTMLFormElement == false) { throw new TypeError('FormElement is not exists.'); }
        this.#form = elmForm;
    }
    #collectItem () {
        let nodeList;
        if (this.#form.id) {
            const id = this.#form.id;
            const query = `form#${id} input:not([type=submit]), form#${id} textarea, form#${id} select, input[form="${id}"]:not([type=submit]), textarea[form="${id}"], select[form="${id}"]`;
            nodeList = document.querySelectorAll(query);
        } else {
            nodeList = this.#form.querySelectorAll('input:not([type=submit]), textarea, select');
        }
        const execludeList = [];
        nodeList.forEach((elm) => {
            const name = elm.name;
            if (execludeList.indexOf(name) > -1) { return; }
            if (this.addItem(elm) == false) {
                execludeList.push(name);
            }
        });
    }

    get parentNode () { return this.#parentNode; }
    get form () { return this.#form; }

    addItem (element) {
        const validElm = element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
        if (validElm == false) { throw new TypeError('addItem'); }
        const name = element.name;
        if (name == '' || name == undefined) { throw new TypeError('Attribute "name" is not defined.'); }
        if (this.#map.has(name)) {
            if ([...this.#map.get(name).values()].indexOf(element) == -1) {
                this.#map.set(name, this.genNodeListByName(name));   
            }
            return true;
        }

        const nodeList = this.genNodeListByName(name);
        if (nodeList.length == 0) { throw new TypeError('Element is not included in HTMLFormElement.'); }
        for (let node of nodeList.values()) {
            if (node.classList.contains('exclude') == true) {
                return false;
            }
        }
        this.#map.set(name, nodeList);
        return true;
    }
    genNodeListByName (name) {
        if (this.#form.id) {
            const id = this.#form.id;
            return document.querySelectorAll(`form#${id} [name="${name}"], [name="${name}"][form="${id}"]`);
        } else {
            return this.#form.querySelectorAll(`[name="${name}"]`);
        }
    }
    getItem (name) {
        if (this.#map.has(name) == false) { throw new FCNotExistsExeption('getItem'); }
        return this.#map.get(name);
    }

    getValues (name) {
        if (this.#map.has(name) == false) { throw new FCNotExistsExeption('getValues'); }
        const values = [];
        this.getItem(name).forEach(elm => {
            if (elm.tagName == 'SELECT') {
                this.#getValsSelectElm(elm).forEach(selectedElm => values.push(selectedElm));
            } else {
                const value = this.#getValInputElm(elm);
                if (value != null) { values.push(value); }
            }
        });
        return values;
    }
    #getValInputElm (elm) {
        if (FCElementCollection.#regexTypeCR.test(elm.type) == true) {
            return elm.checked == true ? elm.value : null;
        }
        return elm.value;
    }
    #getValsSelectElm (select) {
        const values = [];
        const collection = select.selectedOptions;
        const ite = this.#genIteratorIndex(collection.length, i => collection.item(i));
        for (const item of ite) {
            values.push(item);
        }
        return values;
    }

    isEmpty (name) {
        const values = this.getValues(name);
        if (values.length == 0) { return true; }
        return this.getValues(name).some(value => (value == '' || value == undefined || value == null) );
    }

    clearValue (name) {
        if (this.has(name) == false) { throw new FCNotExistsExeption('clearValue'); }
        this.getItem(name).forEach(node => {
            if (node.tagName == 'SELECT') {
                node.value = '';
            } else if (FCElementCollection.#regexTypeCR.test(node.type) == true) {
                node.checked = false;
            } else {
                node.value = '';
            }            
        });
    }

    clearValues () {
        for(let name of this.keys()) {
            this.clearValue(name);
        }
    }

    setValues (data) {
        if (data instanceof FormData) {
            this.forEach((nodeList, name) => this.setValue(name, data.getAll(name)) );
        } else if (data instanceof Map) {
            this.forEach((nodeList, name) => this.setValue(name, data.get(name)) || '');
        } else {
            this.forEach((nodeList, name) => this.setValue(name, data[name] || ''));
        }
    }

    setValue (name, value) {
        if (this.#map.has(name) == false) { throw new FCNotExistsExeption('setValue'); }
        //this.clearValue(name);
        const nodeList = this.getItem(name);
        if (value instanceof Array == true) {
            this.#setValueArray(nodeList, value);
        } else {
            this.#_setValue(nodeList, value);
        }
    }
    #_setValue(nodeList, value) {
        nodeList.forEach(node => {
            if (node.tagName == 'SELECT') {
                node.querySelector(`[value="${value}"]`).selected = true;
            } else if (FCElementCollection.#regexTypeCR.test(node.type) == true) {
                if (node.value == value)  { node.checked = true; }
            } else {
                node.value = value;
            }
        });
    }
    #setValueArray(nodeList, data) {
        data.forEach(value => this.#_setValue(nodeList, value));
    }

    getCollectedFormData () {
        const orgData = new FormData(this.#form);
        const data = new FormData();
        this.#map.forEach((v, name) => {
            const elmValues = orgData.getAll(name);
            if (elmValues.length > 0) {
                elmValues.forEach( value => data.append(name, value) );    
            } else {
                data.append(name, '');
            }
        });
        return data;
    }
    forEach (func, getValue = false) {
        if (getValue == false ) {
            this.#map.forEach(func);
        } else {
            this.#map.forEach((nodeList, name) => {
                cbFn(this.getValues(name), name);
            });
        }
    }
    has (name) { return this.#map.has(name); }
    keys () { return this.#map.keys(); }
    values (getValue = false) {
        if (getValue == false) {
            return this.#map.values();
        }
        return this.#genIteratorKeys(
            this.#map.keys(),
            key => this.getValues(key)
        );
    }
    entries (getValue = false) {
        if (getValue == false) {
            return this.#map.entries();
        }
        return this.#genIteratorKeys(
            this.#map.keys(),
            key => [key, this.getValues(key)]
        );
    }
    #genIteratorIndex = function* (length, getter) {
        for (let i = 0; i < length; i ++) {
            yield getter(i);
        }
    }
    #genIteratorKeys = function* (keys, getter) {
        for (let key of keys) {
            yield getter(key);
        }
    }
}

class FCOnError {
    static #errorList = [];
    static #errorUsed = [];
    static #isSetOnError = false;
    static #targetFc = undefined;

    static addList (fc, onErrorList) {
        const checkFC = (fc instanceof FCBase);
        const checkList = (onErrorList instanceof Array);
        if (checkFC == false || checkList == false) { throw new Error('FCOnError.addList'); }
        FCOnError.#errorList.push([fc, onErrorList]);
    }
    static #exectorOnError (event, [fc, list] = []) {
        if (FCOnError.#targetFc instanceof FCBase && FCOnError.#targetFc !== fc) {
            return;
        }
        list.forEach(func => {
            if (FCOnError.#errorUsed.some(f => f === func) == false) {
                func(event, fc);
                FCOnError.#errorUsed.push(func);
            }
        });
    }
    static #callbackFnOnError (event) {
        FCOnError.#errorList
        .forEach(data => FCOnError.#exectorOnError(event, data));
        FCOnError.#errorUsed = [];
    }
    static setOnError () {
        if (FCOnError.#isSetOnError == true) { return; }
        FCOnError.#isSetOnError = true;
        addEventListener('error', FCOnError.#callbackFnOnError);
    }
    static exec (reason, fc = undefined) {
        FCOnError.#targetFc = fc;
        let event;
        if (reason instanceof Error) {
            event = new ErrorEvent(reason.name, {error : reason, message : reason.message});
        } else {
            event = new ErrorEvent('some error', { error : new Error(reason), message : reason});
        }
        FCOnError.#callbackFnOnError(event);
        FCOnError.#targetFc = undefined;
        console.error(event);
    }
}