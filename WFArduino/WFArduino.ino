/*
 WFduino ScratchX firmware.
*/
#include <Servo.h>
#include <SoftwareSerial.h>
SoftwareSerial wf8266r(2, 4); // RX, TX

const char* version = "2016.04.19";
Servo myservo;
const uint8_t maxLength = 20;
uint8_t serialIndex = 0,serialIndexWF = 0;
char serialBuffer[50],serialBufferWF[50];
String cmd = "";
void setup() {
  Serial.begin(115200);
  wf8266r.begin(9600);
  Serial.print(version);
  Serial.println(".WFduino.Ready");
}

void loop() {
  listen();
  listenWF8266R();
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

void listenWF8266R() {
  while (wf8266r.available() > 0)
  {
    uint8_t val = wf8266r.read();
    
    if (val == 10)
    {
      serialBufferWF[serialIndexWF - 1] = '\0';
      cmd = String(serialBufferWF);
      serialIndexWF = 0;

      doCommand();
    }
    else
    {
      //save to buffer
      serialBufferWF[serialIndexWF++] = (char)val;
    }
  }
}

void doCommand() {
  String p1, p2, v1, v2, temp;
  uint8_t index = cmd.indexOf(',');
  String param = cmd.substring(index + 1, cmd.length() + 1);
  cmd = cmd.substring(0, index);
  index = param.indexOf('&');
  if (index < 255) //multi params
  {
    temp = param.substring(0, index);
    param = param.substring(index + 1, param.length() + 1);
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
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p1 + ",\"Value\":" + v + "}";
    Serial.println(rtn);
  }
  else if (cmd == "analogRead")
  {
    uint16_t v = analogRead(p1.toInt());
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p1 + ",\"Value\":" + v + "}";
    Serial.println(rtn);
  }
  else if(cmd == "wtgpio")
  {
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p2 + ",\"Value\":" + v2 + "}";
    Serial.println(rtn);
    rtn = "WTGPIO+TYPE:"+v1+",RW:W,PIN:"+p2+",VALUE:"+v2;
    wf8266r.println(rtn);
  }
  else if (cmd == "distance")
  {
    String rtn = "{\"Action\":\"" + cmd + "\"," + readDistance(v1.toInt(), v2.toInt()) + "}";
    Serial.println(rtn);
  }
  else if (cmd == "servo")
  {
    String rtn = "{\"Action\":\"" + cmd + "\"," + servo(v1.toInt(), v2.toInt()) + "}";
    Serial.println(rtn);
  }
  else if (cmd == "tone")
  {
    String rtn = "{\"Action\":\"" + cmd + "\"," + toneF(v1.toInt(), p2.toInt(), v2.toInt()) + "}";
    Serial.println(rtn);
  }
  else if (cmd == "noTone")
  {
    String rtn = "{\"Action\":\"" + cmd + "\"," + noToneF(v1.toInt()) + "}";
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

  return "\"distance\":" + String(distance);
}

String servo(uint8_t pin, uint8_t degree) {
  pinMode(pin, OUTPUT);

  //myservo.attach(action.toInt());
  myservo.attach(pin, 570, 2500);
  myservo.write(degree);

  delay(15);
  return "\"degree\":" + String(degree);
}

String toneF(uint8_t pin, uint16_t f, long t) {
  tone(pin, f, t);
  return "\"f\":" + String(f);
}

String noToneF(uint8_t pin)
{
  noTone(pin);
  return "\"pin\":" + String(pin);
}

