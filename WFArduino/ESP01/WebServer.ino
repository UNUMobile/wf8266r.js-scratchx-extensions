void configServerEvent() {
  server.on("/", handleRoot);

  server.on("/scan", []() {
    server.sendHeader("Connection", "close");

    server.send(200, "text/html", scanWIFI());
  });

  server.on("/ap/on", []() {
    server.sendHeader("Connection", "close");
    WiFi.mode(WIFI_AP_STA);
    server.send(200, "text/html", "AP ON");
  });

  server.on("/ap/off", []() {
    server.sendHeader("Connection", "close");
    WiFi.mode(WIFI_STA);
    server.send(200, "text/html", "AP OFF");
  });

  server.on("/cmd", []() {
    String cmd = "";
    for (uint8_t i = 0; i < server.args(); i++) {
      if (server.argName(i) == "text")
      {
        cmd = server.arg(i);
        Serial.println(cmd);
      }
    }
    server.sendHeader("Connection", "close");
    server.send(200, "text/plain", "{\"cmd\":\"" + cmd + "\"}");
  });

  server.on("/fablab-nknu", []() {
    server.send(200, "text/html", "<html><head><title>FabLab-NKNU</title><style>body{background-color: #ffc72a}</style></head><body><h1><img align='absmiddle' src='https://raw.githubusercontent.com/UNUMobile/wf8266r.js-scratchx-extensions/gh-pages/WFArduino/ESP01/img/nknulogo.png'> FabLab-NKNU</h1><br>IP : " + getLocalIp(true) + "<br/>mDNS : http://fablab" + ESP.getChipId() + ".local</br>Windows driver : https://support.apple.com/kb/DL999<p>Functions</p><a href='reset'>Reset</a><br/>AP : <a href='ap/on'>ON</a> <a href='ap/off'>OFF</a><br/></body></html>");
    server.sendHeader("Connection", "close");
  });

  server.on("/user/set", []() {
    String message = "", ip = "";
    for (uint8_t i = 0; i < server.args(); i++) {
      if (server.argName(i) == "ssid")
      {
        server.arg(i).replace("%2b", "+");
        server.arg(i).replace("%20", " ");

        server.arg(i).toCharArray(storage.ssid, server.arg(i).length() + 1);

      }
      else if (server.argName(i) == "password")
        server.arg(i).toCharArray(storage.password, server.arg(i).length() + 1);
    }
    ip = connWiFi(storage.ssid, storage.password);
    if ( ip[0] == '0')
      message = "[Error] Can't use " + String(storage.ssid) + " " + String(storage.password) + " to login, please try again!";
    else
      message = "<h1>請將電腦或手機連接到 " + String(storage.ssid) + "</h1>IP : <a href='http://" + ip + "'>" + ip + "</a><br/>mDNS : <a href='http://fablab" + ESP.getChipId() + ".local'>http://fablab" + ESP.getChipId() + ".local</a>";

    server.send(200, "text/html", "<html><head><style>body{background-color: #ffc72a}</style></head><body>" + message + "</body></html>");
    server.sendHeader("Connection", "close");


  });

  server.on("/firmware", HTTP_GET, []() {
    server.sendHeader("Connection", "close");
    server.send(200, "text/html", FPSTR(serverIndex));
  });

  server.onFileUpload([]() {
    if (server.uri() != "/update") return;

    HTTPUpload& upload = server.upload();

    if (upload.status == UPLOAD_FILE_START) {
      Serial.setDebugOutput(true);
      WiFiUDP::stopAll();
      //WiFi.mode(WIFI_STA);
      Serial.printf("Update: %s\n", upload.filename.c_str());
      uint32_t maxSketchSpace = (ESP.getFreeSketchSpace() - 0x1000) & 0xFFFFF000;
      if (!Update.begin(maxSketchSpace)) { //start with max available size
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_WRITE) {
      if (Update.write(upload.buf, upload.currentSize) != upload.currentSize) {
        Update.printError(Serial);
      }
    } else if (upload.status == UPLOAD_FILE_END) {
      if (Update.end(true)) { //true to set the size to the current progress
        Serial.printf("Update Success: %u\nRebooting...\n", upload.totalSize);
      } else {
        Update.printError(Serial);
      }
      Serial.setDebugOutput(false);
    }
    yield();
  });

  server.on("/update", HTTP_POST, []() {
    server.sendHeader("Connection", "close");
    server.send(200, "text/plain", (Update.hasError()) ? "FAIL" : "Update Success. Wait for 10 seconds to reload.");
    ESP.restart();
  });

  server.on("/reset", HTTP_GET, []() {
    server.sendHeader("Connection", "close");

    restore();
    server.send(200, "text/html", "Done");
    delay(100);
    ESP.restart();
  });

  server.onNotFound(handleNotFound);
}

void handleRoot() {
  String actionPath;

  if (isConnected)
    actionPath = "fablab-nknu";
  else
    actionPath = "scan";

  server.sendHeader("Connection", "close");

  server.send(200, "text/html", "<html><head><meta http-equiv=\"refresh\" content=\"0;url=" + actionPath + "\"></head></html>");
}

void handleNotFound() {
  String message = "FabLab-NKNU RESTful URI not found\n\n";
  message += "Service: ";
  message += server.uri();
  message += "\nMethod: ";
  message += (server.method() == HTTP_GET) ? "GET" : "POST";
  message += "\nArguments: ";
  message += server.args();
  message += "\n";
  for (uint8_t i = 0; i < server.args(); i++) {
    message += " " + server.argName(i) + ": " + server.arg(i) + "\n";
  }

  server.sendHeader("Connection", "close");
  server.send(404, "text/plain", message);
}

String scanWIFI() {
  String message = F("<!DOCTYPE html><html lang='en' xmlns='http://www.w3.org/1999/xhtml'><head><meta name='viewport' content='width=device-width'><meta charset='utf-8' /><title>WF8266R.js</title><script>var apName = '';var password = '';function changed(theselect) {apName = theselect.value;}function set() {password = document.getElementById('password').value; window.location = './user/set?ssid=' + apName.replace('+','%2B') + '&password=' + password.replace('+','%2B');}</script></head><body>AP :<select id='apList' onchange='changed(this)'><option selected>Connect to Wi-Fi</option>");
  int n = WiFi.scanNetworks();
  if (n == 0)
    message += F("<option>Not found</option></select></body></html>");
  else
  {
    for (uint8_t i = 0; i < n; ++i)
    {
      //String ssid = String((char*)WiFi.SSID(i));
      String ssid = WiFi.SSID(i);
      char buf[4];
      sprintf(buf, "%d", WiFi.RSSI(i));
      message += F("<option value='");
      message += ssid + F("'>");
      message += ssid + F(" (");
      message += buf;
      message += F(")</option>");
      //message += F("<option value='" + F(ssid) + "'>" + F(ssid) + " (" + F(buf) + ")</option>");
    }
    message += F("</select><br/>Password : <input id='password' type='text' /> <input type='button' onclick='set()' value='SET' /></body></html>");
  }
  return  message;
}

void restore()
{
  storage.isConnected = 0;
  storage.ssid[0] = '\0';
  storage.password[0] = '\0';
  saveConfig();
}

