/* Form/Utility.js | (c) marknCafe | https://github.com/marknCafe/Form/blob/main/LICENSE */
export class FCTimer {
    #id = undefined;
    #cbFn = undefined;
    #state = FCTimerState.standby;
    #delay = 0;

    constructor (cbFn = () => {}, delay = 0) {
        this.#_cbFn = cbFn;
        this.delay = delay;
    }
    set #_cbFn (cbFn) {
        if (cbFn instanceof Function == false) { throw new TypeError('FCTimer.cbFn'); }
        this.#cbFn = (argument) => {
            this.#state = FCTimerState.running;
            cbFn(argument, this);
            this.clear();
            this.#state = FCTimerState.finished;
        };
    }
    set delay (delay) {
        if (Number.isInteger(delay) == false || delay < 0) { throw new TypeError('FCTimer.delay'); }
        this.#delay = delay;
    }
    start (argument) {
        if (this.#id != undefined) { this.clear(); }
        this.#state = FCTimerState.countdown;
        this.#id = setTimeout(() => this.#cbFn(argument), this.#delay);
    }
    clear () {
        this.#state = FCTimerState.cleared;
        clearTimeout(this.#id);
        this.#id = undefined;
    }
    get state () { return this.#state; }
}
class FCTimerStateValue {
    #state = undefined;
    constructor (state) { this.#state = state; }
    toString() { return this.#state; }
}
export class FCTimerState {
    static #standby = new FCTimerStateValue(1);
    static #countdown = new FCTimerStateValue(2);
    static #running = new FCTimerStateValue(3);
    static #finished = new FCTimerStateValue(4);
    static #cleared = new FCTimerStateValue(5);
    static get standby () { return FCTimerState.#standby; }
    static get countdown () { return FCTimerState.#countdown; }
    static get running () { return FCTimerState.#running; }
    static get finished () { return FCTimerState.#finished; }
    static get cleared () { return FCTimerState.#cleared; }
}

export class FCPromiseTimer extends FCTimer {
    constructor(delay = 0) {
        super(FCPromiseTimer.#genCBFn(), delay);
    }
    static #genCBFn () {
        return ([promises, name] = []) => {
            if (promises instanceof Array == false) { throw new TypeError('FCPromiseTimer.promises');}
            console.dir(promises);
            const message = (name ? `(${name})` : '') + 'Some Promise objects are still "pending". ' +
            'Check if there is a problem with the target promise object.';
            throw new Error(message);
        };
    }
    start ([promises, name] = []) { super.start([promises, name]); }
}

export class FCData {
    static prefectureJP () {
        const text = `01	北海道, 02	青森県, 03	岩手県, 04	宮城県, 05	秋田県, 06	山形県, 07	福島県, 08	茨城県, 09	栃木県, 10	群馬県,
11	埼玉県, 12	千葉県, 13	東京都, 14	神奈川県, 15	新潟県, 16	富山県, 17	石川県, 18	福井県, 19	山梨県, 20	長野県,
21	岐阜県, 22	静岡県, 23	愛知県, 24	三重県, 25	滋賀県, 26	京都府, 27	大阪府, 28	兵庫県, 29	奈良県, 30	和歌山県,
31	鳥取県, 32	島根県, 33	岡山県, 34	広島県, 35	山口県, 36	徳島県, 37	香川県, 38	愛媛県, 39	高知県, 40	福岡県,
41	佐賀県, 42	長崎県, 43	熊本県, 44	大分県, 45	宮崎県, 46	鹿児島県, 47	沖縄県`;
        return FCMapGenerator.exec(text);
    }
}

export class FCMapGenerator {
    static exec (text) {
        const map = new Map();
        String(text).split(/,[\s\n]+/).forEach(data => {
            const [key, value] = data.split(/\t/);
            map.set(key, value);
        });
        return map;
    }
}