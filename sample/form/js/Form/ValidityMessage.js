import {
    VMSError, VMSErrorBadInput, VMSErrorPatternMismatch, VMSErrorTypeMismatch,
    VMSErrorValueMissing, VMSErrorTooLong, VMSErrorTooShort,
    VMSErrorRangeOverflow, VMSErrorRangeUnderflow, VMSErrorStepMismatch,
    VMSCustomError
 } from "./Exeption.js";
 export {
    VMSError, VMSErrorBadInput, VMSErrorPatternMismatch, VMSErrorTypeMismatch,
    VMSErrorValueMissing, VMSErrorTooLong, VMSErrorTooShort,
    VMSErrorRangeOverflow, VMSErrorRangeUnderflow, VMSErrorStepMismatch,
    VMSCustomError
 };
export class ValidityMessage {
    static #D = false;
    static #regexSelection = /^checkbox|radio$/i;
    static #regexTypeName = / ?vmt-([^\s]+)/i;

    #listTypeName = {};
    #cbfSetMessage = {};

    constructor () {
        this.#genListTypeName();
        this.#genCbFuncSetMessage();
    }

    get listTypeName () {
        return this.#listTypeName;
    }

    getCustomMessage (elm) {
        if (elm.classList.contains('vmNo') == true) {
            if (elm.validationMessage.length > 0) {
                return new VMResult(
                    elm.validationMessage,
                    new VMSError('Some error')
                );
            }
            return new VMResult();
        }
        const isTypeEnter = this.#isTypeEnter(elm);
        const validityState = elm.validity;
        const cfsm = this.#cbfSetMessage;
        let message, reason;
        if (validityState.badInput) {
            message = cfsm.badInput(isTypeEnter, elm, this);
            reason = new VMSErrorBadInput(elm.name);
        } else if (validityState.patternMismatch) {
            message = cfsm.patternMismatch(isTypeEnter, elm, this);
            reason = new VMSErrorPatternMismatch(elm.name);
        } else if (validityState.typeMismatch) {
            message = cfsm.typeMismatch(isTypeEnter, elm, this);
            reason = new VMSErrorTypeMismatch(elm.name);
        } else if (elm.type == 'checkbox' && this.#isEmptyCheckbox(elm)) {
            const orgRequired = elm.required;
            elm.required = true;
            message = cfsm.valueMissing(isTypeEnter, elm, this);
            reason = new VMSErrorValueMissing(elm.name);
            elm.required = orgRequired;
        } else if (elm.type != 'checkbox' && validityState.valueMissing) {
            message = cfsm.valueMissing(isTypeEnter, elm, this);
            reason = new VMSErrorValueMissing(elm.name);
        } else if (validityState.tooLong) {
            message = cfsm.tooLong(isTypeEnter, elm, this);
            reason = new VMSErrorTooLong(elm.name);
        } else if (validityState.tooShort) {
            message = cfsm.tooShort(isTypeEnter, elm, this);
            reason = new VMSErrorTooShort(elm.name);
        } else if (elm.maxLength > -1 && elm.value.length > elm.maxLength) {
            message = cfsm.tooLong(isTypeEnter, elm, this);
            reason = new VMSErrorTooLong(elm.name);
        } else if (elm.minLength > -1 && elm.value.length < elm.minLength) {
            message = cfsm.tooShort(isTypeEnter, elm, this);
            reason = new VMSErrorTooShort(elm.name);
        } else if (validityState.rangeOverflow) {
            message = cfsm.rangeOverflow(isTypeEnter, elm, this);
            reason = new VMSErrorRangeOverflow(elm.name);
        } else if (validityState.rangeUnderflow) {
            message = cfsm.rangeUnderflow(isTypeEnter, elm, this);
            reason = new VMSErrorRangeUnderflow(elm.name);
        } else if (validityState.stepMismatch) {
            message = cfsm.stepMismatch(isTypeEnter, elm, this);
            reason = new VMSErrorStepMismatch(elm.name);
        } else {
            return new VMResult();
        }
        return new VMResult(message, reason);
    }

