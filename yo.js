const ss = SpreadsheetApp.getActive();
// const sheet = ss.getActiveSheet();
const sheet = ss.getSheetByName("本番データ");

function showThisURL() {
  console.log(ss.getUrl())
}

function doGet(){
    const html = HtmlService.createTemplateFromFile('home').evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
    html.setTitle("ほんのけんさく（たいけんばん）");
    html.setFaviconUrl("https://img.icons8.com/flat-round/344/26e07f/book.png");
    return html;
}

function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 分類表をもとに変換
 */
function mapGenreNum(){
    const sheet = ss.getSheetByName("分類表");
    if(sheet === null){
        return;
    }
    const value = sheet.getDataRange().getValues();
    for(let [idx, v] of value.entries()){
      console.log(`${idx} ${v}`);
    }
}

/**
 * ワードが含まれる行を取得したい
 * 検索ワードが空の場合は全部返す
 * 1ページあたり50件とする
 * Vueのgoogle.script.runから呼ばれる
 * reference: https://qiita.com/merarli/items/77c649603d5df4caaaf9
 */
function search(header, words, page){
    // とくにjsonとか考えなくても文tableHeader2字列のまま取得できた 配列も同じ
    const searchWords = `(${words.trim().replaceAll(/(　| |\\|\|)+/g, " ").split(" ").join("|")})`;
    console.log(`search target words: ${searchWords}`);
    // 分類分けのためにheaderにgenreを含ませる
    if(!header.includes("genre")){
        header.push("genre");
    }
    // 分類分け、とりあえず3桁番号のみ
    const genrePattern = /\d{3}/g;
    // 検索対象はとりあえずタイトルだけ
    const titleRange = sheet.getRange(`A2:A`);
    const values = sheet.getDataRange().getValues();
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
                // genreのときは専用に分類分けする
                if(String(header[index]) === "genre"){
                    let genre = String(item);
                    console.log("分類あったよん");
                    // テスト
                    genre += `テストだよん`;
                    tmpObj["genre"] = genre;
                }else{
                    tmpObj[String(header[index])] = String(item);
                }
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
            let obj = {};
            row.map((item, index) => {
              obj[String(header[index])] = String(item);
            });
            return obj;
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

