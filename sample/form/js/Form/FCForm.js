/* Form/FCForm.js | (c) marknCafe | https://github.com/marknCafe/Form/blob/main/LICENSE */
import { FCBase, FCNotExistsExeption, FCTimer, FCPromiseTimer } from './Base.js';
import { ValidityMessage, VMResult, VMSError, VMSCustomError } from './ValidityMessage.js';
export class FCForm extends FCBase {
/* フォーム画面を管理するためのクラス。
 * form要素内のinput, select等の入力要素のclass属性に記述されたヒントを元に入力要素の管理を行います。
 * submitイベント時にブラウザの書式検査、自由に設定可能な拡張検査を実行します。
 * ブラウザ毎に定義されているエラーメッセージを独自のメッセージに定義し、統一されたエラーメッセージを表示することができます。
 */
    static #D = false;
    static #regexTypeCR = /^checkbox|radio$/i;

    #message = {};
    #extValidation = {};
    #forcedValidation = {};
    #taskValidation = new Map();
    #useWarnElm = true;
    #noUseMessage = false;

    #delayTime = 1500;

    #marginMaxLength = 5;

    constructor (elmForm) {
        super(elmForm);
        this.form.noValidate = true;
        this.#message = {
            _default : new ValidityMessage()
        };
        this.#extValidation = {};
        this.#forcedValidation = {};
        this.#taskValidation = new Map();
        this.addEventList('submit', FCForm.#cbFuncValidation);

        const cbf = FCForm.#genCbfunc();

        this.addEventList('blur', cbf);
        this.addEventList('click', cbf);
        this.addEventList('input', FCForm.#genCbfuncInput());
        this.addEventList('keydown', FCForm.#genCbfuncKeydown());
        this.#setupReplaceEvent();
        this.#setMarginMaxLength();
    }

    extendValidityMessage(key, vm) {
        if (vm instanceof ValidityMessage == false) { throw new TypeError('obj is not instanceof ValidityMessage.'); }
        this.#message[key] = vm;
    }
    getExtendValidityMessage(key) {
        if (key in this.#message == false) { throw new FCNotExistsExeption('getExtendValidityMessage'); }
        return this.#message[key];
    }

    set useWarnElm (bool) {
        this.#useWarnElm = bool ? true : false;
    }
    get useWarnElm () {
        return this.#useWarnElm;
    }

    set noUseMessage (bool) {
        this.#noUseMessage = bool ? true : false;
    }
    get noUseMessage() {
        return this.#noUseMessage;
    }

    set validityMessage (vm) {
        this.extendValidityMessage('_default', vm);
    }
    get validityMessage () {
        return this.#message._default;
    }

    set delayTime (miriSec) {
        if (Number.isInteger(miriSec) == false) { throw new TypeError('delayTime, type'); }
        if (miriSec < 0) { throw new TypeError('delayTime, range'); }
        this.#delayTime = miriSec;
    }
    get delayTime () { return this.#delayTime; }

    set marginMaxLength (int) {
        if (Number.isInteger(int) == false) { throw new TypeError('marginMaxLength'); }
        if (int < 0) { throw new TypeError('marginMaxLength'); }
        this.#initMarginMaxLength();
        this.#marginMaxLength = int;
        this.#setMarginMaxLength();
    }
    get marginMaxLength () { return this.#marginMaxLength; }

    #setMarginMaxLength () {
        this.querySelectorAll('input').forEach(elm => {
            if (elm.maxLength == -1) { return; }
            elm.maxLength += this.#marginMaxLength;
        });
    }
    #initMarginMaxLength () {
        this.querySelectorAll('input').forEach(elm => {
            if (elm.maxLength == -1) { return; }
            elm.maxLength -= this.#marginMaxLength;
        });
    }

    addExtValidation (key = '', promise = FCExtendValidation.DftAsyncFunc, message = '', eventType = []) {
        if (this.has(key) == false) { throw new FCNotExistsExeption('addExtValidation'); }
        const ev = new FCExtendValidation(promise, message, eventType);
        if (key in this.#extValidation) {
            this.#extValidation[key].push(ev);
        } else {
            this.#extValidation[key] = [ev];
        }
    }
    addExtValidPromExec (key = '', executor = (elm, fc, resolve, reject) => { reject(); }, message = '', eventType = []) {
        if (executor instanceof Function == false) { throw new TypeError('addExtValidPromExecutor')}
        const asyncFunc = (elm, fc) => {
            return new Promise((resolve, reject) => executor(elm, fc, resolve, reject));
        };
        this.addExtValidation(key, asyncFunc, message, eventType);
    }
    addForcedValidation (baseKey, targetKey) {
        if (this.has(baseKey) == false) { throw new FCNotExistsExeption('addForcedValidation, baseKey'); }
        if (this.has(targetKey) == false) { throw new FCNotExistsExeption('addForcedValidation, targetKey'); }
        if (targetKey in this.#forcedValidation && this.#forcedValidation[targetKey].indexOf(baseKey) > -1) {
            throw new TypeError('It has already been registered in the reverse combination.');
        }
        if (baseKey in this.#forcedValidation) {
            if (this.#forcedValidation[baseKey].indexOf(targetKey) == -1) {
                this.#forcedValidation[baseKey].push(targetKey);
            }
        } else {
            this.#forcedValidation[baseKey] = [targetKey];
        }
    }

    addCondRequire (baseKey, targetKey, condVal, message = '',
    {useDisabled = true, eventType = [], cbFnDisabled = (cbFnCond, elm) => {}} = {}) {
        if (this.has(baseKey) == false) { throw new FCNotExistsExeption('addCondRequire, baseKey'); }
        if (this.has(targetKey) == false) { throw new FCNotExistsExeption('addCondRequire, targetKey'); }
        if ((condVal instanceof Object) == false && this.querySelectorAll(`[name="${targetKey}"][value="${condVal}"]`).length == 0) {
            console.log(new FCNotExistsExeption(`addCondRequire, settings: base=${baseKey}, target=${targetKey}, value=${condVal}`));
        }

        const cbFnCond = () => this.isMatch(targetKey, condVal);
        const cbFnCondRequire = this.#genCBFnCondRequire(cbFnCond, 'CondRequire');
        this.addExtValidation(baseKey, cbFnCondRequire, message, eventType);
        this.addForcedValidation(targetKey, baseKey);

        if (useDisabled == false) { return; }

        const cbFnInput = this.#genCBFnInputDisabled(baseKey, cbFnCond, cbFnDisabled);
        const targetElms = this.querySelectorAll(`[name="${targetKey}"]`);
        targetElms.forEach(elm => elm.addEventListener('input', cbFnInput, false));
        this.addEventList('beforeView', fc => cbFnInput());
    }
    #genCBFnCondRequire (cbFnCond, errLabel) {
        return async (elm) => {
            if (cbFnCond()) {
                return (this.isEmpty(elm.name) == true) ? errLabel : true;
            }
            return true;
        };
    }
    #genCBFnInputDisabled (baseKey, cbFnCond, extendFn = (condition, key) => {}) {
        return () => {
            const baseElms = this.querySelectorAll(`[name="${baseKey}"]`);
            const condition = cbFnCond();
            if (condition) {
                baseElms.forEach(elm => elm.disabled = false);
            } else {
                baseElms.forEach(elm => elm.disabled = true);
                this.clearValue(baseKey);
            }
            extendFn(condition, baseKey);
        };
    }
    addCondRequireOr (baseKeys = [], targetArray = [], message = '',
    {useDisabled = true, eventType = [], cbFnDisabled = (condition, key) => {}} = {}) {
        const cbFnCond = () => targetArray.some(([key, cond]) => this.isMatch(key, cond));
        this.#addCondRequireMultiple(baseKeys, targetArray, message, useDisabled, eventType, cbFnCond, cbFnDisabled, 'CondRequireOr');
    }
    addCondRequireAnd (baseKeys = [], targetArray = [], message = '',
    {useDisabled = true, eventType = [], cbFnDisabled = (condition, key) => {}} = {}) {
        const cbFnCond = () => targetArray.some(([key, cond]) => this.isMatch(key, cond) == false) == false;
        this.#addCondRequireMultiple(baseKeys, targetArray, message, useDisabled, eventType, cbFnCond, cbFnDisabled, 'CondRequireAnd');
    }
    #addCondRequireMultiple (baseKeys, targetArray, message, useDisabled, eventType, cbFnCond, cbFnDisabled, errLabel) {
        if (baseKeys instanceof Array == false) { throw new TypeError('baseKey'); }
        if (targetArray instanceof Array == false) { throw new TypeError('target'); }
        const invalidLayout = targetArray.some(data => data instanceof Array == false || data.length != 2);
        if (invalidLayout) { throw new TypeError('target'); }
    
        const cbFnRequire = this.#genCBFnCondRequire(cbFnCond, errLabel);

        baseKeys.forEach(baseKey => {
            this.addExtValidation(baseKey, cbFnRequire, message, eventType);
            targetArray.forEach(([targetKey,]) => this.addForcedValidation(targetKey, baseKey));
            
            if (useDisabled == false) { return; }

            const cbFnInput = this.#genCBFnInputDisabled(baseKey, cbFnCond, cbFnDisabled);
            targetArray.forEach(([targetKey,]) => {
                const targetElms = this.querySelectorAll(`[name="${targetKey}"]`);
                targetElms.forEach(elm => elm.addEventListener('input', cbFnInput, false));
            });
            this.addEventList('beforeView', fc => cbFnInput());
        });
    }

