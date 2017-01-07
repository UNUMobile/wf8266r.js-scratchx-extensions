uint16_t saveConfig() {
  return EEPROM_writeAnything(0, storage, romSize);
}

String loadConfig() {
  delay(100);
  String rtn = "";
  rtn = "{\"Action\":\"ap\",\"data\":\"FabLab-NKNU-" + String(ESP.getChipId()) + "\"}";
  Serial.println(rtn);

  EEPROM_readAnything(0, storage, romSize);
  if (storage.isConnected)
  {
    rtn = "{\"Action\":\"connWiFi\",\"data\":\"" + connectTo() + "\"}";
    Serial.println(rtn);
  }

  String nameAPS = "fablab" + String(ESP.getChipId());
  char nameAP[20];
  nameAPS.toCharArray(nameAP, nameAPS.length() + 1);
  MDNS.begin(nameAP);

  return getLocalIp(true);
}

String getLocalIp(bool closeAP)
{
  char ipString[15];
  IPAddress wifiIP =  WiFi.localIP();
  sprintf(ipString, "%d.%d.%d.%d", wifiIP[0], wifiIP[1], wifiIP[2], wifiIP[3]);

  if (wifiIP[0] == 0)
  {
    openAP();
    isConnected = false;
  }
  else
  {
    isConnected = true;
    if(closeAP)
      WiFi.mode(WIFI_STA);
    else
      WiFi.mode(WIFI_AP_STA);
  }
  return ipString;
}

String scanWiFi()
{
  int n = WiFi.scanNetworks();
  String message = "";

  for (uint8_t i = 0; i < n; ++i)
  {
    String ssid = WiFi.SSID(i);
    char buf[4];
    sprintf(buf, "%d", WiFi.RSSI(i));
    message += ssid + ":";
    message += buf;
    message += ",";
  }

  return  message;
}

String connWiFi(String ssid, String password)
{
  ssid.toCharArray(storage.ssid, ssid.length() + 1);
  password.toCharArray(storage.password, password.length() + 1);
  storage.isConnected = 1;
  saveConfig();

  return connectTo();
}

String connectTo()
{
  uint8_t tryCount = 0;
  WiFi.begin(storage.ssid, storage.password);
  while ((WiFi.status() != WL_CONNECTED && tryCount < 30)) {
    delay(500);
    tryCount++;
  }

  return getLocalIp(false);
}

void openAP() {
  WiFi.mode(WIFI_AP);
  String nameAPS = "FabLab-NKNU-" + String(ESP.getChipId());
  char nameAP[20];
  nameAPS.toCharArray(nameAP, nameAPS.length() + 1);
  uint8_t chn = nameAP[nameAPS.length() - 1] - 47;
  WiFi.softAP(nameAP, "", chn, 0);
}

