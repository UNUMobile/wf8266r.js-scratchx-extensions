/*
 WFduino ＝ Scratch2.x + ScratchX + Arduino + WF8266R
 ----------------------------------------------------
 WFduino let you control Arduino by Scratch.

 ----------------------------------------------------
 2016 @ Union U Inc. http://wf8266.com/wf8266r
 竹林資訊站 : http://blog.ilc.edu.tw/blog/blog/868
*/
#include <Servo.h>
#include <SoftwareSerial.h>
SoftwareSerial wf8266r(2, 4); // RX, TX

const char* version = "2016.05.03";
Servo myservo;
bool isRead = false;
const uint8_t maxLength = 20;
uint8_t serialIndex = 0, serialIndexWF = 0;
char serialBuffer[50], serialBufferWF[50];
String cmd = "";
void setup() {
  Serial.begin(115200);
  wf8266r.begin(9600);
  Serial.flush();
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
      if (cmd.indexOf("digitalRead") == 0 || cmd.indexOf("analogRead") == 0 || cmd.indexOf("readGPIO") == 0)
      {
        isRead = true;
      }
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
  else if (cmd == "readGPIO")
  {
    uint16_t gpios[22];
    for (uint8_t i = 0; i < 22; i++)
    {
      if (i < 14)
        gpios[i] = digitalRead(i);
      else
        gpios[i] = analogRead(i);
    }
    char buf[100];
    sprintf(buf, "%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d",
            gpios[0], gpios[1], gpios[2], gpios[3], gpios[4], gpios[5], gpios[6], gpios[7], gpios[8], gpios[9], gpios[10],
            gpios[11], gpios[12], gpios[13], gpios[14], gpios[15], gpios[16], gpios[17], gpios[18], gpios[19], gpios[20], gpios[21]);
    String rtn = "{\"Action\":\"" + cmd + "\",\"Value\":\"" + String(buf) + "\"}";
    if (isRead)
    {
      wf8266r.println(rtn);
      isRead = false;
    }
    else
    {
      Serial.flush();
      Serial.println(rtn);
    }
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
    if (isRead)
    {
      wf8266r.println(rtn);
      isRead = false;
    }
    else
      Serial.println(rtn);
  }
  else if (cmd == "analogRead")
  {
    uint16_t v = analogRead(p1.toInt());
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p1 + ",\"Value\":" + v + "}";
    if (isRead)
    {
      wf8266r.println(rtn);
      isRead = false;
    }
    else
      Serial.println(rtn);
  }
  else if (cmd == "wtgpio")
  {
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p2 + ",\"Value\":" + v2 + "}";
    Serial.println(rtn);
    rtn = "WTGPIO+TYPE:" + v1 + ",RW:W,PIN:" + p2 + ",VALUE:" + v2;
    wf8266r.println(rtn);
  }
  else if (cmd == "wtsen")
  {
    String rtn = "{\"Action\":\"" + cmd + "\",\"AT\":" + p1 + ",\"Degree\":" + v2 + "}";
    Serial.println(rtn);
    rtn = "WTSEN+" + v1 + ":" + p2 + ",VALUE:" + v2;
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
  else if (cmd == "reset")
  {
    reset();
    String rtn = "{\"Action\":\"" + cmd + "\"}";
    Serial.println(rtn);
  }

}

//Sensors
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

void reset()
{
  digitalWrite(0,HIGH);
  digitalWrite(1,HIGH);
  digitalWrite(2,HIGH);
  digitalWrite(3,LOW);
  digitalWrite(4,HIGH);
  digitalWrite(5,LOW);
  digitalWrite(6,LOW);
  digitalWrite(7,LOW);
  digitalWrite(8,LOW);
  digitalWrite(9,HIGH);
  digitalWrite(10,HIGH);
  digitalWrite(11,HIGH);
  digitalWrite(12,HIGH);
  digitalWrite(13,HIGH);
  asm volatile ("  jmp 0");
}

