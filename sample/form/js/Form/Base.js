/* Form/Base.js | (c) marknCafe | https://github.com/marknCafe/Form/blob/main/LICENSE */
import { FCNotExistsExeption, FCFailedOpenIDBExeption } from './Exeption.js';
import { FCTimer, FCPromiseTimer, FCTimerState } from './Utility.js';
export { FCNotExistsExeption, FCFailedOpenIDBExeption, FCTimer, FCPromiseTimer, FCTimerState };

export class FCBase {
/* HTMLFormElementを管理するクラス。
 * Webフォームを管理するためのFCFormクラス、FCConfirmクラスの親クラスです。
 */
    static #D = false;
    static #DefaultCBFn (event, fc) {};

    #enabledSubmit = false; // フォームデータの送信の可否を決めるフラグ
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

    static #regexType = /email|number|password|range|search|tel|text|url/i;

    static get regexTypeCR () { return FCElementCollection.regexTypeCR; }

    // コンストラクタ
    constructor (elm) {
        this.#list = new FCElementCollection(elm);
        this.#eventList = new FCEventList();
        this.#promiseTimer = undefined;

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

        const timer = new FCPromiseTimer();
        timer.delay = this.#promiseTimeout;
        timer.start([promises, 'execOnSubmit']);
        this.#promiseTimer = timer;

        Promise.allSettled(promises)
        .then(result => {
            timer.clear();
            this.#promiseTimer = undefined;
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
            FCOnError.exec(reason);
        });
        event.preventDefault();
        return false;
    }

