const ss = SpreadsheetApp.getActive();
function showThisURL() {
  console.log(ss.getUrl())
}

function doGet(){
    const html = HtmlService.createTemplateFromFile('home').evaluate();
    html.addMetaTag('viewport', 'width=device-width, initial-scale=1');
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
function getAllData(){
    const sheet = ss.getActiveSheet();
    const values = sheet.getDataRange().getValues();
    const headerValue = values.splice(0, 1)[0];
    return values.map((row)=>{
        let obj = {};
        row.map((item, index) => {
          obj[String(headerValue[index])] = String(item);
        });
        return obj;
      });
}