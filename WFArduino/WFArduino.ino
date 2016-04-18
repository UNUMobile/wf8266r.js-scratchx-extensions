/*
 WF8266R.js RESTful /serial/write service.
*/

const uint8_t maxLength = 20;
uint8_t serialIndex = 0;
char serialBuffer[256];
String cmd = "";
void setup() {
  Serial.begin(115200);
  Serial.println("WF8266R.Arduino Ready");
}

void loop() {
  listen();
}

void listen() {
  while (Serial.available() > 0)
  {
    uint8_t val = Serial.read();

    if (val == 10)
    {
      serialBuffer[serialIndex - 1] = '\0';
      cmd = String(serialBuffer);
      serialIndex = 0;

      doCommand();
    }
    else
    {
      //save to buffer
      serialBuffer[serialIndex++] = (char)val;
    }
  }
}

void doCommand() {
  uint8_t index = cmd.indexOf(',');
  String param = cmd.substring(index + 1, cmd.length() + 1);
  cmd = cmd.substring(0, index);
  index = param.indexOf('=');
  uint8_t pin = param.substring(0, index).toInt();
  uint16_t value = param.substring(index + 1, param.length() + 1).toInt();

  /*Serial.print("Pin:");
  Serial.print(pin);
  Serial.print(" Value:");
  Serial.print(value);
  Serial.print(" CMD :");
  Serial.println(cmd);*/

  if (cmd == "pinMode")
  {
    if (value == 0)
      pinMode(pin, INPUT);
    else
      pinMode(pin, OUTPUT);
  }
  else if (cmd == "digitalWrite")
  {
    digitalWrite(pin, value);
  }
  else if (cmd == "analogWrite")
  {
    analogWrite(pin, value);
  }
  else if (cmd == "digitalRead")
  {
    uint8_t v = digitalRead(pin);
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + pin + ",\"Value\":" + v + "}";
    Serial.println(rtn);
  }
  else if (cmd == "analogRead")
  {
    uint16_t v = analogRead(pin);
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + pin + ",\"Value\":" + v + "}";
    Serial.println(rtn);
  }

}

