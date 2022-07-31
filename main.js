const ss = SpreadsheetApp.getActive();
const DataSheet = ss.getSheetByName("本番データ");
const GenreSheet = ss.getSheetByName("分類表");

// vueのcreatedで初回だけ叩いて予めテーブル情報を生成しとく
// ->失敗したのでキャッシュする方向に転換
const caches = CacheService.getScriptCache();

/**
 * 時限で勝手にキャッシュする　cacheserviceの最大時間は6時間らしい
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
    // cacheの上限が6時間だけどチキってその半分ということにする(milliseconds)
    const cacheResetInterval = 60*60*6*1000 / 2;
    
    // Map object
    const genreTableMap = genGenreTable();
    const genreTableObj = {
        triggerName: "生きとるよ",
    };
    genreTableMap.forEach((v, k)=>{
        genreTableObj[k] = v;
    });
    
    caches.putAll(genreTableObj, 60*60*6); // up to limit is 6 hours(21600 sec)

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
  console.log(ss.getUrl())
}

function doGet(){
    const html = HtmlService.createTemplateFromFile('home').evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setTitle("ほんのけんさく（たいけんばん）");
    html.setFaviconUrl("https://img.icons8.com/flat-round/344/26e07f/book.png");

    const triggerName = "setTriggerForCache";
    // チェック
    if(caches.get(triggerName) == null){
        console.log(`cache~~~`);
        setTriggerForCache(); // 時限で値をキャッシュするやつ
    }

    return html;
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
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
    // めんどくさいのでヘッダーを含めてテーブル作る
    const value = GenreSheet.getDataRange().getDisplayValues();
    for(let [idx, v] of value.entries()){
        if(v.length!==3){
            return new Error("invalid data of sheet `分類表`");
        }
        v = v.map(ele => (ele.trim()).toString());
        table.set(v[0], v[1]);  // key, value. ひらがなは一旦無視
    }
    // 「半角数が3つ並ぶ」にマッチ `g`オプションがないと最初のやつにマッチ
    // 先頭がEだと絵本らしい（これが一般的なのかは不明）
    const pattern = /[0-9]{3}|^E/i;

    // 本番データから分類の部分の列だけとってきてみる
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
function search(header, words, page, andOrOption){
    // とくにjsonとか考えなくても文tableHeader2字列のまま取得できた 配列も同じ
    let searchWords = words.trim().replaceAll(/(　| |\\|\|\s)+/g, " ").split(" ");
    switch(andOrOption){
        case "OR":
            searchWords = `(${searchWords.join("|")})`;
            break;
        case "AND":
            searchWords = "^" + searchWords.map(word => `(?=.*${word})`).join("");
            break;
        default:
            console.log(`why option besides or/and ?`);
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
                // なぜか配列になってる regexのパターンでgは指定してないのだが
                genre = genre.length >= 1 ? genre[0] : genre;
                // tmpObj["genre"] = genreTable.get(genre);
                tmpObj["genre"] = caches.get(genre);
            }else{
                tmpObj["genre"] = `みとうろく(${String(item)}) `;
            }
        }else{
            tmpObj[String(header[index])] = String(item);
        }
    };


    // 検索対象はとりあえずタイトルだけ
    const titleRange = DataSheet.getRange(`${COL_TITLE}2:${COL_TITLE}`);
    const values = DataSheet.getDataRange().getValues();
    // 1ページあたりの表示件数
    const limitNum = 50;
    // 返すオブジェクト
    let retObj = {
        'curPage': page,
        'countLimit': limitNum,
    };
    // 検索
    if(words !== ""){
        const textFinder = titleRange.createTextFinder(searchWords).useRegularExpression(true);
        const targetRanges = textFinder.findAll();
        const curTargetRanges = targetRanges.slice((page-1)*limitNum, page*limitNum);
        const data = curTargetRanges.map((r)=>{
            // valuesはヘッダー行を含まない0オーダー && rowIndexは1オーダーなので
            const rNum = r.getRowIndex()-1;
            Logger.log(`${rNum}: ${values[rNum]}`);
            let tmpObj = {};
            values[rNum].map((item, index) => {
                setObjProperties(tmpObj, index, item, header);
            });
            return tmpObj;
        });
        console.log(`all count: ${targetRanges.length}`);
        console.log(`max page: ${Math.ceil(targetRanges.length/limitNum)}`);
        retObj['data'] = data;
        retObj['resultNum'] = targetRanges.length;
        retObj['maxPage'] = Math.ceil(targetRanges.length/limitNum)
    }else{        
        console.log("検索ワード空だったよ～");
        values.shift();
        // ページはフロント側で先にインクリメントしてた...
        let curValues = values.slice((page-1)*limitNum, page*limitNum);
        const data = curValues.map((row)=>{
            let tmpObj = {};
            row.map((item, index) => {
              setObjProperties(tmpObj, index, item, header);
            });
            return tmpObj;
        });
        console.log(`all count: ${values.length}`);
        console.log(`max page: ${Math.ceil(values.length/limitNum)}`);
        retObj['data'] = data;
        retObj['resultNum'] = values.length;
        retObj['maxPage'] = Math.ceil(values.length/limitNum);
    }
    // 取れたかチェック
    if(Object.keys(retObj).length === 0){
        retObj['successed'] = false;
    }else{
        retObj['successed'] = true;
    }
    return retObj;
}

