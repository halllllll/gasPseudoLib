const ss = SpreadsheetApp.getActive();
const DataSheet = ss.getSheetByName("蔵書データ");
const GenreSheet = ss.getSheetByName("分類表");

// 起動時にキャッシュを再取得
const caches = CacheService.getScriptCache();

/**
 * 時限で自動的にキャッシュする
 * これはdoGetから呼ばれ、毎回チェックして抜ける
 */
 function setTriggerForCache(){
    const triggerName = "setTriggerForCache";

    // チェック
    if(caches.get(triggerName) != null){
        console.log(`not yet expireing time`);
        return;
    }
    console.log(`expired(may be)`);
    // triggerの発火タイミング
    // cacheの上限は6時間だが余裕をもって3時間後に発火
    // ミリ秒で指定
    const cacheResetInterval = 3*60*60*1000;
    
    // Map object
    const genreTableMap = genGenreTable();
    if(genreTableMap.size <= 1){
      throw new Error("蔵書シートに請求番号を記入してください");
    }
    const genreTableObj = {};
    genreTableMap.forEach((v, k)=>{
        if(v!=="" && k!=="")genreTableObj[k] = v;
    });
    // cacheの保持時間は秒で指定
    caches.putAll(genreTableObj, 60*60*6);
    const triggers = ScriptApp.getProjectTriggers();
    for(let trigger of triggers){
        if(trigger.getHandlerFunction() === triggerName){
          ScriptApp.deleteTrigger(trigger);
        }
    }
    // 自分自身にトリガーをセット
    ScriptApp.newTrigger(triggerName).timeBased().after(cacheResetInterval).create();
}

function showThisURL() {
  console.log(ss.getUrl());
}

