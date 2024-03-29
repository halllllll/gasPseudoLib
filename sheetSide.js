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
    menu.addItem("「本の名前」ひらがな変換(openbd)", "convertTitleToKanaByOpenBD_");
    menu.addItem("「本の名前」ひらがな変換(漢字を含まないタイトルを反映)", "mapKanaTitle_");
    menu.addItem("「本の名前」ひらがな変換数を確認", "countKanaFilled_");
    menu.addToUi();
}

/**
 * ISBN列をもとにして本のデータを取得
 * openbdを使用
 * データから読み方を取得
 * openbdはどんどんapi叩いてくれと言っているのでそうする
 * 連続押下を防ぐためのフラグを用意したい（あとでやる）
 */
 function convertTitleToKanaByOpenBD_(){
    const properties = PropertiesService.getScriptProperties();
    // 排他的フラグでブロック
    const execUser = properties.getProperty(CONVERTING_KANA_USER);
    // 時間でのトリガーならブロックしないf
    if(execUser === null){
        properties.setProperty(CONVERTING_KANA_USER, Session.getActiveUser().getEmail());
    }else if(execUser !== Session.getActiveUser().getEmail()){
      SpreadsheetApp.getUi().alert(`${execUser}が使用中です`);
      return;
    }else{

    }
    // 実行時間計測用
    const startTime = new Date();
    const limitMin = 3;
    // ヘッダー無視　以降、ヘッダー亡き者として考える
    const isbnVal = DataSheet.getRange(`${COL_ISBN}2:${COL_ISBN}`).getDisplayValues().flat();
    // タイトル取得
    const titleVal = DataSheet.getRange(`${COL_TITLE}2:${COL_TITLE}`).getDisplayValues().flat();
    const triggers = ScriptApp.getProjectTriggers();
    const range = DataSheet.getRange(`${COL_KANATITLE}2:${COL_KANATITLE}`);

    for(let trigger of triggers){
        if(trigger.getHandlerFunction() === "convertTitleToKanaByOpenBD_"){
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
    let newReggisted = 0;

    // ここでAPIを叩く　10000件文をまとめて取得する
    // urlのパラメータが2kbというfetchの条件があった...
    // どこまでOKか確かめてみる
    /**
     * 
     * @param {number} start 
     * @param {number} bytesLimit 
     * @param {string[]} arr 
     * @returns {number} 
     */
    const nibutan = (start, bytesLimit, arr) => {
        let [left, middle, right] = [start, null, arr.length];
        while(left < right){
            middle = Math.floor(((right - left) / 2)) + left;
            const subArrStr = arr.slice(start, middle).join(",");
            const bytes = Utilities.newBlob(`https://api.openbd.jp/v1/get?isbn=${subArrStr}`);
            if(bytes.getBytes().length < bytesLimit){
                left = middle + 1;
            }else{
                right = middle - 1;
            }
        }
        return left-1;
    }
    let limitIdx = nibutan(taskIdx, 2000, isbnVal);
    console.log(`${taskIdx}から${limitIdx}までやるよ`);
    let resp = getBookData_(isbnVal.slice(taskIdx, limitIdx).join(","));
    let respIdx = 0;


    for(let i = taskIdx; i < isbnVal.length; i++){
        // もし取得してる分のopenbd api response dataが尽きたら再取得
        if(respIdx === resp.length){
            console.log("===================================");
            console.log(`2kb制限 ${limitIdx}に達したので更新`);
            limitIdx = nibutan(i, 2000, isbnVal);
            console.log(`更新しました ${limitIdx}`);            
            resp = getBookData_(isbnVal.slice(i, limitIdx).join(","));
            respIdx = 0;
        }

        // 実行時間チェック
        const curTime = new Date();
        const difTime = parseInt((curTime.getTime() - startTime.getTime())/(1000*60));
        if(difTime >= limitMin){
            // 実行猶予時間を越えているので次のトリガー設定しておわり
            console.log(`range start from: ${startIdx}, end ${i-1}`);
            properties.setProperty("taskIdx", i);
            console.log(`and, result : ${(i - 1) - startIdx}, new : ${newReggisted}`);
            const nextTrigger = ScriptApp.newTrigger("convertTitleToKanaByOpenBD_").timeBased().after(30000).create(); // 30秒後
            return;
        }


        // 都度rangeで取得したい衝動がある（一個一個BGColorつけたい)
        const cell = range.getCell(i+1, 1);

        // ここから取得
        // const curIsbn = isbnVal[i];
        // const data = TestGetBookData_(curIsbn);
        const kanaTitle = resp[respIdx] !== null ? resp[respIdx].onix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkey : "";
        respIdx++;

        // collationkeyが存在しないパターンがある
        if(kanaTitle === undefined || kanaTitle === "" || kanaTitle === null){
            // console.info(`${isbnVal[taskIdx]}: openbd上でonix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkeyがみつかりませんでした`);
            continue;
        }
        console.log(i, titleVal[i], isbnVal[i], kanaTitle, kanaToHira_(kanaTitle), cell.getDisplayValue());

        cell.setBackground("#97bad9");
        cell.setValue(kanaToHira_(kanaTitle));
        newReggisted++;
    }
    properties.deleteProperty("taskIdx");
    properties.deleteProperty(CONVERTING_KANA_USER);
    SpreadsheetApp.getUi().alert("openbdから反映する処理が完了しました");
}

/**
 * もともと仮名とカナオンリーのタイトルだったらAPI叩く意味なさそうなので、
 * そういうやつは単純にかな変換して転写するだけにする
 * そんなに計算量と時間的にシビアではないので、列全体ではなく、都度APIを叩いてrangeごとに埋めるようにする
 * (この関数による処理だとわかりやすくするため背景色を付与する)
 */
function mapKanaTitle_(){
    const titleRange = DataSheet.getRange(`${COL_TITLE}2:${COL_TITLE}`);
    const kanaRange = DataSheet.getRange(`${COL_KANATITLE}2:${COL_KANATITLE}`);
    // タイトル取得
    const titleVal = titleRange.getDisplayValues().flat();
    // かな変換後のカラム 不要な変換を防ぐため、すでに埋まっている箇所は無視する
    const kanaVal = kanaRange.getDisplayValues().flat();
    for(let i=0; i<titleVal.length; i++){
        // if(kanaVal[i] !== "")continue;
        if(!containsKanji_(titleVal[i]))continue; // 漢字が含まれていたらそのまま流用できない
        // console.log(`「${titleVal[i]}」に漢字は含まれないのでそのまんま流用しちゃえ -> 「${kanaToHira_(titleVal[i])}」`);
        const kanaRow = kanaRange.getCell(i+1, 1);
        kanaRow.setBackground("#69fa99");
        kanaRow.setValue(kanaToHira_(titleVal[i]));
    }
    SpreadsheetApp.getUi().alert("漢字が含まれないタイトルについて、「かな」列に流用する処理が完了しました");
}

/**
 * 漢字以外
 * 漢字(CJK)にマッチする正規表現 -> [\u4E00-\u9FFF\u3005-\u3007] (https://www.javadrive.jp/regex-basic/sample/index9.html)
 * こういうことをするなら本当はウムラウトとか考えなければいけないが、今回の要件では無視する
 * @param {String} text
 * @return {boolean}
 */
function containsKanji_(text){
    const pattern = /[\u4E00-\u9FFF\u3005-\u3007]/g;
    return text.match(pattern) === null ? true : false;
}


/**
 * カタカナを含む文字列 -> カタカナ部分は全部ひらがなに変換
 * @param {String} kana 
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
    // URL Fetch parameter limit 確認
    const bytes = Utilities.newBlob(url).getBytes().length;
    console.log(`バイト長: ${bytes}`);
    const res = UrlFetchApp.fetch(url);
    return JSON.parse(res.getContentText());
}

/**
 * かな列、どんだけ埋まってないか知りたい
 */
function countKanaFilled_(){
    const kanaVal = DataSheet.getRange(`${COL_KANATITLE}2:${COL_KANATITLE}`).getDisplayValues().flat();
    const kanaHeader = DataSheet.getRange(`${COL_KANATITLE}1`).getDisplayValue();
    let count = 0;
    for(let k of kanaVal){
        if(k === "")continue;
        count++;
    }
    SpreadsheetApp.getUi().alert(`「${kanaHeader}」 記入数 \n${count} / ${kanaVal.length} (${Math.round((count/kanaVal.length * 100) * 1000)/1000}%)`);

}


/**
 * 今のURLがとってこれるかテスト
 */

function curURL(){
    return ScriptApp.getService().getUrl();
}