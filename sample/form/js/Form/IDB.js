/* Form/IDB.js | (c) marknCafe | https://github.com/marknCafe/Form/blob/main/LICENSE */
export class IDB {
    static #D = false;
    static #DefStoreSettings = db => {};
    #db = undefined;
    #dbName = undefined;
    #version = undefined;
    #storeName = undefined;
    #storeSettings = IDB.#DefStoreSettings;

    #tran = undefined;
    #store = undefined;

    constructor (dbName = '', version = 1) {
        this.dbName = dbName;
        this.version = version;
    }
    set dbName (dbName) {
        if (IDB.#isEmpty(dbName)) { throw new TypeError('Argument "dbName" is Empty.'); }
        this.#dbName = dbName;
    }
    get dbName () { return this.#dbName; }
    set version (version) {
        if (Number.isInteger(version) == false) { throw new TypeError('Invalid argument "version".'); }
        if (version <= 0) { throw new RangeError('Version is out of range.'); }
        this.#version = version;
    }
    get version ()  { return this.#version; }
    set storeName (storeName) {
        if (IDB.#isEmpty(storeName)) { throw new TypeError('Argument "storeName" is Empty.'); }
        this.#storeName = storeName;
    }
    get storeName () { return this.#storeName; }

    get db () {
        if (this.#db == undefined) { throw new IDBNotOpenExeption(`db ${this.#dbName} is closed.`); }
        return this.#db;
    }

    get hasDb () {
        return this.#db instanceof IDBDatabase;
    }

    storeSettings (storeName = '', option = { keyPath : '', autooIncrement : false}, cbFunc = store => {}) {
        this.storeName = storeName;
        this.#storeSettings = db => {
            const store = db.createObjectStore(this.storeName, option);
            cbFunc(store);
        };
    }

    open () {
        if (IDB.#isEmpty(this.storeName)) { throw new TypeError('Argument "storeName" is not defined.'); }
        if (this.#storeSettings === IDB.#DefStoreSettings) { throw new TypeError('There is no StoreSettings'); }

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.#dbName, this.#version);
            req.addEventListener('error', event => {
                reject(req);
            });
            req.addEventListener('upgradeneeded', event => {
                this.#storeSettings(req.result);
            });
            req.addEventListener('success', event => {
                this.#db = req.result;
                resolve(req);
            });
        });
    }

    transaction (mode) {
        if (this.#tran == undefined || this.#tran.mode != mode) {
            this.#tran = this.#db.transaction(this.#storeName, mode);
            this.#tran.addEventListener('complete', event => {
                this.#tran = undefined;
                this.#store = undefined;
            });
            this.#store = this.#tran.objectStore(this.#storeName);
        }
        return [this.#tran, this.#store];
    }

    #genPromise (req) {
        return new Promise((resolve, reject) => {
            req.addEventListener('error', event => reject([req, event]) );
            req.addEventListener('success', event => resolve([req, event]) );            
        });
    }

    get (key) {
        const [, store] = this.transaction('readonly');
        const req = store.get(key);
        return this.#genPromise(req);
    }

    put (data = {}) {
        const [, store] = this.transaction('readwrite');
        const req = store.put(data);
        return this.#genPromise(req);
    }

    clear () {
        const [, store] = this.transaction('readwrite');
        const req = store.clear();
        return this.#genPromise(req);
    }

    delete () {
        if (this.hasDb) this.#db.close();
        const req = indexedDB.deleteDatabase(this.#dbName);
        return this.#genPromise(req);
    }

    static #isEmpty (string) {
        return string == '' || string == undefined || string == null;
    }
}

export class IDBNotOpenExeption extends Error {
    constructor (message) {
        super(message);
        this.name = 'IDBNotOpenExeption';
    }
}