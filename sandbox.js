function myFunction() {
  
    const properties = PropertiesService.getScriptProperties();
    console.log(properties.getProperty(CONVERTING_KANA_FLAG) === null);
    properties.setProperty(CONVERTING_KANA_FLAG, true);
    console.log(properties.getProperty(CONVERTING_KANA_FLAG) === "true");
    properties.deleteAllProperty(CONVERTING_KANA_FLAG);
}
