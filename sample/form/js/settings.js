import { Form, FCType, VMType, FCUtil, FCData } from './Form.js';
removeEventListener('load', onLoadUnavailable); // 非対応ブラウザ用のイベントリスナを削除

const form = new Form('form1');
form.controllerSettings({
    expires : 300,
    //onExpires : () => {}
})
.formSettings({
    useWarnElm : true,
    delayTime : 1000,
    promiseTimeout : 2,
    enableSubmit : false,
    validityMessage : new VMType.Jp(),
    marginMaxLength : 3
})

.append('agreement', FCType.Form, 'div.form.agreement') // 同意画面
.append('enquate', FCType.Form, 'div.form.enquate') // アンケートフォーム
.append('userinfo', FCType.Form, 'div.form.userinfo') // 基本情報フォーム
.append('address', FCType.Form, 'div.form.address') // 住所登録フォーム

.append('confirm', FCType.Confirm, 'div.confirm') // 確認画面
.append('applied', FCType.NoForm, 'div.applied') // 登録完了画面
.append('error', FCType.Error, 'div.error', {noStat : true}) // エラー画面

.addInitTask(ctr => {
    const cbfErr = (event, fc) => { // onerrorイベントでエラー画面を表示させる
        const fcErr = ctr.get('error');
        // お試し用です。本番運用ではセキュリティの観点からやらないでください。
        fcErr.reason = `システムに問題があるためサービスが利用できません。
        理由：` + event.message;
        fcErr.view();
        ctr.clear();
    };
    ctr.forEach(fc => fc.addEventList('error', cbfErr) );
})
.addInitTask(ctr => {
    const fc = ctr.get('agreement');
    const vmAgree = fc.validityMessage.copy(); // エラーメッセージテンプレートをコピーして専用メッセージを作成する。
    vmAgree.setCbFuncMessage('valueMissing', '申し込むには同意していただく必要があります。'); // 未選択エラー用
    fc.extendValidityMessage('agreement', vmAgree); // FCFormに登録する。使用したい要素のclass属性に接頭辞"vm-"+キー名（今回は"age"）を設定しておく。
})
.addInitTask(ctr => {
    const fc = ctr.get('enquate');
    fc.addCondRequire('etc-hobby', 'hobby', 3, 'その他の内容を入力してください。', { useDisabled : false }); // 条件付き必須の定義
    const cbFnDisabled = (condition, key) => {
        const elm = fc.querySelector(`.item.${key}`);
        elm.classList.remove('hide');
        if (condition == false) elm.classList.add('hide');
    };
    fc.addCondRequireOr(['q3', 'q4'], [['q1', 1], ['q2', 2]], '質問１を「はい」、または質問２を「いいえ」と回答された方は必須です。', {cbFnDisabled : cbFnDisabled});
    fc.addCondRequireAnd(['q7', 'q8'], [['q5', 1], ['q6', 2]], '質問５を「はい」、かつ質問６を「いいえ」と回答された方は必須です。', {cbFnDisabled : cbFnDisabled});
})
.addInitTask(ctr => {
    const fc = ctr.get('userinfo');
    const minAge = 13; // 最小年齢をここで変更できるようにしておく
    fc.form.querySelector('[name=age]').min = minAge; //input min属性を上書き
    const vmAge = fc.validityMessage.copy();
    vmAge.setCbFuncMessage('rangeUnderflow', (isTypeEnter, elm) => `${minAge}歳未満の方はお申し込みできません。`);
    fc.extendValidityMessage('age', vmAge);
    fc.addCondRequire('parental_consent', 'age', value => (value >= minAge && value < 18), '１８歳未満の方は親権者の同意を得る必要があります。');
})
.addInitTask(ctr => {
    const fc = ctr.get('address');
    // 条件付き必須の定義
    fc.addCondRequire('email', 'newsletter', '1', 'メールマガジンの配信希望された場合は必須です。', { useDisabled : true }); //メールマガジンを希望した場合、Emailは必須
    // 郵便番号の拡張検査（遅延して処理結果を表示する演出をするためにsetTimeoutを利用しています）
    const timer = new FCUtil.Timer((args) => {
        const [elm, myFc, resolve, reject] = args;
        if (elm.value == '7777777') {
            resolve(elm.name); // 無効（問題あり）
        }else {
            resolve(true); //　有効（問題なし）
        }
    }, 1000);
    const cbFn = (elm, myFc, resolve, reject) => {
        if (timer.state > FCUtil.timerState.standby) {
            timer.clear();
        }
        timer.start([elm, myFc, resolve, reject]);
    };
    fc.addExtValidPromExec('postcode', cbFn, 'そんなラッキーな番号なはずがない！', ['submit']);

    const pref = fc.querySelector('select[name=prefecture]');
    FCData.prefectureJP().forEach((value, key) => {
        const option = pref.appendChild(document.createElement('option'));
        option.text = value;
        option.value = key;
    });
})

.confirmSettings({
    enableSubmit : false,
    onSubmit : async (event, fc) => {
        const ctr = form.controller;
        ctr.getAllData().forEach((value, key) => console.log(`${key} : ${value}`));
        ctr.next(fc);
        ctr.clear(); // hiddenの値も消します
    }
})
.addInitTask(ctr => {
    const fc = ctr.get('confirm');
    const hidden = fc.form.querySelector('[name="hiddenvall"]');
    if (hidden.value == '') {
        location.href = location.href;
    }
    const pref = fc.querySelector('.value.prefecture');
    FCData.prefectureJP().forEach((value, key) => {
        const li = pref.appendChild(document.createElement('li'));
        li.classList.add('fccl-prefecture', `v-${key}`);
        li.appendChild(document.createTextNode(value));
    });
});
alert('a');
form.start()
.then(idbReq => {
    form.controller.updateExpires();
    document.getElementById('available').className = 'view';
})
.catch(reason => document.getElementById('unavailable').className = 'view');