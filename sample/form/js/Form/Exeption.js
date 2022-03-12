/* Form/Exeption.js | (c) marknCafe | https://github.com/marknCafe/Form/blob/main/LICENSE */
export class FCExeption extends Error {
/* form.js内で使用する拡張Errorクラスのベースクラス。 */
    constructor (baseMessage, hint) {
        super( baseMessage + (hint ? ` (${hint})` : '') );
        this.name = 'FCExeption';
    }
}
export class FCBadArgumentExeption extends FCExeption {
/* メソッドの引数が不適切な時に使用する拡張Errorクラス。 */
    constructor (hint) {
        super('Bad argument.', hint);
        this.name = 'FCBadArgumentExeption'
    }
}
export class FCNotExistsExeption extends FCExeption {
/* メソッドに渡したキーが存在しない場合に使用する拡張Errorクラス。 */
    constructor (hint) {
        super('Key is not exists.', hint);
        this.name = 'FCNotExistsExeption';
    }
}

export class FCUndefinedExeption extends FCExeption {
    constructor (hint) {
        super('Undefined.', hint);
        this.name = 'FCUndefinedExeption';
    }
}

export class FCFailedOpenIDBExeption extends FCExeption {
    constructor (hint) {
        super('Failed open IndexedDB', hint);
        this.name = 'FCFailedOpenIDBExeption';
    }
}

export class VMSError extends FCExeption {
    constructor (hint) {
        super(hint);
        this.name = 'VMSError';
    }
}

export class VMSErrorBadInput extends VMSError {
    constructor (hint) {
        super('Validity state is "BadInput".', hint);
        this.name = 'VMSErrorBadInput';
    }
}

export class VMSErrorPatternMismatch extends VMSError {
    constructor (hint) {
        super('Validity state is "PatternMismatch".', hint);
        this.name = 'VMSErrorPatternMismatch';
    }
}

export class VMSErrorTypeMismatch extends VMSError {
    constructor (hint) {
        super('Validity state is "TypeMismatch".', hint);
        this.name = 'VMSErrorTypeMismatch';
    }
}

export class VMSErrorValueMissing extends VMSError {
    constructor (hint) {
        super('Validity state is "ValueMissing".', hint);
        this.name = 'VMSErrorValueMissing';
    }
}

export class VMSErrorTooLong extends VMSError {
    constructor (hint) {
        super('Validity state is "TooLong".', hint);
        this.name = 'VMSErrorTooLong';
    }
}

export class VMSErrorTooShort extends VMSError {
    constructor (hint) {
        super('Validity state is "TooShort".', hint);
        this.name = 'VMSErrorTooShort';
    }
}

export class VMSErrorRangeOverflow extends VMSError {
    constructor (hint) {
        super('Validity state is "RangeOverflow".', hint);
        this.name = 'VMSErrorRangeOverflow';
    }
}

export class VMSErrorRangeUnderflow extends VMSError {
    constructor (hint) {
        super('Validity state is "RangeUnderflow".', hint);
        this.name = 'VMSErrorRangeUnderflow';
    }
}

export class VMSErrorStepMismatch extends VMSError {
    constructor (hint) {
        super('Validity state is "StepMismatch".', hint);
        this.name = 'VMSErrorStepMismatch';
    }
}

export class VMSCustomError extends VMSError {
    constructor (hint) {
        super('Validity state is "CustomError".', hint);
        this.name = 'VMSCustomError';
    }
}