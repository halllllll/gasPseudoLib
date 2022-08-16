function myFunction() {
  
    const properties = PropertiesService.getScriptProperties();
    console.log(properties.getProperty(CONVERTING_KANA_USER) === null);
    properties.setProperty(CONVERTING_KANA_USER, true);
    console.log(properties.getProperty(CONVERTING_KANA_USER) === "true");
    properties.deleteAllProperty(CONVERTING_KANA_USER);
}


/**
 * API叩くところ(テスト)
 */
function apitest(){
    const testData = ["4-7743-1340-5", "978-4-591-15523-3", "978-4-477-02549-0", "4-652-02083-X", "4-00-113147-1"];
    // 10000万件までならカンマ区切りで一回でとってこれる
    const data = getBookData_(testData.join(","));
    for(let [idx, v] of data.entries()){
        console.log(`idx=${idx}`);
        const kanaTitle = data[idx] !== null ? data[idx].onix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkey : "";
        console.log(kanaTitle, kanaToHira_(kanaTitle));
    }
}

function pp(){
    const properties = PropertiesService.getScriptProperties();
    for(let k of properties.getKeys()){
        console.log(k, properties.getProperty(k));
   }
}


/**
 * １件ずつAPI叩くのアホくさいのでまとめて取得してみる
 * @returns 
 */
function TestConvertTitleToKanaByOpenBD(){
    const properties = PropertiesService.getScriptProperties();
    // 排他的フラグでブロック
    const execUser = properties.getProperty(CONVERTING_KANA_USER);
    // 時間でのトリガーならブロックしない
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
        if(trigger.getHandlerFunction() === "TestConvertTitleToKanaByOpenBD"){
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
    const nibutan = (start, bytesLimit=2000, arr) => {
        let [left, middle, right] = [start, null, arr.length];
        while(left < right){
            middle = Math.floor(((right - left) / 2) + left);
            const subArrStr = arr.slice(start, middle).join(",");
            const bytes = Utilities.newBlob(`https://api.openbd.jp/v1/get?isbn=${subArrStr}`);
            if(bytesLimit < bytes.getBytes().length){
                right = middle - 1;
            }else{
                left = middle + 1;
            }
        }
        // ほんまかいな...
        let url = `https://api.openbd.jp/v1/get?isbn=${arr.slice(start, left-1).join(",")}`;
        let strBytes = Utilities.newBlob(url);
        console.log(`${start}から${left-1}までのbyte数は${strBytes.getBytes().length}なので${bytesLimit}未満だよね????`);
        console.log(strBytes.getBytes().length < bytesLimit);
        return left-1;
    }

    let limitIdx = nibutan(taskIdx, 2000, isbnVal);
    let resp = getBookData_(isbnVal.slice(taskIdx, taskIdx+limitIdx).join(","));
    let respIdx = 0;
    for(let i = taskIdx; i < isbnVal.length; i++){
        // もし取得してる分のopenbd api response dataが尽きたら再取得
        if(respIdx === resp.length){
            limitIdx = nibutan(i, 2000, isbnVal);
            resp = getBookData_(isbnVal.slice(i, limitIdx).join(","));
            respIdx = 0;
        }

        // 実行時間チェック
        const curTime = new Date();
        const difTime = parseInt((curTime.getTime() - startTime.getTime())/(1000*60));
        if(difTime >= limitMin){
            // 実行猶予時間を越えているので次のトリガー設定しておわり
            console.log(`range start from: ${startIdx}, end ${taskIdx-1}`);
            properties.setProperty("taskIdx", taskIdx);
            console.log(`and, result : ${(taskIdx - 1) - startIdx}, new : ${newReggisted}`);
            const nextTrigger = ScriptApp.newTrigger("TestConvertTitleToKanaByOpenBD").timeBased().after(30000).create(); // 30秒後
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
        // console.log(i, titleVal[i], isbnVal[i], kanaTitle, kanaToHira_(kanaTitle), cell.getDisplayValue());
        console.log(i, titleVal[i], isbnVal[i] ,kanaTitle);
        // cell.setBackground("#97bad9");
        // cell.setValue(kanaToHira_(kanaTitle));
        newReggisted++;
    }
    properties.deleteProperty("taskIdx");
    properties.deleteProperty(CONVERTING_KANA_USER);
    SpreadsheetApp.getUi().alert("openbdから反映する処理が完了しました");
}

/**
 * isbnをもとにopenbdから書籍データをFetchする
 * @param {Number} isbn
 * @returns {JSON}
 */
 function TestGetBookData_(isbn){
    const url = `https://api.openbd.jp/v1/get?isbn=${isbn}`;
    const res = UrlFetchApp.fetch(url);
    return JSON.parse(res.getContentText());
}