/* Form/Controller.js | (c) marknCafe | https://github.com/marknCafe/Form/blob/main/LICENSE */
import { FCBase, FCEventHandlerList, FCTimer, FCTimerState } from './Base.js';
import { FCNotExistsExeption, FCFailedOpenIDBExeption } from './Exeption.js';
import { FCForm } from './FCForm.js';
import { FCConfirm } from './Confirm.js';
import { FCError } from './Error.js';
import { FCNoForm } from './NoForm.js';
import { IDB } from './IDB.js';
export  {
    FCBase, FCForm, FCConfirm, FCError, FCNoForm, FCEventHandlerList, FCNotExistsExeption, FCFailedOpenIDBExeption
};
export class FCController {
    static #nameList = {};
    static #NotActive = () => {
        const elm = document.createElement('div');
        elm.appendChild(document.createElement('form'));
        return new FCBase(elm);
    };
    static #DefaultOnExpires = ctr => { undefined; };
    #fcCol = new Map();
    #data = new Map();
    #keyStat = undefined;
    #keyExpires = undefined;
    #keyIsConfirm = undefined;
    #keyIdbName = undefined;
    #keyIdbStore = undefined;
    #active = FCController.#NotActive;
    #expires = 0;
    #onExpires = FCController.#DefaultOnExpires;
    #timer = new FCTimer(() => {}, 0);

    #idb = undefined;
    #useIdb = true;

    #cbfUploadDb = undefined;

    constructor (name, useIdb = true) {
        if (!name) { throw new TypeError('"name" is not defined.'); }
        if (name in FCController.#nameList) { throw new TypeError('"name" is already in use.'); }
        FCController.#nameList[name] = true;
        this.#keyStat = `fc-${name}-stat`;
        this.#keyExpires = `fc-${name}-expires`;
        this.#keyIsConfirm = `fc-${name}-isconfirm`;
        this.#keyIdbName = `fc-idb-${name}`;
        this.#keyIdbStore = `fc-idb-${name}-store`;

        this.#fcCol = new Map();
        this.#data = new Map ();
        this.#useIdb = useIdb;
        this.#idbSetting();
        this.#addEventFocus();
    }
    append(key, type, parentNode, noStat) {
        if (key.length == 0 || this.#fcCol.has(key)) {
            throw new TypeError('append');
        }
        const fc = this.#genFC(type, parentNode, noStat);
        this.#fcCol.set(key, fc);
        return fc;
    }
    get(key) {
        if (this.#fcCol.has(key) == false) {
            throw new FCNotExistsExeption('append');
        }
        return this.#fcCol.get(key);
    }

    view (key) { this.#fcCol.get(key).view(); }
    hide (key) { this.#fcCol.get(key).hide(); }
    hideAll () { Array.from(this.#fcCol.values()).forEach(fc => fc.hide()); }

    #viewNext(fc, list, from, errMessage) {
        if (fc instanceof FCBase == false) { throw new TypeError(from); }
        const index = list.indexOf(fc);
        if (index == -1) { throw new FCNotExistsExeption('next'); }
        if (index + 1 == list.length) { throw new Error(errMessage); }
        list[index + 1].view();        
    }
    next (fc) {
        const list = Array.from(this.#fcCol.values());
        this.#viewNext(fc, list, 'next', 'Target is last element.');
    }
    back (fc) {
        const list = Array.from(this.#fcCol.values()).reverse();
        this.#viewNext(fc, list, 'back', 'Target is first element.');
    }
    getKey(fc) {
        if (fc instanceof FCBase == false) { throw new TypeError('getKey'); }
        const result = Array.from(this.#fcCol.entries()).find(target => target[1] === fc);
        if (result == undefined) { throw new FCNotExistsExeption('getKey'); }
        return result[0];
    }
    #genFC (type, parentNode, noStat) {
        const fc = new type(parentNode);
        if (fc instanceof FCBase == false) { TypeError('"type" is not instance of FCBase.'); }
        fc.addEventList('beforeView', this.#genDefaultBeforeView(noStat));
        return fc;
    }
    #genDefaultBeforeView (noStat) {
        const ctr = this;
        return myFc => {
            setTimeout(() => ctr.scroll(), 1);
            if (this.#multiView == false && ctr.#active !== FCController.#NotActive) {
                ctr.#active.hide();
            }
            ctr.#active = myFc;
            if (noStat) { return ; }
            sessionStorage.setItem(this.#keyStat, ctr.getKey(myFc));
        }
    }

    setData (key) {
        const fc = this.get(key);
        this.#data.set(key, fc.getCollectedFormData());
        if (this.#useIdb == false) { return; }

        const pr = this.#idb.put({
            page : key,
            formData : this.#genSimpleObj(fc.getCollectedFormData())
        });
        pr.catch(([req, ]) => { throw req.error; });
    }
    getData (key) {
        if (this.#data.has(key) == false) { throw new FCNotExistsExeption(`getData, key: ${key}`); }
        return this.#data.get(key);
    }
    getAllData () {
        const newData = new FormData();
        this.#data.forEach( data => {
            data.forEach((v, k) => newData.append(k, v) );
        });
        return newData;
    }
    setALlValues () {
        this.#data.forEach( (data, key) => this.#fcCol.get(key).setValues(data) );
    }
    set expires (sec) {
        if (Number.isInteger(sec) == false) { throw new TypeError('expires'); }
        if (sec < 0) { sec = -1; }
        this.#expires = sec;
    }
    #initExpires (clearStrage = false) {
        if (this.#expires <= 0) { return; }
        const strExpires = sessionStorage.getItem(this.#keyExpires);
        if (strExpires == '' || strExpires == 0 || strExpires == null) {
            if (clearStrage) { this.#clearStrage(); }
            sessionStorage.setItem(this.#keyExpires, Number(new Date()) + (this.#expires * 1000));
        }
        if (this.#onExpires !== FCController.#DefaultOnExpires) {
            this.#setTimerExpires();
        }
    }
    get expires () {
        return this.#expires;
    }
    get expiresDate () {
        if (this.#expires == 0) { return null; }
        return new Date( Number(sessionStorage.getItem(this.#keyExpires)) );
    }
    get remainingTime () {
        const strExpires = sessionStorage.getItem(this.#keyExpires);
        if (strExpires == 0) { return 0; }
        const miriSec = Number(strExpires) - Number(new Date());
        return miriSec / 1000;
    }
    updateExpires () {
        sessionStorage.removeItem(this.#keyExpires);
        this.#initExpires();
    }

    set isConfirm (bool) {
        sessionStorage.setItem(this.#keyIsConfirm, bool ? 1 : 0);
    }
    get isConfirm () {
        return sessionStorage.getItem(this.#keyIsConfirm) == '1' ? true : false;
    }
    async #LoadFormDatas (key) {
        try {
            const [req, ] = await this.#idb.get(key);
            const fc = this.#fcCol.get(key);
            if (req.result != undefined) {
                fc.clearValues();
                fc.setValues(req.result.formData);
            }
            const data = fc.getCollectedFormData();
            this.#data.set(key, data);
            return req;
        } catch (data) {
            const [req, ] = data;
            throw req.error;
        }
    }
    async start () {
        if (this.#useIdb == false) {
            return this.#startNotUseIdb();
        }
        try {
            this.#initExpires(true);
            this.#checkExpires();

            const idbReq = await this.#idb.open();
            const promises = [];
            this.#fcCol.forEach((fc, key) => {
                promises.push(this.#LoadFormDatas(key));
            });
            await Promise.allSettled(promises);

            this.hideAll();
            this.#firstView();
            this.#addIDBEvent();
            return idbReq;

        } catch (reason) {
            this.#tryClear();
            if (reason instanceof IDBRequest) {
                if (reason.error) {
                    throw new FCFailedOpenIDBExeption(reason.error);
                } else {
                    throw new FCFailedOpenIDBExeption(reason.message);
                }
            } else {
                console.dir(reason);
                throw new Error('Some errors.');
            }
        }
    }
    async #startNotUseIdb () {
        try {
            this.#fcCol.forEach((fc, key) => this.setData(key) );
            this.#initExpires(true);
            this.#checkExpires();
            this.hideAll();
            this.#firstView();
            return;
        } catch (reason) {
            throw reason instanceof Error ? reason : new Error(reason);
        }
    }

    clear () { this.#tryClear(); }
    #tryClear() {
        try { this.#clear(); }
        catch (e) { console.error(e); }
    }
    #clear () {
        this.clearValues();
        this.#timer.clear();
        this.#clearStrage();
    }
    #clearStrage () {
        sessionStorage.clear();
        this.#idb.delete();
        removeEventListener('beforeunload', this.#cbfUploadDb);
        this.#cbfUploadDb = undefined;
    }
    #isExpires () {
        const expires = sessionStorage.getItem(this.#keyExpires);
        if (!expires) { return false; }
        return expires <= Number(new Date()) ? true : false;
    }
    #checkExpires () {
        if (this.#isExpires() == false) { return ;}
        this.#clear();
        this.expires = this.expires;
    }
    #firstView () {
        const key = sessionStorage.getItem(this.#keyStat);
        const fcMap = this.#fcCol;
        if (fcMap.has(key)) {
            fcMap.get(key).view();
        } else {
            fcMap.values().next().value.view();
        }
    }

    set onExpires (func) {
        if (func instanceof Function == false) { throw new TypeError('onExpires'); }
        this.#onExpires = func;
        if (this.#expires > 0) {
            this.#setTimerExpires();
        }
    }
    #setTimerExpires () {
        if (this.#timer.state > FCTimerState.standby) {
            this.#timer.clear();
        }
        const delay = Number(sessionStorage.getItem(this.#keyExpires)) - Number(new Date());
        if (delay < 0) { return; }
        this.#timer = new FCTimer(() => {
            this.#clear();
            this.#onExpires(this);
        }, delay);
        this.#timer.start();
    }
    #addEventFocus () {
        addEventListener('focus', event => {
            if (this.#isExpires() == false) { return; }
            this.#clear();
            this.#onExpires(this);
        }, false);
    }
    clearValues () {
        this.#fcCol.forEach(fc => fc.clearValues());
    }
    scroll (xCoord = 0, yCoord = 0) {
        try {
            scrollTo({top: yCoord, left: xCoord, behavior:'smooth'});
        } catch (e) {
            scrollTo(xCoord, yCoord);
        }
    }

    #idbSetting () {
        const idb = new IDB(this.#keyIdbName, 1);
        idb.storeSettings(this.#keyIdbStore, { keyPath : 'page' }, store => {
            store.createIndex('formData', 'formData', {unique : false});
        });
        this.#idb = idb;
    }

    #updateDB () {
        this.#fcCol.forEach((fc, key) => {
            const data = (this.isConfirm ? this.getData(key) : fc.getCollectedFormData());
            const pr = this.#idb.put({
                page : key,
                formData : this.#genSimpleObj(data)
            });
            pr.catch(([req, ]) => { console.error(req.error); });
        });
    }
    #addIDBEvent () {
        this.#cbfUploadDb = () => this.#updateDB();
        addEventListener('beforeunload', this.#cbfUploadDb);
    }
    #genSimpleObj (formData) {
        const obj = {};
        formData.forEach((value, key) => {
            obj[key] = formData.getAll(key);
        });
        return obj;
    }
    forEach (func = (fc, key) =>{}) {
        this.#fcCol.forEach(func);
    }
    indexOf (fc) {
        return Array.from(this.#fcCol.values()).indexOf(fc);
    }
    isFirst (fc) {
        return this.indexOf(fc) == 0 ? true : false;
    }
    isLast (fc) {
        return this.indexOf(fc) == this.size - 1 ? true : false;
    }
    get size () {
        return this.#fcCol.size;
    }

    #multiView = false;
    set multiView (bool = false) {
        this.#multiView = bool ? true : false;
    }
    get multiView () { return this.#multiView; }
}