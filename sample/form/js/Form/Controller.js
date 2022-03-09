import { FCBase, FCEventHandlerList, FCNotExistsExeption, FCFailedOpenIDBExeption } from './Base.js';
import { FCForm } from './FCForm.js';
import { FCConfirm } from './Confirm.js';
import { FCError } from './Error.js';
import { FCNoForm } from './NoForm.js';
import { IDB } from './IDB.js';
export  {
    FCBase, FCForm, FCConfirm, FCError, FCNoForm, FCEventHandlerList, FCNotExistsExeption, FCFailedOpenIDBExeption
};
export class FCController {
    static #D = false;
    static #nameList = {};
    static #NotActive = () => {
        let elm = document.createElement('div');
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
    #stoID = undefined;

    #idb = undefined;

    #cbfUploadDb = undefined;
    #siID = undefined;

    constructor (name) {
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
        this.#idbSetting();
    }
    append(key, type, parentNode, noStat) {
        if (key.length == 0 || this.#fcCol.has(key)) {
            throw new TypeError('append');
        }
        let fc = this.#genFC(type, parentNode, noStat);
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
        let index = list.indexOf(fc);
        if (index == -1) { throw new FCNotExistsExeption('next'); }
        if (index + 1 == list.length) { throw new Error(errMessage); }
        list[index + 1].view();        
    }
    next (fc) {
        let list = Array.from(this.#fcCol.values());
        this.#viewNext(fc, list, 'next', 'Target is last element.');
    }
    back (fc) {
        let list = Array.from(this.#fcCol.values()).reverse();
        this.#viewNext(fc, list, 'back', 'Target is first element.');
    }
    getKey(fc) {
        if (fc instanceof FCBase == false) { throw new TypeError('getKey'); }
        let result = Array.from(this.#fcCol.entries()).find(target => target[1] === fc);
        if (result == undefined) { throw new FCNotExistsExeption('getKey'); }
        return result[0];
    }
    #genFC (type, parentNode, noStat) {
        let fc = new type(parentNode);
        if (fc instanceof FCBase == false) { TypeError('"type" is not instance of FCBase.'); }
        fc.addEventList('beforeView', this.#genDefaultBeforeView(noStat));
        return fc;
    }
    #genDefaultBeforeView (noStat) {
        let ctr = this;
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
        let fc = this.get(key); //let fc = new FCForm();
        let flg = false;
        this.#data.set(key, fc.getCollectedFormData());

        let [tran, store] = this.#idb.transaction('readwrite');
        let req = store.put({ page : key, formData : this.#genSimpleObj(fc.getCollectedFormData())});
        req.addEventListener('error', event => {
            throw req.error;
        });
        if (FCController.#D) req.addEventListener('success', event => { console.log('setData(db) success'); });
    }
    getData (key) {
        if (this.#data.has(key) == false) { throw new FCNotExistsExeption(`getData, key: ${key}`); }
        return this.#data.get(key);
    }
    getAllData () {
        let newData = new FormData();
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
        this.#initExpires();
    }
    #initExpires () {
        if (this.#expires <= 0) { return; }
        let strExpires = sessionStorage.getItem(this.#keyExpires);
        if (strExpires == '' || strExpires == 0 || strExpires == null) {
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
        let strExpires = sessionStorage.getItem(this.#keyExpires);
        if (strExpires == 0) { return 0; }
        let miriSec = Number(strExpires) - Number(new Date());
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
    #genPromiseLoadFormDatas (tran, store, key) {
        if (FCController.#D) console.log(`genPrLoadFormData, key: ${key}`);
        return new Promise( (resolve, reject) =>{
            if (FCController.#D) console.log(`exec Promise, key: ${key}`);
            let req = store.get(key);
            req.addEventListener('error', event => {
                reject(req);
            });
            req.addEventListener('success', event => {
                let fc = this.#fcCol.get(key);
                if (req.result != undefined) {
                    fc.clearValues();
                    fc.setValues(req.result.formData);
                    if (FCController.#D) console.log(`success! ${key}`);
                }
                let data = fc.getCollectedFormData();
                this.#data.set(key, data);
                resolve(req);
            });
        } );
    }

    async start () {
        try {
            let idbReq = await this.#idb.open();
            let promises = [];
            let [tran, store] = this.#idb.transaction('readonly');
            this.#fcCol.forEach((fc, key) => {
                promises.push(this.#genPromiseLoadFormDatas(tran, store, key));
            });
            await Promise.allSettled(promises);
            this.#initExpires();
            this.#checkExpires();
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

    clear () { this.#tryClear(); }
    #tryClear() {
        try { this.#clear(); }
        catch (e) { console.error(e); }
    }
    #clear () {
        if (FCController.#D) {
            console.log('#clear');
            console.trace();
        }

        this.clearValues();
        sessionStorage.clear();
        if (this.#idb.hasDb) {
            this.#idb.db.close();
            this.#idb.delete();
        }
        removeEventListener('beforeunload', this.#cbfUploadDb);
        clearInterval(this.#siID);
        this.#cbfUploadDb = undefined;
        clearTimeout(this.#stoID);
    }
    #isExpires () {
        let expires = sessionStorage.getItem(this.#keyExpires);
        if (!expires) { return false; }
        return expires <= Number(new Date()) ? true : false;
    }
    #checkExpires () {
        if (this.#isExpires() == false) { return ;}
        this.#clear();
        this.expires = this.expires;
    }
    #firstView () {
        let key = sessionStorage.getItem(this.#keyStat);
        let fcMap = this.#fcCol;
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
        let timeout = Number(sessionStorage.getItem(this.#keyExpires)) - Number(new Date());
        if (this.#stoID != undefined) {
            clearTimeout(this.#stoID);
            this.#stoID == undefined;
        }
        let ctr = this;
        this.#stoID = setTimeout(() => {
            clearTimeout(this.#stoID);
            this.#stoID == undefined;
            this.#clear();
            ctr.#onExpires(ctr);
        }, timeout);
        addEventListener('focus', event => {
            if (this.#isExpires() == false) { return; }
            this.#clear();
            ctr.#onExpires(ctr);
        }, false);
    }
    clearValues () {
        for (let fc of this.#fcCol.values()) {
            fc.clearValues();
        }
    }
    scroll (xCoord = 0, yCoord = 0) {
        try {
            scrollTo({top: yCoord, left: xCoord, behavior:'smooth'});
        } catch (e) {
            scrollTo(xCoord, yCoord);
        }
    }

    #idbSetting () {
        let version = 1;
        let idb = new IDB(this.#keyIdbName, version);
        idb.storeSettings(this.#keyIdbStore, { keyPath : 'page' }, store => {
            store.createIndex('formData', 'formData', {unique : false});
        });
        this.#idb = idb;
    }

    #updateDB () {
        let promises = [];
        let [tran, store] = this.#idb.transaction('readwrite');
        this.#fcCol.forEach((fc, key) => {
            let data = (this.isConfirm ? this.getData(key) : fc.getCollectedFormData());
            let req = store.put({ page : key, formData : this.#genSimpleObj(data)});
            req.addEventListener('error', event => {
                console.error(req.error);
            });
            if (FCController.#D) req.addEventListener('success', event => { console.log('success updateDB'); });
        });
    }
    #addIDBEvent () {
        this.#cbfUploadDb = () => this.#updateDB();
        addEventListener('beforeunload', this.#cbfUploadDb);
    }
    #genSimpleObj (formData) {
        let obj = {};
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