/*
 WFduino ScratchX firmware.
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
  String p1,p2,v1,v2,temp;
  uint8_t index = cmd.indexOf(',');
  String param = cmd.substring(index + 1, cmd.length() + 1);
  cmd = cmd.substring(0, index);
  index = param.indexOf('&');
  if (index < 255) //multi params
  {
    temp = param.substring(0,index);
    param= param.substring(index+1, param.length()+1);
    index = temp.indexOf('=');
    p1 = temp.substring(0, index);
    v1 = temp.substring(index + 1, temp.length() + 1);
    index = param.indexOf('=');
    p2 = param.substring(0, index);
    v2 = param.substring(index + 1, param.length() + 1);
  }
  else
  {
    index = param.indexOf('=');
    p1 = param.substring(0, index);
    v1 = param.substring(index + 1, param.length() + 1);
  }

  if (cmd == "pinMode")
  {
    if (v1.toInt() == 0)
      pinMode(p1.toInt(), INPUT);
    else
      pinMode(p1.toInt(), OUTPUT);
  }
  else if (cmd == "digitalWrite")
  {
    digitalWrite(p1.toInt(), v1.toInt());
  }
  else if (cmd == "analogWrite")
  {
    analogWrite(p1.toInt(), v1.toInt());
  }
  else if (cmd == "digitalRead")
  {
    uint8_t v = digitalRead(p1.toInt());
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p1.toInt() + ",\"Value\":" + v + "}";
    Serial.println(rtn);
  }
  else if (cmd == "analogRead")
  {
    uint16_t v = analogRead(p1.toInt());
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p1.toInt() + ",\"Value\":" + v + "}";
    Serial.println(rtn);
  }
  else if (cmd == "distance")
  {
    String rtn = "{\"Action\":\"" + cmd + "\"," + readDistance(v1.toInt(),v2.toInt()) + "}";
    Serial.println(rtn);
  }

}

//Senser
String readDistance(uint8_t echoPin, uint8_t trigPin)
{
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  long duration;
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  uint16_t distance = (duration / 2) / 29.1;

  return "\"distance\":\"" + String(distance) + "\"";
}

