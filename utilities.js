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

function t(){
  const arr = ["E", "A", "X", "U", "T", "AA", "CAE", 93, "GREAT"];
  try{
    for(let a of arr){
      const ret = convertA1toColNum_(a);
      console.log(a, ret);
    }
  }catch(e){
    console.log(e);
  }
}