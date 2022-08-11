function myFunction() {
  
    const properties = PropertiesService.getScriptProperties();
    console.log(properties.getProperty(CONVERTING_KANA_USER) === null);
    properties.setProperty(CONVERTING_KANA_USER, true);
    console.log(properties.getProperty(CONVERTING_KANA_USER) === "true");
    properties.deleteAllProperty(CONVERTING_KANA_USER);
}


/**
 * API叩くところ(テスト)
 */
function apitest(){
    const testData = ["4-7743-1340-5", "978-4-591-15523-3", "978-4-477-02549-0", "4-652-02083-X", "4-00-113147-1"];
    // 10000万件までならカンマ区切りで一回でとってこれる
    const data = getBookData_(testData.join(","));
    for(let [idx, v] of data.entries()){
        console.log(`idx=${idx}`);
        const kanaTitle = data[idx] !== null ? data[idx].onix.DescriptiveDetail.TitleDetail.TitleElement.TitleText.collationkey : "";
        console.log(kanaTitle, kanaToHira_(kanaTitle));
    }
}

function pp(){
    const properties = PropertiesService.getScriptProperties();
    for(let k of properties.getKeys()){
        console.log(k, properties.getProperty(k));
    }
}