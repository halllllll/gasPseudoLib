/**
 * SpreadSheet側の画面
 */
function onOpen(){
    // とくにトリガー設定しなくても開いちゃったな
    genMenu_();
}

/**
 * カスタムメニュー
 * onOpen時に呼ばれる
 */
function genMenu_(){
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('蔵書検索用べんりボタン');
    menu.addItem("「本の名前」ひらがな変換", "convertTitleToKana_");
    menu.addToUi();
}

/**
 * ISBN列をもとにして本のデータを取得
 * データから読み方を取得
 * 不要なfetchはしないようにしたい
 * 最終的にはtriggerにする
 * 連続押下を防ぐためのフラグを用意したい（あとでやる）
 */
function convertTitleToKana_(){
    // 実行時間計測用
    const startTime = new Date();
    const limitMin = 1;
    // ヘッダー無視　以降、ヘッダー亡き者として考える
    const isbnVal = DataSheet.getRange(`${COL_ISBN}2:${COL_ISBN}`).getDisplayValues();
    // テストでタイトル取得
    const titleVal = DataSheet.getRange(`${COL_TITLE}2:${COL_TITLE}`).getDisplayValues();
    const triggers = ScriptApp.getProjectTriggers();
    const properties = PropertiesService.getScriptProperties();

    for(let trigger of triggers){
        if(trigger.getHandlerFunction() === "convertTitleToKana_"){
          console.log(`--- DELETE SELF TRIGGER ---`);
          ScriptApp.deleteTrigger(trigger);
        };
      }
    // 実行時間に間に合わないときのトリガーのための「前回どこまでやったか」保存
    let taskIdx = parseInt(properties.getProperty(`taskIdx`));
    if(isNaN(taskIdx)){
        taskIdx = 0;
        properties.setProperty(`taskIdx`, taskIdx);
    }
    const startIdx = taskIdx;
    let result = [];
    for(let i = taskIdx; i < isbnVal.length; i++){
        // 実行時間チェック
        const curTime = new Date();
        const difTime = parseInt((curTime.getTime() - startTime.getTime())/(1000*60));
        if(difTime >= limitMin){
            // 実行猶予時間を越えているのでここまでの結果を反映してトリガー設定しておわり
            // （時間を甘く見積もってるので、残り時間でsetValuesするくらいの余裕はあると思われる）
            taskIdx = i-1;
            console.log(`range start from: ${startIdx}, end ${taskIdx}`);
            properties.setProperty("taskIdx", taskIdx);
            const range = DataSheet.getRange(`${COL_KANATITLE}${startIdx}:${COL_KANATITLE}${taskIdx}`); 
            console.log(`so, range height: ${range.getHeight()}`);
            console.log(`and, result length: ${result.length}`);
            range.setValues(result);
            const nextTrigger = ScriptApp.newTrigger("convertTitleToKana_").timeBased().after(30000).create(); // 30秒後
            console.log(`next loop will start 30秒後?`);
            return;
        }

        // ここから取得
        const curIsbn = isbnVal[i][0];
        if(curIsbn === ""){
            result.push([""]);
            continue;
        }
        const data = getBookData_(curIsbn);
        const kanaTitle = data[0] !== null ? data[0].onix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkey : "";
        console.log(`kanaTitle? ${kanaTitle}`);
        // 4-931129-84-6でcollationkeyが存在しないパターンが発見されたので。全部あるわけじゃないんかい
        if(kanaTitle === undefined){
            console.log(`${curIsbn}: openbd上でonix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkeyがみつかりませんでした`);
            // result.push("{{not find `collationkey`}}");
            result.push([""]);
            continue;
        }
        // const kanaTitle = "ニャー";
        console.log(i, titleVal[i][0], curIsbn, kanaTitle, kanaToHira_(kanaTitle));
        result.push([kanaToHira_(kanaTitle)]);
    }
    properties.deleteProperty("taskIdx");
    console.log("おわったよ～");
}

/**
 * API叩くところ(テスト)
 */
function t(){
    const testData = ["4-7743-1340-5", "978-4-591-15523-3", "978-4-477-02549-0", "4-652-02083-X", "4-00-113147-1"];
    for(let [idx, v] of testData.entries()){
        const data = getBookData_(v);
        const kanaTitle = data[0] !== null ? data[0].onix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkey : "";
        console.log(v, kanaTitle, kanaToHira_(kanaTitle));
    }
}

/**
 * カタカナ->ひらがな
 */
function kanaToHira_(kana) {
    return kana.replace(/[\u30a1-\u30f6]/g, c => {
        const chr = c.charCodeAt(0) - 0x60;
        return String.fromCharCode(chr);
    });
 }
/**
 * isbnをもとにopenbdから書籍データをFetchする
 * @param {Number} isbn
 * @returns {JSON}
 */
function getBookData_(isbn){
    const url = `https://api.openbd.jp/v1/get?isbn=${isbn}`;
    const res = UrlFetchApp.fetch(url);
    return JSON.parse(res.getContentText());
}