    #cbfCatchValidPromise (result, label = 'someError') {
        if (result instanceof VMSError == false) {
            let error = result;
            if (result instanceof Error == false) {
                error = new Error(result);
            }
            throw error;
        }
    }
    static #genCbfunc () {
        return (event, fc) => {
            const pr = fc.validation(event.currentTarget, false, event);
            const timer = new FCPromiseTimer(this.promiseTimeoutMiriSec);
            timer.start([[pr], event.type]);
            pr.then(() => { timer.clear(); })
            .catch(result => fc.#cbfCatchValidPromise(result, `${event.type}Event`) );
        };
    }

    static #genCbfuncInput () {
        let timer;
        return (event, fc) => {
            if (event.key == 'Tab') { return; }
            const elm = event.currentTarget;
            if (timer instanceof FCTimer) {
                timer.clear();
            }
            timer = new FCTimer(() => {
                timer = undefined;
                const pr = fc.validation(elm, false, event);
                const pTimer = new FCPromiseTimer(this.promiseTimeoutMiriSec);
                pTimer.start([[pr], event.type]);
                pr.then(result => {
                    pTimer.clear();
                    if (elm.classList.contains('notrim')) { return; }
                    const regexSpace = /(?:^\s+|\s+$)/;
                    if (regexSpace.test(elm.value)) {
                        // elm.valueをコード側で変更すると、ブラウザの有効性チェックが働かないので置換は最低限にとどめる
                        elm.value = elm.value.replace(regexSpace, '');
                    }
                })
                .catch(result => fc.#cbfCatchValidPromise(result, 'inputEvent') );
            }, fc.#delayTime);
            timer.start();
        };
    }
    static #genCbfuncKeydown () {
        return (event, fc) => {
            const elm = event.currentTarget;
            const isSpace = /\s/.test(event.key) == true && elm.value.length == 0;
            if (isSpace || /^enter$/i.test(event.key)) {
                event.preventDefault();
            }
        }
    }

    #setupReplaceEvent () {
        this.forEach((elm, key) => {
            this.querySelectorAll(`[name=${key}]`)
                .forEach(elm => this.#addReplaceEvent(elm));
        });
    }
    #addReplaceEvent (elm) {
        const find = [...elm.classList.values()].find(value => /^cfr-[^\s]+/i.test(value));
        if (find == undefined) { return; }
        const key = find.replace('cfr-', '');
        if (FCFReplace.has(key) == false) {
            return;
        }
        const [regex, cbReplace] = FCFReplace.get(key);
        const cbFunc = event => {
            const elm = event.currentTarget;
            elm.value = elm.value.replace(regex, cbReplace);
        };
        this.addEventFormItem(elm.name, {
            blur : cbFunc
        });
    }

    static #cbFuncValidation (event, fc) {
        if (fc.#useWarnElm) {
            return fc.validationAll(event);
        } else {
            return fc.#validationStopFindInvalid(event);
        }
    }
    async #validationStopFindInvalid (event) {
        const promises = [];
        const timer = new FCPromiseTimer(this.promiseTimeoutMiriSec);
        timer.start([promises, 'validationStopFindInvalid']);
        let isValid = true;
        try {
            for (let nodeList of this.values()) {
                const result = await this.#genPromiseVSFI(nodeList.item(i), event, promises);
                if (result.isInvalid) {
                    isValid = false;
                    break;
                }
            }
            timer.clear();
            return isValid;
        } catch (reason) {
            timer.clear();
            throw reason;
        }
    }
    #genPromiseVSFI (elm, event, promises) {
        const pr = this.validation(elm, false, event);
        promises.push(pr);
        return pr;
    }

    testElm (elm, event) {
        const fc = this;
        const pr = fc.validation(elm, true, event);
        const timer = new FCPromiseTimer(this.promiseTimeoutMiriSec);
        timer.start([[pr], 'testElm']);
        pr.then(() => { timer.clear(); });
        return pr;
    }

    test (event) {
        const promises = [];
        this.forEach( nodeList => promises.push(this.validation(nodeList.item(0), true, event)) );
        return this.#genPromiseValidationAll(promises, 'test');
    }
    validationAll (event) {
        const promises = [];
        this.forEach( nodeList => promises.push(this.validation(nodeList.item(0), false, event)) );
        return this.#genPromiseValidationAll(promises, 'validationAll');
    }

    async #genPromiseValidationAll (promises, name) {
        const timer = new FCPromiseTimer(this.promiseTimeoutMiriSec);
        timer.start([promises, name]);
        try {
            const result = await Promise.allSettled(promises);
            timer.clear();
            const errorData = result.find(data => data.status == 'rejected');
            if (errorData) { throw errorData.reason; }
            if (result.some(data => data.value.isInvalid)) {
                return false;
            } else {
                return true;
            }
        } catch (reason) {
            throw reason;
        }
    }

    validation (elm, noUseMessage = false, event) {
        if (this.#taskValidation.get(elm.name) instanceof Promise) {
            return this.#taskValidation.get(elm.name);
        }

        if (elm.name in this.#forcedValidation) {
            this.#forcedValidation[elm.name]
            .forEach(key => {
                const pr = this.validation(this.querySelector(`[name=${key}]`), noUseMessage, event);
                const timer = new FCPromiseTimer(this.promiseTimeoutMiriSec);
                timer.start([[pr], 'forcedValidation']);
                pr.then(() => { timer.clear(); })
                .catch(result => this.#cbfCatchValidPromise(result, 'forcedValidation') );
            });
        }

        const promiseValid = this.#genPromiseValid(elm, noUseMessage, event);
        this.#taskValidation.set(elm.name, promiseValid);
        return promiseValid;
    }

    async #genPromiseValid (elm, noUseMessage, event) {
        try {
            const result = await this.#getCustomMessage(elm, event);
            if ((this.#noUseMessage || noUseMessage) == false) {
                this.#setMessage(elm, result);
            }
            this.#taskValidation.set(elm.name, null);
            return result;
        } catch (reason) {
            throw reason;
        }
    }

    #getValidityMessage (elm) {
        const findVal = [...elm.classList.values()].find(value => /^vm-[^\s]+/i.test(value));
        if (findVal == undefined) {
            return this.#message._default;
        } else {
            const key = findVal.replace('vm-', '');
            return key in this.#message ? this.#message[key] : this.#message._default;
        }
    }

    async #getCustomMessage (elm, event) {
        const vm = this.#getValidityMessage(elm);
        const result = vm.getCustomMessage(elm, this.#marginMaxLength);
        if (result.isInvalid) {
            return result;
        }
        const hasExtValidation = (elm.name in this.#extValidation);
        if (hasExtValidation == false) {
            return result;
        }
        const promises = [];
        this.#extValidation[elm.name].forEach(exValid => {
            promises.push(exValid.exec(elm, this, event));
        });

        try {
            const resultSet = await Promise.allSettled(promises);
            const resRejected = resultSet.find(data => data.status == 'rejected');
            if (resRejected != undefined) {
                throw resRejected.reason;
            }
            const resInvalid = resultSet.find(data => {
                if (data.value instanceof VMResult == false) { throw TyperError('Return value is not a "VMResult" class.'); }
                return data.value.isInvalid;
            });
            return resInvalid ? resInvalid.value : result;
        } catch (reason) {
            throw reason;
        }
    }

    #setMessage (elm, result) {
        const isInvalid = result.isInvalid;
        const className = isInvalid ? 'invalid' : 'valid';

        const classList = elm.classList;
        classList.remove('invalid', 'valid');
        classList.add(className);

        if (FCForm.#regexTypeCR.test(elm.type)) {
            elm.form.querySelectorAll(`[name=${elm.name}]`).forEach(elm => {
                const parentClassList = elm.parentNode.classList;
                parentClassList.remove('invalid', 'valid');
                parentClassList.add(className);    
            });
        }

        if (this.#useWarnElm) {
            this.#getElmWarnig(elm).forEach(elm => {
                elm.classList.remove('invalid', 'valid');
                elm.classList.add(className);
                elm.innerHTML = '';
                if (isInvalid) {
                    elm.appendChild(document.createTextNode(result.message));
                }
            });
        } else if (isInvalid) {
            elm.setCustomValidity(result.message);
            elm.reportValidity();
        }
    }
    #getElmWarnig (elm) {
        const elmWarning = elm.form.querySelectorAll(`.warning.${elm.name}, .warning > .${elm.name}`);
        if (elmWarning.length == 0) {
            throw new FCNotExistsExeption(`Element for warning "${elm.name}'"`);
        }
        return elmWarning;
    }
    isMatch (key, condition) {
        let targetVal; // Array
        try { targetVal = this.getValues(key); }
        catch (e) { throw e; }

        if (condition instanceof Array) {
            if (condition.length == 0) { throw TypeError('isMatch'); }
            if (targetVal.length != condition.length) { return false; }
            return !condition.some(cValue => {
                return !targetVal.some(tValue => tValue == cValue);
            });
        }

        let condFunc;
        if (condition instanceof Function) {
            condFunc = condition;
        } else {
            condFunc = value => value == String(condition);
        }
        return targetVal.some(condFunc);
    }

    addItem (elm) {
        super.addItem(elm);
        this.#addReplaceEvent(elm);
    }
}

