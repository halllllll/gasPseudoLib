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
    // 検索対象はとりあえずタイトルだけ
    const titleRange = sheet.getRange(`A2:A`);
    const values = sheet.getDataRange().getValues();
    // 1ページあたりの表示件数
    const limitNum = 50;
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