function doGet(){
    const html = HtmlService.createTemplateFromFile('home').evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setTitle(HEADER_TITLE);
    html.setFaviconUrl("https://img.icons8.com/flat-round/344/26e07f/book.png");

    const triggerName = "setTriggerForCache";
    // チェック
    if(caches.get(triggerName) == null){
        console.log(`cache~~~`);
        setTriggerForCache(); // 時限で値をキャッシュする
    }

    return html;
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function includeHeaderLogoTemplate(filename){
    const html = HtmlService.createTemplateFromFile(filename);
    // htmlの属性の値にscriptletがあってもちゃんと評価される
    html.webAppUrl = ScriptApp.getService().getUrl();
    return html.evaluate().getContent();
}

/**
 * 分類表をもとに変換
 */
function genGenreTable(){
    if(GenreSheet === null){
        return;
    }
    // 中間テーブル（こっちがインターフェース）
    const midTable = new Map();
    // 実テーブル
    const table = new Map();
    // 一応 ヘッダーを含めてテーブル作る
    const value = GenreSheet.getDataRange().getDisplayValues();
    for(let [idx, v] of value.entries()){
        if(v.length!==3){
            return new Error("invalid data of sheet `分類表`");
        }
        v = v.map(ele => (ele.trim()).toString());
        table.set(v[0], v[1]);  // key, value. ひらがなは一旦無視
    }
    // 先頭がEだと絵本らしい（これが一般的なのかは不明）
    const pattern = /[0-9]{3}|^E/i;

    // 本番データから分類の部分の列だけ取得
    const sayQNumb = DataSheet.getRange(`${COL_GENRE}2:${COL_GENRE}`).getDisplayValues();
    for(let [idx, v] of sayQNumb.entries()){
        const content = v.toString().replaceAll(/\s/img, "");
        if(content == null){
            midTable.set(v.toString(), v.toString()); // 未登録
            continue;
        }
        let result = content.match(pattern);
        if(result == null){
            midTable.set(v.toString(), v.toString()); // 未登録
            continue;
        }
        result = result.toString();
        if(result != null && table.has(result)){
            midTable.set(result, table.get(result));
        }else{
            midTable.set(result, v.toString()); // 未登録
        }
    }

    console.log(`mid table:`);
    midTable.forEach((v, k)=>{
        console.log(`--- key: ${k}, value: ${v}`);
    });
    console.log(`--------------end-----------------`);
    return midTable;
}

/**
 * ワードが含まれる行を取得したい
 * 検索ワードが空の場合は全部返す
 * 1ページあたり50件とする(limitNum)
 * Vueのgoogle.script.runから呼ばれる
 * reference: https://qiita.com/merarli/items/77c649603d5df4caaaf9
 */
function search(options){
    const decodedObj = JSON.parse(options);
    console.log(`decodeObj:`);
    console.log(decodedObj);
    const header = decodedObj.header;
    const words = decodedObj.words;
    const page = decodedObj.page;
    const andOrOption = decodedObj.andOrOption;
    const includeAuthorName = decodedObj.includeAuthorName;
    const experimental_hiraganaMode = decodedObj.hiraganaMode;
    let searchWords = words.trim().replaceAll(/(　| |\\|\|\s)+/g, " ").split(" ");

    switch(andOrOption){
        case "OR":
            searchWords = `(${searchWords.join("|")})`;
            break;
        case "AND":
            searchWords = "^" + searchWords.map(word => `(?=.*${word})`).join("");
            break;
        default:
            console.error(`why option besides or/and ? option: ${andOrOption}`);
    }
    
    console.log(`search target words: ${searchWords}`);
    
    // 分類分けのためにheaderにgenreを含ませる
    if(!header.includes("genre")){
        header.push("genre");
    }
    const setObjProperties = (tmpObj, index, item, header) =>{
        if(String(header[index]) === "genre"){
            let genre = item.replaceAll(/\s/img, "");
            // 先頭がEだと絵本らしい（これが一般的なのかは不明）
            genre = genre.match(/[0-9]{3}|^E/i);
            if(genre != null){
                genre = genre.length >= 1 ? genre[0] : genre;
                tmpObj["genre"] = `${genre}:${caches.get(genre)}`;
            }else{
                tmpObj["genre"] = `みとうろく(${String(item)}) `;
            }
        }else{
            tmpObj[String(header[index])] = String(item);
        }
    };

    const titleColIdx = convertA1toColNum_(COL_TITLE);
    const kanaTitleColIdx = convertA1toColNum_(COL_KANATITLE);

    // 検索対象 本のタイトル（オリジナル or かな）
    // experimental hiragana mode
    const titleRange = experimental_hiraganaMode ? DataSheet.getRange(`${COL_KANATITLE}2:${COL_KANATITLE}`) : DataSheet.getRange(`${COL_TITLE}2:${COL_TITLE}`);

    // 検索対象　人名（オリジナル）
    const authorRange = DataSheet.getRange(`${COL_AUTHOR}2:${COL_AUTHOR}`);

    // ひらがなモード仮
    // TODO: オリジナルの名前の列とひらがなの名前の列を入れ替えるが、ほかにいい方法があるはず
    const values = experimental_hiraganaMode ? 
          DataSheet.getDataRange().getDisplayValues().map(row=>{
              [row[kanaTitleColIdx], row[titleColIdx]] = [row[titleColIdx], row[kanaTitleColIdx]];
              return row;
          }) : DataSheet.getDataRange().getDisplayValues();


    // 1ページあたりの表示件数
    const limitNum = 50;
    let retObj = {
        'curPage': page,
        'countLimit': limitNum,
    };
    // 検索
    if(words !== ""){
        const titleFinder = titleRange.createTextFinder(searchWords).useRegularExpression(true);
        // 人名での検索 データに含まれる著作の区切りである「／」より手前で検索（「さく」「やく」「文」「著」が人名に含まれてることがある）
        const targetAuthorRanges = includeAuthorName ? authorRange.createTextFinder(`${searchWords}.*(?=／).*`).useRegularExpression(true).findAll() : null;
        // TODO: merge ranges for appearance order on sheet
        const targetTitleRanges = titleFinder.findAll();
        if(includeAuthorName)targetTitleRanges.push(...targetAuthorRanges);
        const curTargetTitleRanges = targetTitleRanges.slice((page-1)*limitNum, page*limitNum);
        // 検索オプション（本のタイトル+人名など）を使ったときの重複排除とソート用
        const addedData = new Map();

        // 重複 排除
        const data = curTargetTitleRanges.reduce((pre, _, rangeArrIdx, rangeArr) => {
            const curObj = rangeArr[rangeArrIdx];
            const rNum = curObj.getRowIndex()-1;
            if(addedData.has(rNum))return pre;
            addedData.set(rNum, true);
            Logger.log(`${rNum}: ${values[rNum]}`);
            let tmpObj = {};
            // headerまでの長さに合わせて余計なものを取らないようにする
            values[rNum].slice(0, header.length).map((item, index) => {
                setObjProperties(tmpObj, index, item, header);
            });
            pre.push(tmpObj);
            return pre;
        }, []);
        console.log(`all count: ${targetTitleRanges.length}`);
        console.log(`max page: ${Math.ceil(targetTitleRanges.length/limitNum)}`);
        retObj['resultNum'] = targetTitleRanges.length;
        retObj['maxPage'] = Math.ceil(targetTitleRanges.length/limitNum)
        retObj['data'] = data;
    }else{        
        console.log("検索ワードが空");
        values.shift();
        // ページはフロント側で先にインクリメントしている
        let curVal = values.slice((page-1)*limitNum, page*limitNum);
        const data = curVal.map((row)=>{
            let tmpObj = {};
            row.map((item, index) => {
              setObjProperties(tmpObj, index, item, header);
            });
            return tmpObj;
        });
        console.log(`all count: ${values.length}`);
        console.log(`max page: ${Math.ceil(values.length/limitNum)}`);
        retObj['resultNum'] = values.length;
        retObj['maxPage'] = Math.ceil(values.length/limitNum);
        retObj['data'] = data;
    }
    // 取得できたかチェック
    if(Object.keys(retObj).length === 0){
        retObj['successed'] = false;
    }else{
        retObj['successed'] = true;
    }
    return retObj;
}

