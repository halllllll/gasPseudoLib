/**
* A1表記を十進数に変換
* @param {String} A1表記
* @return {Number} 数値
*/
function convertA1toColNum_(strCol){
  const m = strCol.toString().match(/^([a-zA-Z]+?)+/g);
  if(!m || m.length!==1){
    throw new Error(`${strCol} is invalid, it's not alphabet sequence by head.`);
  }
  strCol = m[0];
  let iNum = 0;
  let temp = 0;
  
  strCol = strCol.toUpperCase();  // Asciiコードで計算するので
  for (i = strCol.length - 1; i >= 0; i--) {
    temp = strCol.charCodeAt(i) - 65; // 現在の文字番号;
    if(i != strCol.length - 1) {
      temp = (temp + 1) * Math.pow(26,(i + 1));
    }
    iNum = iNum + temp
  }
  return iNum;
}

/**
 * Google Drive上の画像IDからその画像のbase64urlを取得
 * @param {String} fileId 
 * @returns {String} ret - formatedBase64Url
 */
 function getBase64UrlOnDriveImage(fileId){  
  // check
  // - Drive上にあるか
  // - アクセスできるか
  // - 画像ファイルかどうか
  try{
    const file = DriveApp.getFileById(fileId);
    if(file === null){
      console.error("ドライブ上のファイルじゃないかも");
      throw new Error("is this file on Google Drive?");
    }
    if(!accesibleDrive_(file)){
      console.error("アクセスできないファイル permission not `ANYONE_WITH_LINK`");
      throw new Error("permission not `ANYONE_WITH_LINK`");
    }
    if(!typeOfImage_(file)){
      console.error("not image file");
      throw new Error("not image file?");
    }
    const ret = createImageBase64_(file);
    return ret;
  }catch(e){
    console.error(e);
    throw new Error(e);
  }
}

/**
 * Googleドライブに存在かつアクセスできる
 */
function accesibleDrive_(file){
  return file.getSharingAccess().toString() === "ANYONE_WITH_LINK";
}
/**
 * 画像ファイルかどうか MIMEで判断
 */
function typeOfImage_(file){
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
  const imageMimeTypes = ["image/jpeg", "image/png", "image/svg+xml"];
  return imageMimeTypes.includes(file.getMimeType());
}

/**
 * Googleドライブ上にある画像ファイルをbase64形式で返す
 */
function createImageBase64_(file){
  const fileBlob = file.getBlob();
  const base64Data = Utilities.base64Encode(fileBlob.getBytes());
  const contentType = fileBlob.getContentType();
  const base64Url = "data:" + contentType + ";base64," + base64Data;
  return base64Url;
}