class FCExtendValidation {
/* 拡張検査処理のデータ書式を定義したクラス。 */
    static async DftAsyncFunc (elm, fc) { return; /* or throw */};
    #asyncFunc = FCExtendValidation.DftAsyncFunc;
    #message = '';
    #eventType = [];
    constructor (asyncFunc = FCExtendValidation.DftAsyncFunc, message, eventType = []) {
        this.#setAsyncFunc(asyncFunc);
        this.message = message;
        this.eventType = eventType;
    }

    #setAsyncFunc (asyncFunc) {
        if (asyncFunc instanceof Function == false) { throw new TypeError('FCExtendValidation'); }
        if (asyncFunc === FCExtendValidation.DftAsyncFunc) { throw new TypeError('FCExtendValidation'); }
        this.#asyncFunc = asyncFunc;
    }
    set message (val) {
        this.#message = String(val);
    }
    get message () {
        return this.#message;
    }
    set eventType (eventType) {
        if (eventType instanceof Array == false) { throw new TypeError('eventType'); }
        this.#eventType = eventType;
    }

    async exec (elm, fc, event) {
        if (event instanceof Event && this.#eventType.length > 0) {
            if (this.#eventType.some(type => type == event.type) == false) {
                return new VMResult();
            }
        }
        try {
            const result = await this.#asyncFunc(elm, fc);
            if (result == true) {
                return new VMResult();
            } else {
                return new VMResult(
                    this.#message,
                    new VMSCustomError(elm.name + (result == false ? '' : `, ${result}`))
                );
            }
        } catch (reason) {
            throw reason instanceof Error ? reason : new Error(elm.name + (reason ? `, ${reason}` : ''));
        }
    }
}

class FCFReplace {
    static #list = {
        // 全角から半角
        'wth' : [/[\uff01-\uff5e]/gu, target => String.fromCharCode(target.charCodeAt(0) - 0xFEE0)],
        // 半角から全角
        'htw' : [/[!-~]/gu, target => String.fromCharCode(target.charCodeAt(0) + 0xFEE0)],
        // カタカナからひらがな
        'kth' : [/[\u30a1-\u30f6]/gu, target => String.fromCharCode(target.charCodeAt(0) - 0x60)],
        // ひらがなからカタカナ
        'htk' : [/[\u3041-\u3096]/gu, target => String.fromCharCode(target.charCodeAt(0) + 0x60)]
    };
    static get (key) { return FCFReplace.#list[key]; }
    static has (key) { return key in FCFReplace.#list; }
}