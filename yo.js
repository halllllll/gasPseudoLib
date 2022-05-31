const ss = SpreadsheetApp.getActive();
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
    const sheet = ss.getActiveSheet();
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
 * @param {string} words 
 * @returns 
 */
function search(header, words){
  // とくにjsonとか考えなくても文tableHeader2字列のまま取得できた
  // 配列も同じ
  const searchWords = `(${word.trim().replaceAll(/(　| |\\|\|)+/g, " ").split(" ").join("|")})`;
  console.log(`search target words: ${searchWords}`);
  const sheet = ss.getActiveSheet();
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

