

void processCallbackAction(String topic, String data) {
  Serial.println(data);

  int index = data.indexOf(',');
  String action = data.substring(0, index);
  String value = data.substring(index + 1, data.length() + 1);
  Serial.println(action);
  Serial.println(value);

  if (action == "OTA")
  {
    index = value.indexOf('/');
    String uri = value.substring(index, value.length() + 1);
    value = value.substring(0, index);

    ESPhttpUpdate.update(value, 80, uri, String(product) + "," + String(version));
  }
  if (action == "RequestState")
  {
    clientMQTT.publish("unumobile.com/UNU-WF8266R", "{'Action':'ResponseState','ChipId':'" + String(ESP.getChipId()) + "','LocalIp':'" + getLocalIp() + "','Version':'" + product + ',' + version + "'}");
  }
  if (action == "APP") //APP,APPID,ACTION,VALUE
  {
    index = value.indexOf(',');
    String backAddr = value.substring(0, index);

    value = value.substring(index + 1, value.length() + 1);
    index = value.indexOf(',');
    action = value.substring(0, index);
    value = value.substring(index + 1, value.length() + 1);

    if (action == "CONFIG")
    {
      clientMQTT.publish("unumobile.com/UNU-WF8266R/" + backAddr, "{\"Action\":\"" + action + "\",\"Data\":\"" + value + "\",\"Product\":\"" + product + "\",\"Message\":[],\"UUID\":\"\",\"ChipId\":\"" + ESP.getChipId() + "\",\"LocalIp\":\"" + getLocalIp() + "\"}");
    }
  }
}

