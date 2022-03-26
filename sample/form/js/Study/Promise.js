const MyPromise = function (executor) {
    if (executor instanceof Function == false) throw new TypeError(String(executor) + ' is not a function');
    this._constructor(executor);
}

{
    const genMyAggregateError = function (promises) {
        const error = new Error('No Promise in MyPromise.any was resolved');
        Object.defineProperty(error, 'errors', { value : [], writable: false, configurable : false});
        const errors = error.errors;
        promises.forEach(function (p) { errors.push(p._reason); });
        return error;
    };

    const organizeIntoArray = function (data) {
        if (data instanceof Array) { return data; }
        const resArray =  Array();
        if (data instanceof Map) {
            data.forEach(function (value, key) { resArray.push([key, value]); });
            return resArray;
        } else if (data instanceof Set) {
            data.forEach(function (value) { resArray.push(value); });
            return resArray;
        } else if (data.split) {
            return data.split('');
        } else if (data.length || data.size) {
            try {
                Array.prototype.forEach.call(data, function (value) { resArray.push(value); });
                return resArray;
            } catch (e) {
                return undefined;
            }
        }
        return undefined;
    }
    const genMyPromiseIterable = function (iterable, name, func) {
        const promises = organizeIntoArray(iterable);
        return new MyPromise(function (res, rej) {
            if (promises instanceof Array == false) {
                rej(new TypeError('Invalid Argument of "' + name + '"'));
                return;
            }
            const iid = setInterval(function () {
                    func(promises, iid, res, rej);
            }, 0);
        });
    }
    const genMyPromiseAll = function (iterable) {
        return genMyPromiseIterable(iterable, 'MyPromise.All', function (promises, iid, res, rej) {
            for (let i = 0; i < promises.length; i ++) {
                const p = promises[i];
                if (p instanceof MyPromise == false || p._state == 'fulfilled') {
                    continue;
                } else if (p._state == 'rejected') {
                    clearInterval(iid);
                    return rej(p._reason);
                }
                return;
            }
            clearInterval(iid);

            const values = [];
            promises.forEach(function (p) {
                values.push(p instanceof MyPromise ? p._value : p);
            });
            return res(values);
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

            const values = [];
            promises.forEach(function (p) {
                if (p._state == 'fulfilled') {
                    values.push({ status : p._state, value : p._value });
                } else {
                    values.push({ status : p._state, reason : p._reason });
                }
            });
            return res(values);
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
            return rej(genMyAggregateError(promises));
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
            let value;
            if (parentPromise._state == 'fulfilled') {
                value = onFulfilled instanceof Function ? onFulfilled(parentPromise._value) : parentPromise._value;
                this._isTakeOver = true;
                return value;
            } else {
                if (onRejected instanceof Function) {
                    value = onRejected(parentPromise._reason);
                    this._isTakeOver = true;
                    return value;
                }
                throw parentPromise._reason;
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
        _state : { value : 'pending', writable : false },
        _value : { value : undefined, writable : false },
        _reason : { value : undefined, writable : false },
        _isTakeOver : { value : false, writable : false }
    });
}