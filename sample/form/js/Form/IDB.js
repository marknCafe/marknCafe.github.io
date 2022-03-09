export class IDB {
    static #D = false;
    static #DefStoreSettings = db => {};
    #db = undefined;
    #dbName = undefined;
    #version = undefined;
    #storeName = undefined;
    #storeSettings = IDB.#DefStoreSettings;

    constructor (dbName = new String(), version = 1) {
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

    storeSettings (storeName = new String(), option = { keyPath : '', autooIncrement : false}, cbFunc = store => {}) {
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
                reject(idbReq);
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
        const tran = this.#db.transaction(this.#storeName, mode);
        const store = tran.objectStore(this.#storeName);
        return [tran, store];
    }

    static #getOnError = (event) => { throw event.target.error; }
    static #getOnSuccess (event, key) { if (IDB.#D) console.log(`Success get method.(key: ${key})`); }

    get (key, onerror = IDB.#getOnError, onsuccess = IDB.#getOnSuccess) {
        const [tran, store] = this.transaction('readonly');
        const req = store.get(key);
        req.addEventListener('error', onerror);
        req.addEventListener('success', event => onsuccess(event, key));
        return req;
    }

    static #putOnError = IDB.#getOnError;
    static #putOnSuccess = (event) => {  if (IDB.#D) console.log(`Success put method.`); }

    put (data = {}, onerror = IDB.#putOnError, onsuccess = IDB.#putOnSuccess) {
        const [tran, store] = this.transaction('readwrite');
        const req = store.put(data);
        req.addEventListener('error', onerror);
        req.addEventListener('success', onsuccess);
    }

    static #clearOnError = IDB.#getOnError;
    static #clearOnSuccess = (event, storeName) => { if (IDB.#D) console.log(`objectStore "${storeName}" is cleared.`); };

    clear (onerror = IDB.#clearOnError, onsuccess = IDB.#clearOnSuccess) {
        const [tran, store] = this.transaction('readwrite');
        const req = store.clear();
        req.addEventListener('error', onerror);
        req.addEventListener('success', event => onsuccess(event, this.#storeName) );
        return req;
    }

    static #deleteOnError = IDB.#getOnError;
    static #deleteOnSuccess = (event, dbName) => { if (IDB.#D) console.log(`database "${dbName}" is deleted.`); };

    delete (onerror = IDB.#deleteOnError, onsuccess = IDB.#deleteOnSuccess) {
        this.#db.close();
        const req = indexedDB.deleteDatabase(this.#dbName);
        req.addEventListener('error', onerror);
        req.addEventListener('success', event => onsuccess(event, this.#dbName));
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