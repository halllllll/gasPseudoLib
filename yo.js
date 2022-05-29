const ss = SpreadSheetApp.getActive();
function myFunction() {
  console.log(ss.getUrl())
}

function doGet(){
    return HtmlService.createHtmlOutputFromFile('home');
}