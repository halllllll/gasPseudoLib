const ss = SpreadsheetApp.getActive();
function myFunction() {
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