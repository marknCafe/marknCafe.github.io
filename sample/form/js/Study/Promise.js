'use strict';
const MyPromise = function (executor) {
    if (executor instanceof Function == false) throw new TypeError(String(executor) + ' is not a function');
    this._init(executor);
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
        promises.forEach(function (p) {
            if (p instanceof MyPromise && p._hasChildren == false) {
                Object.defineProperty(p, '_hasChildren', { writable : false, configurable : false, value : true });
            }
        });
        return new MyPromise(function (res, rej) {
            if (promises instanceof Array == false) {
                rej(new TypeError('Invalid argument of "' + name + '"'));
                return;
            }
            promises.forEach(function (p) {
                if (p instanceof MyPromise == false) return;
                addFulfilledList.call(p, function () {
                    func(p, promises, res, rej);
                });
            });
        });
    };
    const genMyPromiseAll = function (iterable) {
        let isFulfilled = false;
        return genMyPromiseIterable(iterable, 'MyPromise.all', function (p, promises, res, rej) {
            if (isFulfilled) return;
            if (p._state == 'rejected') {
                isFulfilled = true;
                return rej(p._reason);
            }
            for (let i = 0; i < promises.length; i ++) {
                if (promises[i]._state == 'pending') return;
            }
            isFulfilled = true;
            promises.forEach(function (p) {
                values.push(p instanceof MyPromise ? p._value : p);
            });
            res(values);
        });
    };
    const genMyPromiseAllSettled  = function (iterable) {
        return genMyPromiseIterable(iterable, 'MyPromise.allSettled', function (promise, promises, res, rej) {
            for (let i = 0; i < promises.length; i ++) {
                const p = promises[i];
                if (p instanceof MyPromise == false) continue;
                if (p._state == 'pending') return;
            }
            const values = [];
            promises.forEach(function (p) {
                if (p._state == 'fulfilled') {
                    values.push({ status : p._state, value : p._value });
                } else {
                    values.push({ status : p._state, reason : p._reason });
                }
            });
            res(values);
        });
    };
    const genMyPromiseAny = function (iterable) {
        let isFulfilled = false;
        return genMyPromiseIterable(iterable, 'MyPromise.any', function (promise, promises, res, rej) {
            if (isFulfilled) return;
            if (promise._state == 'fulfilled') {
                isFulfilled = true;
                return res(promise._value);
            }
            for (let i = 0; i < promises.length; i ++) {
                const p = promises[i];
                if (p instanceof MyPromise == false || p._state == 'rejected') continue;
                return;
            }
            rej(genMyAggregateError(promises));
        });
    };
    const genMyPromiseRace = function (iterable) {
        let isFulfilled = false;
        return genMyPromiseIterable(iterable, 'MyPromise.race', function (p, promises, res, rej) {
            if (isFulfilled) return;
            isFulfilled = true;
            if (p._state == 'fulfilled') {
                res(p._value);
            } else {
                rej(p._reason);
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
        all : { value : genMyPromiseAll, configurable : false },
        allSettled : { value : genMyPromiseAllSettled, configurable : false },
        any : { value : genMyPromiseAny, configurable : false },
        race : { value : genMyPromiseRace, configurable : false },
        reject : { value : genMyPromiseReject, configurable : false },
        resolve : { value : genMyPromiseResolve, configurable : false }
    });

    const MyPromiseConstructor = function (executor) {
        onfulfilledList.set(this, []);
        //Object.seal(this);
        const promise = this;
        const tid = setTimeout(function () {
            clearTimeout(tid);
            try {
                executor(genResolutionFunc.call(promise), genRejectionFunc.call(promise));
            } catch (e) {
                setRejection.call(promise, e);
            }
        });
    };
    const MyPromiseCatch = function (onRejected) {
        return this.then(undefined, onRejected);
    }
    const genExecutor = function (parentPromise, func) {
        return function (res, rej) {
            addFulfilledList.call(parentPromise, function () {
                try { res(func()); }
                catch (e) { rej(e); }
            });
        };
    };
    const MyPromiseFinally = function (onFinally) {
        return new MyPromise(genExecutor(this, onFinally));
    };
    const MyPromiseThen = function (onFulfilled, onRejected) {
        if (this._hasChildren == false) {
            Object.defineProperty(this, '_hasChildren', { writable : false, configurable : false, value : true });
        }
        if (this._throwTid) {
            clearTimeout(this._throwTid);
        }
        const parentPromise = this;
        const executor = genExecutor(this, function () {
            let value;
            if (parentPromise._state == 'fulfilled') {
                value = onFulfilled instanceof Function ? onFulfilled(parentPromise._value) : parentPromise._value;
                return value;
            } else {
                if (onRejected instanceof Function) {
                    value = onRejected(parentPromise._reason);
                    return value;
                }
                throw parentPromise._reason;
            }
        });
        return new MyPromise(executor);
    };
    const genRejectionFunc = function () {
        const promise = this;
        return function (reason) {
            const tid = setTimeout(function () {
                clearTimeout(promise._throwTid);
                if (promise._hasChildren) return;
                throw '(in promise) ' + promise._reason;
            });
            Object.defineProperty(promise, '_throwTid', { writable : false, value : tid, configurable : false });
            setRejection.call(promise, reason);
        };
    };
    const genResolutionFunc = function () {
        const promise = this;
        return function (value) {
            setResolution.call(promise, value);
        };
    }
    const onfulfilled = function () {
        onfulfilledList.get(this).forEach(function (func) {
            func();
        });
        onfulfilledList.delete(this);
    };
    const addFulfilledList = function (func) {
        if (this._state == 'pending') {
            onfulfilledList.get(this).push(func);
        } else {
            func();
        }
    };
    const setRejection = function (reason) {
        if (this._state != 'pending') return;
        Object.defineProperty(this, '_state', {writable : false, configurable : false, value : 'rejected'});
        Object.defineProperty(this, '_reason', {writable : false, configurable : false, value : reason });
        onfulfilled.call(this);
    };
    const setResolution = function (value) {
        if (this._state != 'pending') return;
        Object.defineProperty(this, '_state', {writable : false, configurable : false, value : 'fulfilled'});
        Object.defineProperty(this, '_value', {writable : false, configurable : false, value : value });
        onfulfilled.call(this);
    };

    const onfulfilledList = new Map();

    Object.defineProperties(MyPromise.prototype, {
        catch : { value : MyPromiseCatch, configurable : false },
        finally : { value : MyPromiseFinally, configurable : false },
        then : { value : MyPromiseThen, configurable : false },
        constructor : { value : MyPromise, configurable : false },
        _init : { value : MyPromiseConstructor, configurable : false },
        _parentPromise : { value : undefined, configurable : false },
        _onfulfilled : { value : onfulfilled, configurable : false },
        _state : { value : 'pending', configurable : false },
        _value : { value : undefined, configurable : false },
        _reason : { value : undefined, configurable : false },
        _throwTid : { value : undefined, configurable : false },
        _hasChildren : { value : false, configurable : false }
    });
}