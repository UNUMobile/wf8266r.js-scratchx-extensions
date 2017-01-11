void configServerEvent() {
  server.on("/", handleRoot);

  server.on("/scan", []() {
    server.sendHeader("Connection", "close");

    server.send(200, "text/html", scanWIFI());
  });

  server.on("/wfduino", []() {
    server.send(200, "text/html", "<html><head><meta http-equiv=\"refresh\" content=\"1;url=http://wf8266.com/wf8266r/wfduino/help?d=" + String(ESP.getChipId()) + "&p=" + getLocalIp() + "\"></head><body>Welcome to WFduino</body></html>");
    server.sendHeader("Connection", "close");
  });

  server.on("/user/set", []() {
    for (uint8_t i = 0; i < server.args(); i++) {
      String parameter = server.argName(i);
      String value = server.arg(i);

      if (parameter == "ssid")
      {
        value.replace("%2b", "+");
        value.replace("%20", " ");

        value.toCharArray(storage.ssid, value.length() + 1);

        if (parameter == "password")
          value.toCharArray(storage.password, value.length() + 1);

      }
    }

    server.send(200, "text/html", "<html><head><meta http-equiv=\"refresh\" content=\"10;url=..\\\"></head><body>Rebooting...</body></html>");
    server.sendHeader("Connection", "close");

    connWiFi(storage.ssid, storage.password);
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

  server.on("/gpio", []() {
    String message = "";

    for (uint8_t i = 0; i < server.args(); i++) {
      String action = server.argName(i);
      message += "\"" + action + "\":\"" + server.arg(i).toInt() + "\"";
      if (i < server.args() - 1)
        message += ",";
      pinMode(mpin(action.toInt()), OUTPUT);
      digitalWrite(mpin(action.toInt()), server.arg(i).toInt());
    }

    server.sendHeader("Connection", "close");

    server.send(200, "text/plain", "{" + message + "}");
  });

  server.on("/gpio/pwm", []() {
    String message = "";

    for (uint8_t i = 0; i < server.args(); i++) {
      String action = server.argName(i);
      message += "\"" + action + "\":\"" + server.arg(i).toInt() + "\"";
      if (i < server.args() - 1)
        message += ",";
      pinMode(mpin(action.toInt()), OUTPUT);
      analogWrite(mpin(action.toInt()), server.arg(i).toInt());
    }

    server.sendHeader("Connection", "close");

    server.send(200, "text/plain", "{" + message + "}");
  });

  server.on("/gpio/read", []() {

    String message = "";
    uint8_t action = 0, pinModeValue = 0;

    for (uint8_t i = 0; i < server.args(); i++) {
      if (server.argName(i) == "pinmode")
        pinModeValue = server.arg(i).toInt();
      else
      {
        action = server.argName(i).toInt();
        pinMode(mpin(action), pinModeValue == 0 ? INPUT : OUTPUT);
        message += "\"" + String(action) + "\":\"" + digitalRead(mpin(action)) + "\"";
        if (i < server.args() - 1)
          message += ",";
      }
    }

    server.sendHeader("Connection", "close");

    server.send(200, "text/plain", "{" + message + "}");
  });

  server.on("/gpio/adc", []() {
    char adc[4];

    sprintf(adc, "%d", analogRead(A0));
    server.sendHeader("Connection", "close");

    server.send(200, "text/plain", adc);
  });

  server.on("/dht", []() {
    uint8_t pin, type;

    for (uint8_t i = 0; i < server.args(); i++) {
      if (server.argName(i) == "pin")
        pin = server.arg(i).toInt();
      if (server.argName(i) == "type")
        type = server.arg(i).toInt();
    }

    String message = dht(pin, type);
    server.sendHeader("Connection", "close");

    server.send(200, "text/plain", "{" + message + "}");
  });

  //lcd
  server.on("/lcd", []() {
    uint8_t addr = 0x3F, row = 0, col = 0;
    String text = "", act = "";
    for (uint8_t i = 0; i < server.args(); i++) {
      if (server.argName(i) == "addr")
        addr = server.arg(i).toInt();
      if (server.argName(i) == "row")
        row = server.arg(i).toInt();
      if (server.argName(i) == "col")
        col = server.arg(i).toInt();
      if (server.argName(i) == "text")
        text = server.arg(i);
      if (server.argName(i) == "act")
        act = server.arg(i);
    }

    lcdShow(addr, col, row, text);
    if (act != "")
      lcdAction(act, row);

    server.sendHeader("Connection", "close");

    server.send(200, "text/plain", "{}");
  });

  server.on("/i2c", []() {
    server.sendHeader("Connection", "close");

    server.send(200, "text/plain", "{\"address\":" + String(queryI2C()) + "}");
  });

  server.on("/ir/code", []() {
    for (uint8_t i = 0; i < server.args(); i++) {
      if (server.argName(i) == "pin")
        readIRCode(server.arg(i).toInt());
      if (server.argName(i) == "mode")
        isIRRaw = true;

    }

    server.sendHeader("Connection", "close");
    server.send(200, "text/plain", "{\"type\":\"" + irType + "\",\"code\":\"" + irCode + "\"}");
  });

  server.on("/ir/send", []() {
    uint8_t pin = 6;
    uint8_t f = 38;
    String type = "";
    String code = "";
    for (uint8_t i = 0; i < server.args(); i++) {
      if (server.argName(i) == "pin")
        pin = server.arg(i).toInt();
      if (server.argName(i) == "f")
        f = server.arg(i).toInt();
      if (server.argName(i) == "type")
        type = server.arg(i);
      if (server.argName(i) == "code")
        code = server.arg(i);
    }

    irSend(pin, f, type, code);

    server.sendHeader("Connection", "close");
    server.send(200, "text/plain", "{\"pin\":" + String(pin) + ",\"code\":\"" + code + "\",\"f\":" + String(f) + "}");
  });

  server.onNotFound(handleNotFound);
}

void handleRoot() {
  String actionPath;

  if (isConnected)
    actionPath = "wfduino";
  else
    actionPath = "scan";

  server.sendHeader("Connection", "close");

  server.send(200, "text/html", "<html><head><meta http-equiv=\"refresh\" content=\"0;url=" + actionPath + "\"></head></html>");
}

void handleNotFound() {
  String message = "WFduino RESTful URI not found\n\n";
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

