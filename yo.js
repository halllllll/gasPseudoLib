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
    return HtmlService.createHtmlOutputFromFile(filename)
        .getContent();
}

/**
 * Vueのgoogle.script.runから呼ばれる
 * とりあえずsheetの全データを返す（Jsonとして返す）
 * reference: https://qiita.com/merarli/items/77c649603d5df4caaaf9
 */
function getAllData(header){
    const values = sheet.getDataRange().getValues();
    values.shift(); // ヘッダーいらないよ
    return values.map((row)=>{
        let obj = {};
        row.map((item, index) => {
          obj[String(header[index])] = String(item);
        });
        return obj;
      });
}

/**
 * ワードが含まれる行を取得したい
 */
function search(header, words){
    // とくにjsonとか考えなくても文tableHeader2字列のまま取得できた 配列も同じ
    const searchWords = `(${words.trim().replaceAll(/(　| |\\|\|)+/g, " ").split(" ").join("|")})`;
    console.log(`search target words: ${searchWords}`);
    // 検索対象はとりあえずタイトルだけ
    const titleRange = sheet.getRange(`A2:A`);
    const values = sheet.getDataRange().getValues();
    // 検索
    if(words !== ""){
        const textFinder = titleRange.createTextFinder(searchWords).useRegularExpression(true);
        const targetRanges = textFinder.findAll();
        return targetRanges.map((r)=>{
            let obj = {};
            // valuesはヘッダー行を含まない0オーダー && rowIndexは1オーダーなので
            const rNum = r.getRowIndex()-1;
            Logger.log(`${rNum}: ${values[rNum]}`);
            values[rNum].map((item, index) => {
            obj[String(header[index])] = String(item);
            });
            return obj;
        });
    }else{        
        console.log("検索ワード空だったよ～");
        values.shift();
        return values.map((row)=>{
            let obj = {};
            row.map((item, index) => {
              obj[String(header[index])] = String(item);
            });
            return obj;
        });
    }
}

