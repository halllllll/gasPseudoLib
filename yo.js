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
 * とりあえずsheetの全データを返す（二次元配列だがJsonとして返す）
 */
function getAllData(){
    const sheet = ss.getActiveSheet();
    const values = sheet.getDataRange().getValues();
    const header = values.splice(0, 1)[0];
    return values.map(function(row) {
        let obj = {};
        row.map((item, index) => {
          obj[String(header[index])] = String(item);
        });
        return obj;
      });
}