    #isEmptyCheckbox (elm) {
        const form = elm.form;
        const isTarget = (form.querySelector(`[name="${elm.name}"]:required`) || form.querySelector(`[name="${elm.name}"].required`) ? true : false);
        if (isTarget == false) {
            return false;
        }
        return elm.form.querySelectorAll(`[name="${elm.name}"]:checked`).length == 0 ? true : false;
    }

    #isTypeEnter (elm) {
        if (elm.tagName == 'INPUT' && ValidityMessage.#regexSelection.test(elm.type) || elm.tagName == 'SELECT' ) {
            return false;
        }
        return true;
    }

    #genListTypeName () {
        this.#listTypeName = {
            'tel' : 'Phone number format',
            'url' : 'URL format',
            'number' : 'Numeric',
            'alphabet' : 'Alphabet',
            'alpha-num' : 'Alpanumeric',
            'email' : 'E-mail format'
        };
    }

    #genCbFuncSetMessage () {
        const cbFn = (isTypeEnter, elm, vm) => elm.validationMessage;
        const cfsm = {
            badInput : cbFn,
            patternMismatch : cbFn,
            typeMismatch : cbFn,
            valueMissing : cbFn,
            tooLong : cbFn,
            tooShort : cbFn,
            rangeOverflow : cbFn,
            rangeUnderflow : cbFn,
            stepMismatch : cbFn
        };
        this.#cbfSetMessage = cfsm;
    }

    setCbFuncMessage (key, message) {
        if (key in this.#cbfSetMessage == false) {
            throw new TypeError('"key" is not exists.');
        }
        if (message instanceof Function) {
            this.#cbfSetMessage[key] = message;
        } else {
            this.#cbfSetMessage[key] = (isTypeEnter, elm, vm) => String(message);
        }
    }

    getTypeName (elm) {
        if (elm.tagName == 'INPUT') {
            if (elm.type in this.#listTypeName) {
                return this.#listTypeName[elm.type];
            }
        }
        const tnKey =  ValidityMessage.#regexTypeName.exec(elm.className);
        if (tnKey instanceof Array) {
            return tnKey[1] in this.#listTypeName ? this.#listTypeName[tnKey[1]] : '';
        }
        return '';
    }

    getLabelText (elm) {
        let label = elm.form.querySelector(`[for="${elm.id}"]`);
        if (!label) {
            label = elm.form.querySelector(`.vmfor-${elm.name}`);
        }
        return label ? label.textContent : '';
    }

    copy () {
        const copyObj = new this.constructor();
        Object.entries(this.#listTypeName)
            .forEach(([key, value]) => copyObj.listTypeName[key] = value );
        Object.entries(this.#cbfSetMessage)
            .forEach(([key, value]) => copyObj.setCbFuncMessage(key, value) );
        return copyObj;
    }
}

export class VMResult {
    static #DftReason = new VMSError();
    #reason = undefined;
    #message = undefined;
    constructor (message = '', reason = VMResult.#DftReason) {
        if (message != undefined && message != null && message != '') {
            this.#_message = message;
        }
        if (reason !== VMResult.#DftReason) {
            this.#_reason = reason;
        }
    }

    set #_message (message) {
        this.#message = String(message);
    }
    get message () { return this.#message; }
    set #_reason (reason) {
        if (reason instanceof VMSError) {
            this.#reason = reason;
        } else {
            this.#reason = new VMSCustomError(reason);
        }
    }
    get reason () { return this.#reason; }

    get isInvalid () {
        const check = (this.#reason != undefined || this.#message instanceof VMSError);
        return check;
    }
    get isValid () { return !this.isInvalid; }
}

export class VMBadArgumentExeption extends Error {
    constructor (note) {
        super('Bad argument.' + (note ? `'(${note})` : ''));
    }
}

export class ValidityMessageJP extends ValidityMessage {
    #actEnter = '入力してください。';
    #actSelect = 'お選びください。';
    #rngChrLenRange = '#min#文字から#max#文字の間で'; // min to max
    #rngChrLenMore = '#min#文字以上で'; // only min
    #rngChrLenLess = '#max#文字以下で'; // only max
    #rngChrLenEqual = '#max#文字で'; // min eq max
    #rngNumRange = '#min#以上#max#以下で';
    #rngNumMore = '#min#以上で';
    #rngNumLess = '#max#以下で';
    #typeMismatch = '正しく';
    #requiredEnter = '入力してください。';
    #requiredSelect = '選択してください。';

    constructor () {
        super();
        this.#genListTypeName();
        this.#genCbFuncSetMessage();
    }

    #genListTypeName() {
        this.listTypeName.number = '数字';
        this.listTypeName.hw_number = '半角数字';
        this.listTypeName.alphabet = '英字';
        this.listTypeName.hw_alphabet = '半角英字';
        this.listTypeName.alphanum = '英数字';
        this.listTypeName.hw_alphanum = '半角英数字';
        this.listTypeName.hiragana = 'ひらがな';
        this.listTypeName.katakana = 'カタカナ';
        this.listTypeName.email = ''; //'Eメール形式';
        this.listTypeName.tel = ''; //'電話番号の形式で';
        this.listTypeName.url = 'URL';
    }

    #genCbFuncSetMessage () {
        const genMessage1 = (isTypeEnter, elm, vm) => {
            const label = vm.getLabelText(elm);
            const typeName = vm.getTypeName(elm);
            const particle = typeName != '' ? 'は' : 'を';
            return (label != '' ? `${label}${particle}` : '')
                + (typeName != '' ? `${typeName}で` : '')
                + vm.#typeMismatch + (isTypeEnter ? vm.#actEnter : vm.#actSelect);
        };
        this.setCbFuncMessage('badInput', genMessage1);
        this.setCbFuncMessage('patternMismatch', genMessage1);
        this.setCbFuncMessage('typeMismatch', genMessage1);
        this.setCbFuncMessage('valueMissing', (isTypeEnter, elm, vm) => {
            const label = vm.getLabelText(elm);
            return (label != '' ? `${label}を` : '') + (isTypeEnter ? vm.#actEnter : vm.#actSelect);
        });

        this.setCbFuncMessage('tooLong', (isTypeEnter, elm, vm) => {
            const label = vm.getLabelText(elm);
            const typeName = vm.getTypeName(elm);
            const particle = 'は';//typeName != '' ? 'は' : 'を';
            const msgAction = isTypeEnter ? vm.#actEnter : vm.#actSelect;
            const msgRange = (elm.minLength == elm.maxLength) ? vm.#rngChrLenEqual : vm.#rngChrLenLess;
                                            //(elm.minLength > 0 ? vm.#rngChrLenRange : vm.#rngChrLenLess);
            const message = (label != '' ? `${label}${particle}` : '')
                + (typeName != '' ? `${typeName}` : '')
                + msgRange + msgAction;
            return message.replace(/#min#/i, elm.minLength).replace(/#max#/i, elm.maxLength);
        });

        this.setCbFuncMessage('tooShort', (isTypeEnter, elm, vm) => {
            const label = vm.getLabelText(elm);
            const typeName = vm.getTypeName(elm);
            const particle = 'は';//typeName != '' ? 'は' : 'を';
            const msgAction = isTypeEnter ? vm.#actEnter : vm.#actSelect;
            const msgRange = (elm.minLength == elm.maxLength) ? vm.#rngChrLenEqual : vm.#rngChrLenMore;
                                            //(elm.maxLength > 0 ? vm.#rngChrLenRange : vm.#rngChrLenMore);
            const message = (label != '' ? `${label}${particle}` : '')
            + (typeName != '' ? `${typeName}` : '')
            + msgRange + msgAction;
            return message.replace(/#min#/i, elm.minLength).replace(/#max#/i, elm.maxLength);
        });

        this.setCbFuncMessage('rangeOverflow', (isTypeEnter, elm, vm) => {
            const label = vm.getLabelText(elm);
            const msgAction = isTypeEnter ? vm.#actEnter : vm.#actSelect;
            const message = (label != '' ? `${label}は` : '') + (elm.min != '' ? vm.#rngNumRange : vm.#rngNumLess) + msgAction;
            return message.replace(/#min#/i, elm.min).replace(/#max#/i, elm.max);
        });
        this.setCbFuncMessage('rangeUnderflow', (isTypeEnter, elm, vm) => {
            const label = vm.getLabelText(elm);
            const msgAction = isTypeEnter ? vm.#actEnter : vm.#actSelect;
            const message = (label != '' ? `${label}は` : '') + (elm.max != '' ? vm.#rngNumRange : vm.#rngNumMore) + msgAction;
            return message.replace(/#min#/i, elm.min).replace(/#max#/i, elm.max);
        });
        this.setCbFuncMessage('stepMismatch', genMessage1);
    }

    set actEnter (newMessage) { this.#actEnter = newMessage.toString(); }
    get actEnter () { return this.#actEnter; }

    set actSelect (newMessage) { this.#actSelect = newMessage.toString(); }
    get actSelect () { return this.#actSelect; }

    set rngChrLenRange (newMessage) { this.#rngChrLenRange = newMessage.toString(); }
    get rngChrLenRange () { return this.#rngChrLenRange; }

    set rngChrLenMore (newMessage) { this.#rngChrLenMore = newMessage.toString(); }
    get rngChrLenMore () { return this.#rngChrLenMore; }

    set rngChrLenLess (newMessage) { this.#rngChrLenLess = newMessage.toString(); }
    get rngChrLenLess () { return this.#rngChrLenLess; }

    set rngChrLenEqual (newMessage) { this.#rngChrLenEqual = newMessage.toString(); }
    get rngChrLenEqual () { return this.#rngChrLenEqual; }

    set rngNumRange (newMessage) { this.#rngNumRange = newMessage.toString(); }
    get rngNumRange () { return this.#rngNumRange; }

    set rngNumMore (newMessage) { this.#rngNumMore = newMessage.toString(); }
    get rngNumMore () { return this.#rngNumMore; }

    set rngNumLess (newMessage) { this.#rngNumLess = newMessage.toString(); }
    get rngNumLess () { return this.#rngNumLess; }

    set requiredEnter (newMessage) { this.#requiredEnter = newMessage.toString(); }
    get requiredEnter () { return this.#requiredEnter; }

    set requiredSelect (newMessage) { this.#requiredSelect = newMessage.toString(); }
    get requiredSelect () { return this.#requiredSelect; }
}
/*
     x   badInput
     n   customError
     x   patternMismatch
     x   rangeOverflow
     x   rangeUnderflow
     x   stepMismatch
     x   tooLong
     x   tooShort
     x   typeMismatch
     n   valid
     x   valueMissing // required
*/