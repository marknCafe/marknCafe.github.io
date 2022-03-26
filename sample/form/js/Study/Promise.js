const MyPromise = function (executor) {
    if (executor instanceof Function == false) throw new TypeError(String(executor) + ' is not a function');
    this._constructor(executor);
}

{
    const organizeIntoArray = function (data) {
        if (data instanceof Array) { return data; }
        if (data instanceof Map) {
            const resArray = Array();
            data.forEach(function (value, key) { resArray.push([key, value]); });
            return resArray;
        } else if (data instanceof Set) {
            const resArray = Array();
            data.forEach(function (value) { resArray.push(value); });
            return resArray;
        } else if (data.split) {
            return data.split('');
        }
        return undefined;
    }
    const genMyPromiseIterable = function (iterable, name, func) {
        const promises = organizeIntoArray(iterable);
        return new MyPromise(function (res, rej) {
            if (promises instanceof Array == false) rej(new TypeError('Invalid Argument of "' + name + '"'));
            const iid = setInterval(function () {
                func(promises, iid, res, rej);
            }, 0);
        });
    }
    const genMyPromiseAll = function (iterable) {
        return genMyPromiseIterable(iterable, 'MyPromise.All', function (promises, iid, res, rej) {
            for (let i = 0; i < promises.length; i ++) {
                const p = promises[i];
                if (p instanceof MyPromise == false) continue;
                if (p._state == 'fulfilled') continue;
                if (p._state == 'rejected') {
                    clearInterval(iid);
                    return rej(p._reason);
                } else {
                    return;
                }
            }
            clearInterval(iid);
            return res(promises);
        });
    };
    const genMyPromiseAllSettled  = function (iterable) {
        return genMyPromiseIterable(iterable, 'MyPromise.AllSettled', function (promises, iid, res, rej) {
            for (let i = 0; i < promises.length; i ++) {
                const p = promises[i];
                if (p instanceof MyPromise == false) continue;
                if (p._state == 'pending') return;
            }
            clearInterval(iid);
            return res(promises);
        });
    };
    const genMyPromiseAny = function (iterable) {
        return genMyPromiseIterable(iterable, 'MyPromise.Any', function (promises, iid, res, rej) {
            for (let i = 0; i < promises.length; i ++) {
                const p = promises[i];
                if (p instanceof MyPromise == false) continue;
                if (p._state == 'fulfilled') {
                    clearInterval(iid);
                    return res(p._value);
                } else if (p._state == 'pending') return;
            }
            clearInterval(iid);
            return rej('error'); // 詳細を調べて調整する
        });
    };
    const genMyPromiseRace = function (iterable) {
        return genMyPromiseIterable(iterable, 'MyPromise.Race', function (promises, iid, res, rej) {
            for (let i = 0; i < promises.length; i ++) {
                const p = promises[i];
                if (p instanceof MyPromise == false) continue;
                if (p._state == 'fulfilled') {
                    clearInterval(iid);
                    return res(p._value);
                } else if (p._state == 'rejected') {
                    clearInterval(iid);
                    return rej(p._reason);
                }
            }
        });
    };
    const genMyPromiseReject = function (reason) {
        return new MyPromise(function (resolve, reject) {
            reject(reason);
        });
    };
    const genMyPromiseResolve = function (value) {
        return new MyPromise(function (resolve, reject) {
            resolve(value);
        });
    };

    Object.defineProperties(MyPromise, {
        all : { value : genMyPromiseAll },
        allSettled : { value : genMyPromiseAllSettled },
        any : { value : genMyPromiseAny },
        race : { value : genMyPromiseRace },
        reject : { value : genMyPromiseReject },
        resolve : { value : genMyPromiseResolve }
    });

    const MyPromiseConstructor = function (executor) {
        try {
            executor(this._genResolutionFunc(), this._genRejectionFunc());
        } catch (e) {
            this._setRejection(e);
        }
    };
    const MyPromiseCatch = function (onRejected) {
        return this.then(undefined, onRejected);
    }
    const genExecutor = function (parentPromise, func) {
        return function (res, rej) {
            const iid = setInterval(function () {
                const state = parentPromise._state;
                if (state == 'pending') return;
                clearInterval(iid);
                try {
                    res(func());
                } catch (e) {
                    rej(e);
                }
            }, 0);        
        };
    };
    const genExecutorFinally = function (parentPromise, onFinally) {;
        return genExecutor(parentPromise, onFinally);
    };
    const MyPromiseFinally = function (onFinally) {
        const newPromise = new MyPromise(genExecutorFinally(this, onFinally));
        return newPromise;
    };
    const genExecutorFuncThen = function (parentPromise, onFulfilled, onRejected) {
        return function () {
            if (parentPromise._state == 'fulfilled') {
                return onFulfilled instanceof Function ? onFulfilled(parentPromise._value) : parentPromise._value;
            } else {
                return onRejected instanceof Function ? onRejected(parentPromise._reason) : parentPromise._reason;
            }
        };
    };
    const genExecutorThen = function (parentPromise, onFulfilled, onRejected) {
        return genExecutor(parentPromise, genExecutorFuncThen(parentPromise, onFulfilled, onRejected));
    };
    const MyPromiseThen = function (onFulfilled, onRejected) {
        const newPromise = new MyPromise(genExecutorThen(this, onFulfilled, onRejected));
        return newPromise;
    };
    const genRejectionFunc = function () {
        const promise = this;
        return function (reason) {
            promise._setRejection(reason);
        };
    };
    const genResolutionFunc = function () {
        const promise = this;
        return function (value) {
            promise._setResolution(value);
        };
    }
    const setRejection = function (reason) {
        if (this._state != 'pending') return;
        Object.defineProperty(this, '_state', {writable : true, configurable : true});
        this._state = 'rejected';
        Object.defineProperty(this, '_state', {writable : false, configurable : false});
        Object.defineProperty(this, '_reason', {writable : true, configurable : true});
        this._reason = reason;
        Object.defineProperty(this, '_reason', {writable : false, configurable : false});
    };
    const setResolution = function (value) {
        if (this._state != 'pending') return;
        Object.defineProperty(this, '_state', {writable : true, configurable : true});
        this._state = 'fulfilled';
        Object.defineProperty(this, '_state', {writable : false, configurable : false});
        Object.defineProperty(this, '_value', {writable : true, configurable : true});
        this._value = value;
        Object.defineProperty(this, '_value', {writable : false, configurable : false});
    };

    Object.defineProperties(MyPromise.prototype, {
        catch : { value : MyPromiseCatch },
        finally : { value : MyPromiseFinally },
        then : { value : MyPromiseThen },
        _constructor : { value : MyPromiseConstructor },
        _parentPromise : { value : undefined },
        _genRejectionFunc : { value : genRejectionFunc },
        _genResolutionFunc : { value : genResolutionFunc },
        _setRejection : { value : setRejection },
        _setResolution : { value : setResolution },
        _state : { value : 'pending', writable : true },
        _value : { value : undefined, writable : false },
        _reason : { value : undefined, writable : false }
    });
}