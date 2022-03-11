/* example.js
 * 非対応のブラウザの処理は別途記述が必要です。 */
import { Form, FCType, VMType } from './Form.js';

const form = new Form('form1'); // startメソッド以外はチェーンメソッド可能です。
form.controllerSettings({ //　内包するコントローラクラスの設定
    expires : 30 // フォームの有効期限（秒）
})
.formSettings({ // FCType.Form の設定
    delayTime : 1000, // inputイベント発火の遅延時間設定（ミリ秒）
    marginMaxLength : 3, // maxlength以上に文字を入力できるようにするマージンの設定。電話番号の誤入力等に有効です。今のところ共通設定
    validityMessage : new VMType.Jp() // 日本語のテンプレートを使用（今はこれか、各ブラウザのメッセージを利用するクラスしかない）
})
.confirmSettings({ // FCType.COnfirm の設定
    onSubmit : async (event, fc) => {
        const ctr = form.controller;
        ctr.getAllData().forEach((value, key) => console.log(`${key} : ${value}`));
        ctr.next(fc);
        ctr.clear(); // hiddenの値も消します
        /* // ctr.getAllData() はFormDataクラスを返すので、そのままxhrでsendできます。
            const xhr = new XMLHttpRequest();
            xhr.open("POST", '/apply');
            xhr.send(ctr.getAllData());
        */
    }
})
/* append('画面名', 画面のタイプ, formの親要素, オプション)。 原則追加した順に画面遷移します。 */
.append('form', FCType.Form, 'div.form') // フォーム
.append('confirm', FCType.Confirm, 'div.confirm') // 確認画面
.append('applied', FCType.NoForm, 'div.complete') // 登録完了画面
.append('error', FCType.Error, 'div.error', {noStat : true}) // エラー画面

.addInitTask(ctr => { // 各画面の初期処理の定義
    const fc = ctr.get('form'); //画面管理のクラスオブジェクトを取得
    fc.addCondRequire('hobby-etc', 'hobby', 3, 'その他の内容を入力してください。'); // 条件付き必須の定義
})
.start() // 機能開始。append -> addInitTaskの順にwindow.onloadイベントとして実行します。
.then(() => { document.body.classList.remove('hidden'); }) // start()の戻り値はPromiseインスタンスなので、then catch が利用できます。