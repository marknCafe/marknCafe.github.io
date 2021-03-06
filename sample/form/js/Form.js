/* Form.js | (c) marknCafe | https://github.com/marknCafe/Form/blob/main/LICENSE */
import {
    FCController, FCBase, FCForm, FCConfirm, FCNoForm, FCError, FCEventHandlerList
} from './Form/Controller.js';
import { ValidityMessage, ValidityMessageJP } from './Form/ValidityMessage.js';
import { FCTimer, FCTimerState, FCData } from './Form/Utility.js';
export {
    FCBase, FCData, FCForm, FCConfirm, FCNoForm, FCError, ValidityMessage, ValidityMessageJP, FCTimer, FCTimerState, FCEventHandlerList
};

export class Form {
    static #D = false;
    static #defaultOnExpires (ctr) {
        try {
            const fc = ctr.get('error');
            fc.reason = 'Session time out';
            fc.view();
        } catch (e) {
            throw e;
        }
    };
    static #defaultFormAfterSubmit (result, fc) { }
    static async #defaultConfirmOnSubmit (event, fc) { return true; }
    static get #defaultExpires () { return -1; }
    static get #defaultUseWarnElm () { return true; }
    static get #defaultDelayTime () { return 1500; }
    static get #defaultMarginMaxLength () { return 5; }
    static get #defaultPromiseTimeout () { return 30; }
    static get #defaultEnableSubmit () { return false; }
    static #defaultValidityMessage = new ValidityMessage();

    #ctr = new FCController('_dummy_');
    #appendList = Array();
    #initList = Array();

    #useWarnElm = Form.#defaultUseWarnElm;
    #delayTime = Form.#defaultDelayTime;
    #marginMaxLength = Form.#defaultMarginMaxLength;
    #validityMessage = Form.#defaultValidityMessage;
    #promiseTimeout = Form.#defaultPromiseTimeout;
    #formEnableSubmit = Form.#defaultEnableSubmit;
    #formAfterSubmit = Form.#defaultFormAfterSubmit;
    #comfirmEnableSubmit = Form.#defaultEnableSubmit;
    #confirmOnSubmit = Form.#defaultConfirmOnSubmit;

    #isSetEvent = false;
    #isInitError = false;
    #reasonInitError = new ErrorEvent('dummy');
    #appendFinished = false;

    constructor (name, useIdb = true) {
        this.#ctr = new FCController(name, useIdb);
        this.#appendList = Array();
        this.#initList = Array();
        this.controllerSettings();
    }
    get controller () { return this.#ctr; }

    get isInitError () { return this.#isInitError; }
    get appendFinished () { return this.#appendFinished; }

    controllerSettings ({expires = Form.#defaultExpires, onExpires = Form.#defaultOnExpires} = {}) {
        if (Number.isInteger(expires) == false) { throw new TypeError('controllerSettings (expires)'); }
        if (onExpires instanceof Function == false) { throw new TypeError('controllerSettings (onExpires)'); }
        this.#ctr.expires = expires;
        this.#ctr.onExpires = onExpires;
        return this;
    }
    formSettings ({useWarnElm = Form.#defaultUseWarnElm, delayTime = Form.#defaultDelayTime,
                    marginMaxLength = 5, validityMessage = Form.#defaultValidityMessage,
                    promiseTimeout = Form.#defaultPromiseTimeout, enableSubmit = Form.#defaultEnableSubmit, afterSubmit = Form.#defaultFormAfterSubmit} = {}) {
        if (Number.isInteger(delayTime) == false) { throw new TypeError('formSettings (delayTime)'); }
        if (Number.isInteger(marginMaxLength) == false || marginMaxLength < 0) { throw new TypeError('formSettings (marginMaxLength)'); }
        if (validityMessage instanceof ValidityMessage == false) { throw new TypeError('formSettings (validityMessage)'); }
        if (Number.isInteger(promiseTimeout) == false) { throw new TypeError('formSettings (promiseTimeout)'); }
        if (afterSubmit instanceof Function == false) { throw new TypeError('formSettings (afterSubmit)'); }
        this.#useWarnElm = useWarnElm ? true : false;
        this.#delayTime = delayTime;
        this.#marginMaxLength = marginMaxLength;
        this.#validityMessage = validityMessage;
        this.#promiseTimeout = promiseTimeout;
        this.#formEnableSubmit = enableSubmit ? true : false;
        this.#formAfterSubmit = afterSubmit;
        return this;
    }
    confirmSettings ({enableSubmit = Form.#defaultEnableSubmit, onSubmit = Form.#defaultConfirmOnSubmit} = {}) {
        if (onSubmit instanceof Function == false) { throw new TypeError('confirmSettings (onSubmit)'); }
        this.#comfirmEnableSubmit = enableSubmit ? true : false;
        this.#confirmOnSubmit = onSubmit;
        return this;
    }
    append (name, fcbase, selector, {noStat = false, useBeforeViewSetting = true, useButtonSetting = true} = {}) {
        if (this.#isSetEvent == false) this.#addLoadEvent();
        this.#appendList.push(new FCAppendOption(name, fcbase, selector, noStat, useBeforeViewSetting, useButtonSetting));
        return this;
    }
    addInitTask (cbFn = (ctr) => {}) {
        if (cbFn instanceof Function == false) { throw new Error('addInitTask'); }
        if (this.#isSetEvent == false) this.#addLoadEvent();
        this.#initList.push(cbFn);
        return this;
    }
    #addLoadEvent () {
        this.#isSetEvent = true;
        const fm = this;
        const appendList = this.#appendList;
        const initList = this.#initList;
        addEventListener('load', () => {
            for (let option of appendList) {
                if (fm.#isInitError) return;
                fm.#fcBaseSettings(option);
            }
            this.#appendFinished = true;
            for (let cbFn of initList) {
                if (fm.#isInitError) return;
                cbFn(fm.#ctr);
            }
        }, false);
        addEventListener('error', (event) => {
            fm.#reasonInitError = event;
            fm.#isInitError = true;
        }, false);
    }
    #fcBaseSettings (option) {
        const fc = this.#ctr.append(option.name, option.FCBase, option.element, option.noStat);
        if (fc instanceof FCForm) {
            this.#execFormSettings(fc, option.useBeforeViewSetting, option.useButtonSetting);
        } else if (fc instanceof FCConfirm) {
            this.#execConfirmSettings(fc, option.useBeforeViewSetting, option.useButtonSetting);
        }
    }
    #execFormSettings (fc, useBeforeViewSetting, useButtonSetting) {
        fc.enableSubmit = this.#formEnableSubmit;
        fc.useWarnElm = this.#useWarnElm;
        fc.delayTime = this.#delayTime;
        fc.marginMaxLength = this.#marginMaxLength;
        fc.validityMessage = this.#validityMessage;
        fc.promiseTimeout = this.#promiseTimeout;
        const cmp = this.#formAfterSubmit === Form.#defaultFormAfterSubmit;
        fc.addEventList('afterSubmit', cmp ? this.#genFormAfterSubmit() : this.#formAfterSubmit);
        if (useBeforeViewSetting) {
            fc.addEventList('beforeView', this.#genFormBeforeView());
        }
        if (useButtonSetting) {
            fc.querySelectorAll('.back').forEach(elm => {
                elm.addEventListener('click', this.#genFormClickBackButton(fc));
            });    
        }
    }
    #genFormAfterSubmit () {
        const ctr = this.#ctr;
        return (result, fc) => {
            if (result == false) { // ?????????????????????????????????????????????
                if (fc.useWarnElm) { ctr.scroll(); }
            } else {
                ctr.setData(ctr.getKey(fc)); // form??????????????????????????????FormData???????????????????????????????????????????????????
                ctr.isConfirm ? ctr.view('confirm') : ctr.next(fc);
            }
        };
    }
    #genFormBeforeView () {
        const ctr = this.#ctr;
        return fc => {
            if (ctr.isFirst(fc)) {
                fc.querySelectorAll('.back').forEach(elm => {
                    elm.parentNode.style.display = ctr.isConfirm ? '' : 'none';
                });
            }
            if (ctr.isConfirm == false) { return; }
            fc.validationAll()
            .then(data => {
                if (Form.#D) console.dir(data);
            })
            .catch(reason => {
                if (reason instanceof Error) { throw reason; }
            });
        };
    }
    #genFormClickBackButton (fc) {
        const ctr = this.#ctr;
        return event => {
            if (ctr.isConfirm) {
                // ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
                const data = ctr.getData(ctr.getKey(fc));
                fc.clearValues();
                fc.setValues(data);
                ctr.view('confirm');
            } else { // ????????????????????????????????????
                ctr.back(fc);
            }
        };
    }

    #execConfirmSettings (fc, useBeforeViewSetting, useButtonSetting) {
        fc.enableSubmit = this.#comfirmEnableSubmit;
        const cmp = this.#confirmOnSubmit === Form.#defaultConfirmOnSubmit;
        fc.addEventList('submit', cmp ? this.#genConfirmOnSubmit() : this.#confirmOnSubmit);
        if (useBeforeViewSetting) {
            fc.addEventList('beforeView', this.#genConfirmBeforeView());
        }
        if (useButtonSetting) {
            fc.querySelectorAll('button.modify').forEach(elm => {
                elm.addEventListener('click', this.#genConfirmClickModifyButton(elm), false);
            });
        }
    }
    #genConfirmOnSubmit () {
        const ctr = this.#ctr;
        return (event, fc) => {
            ctr.setData(ctr.getKey(fc));
            ctr.getAllData().forEach((value, key) => console.log(`${key} : ${value}`));
            ctr.next(fc);
            return true;
        };
    }
    #genConfirmBeforeView () {
        const ctr = this.#ctr;
        return fc => {
            ctr.isConfirm = true;
            fc.clearConfirmValues();
            fc.setConfirmValues(ctr.getAllData());
        };
    }
    #genConfirmClickModifyButton (elm) {
        const ctr = this.#ctr;
        return event => {
            const classList = event.currentTarget.classList;
            const index = [...classList.values()].indexOf('modify') + 1;
            ctr.view(classList.item(index));
        };
    }
    start () {
        const fm = this;
        const ctr = this.#ctr;
        return new Promise((resolve, reject) => {
            addEventListener('load', () => {
                if (fm.#isInitError) {
                    reject(fm.#reasonInitError.error);
                    return;
                }
                ctr.start()
                .then(idbReq => resolve(idbReq))
                .catch(reason => reject(reason));
            }, false);
        });
    }
    updateExpires () { this.#ctr.updateExpires(); }
}

class FCAppendOption {
    #name;
    #fcbase;
    #selector;
    #noStat;
    #useBeforeViewSetting;
    #useButtonSetting;
    constructor (name = '', fcbase = '', selector = '', noStat = false, useBeforeViewSetting = true, useButtonSetting = true) {
        this.name = name;
        this.FCBase = fcbase;
        this.selector = selector;
        this.noStat = noStat;
        this.useBeforeViewSetting = useBeforeViewSetting;
        this.useButtonSetting = useButtonSetting;
    }
    set name (name) {
        if (FCAppendOption.#isEmpty(name)) { throw TypeError('FCAppendOption.name'); }
        this.#name = name;
    }
    get name () { return this.#name; }
    set FCBase (fcbase) {
        if (FCType.includes(fcbase) == false) { throw new TypeError('FCAppendOption.FCBase'); }
        this.#fcbase = fcbase;
    }
    get FCBase () { return this.#fcbase; }
    set selector (selector) {
        if (FCAppendOption.#isEmpty(selector)) { throw new TypeError('FCAppendOption.selector'); }
        this.#selector = selector;
    }
    get selector () { return this.#selector; }
    get element () { return document.querySelector(this.#selector); }
    set noStat (bool) { this.#noStat = bool ? true : false; }
    get noStat () { return this.#noStat; }
    static #isEmpty (value) {
        return (value == '' || value == undefined || value == null);
    }
    set useBeforeViewSetting (bool) {
        this.#useBeforeViewSetting = bool ? true : false;
    }
    get useBeforeViewSetting () { return this.#useBeforeViewSetting; }
    set useButtonSetting (bool) {
        this.#useButtonSetting = bool ? true : false;
    }
    get useButtonSetting () { return this.#useButtonSetting; }
}

export class FCType {
    static #map = new Map([
        ['base', FCBase],
        ['form', FCForm],
        ['confirm', FCConfirm],
        ['noForm', FCNoForm],
        ['error', FCError]
    ]);
    static get Base () { return FCType.#map.get('base'); }
    static get Form () { return FCType.#map.get('form'); }
    static get Confirm () { return FCType.#map.get('confirm'); }
    static get NoForm () { return FCType.#map.get('noForm'); }
    static get Error () { return FCType.#map.get('error'); }
    static includes (value) { return [...FCType.#map.values()].includes(value); }
}

export class VMType {
    static get Basic () { return ValidityMessage; }
    static get Jp () { return ValidityMessageJP; }
}

export class FCUtil {
    static get Timer () { return FCTimer; }
    static get timerState () { return FCTimerState; }
}