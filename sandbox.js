function myFunction() {
  
    const properties = PropertiesService.getScriptProperties();
    console.log(properties.getProperty(CONVERTING_KANA_FLAG) === null);
    properties.setProperty(CONVERTING_KANA_FLAG, true);
    console.log(properties.getProperty(CONVERTING_KANA_FLAG) === "true");
    properties.deleteAllProperty(CONVERTING_KANA_FLAG);
}



/**
 * textfinderのやつ　複数の列をターゲットにしたい　rangeをマージする？なんかいい方法ないかな
 */
function searchTest(){
    // とくにjsonとか考えなくても文tableHeader2字列のまま取得できた 配列も同じ
    const header = ["title", "author", "publisher", "genre"];
    const words = `夏　草`;
    const page = 1;
    const andOrOption = "OR";
    const includeAuthorName = false;


    let searchWords = words.trim().replaceAll(/(　| |\\|\|\s)+/g, " ").split(" ");
    switch(andOrOption){
        case "OR":
            searchWords = `(${searchWords.join("|")})`;
            break;
        case "AND":
            searchWords = "^" + searchWords.map(word => `(?=.*${word})`).join("");
            break;
        default:
            console.log(`why option besides or/and ?`);
    }
    
    console.log(`search target words: ${searchWords}`);
    
    // 分類分けのためにheaderにgenreを含ませる
    if(!header.includes("genre")){
        header.push("genre");
    }
    const setObjProperties = (tmpObj, index, item, header) =>{
        if(String(header[index]) === "genre"){
            let genre = item.replaceAll(/\s/img, "");
            // 先頭がEだと絵本らしい（これが一般的なのかは不明）
            genre = genre.match(/[0-9]{3}|^E/i);
            if(genre != null){
                // なぜか配列になってる regexのパターンでgは指定してないのだが
                genre = genre.length >= 1 ? genre[0] : genre;
                // tmpObj["genre"] = genreTable.get(genre);
                tmpObj["genre"] = caches.get(genre);
            }else{
                tmpObj["genre"] = `みとうろく(${String(item)}) `;
            }
        }else{
            tmpObj[String(header[index])] = String(item);
        }
    };


    // 検索対象 本のタイトル（オリジナル）
    const titleRange = DataSheet.getRange(`${COL_TITLE}2:${COL_TITLE}`);
    // 検索対処 人名（オリジナル）
    const authorRange = DataSheet.getRange(`${COL_AUTHOR}2:${COL_AUTHOR}`);

    const values = DataSheet.getDataRange().getValues();

    // 1ページあたりの表示件数
    const limitNum = 50;
    // 返すオブジェクト
    let retObj = {
        'curPage': page,
        'countLimit': limitNum,
    };
    // 検索
    if(words !== ""){
        const titleFinder = titleRange.createTextFinder(searchWords).useRegularExpression(true);
        // 人名での検索？
        const targetAuthorRanges = includeAuthorName ? authorRange.createTextFinder(searchWords).useRegularExpression(true).findAll() : null;
        // rangeって合成できるんだっけ
        const targetTitleRanges = titleFinder.findAll();
        const curTargetTitleRanges = targetTitleRanges.slice((page-1)*limitNum, page*limitNum);
        const data = curTargetTitleRanges.map((r)=>{
            // valuesはヘッダー行を含まない0オーダー && rowIndexは1オーダーなので
            const rNum = r.getRowIndex()-1;
            Logger.log(`${rNum}: ${values[rNum]}`);
            let tmpObj = {};
            values[rNum].map((item, index) => {
                setObjProperties(tmpObj, index, item, header);
            });
            return tmpObj;
        });
        console.log(`all count: ${targetTitleRanges.length}`);
        console.log(`max page: ${Math.ceil(targetTitleRanges.length/limitNum)}`);
        retObj['data'] = data;
        retObj['resultNum'] = targetTitleRanges.length;
        retObj['maxPage'] = Math.ceil(targetTitleRanges.length/limitNum)
    }else{        
        console.log("検索ワード空だったよ～");
        values.shift();
        // ページはフロント側で先にインクリメントしてた...
        let curVal = values.slice((page-1)*limitNum, page*limitNum);
        const data = curVal.map((row)=>{
            let tmpObj = {};
            row.map((item, index) => {
              setObjProperties(tmpObj, index, item, header);
            });
            return tmpObj;
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
  　for(let [val, key] of Object.entries(retObj)){
      console.log(key, val);
  }
}