    // アクセサ
    get form () { return this.#list.form; }
    get parentNode () { return this.#list.parentNode; }
    set enabledSubmit (bool) {
        this.#enabledSubmit = bool ? true : false;
    }
    get enabledSubmit () { return this.#enabledSubmit; }
    get onblurOuter () { return this.#onblurOuter; }
    get onclickOuter () { return this.#onclickOuter; }
    get oninputOuter () { return this.#oninputOuter; }
    get onkeydownOuter () { return this.#onkeydownOuter; }
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

    // メソッド
    view () {
    // form要素を表示させる
        this.#eventList.beforeView.forEach((func, index) => func(this) );
        this.#view(this.#list.parentNode);
        this.#eventList.afterView.forEach((func, index) => func(this) );
    }
    hide () {
    // form要素を非表示にする
        this.#eventList.beforeHide.forEach((func, index) => func(this) );
        this.#hide(this.#list.parentNode);
        this.#eventList.afterHide.forEach((func, index) => func(this) );
    }
    getFormData () {
    // form要素のデータでFormDataインスタンスを生成して返す
        return new FormData(this.form);
    }

    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /* 入力要素管理関連 */
    addItem (elm) { this.#list.addItem(elm); }
    getItem (name) { return this.#list.getItem(name); }
    keys () { return this.#list.keys(); }
    values () { return this.#list.values(); }
    enttires () { return this.#list.entries(); }
    has (key) { return this.#list.has(key); }
    forEach (cbFunc = (vlaue, key) => { undefined; }) {
        this.#list.forEach(cbFunc);
    }
    getValues (key) { return this.#list.getValues(key); }
    isEmpty (key) { return this.#list.isEmpty(key); }
    clearValue (key) { return this.#list.clearValue(key); }
    clearValues() { return this.#list.clearValues(); }
    setValue (key, value) { this.#list.setValue(key, value); }
    setValues (data) { this.#list.setValues(data); }
    getCollectedFormData () { return this.#list.getCollectedFormData(); }
    querySelector (query) { return this.#list.parentNode.querySelector(query); }
    querySelectorAll(query) { return this.#list.parentNode.querySelectorAll(query); }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    /* イベント管理関連 */
    addEventList (type = '', func = FCBase.#DefaultCBFn) {
        this.#eventList.addEventList(type, func);
    }
    removeEventList (type = '', func) {
        this.#eventList.removeEventList(type, func);
    }
    addEventFormItem (key, {blur, click, keydown, input} = new FCEventHandlerList()) {
        this.querySelectorAll(`[name=${key}]`).forEach(elm => {
            if (blur) elm.addEventListener('blur', blur, false);
            const tagName = elm.tagName;
            const isInput = tagName == 'INPUT' ? true : false;
            if (isInput && FCBase.#regexType.test(elm.type) || tagName =='TEXTAREA') {
                if (keydown) elm.addEventListener('keydown', keydown, false);
                if (input) elm.addEventListener('input', input, false);
            } else if (isInput && FCBase.regexTypeCR.test(elm.type) || tagName == 'SELECT') {
                if (click) elm.addEventListener('click', click, false);
                //if (cbFnList.input) elm.addEventListener('input', cbFnList.input, false);
            }
        });
    }
    #addEventFormItems () {
        const cbFnList = new FCEventHandlerList();
        cbFnList.blur = this.#onblurOuter;
        cbFnList.click = this.#onclickOuter;
        cbFnList.keydown = this.#onkeydownOuter;
        cbFnList.input = this.#oninputOuter;
        this.forEach((value, key) => this.addEventFormItem(key, cbFnList) );
    }
    #genCBFnBlurOuter () {
        const fc = this;
        return event => fc.#eventList.blurList.forEach(func => func(event, fc));
    }
    #genCBFnClickOuter () {
        const fc = this;
        return event => fc.#eventList.clickList.forEach(func => func(event, fc));
    }
    #genCBFnInputOuter () {
        const fc = this;
        return event => fc.#eventList.inputList.forEach(func => func(event, fc));
    }
    #genCBFnKeydownOuter () {
        const fc = this;
        return event => fc.#eventList.keydownList.forEach(func => func(event, fc));
    }
    #initErrorEvent () {
        this.addEventList('error', (event, fc) => {
            if (this.#promiseTimer instanceof FCPromiseTimer) {
                this.#promiseTimer.clear();
                this.#promiseTimer = undefined;
            }
        });
    }
}

export class FCEventHandlerList {
    #blur = undefined;
    #click = undefined;
    #keydown = undefined;
    #input = undefined;
    //constructor () {}
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
    static #DefaultCBFn () {}; // (event, fc) {};
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

    addEventList (type = '', func = FCEventList.#DefaultCBFn) {
        if (func instanceof Function == false) { throw new TypeError('addEvent, func'); }
        if (func === FCEventList.#DefaultCBFn) { throw new TypeError('addEvent, func'); }
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

//class FCElementCollection extends Map {
class FCElementCollection {
    static #D = false;
    static #regexTypeCR = /^checkbox|radio$/i;
    static get regexTypeCR () { return FCElementCollection.#regexTypeCR; }
    #map = new Map();
    #parentNode = undefined;
    #form = document.createElement('form');

    constructor (elm) {
        //super();
        this.#map = new Map();
        this.#setForm(elm);
        this.#collectItem();
    }
    #setForm (elm) {
        // form要素をインスタンスにセットする
        if (elm instanceof HTMLElement == false) { throw new TypeError('"elm" is not HTMLElement'); }
        this.#parentNode = elm;
        const elmForm = elm.querySelector('form');
        if (elmForm instanceof HTMLFormElement == false) { throw new TypeError('FormElement is not exists.'); }
        this.#form = elmForm;
    }
    #collectItem () {
        const list = this.#form.querySelectorAll('input:not([type=submit]), textarea, select');
        if (FCElementCollection.#D && list.length == 0) { console.log('There is no item.'); }
        const execludeList = {};
        list.forEach((elm) => {
            const name = elm.name;
            if (name in execludeList == true) { return; }
            if (elm.classList.contains('exclude') == true) {
                execludeList[name] = true;
                this.#map.delete(name);
            } else if (this.#map.has(name) == false) {
                this.#map.set(name, elm);
            }
        });
    }

    get parentNode () { return this.#parentNode; }
    get form () { return this.#form; }

    addItem (elm) {
        const validElm = elm instanceof HTMLInputElement || elm instanceof HTMLSelectElement || elm instanceof HTMLTextAreaElement;
        if (validElm == false) { throw new TypeError('addItem'); }
        if (elm.classList.contains('exclude') == true) {
            return false;
        }
        if (this.#map.has(elm.name) == false) {
            this.#map.set(elm.name, elm);
        }
        return true;
    }
    getItem (name) {
        if (this.#map.has(name) == false) { throw FCNotExistsExeption('getItem'); }
        return this.#map.get(name);
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
    getValues (key) {
        const nodeList = this.#form.querySelectorAll(`[name="${key}"]`);
        if (nodeList.length == 0) { throw new FCNotExistsExeption('getValue'); }
        const values = [];
        nodeList.forEach(elm => {
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
        const ite = FCSimpleIterator.gen(collection, i => collection.item(i));
        for (const item of ite) {
            values.push(item);
        }
        return values;
    }

    isEmpty (key) {
        const values = this.getValues(key);
        if (values.length == 0) { return true; }
        return this.getValues(key).some(value => (value == '' || value == undefined || value == null) );
    }

    clearValue (key) {
        if (this.has(key) == false) { throw new FCNotExistsExeption('clearValue'); }
        this.#form.querySelectorAll(`[name="${key}"]`).forEach(elm => {
            if (elm.tagName == 'SELECT') {
                elm.value = '';
            } else if (FCElementCollection.#regexTypeCR.test(elm.type) == true) {
                elm.checked = false;
            } else {
                elm.value = '';
            }
        });
    }

    clearValues () {
        this.forEach((v, key) => this.clearValue(key));
    }

    setValues (data) {
        if (data instanceof FormData) {
            this.#setValuesFormData(data);
        } else {
            this.#setValuesList(data);
        }
    }
    #setValuesFormData (data) {
        if (data instanceof FormData == false) { throw new TypeError('setValuesFormData'); }
        this.forEach((v, key) => this.setValue(key, data.getAll(key)) );
    }
    #setValuesList(data) {
        this.forEach((v, key) => this.setValue(key, data[key] || ''));
    }

    setValue (key, value) {
        if (this.#map.has(key) == false) { throw new FCNotExistsExeption('setValue'); }
        const nodeList = this.#form.querySelectorAll(`[name="${key}"]`); // '[name="' + key + '"]');
        if (nodeList.length == 0) { throw new FCNotExistsExeption('setValue'); }
        if (value instanceof Array == true) {
            this.#setValueArray(nodeList, value);
        } else {
            this.#_setValue(nodeList, value);
        }
    }
    #_setValue(nodeList, value) {
        nodeList.forEach(elm => {
            if (elm.tagName == 'SELECT') {
                elm.querySelector(`[value="${value}"]`).selected = true;
            }
            else if (FCElementCollection.#regexTypeCR.test(elm.type) == true) {
                if (elm.value == value)  { elm.checked = true; }
            }
            else {
                elm.value = value;
            }
        });
    }
    #setValueArray(nodeList, data) {
        data.forEach(value => this.#_setValue(nodeList, value));
    }
    /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

    getCollectedFormData () {
        //console.trace();
        const orgData = new FormData(this.#form);
        const data = new FormData();
        this.#map.forEach((v, key) => {
            const elmValues = orgData.getAll(key);
            if (elmValues.length > 0) {
                elmValues.forEach( value => data.append(key, value) );    
            } else {
                data.append(key, '');
            }
        });
        return data;
    }
    forEach (cbFn) { this.#map.forEach(cbFn); }
    has (key) { return this.#map.has(key); }
    keys () { return this.#map.keys(); }
    values () { return this.#map.values(); }
    entries () { return this.#map.entries(); }
}

class FCSimpleIterator {
    static #dummy = new Object();
    static gen (object = FCSimpleIterator.#dummy, getter) {
        if (object === FCSimpleIterator.#dummy) { throw new TypeError('genIteratableFn'); }
        if (getter instanceof Function == false) { throw new TypeError('genIteratableFn'); }
        return FCSimpleIterator.#iteratableFn(object, getter);
    }
    static #iteratableFn = function* (object, getter) {
        let i = 0;
        while (true) {
            if (i >= object.length) { break; }
            yield getter(i);
            i ++;
        }
    }
}

class FCOnError {
    static #errorList = [];
    static #errorUsed = [];
    static #isSetOnError = false;

    static addList (fc, onErrorList) {
        const checkFC = (fc instanceof FCBase);
        const checkList = (onErrorList instanceof Array);
        if (checkFC == false || checkList == false) { throw new Error('FCOnError.addList'); }
        FCOnError.#errorList.push([fc, onErrorList]);
    }
    static #exectorOnError (event, data) {
        const [fc, list] = data;
        list.forEach(func => {
            if (FCOnError.#errorUsed.some(f => f === func) == false) {
                func(event, fc);
                FCOnError.#errorUsed.push(func);
            }
        });
    }
    static #callbackFnOnError (event) {
        console.dir(event);
        FCOnError.#errorList
        .forEach(data => FCOnError.#exectorOnError(event, data));
        FCOnError.#errorUsed = [];
    }
    static setOnError () {
        if (FCOnError.#isSetOnError == true) { return; }
        FCOnError.#isSetOnError = true;
        addEventListener('error', FCOnError.#callbackFnOnError);
    }
    static exec (reason) {
        let event;
        if (reason instanceof Error) {
            event = new ErrorEvent(reason.name, {error : reason, message : reason.message});
        } else {
            event = new ErrorEvent('some error', { error : new Error(reason), message : reason});
        }
        FCOnError.#callbackFnOnError(event);
        console.error(event);
    }
}