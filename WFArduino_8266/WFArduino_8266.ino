/*
 WFduino ＝ Scratch2.x + ScratchX + Arduino + WF8266R
 ----------------------------------------------------
 WFduino let you control Arduino by Scratch.
 ----------------------------------------------------
 2016 @ Union U Inc. http://wf8266.com/wf8266r
 竹林資訊站 : http://blog.ilc.edu.tw/blog/blog/868
*/
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <Servo.h>

#define pinSize 11
struct pinData {
  uint8_t state[pinSize];
  uint8_t pin[pinSize];
} pins;

const char* version = "2016.09.03";
Servo myservo1,myservo2,myservo3,myservo4,myservo5,myservo6,myservo7,myservo8,myservo9;
bool isRead = false, isGPIORead = false;
const uint8_t maxLength = 20;
uint8_t serialIndex = 0;
char serialBuffer[50];


String cmd = "";
unsigned long int heartbeat = 0;
bool heartbeatEnabled = false;

void setup() {
  initPin();
  Serial.begin(115200);
  Serial.flush();
  Serial.println();
  Serial.print(version);
  Serial.println(".WFduino.Ready");
}

void loop() {
  listen();

  if (heartbeatEnabled)
  {
    if (millis() - heartbeat > 300)
    {
      heartbeat = millis();
      cmd = "readGPIO";
      doCommand();
    }
  }
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
      if (serialIndex > 49)
        serialIndex = 0;
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

  if (cmd == "init")
  {
    ESP.restart();
  }
  else if (cmd == "pinMode")
  {
    if (v1.toInt() == 0)
    {
      pinMode(mpin(p1.toInt()), INPUT);
      pins.state[p1.toInt()] = 0;
    }
    else
    {
      pinMode(mpin(p1.toInt()), OUTPUT);
      pins.state[p1.toInt()] = 1;
    }
  }
  else if ( cmd == "heartMode")
  {
    heartbeatEnabled = p1.toInt() == 0 ? false : true;
  }
  else if (cmd == "readGPIO")
  {
    if (isGPIORead)
      return;
    isGPIORead = true;

    uint16_t gpios[pinSize];
    for (uint8_t i = 0; i < 9; i++) //D0~D8
    {
      if (pins.state[i] == 0)
        gpios[i] = digitalRead(mpin(i));
      else
        gpios[i] = 0;
    }
    //ADC
    if (pins.state[9] == 0)
      gpios[9] = analogRead(A0);
    else
      gpios[9] = 0;

    char buf[100];
    sprintf(buf, "%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d",
            gpios[0], gpios[1], gpios[2], gpios[3], gpios[4], gpios[5], gpios[6], gpios[7], gpios[8], 0, 0,
            0, 0, 0, gpios[9], 0, 0, 0, 0, 0, 0, 0);
    String rtn = "{\"Action\":\"" + cmd + "\",\"Value\":\"" + String(buf) + "\"}";
    if (isRead)
    {
      //wf8266r.println(rtn);
      isRead = false;
    }
    else
    {
      Serial.flush();
      Serial.println(rtn);
    }
    isGPIORead = false;
  }
  else if (cmd == "digitalWrite")
  {
    uint8_t pin, value;
    pin = mpin(p1.toInt());
    value = v1.toInt();
    pins.state[p1.toInt()] = 0;
    if ( value == 1)
    {
      analogWrite(pin, 0);
      digitalWrite(pin, value);
    }
    digitalWrite(pin, value);
  }
  else if (cmd == "analogWrite")
  {
    pins.state[p1.toInt()] = 1;
    analogWrite(mpin(p1.toInt()), v1.toInt() * 4);
  }
  else if (cmd == "digitalRead")
  {
    uint8_t v = digitalRead(mpin(p1.toInt()));
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p1 + ",\"Value\":" + v + "}";
    if (isRead)
    {
      //wf8266r.println(rtn);
      isRead = false;
    }
    else
      Serial.println(rtn);
  }
  else if (cmd == "analogRead")
  {
    uint16_t v = analogRead(mpin(p1.toInt()));
    String rtn = "{\"Action\":\"" + cmd + "\",\"Pin\":" + p1 + ",\"Value\":" + v + "}";
    if (isRead)
    {
      //wf8266r.println(rtn);
      isRead = false;
    }
    else
      Serial.println(rtn);
  }
  else if (cmd == "car")
  {
    uint8_t pin = 0, value = 0;
    v1 = v1 + ".";
    v2 = v2 + ".";
    while (v1.indexOf(".") > -1)
    {
      index = v1.indexOf(".");
      pin = v1.substring(0, index).toInt();
      v1 = v1.substring(index + 1, v1.length());
      index = v2.indexOf(".");
      value = v2.substring(0, index).toInt();
      v2 = v2.substring(index + 1, v2.length());

      if (value == 1)
      {
        digitalWrite(pin, value);
      }
      else
      {
        analogWrite(pin, value);
      }
    }

    String rtn = "{\"Action\":\"" + cmd + "\"}";
    Serial.println(rtn);
  }
  else if (cmd == "wtgpio")
  {

  }
  else if (cmd == "wtsen")
  {

  }
  else if (cmd == "wtirsc") //IR send NEC code
  {

  }
  else if (cmd == "distance")
  {
    String rtn = "{\"Action\":\"" + cmd + "\"," + readDistance(mpin(v1.toInt()), mpin(v2.toInt())) + "}";
    Serial.println(rtn);
  }
  else if (cmd == "servo")
  {
    pins.state[v1.toInt()] = 1;
    String rtn = "{\"Action\":\"" + cmd + "\"," + servo(v1.toInt(), v2.toInt()) + "}";
    Serial.println(rtn);
  }
  else if (cmd == "tone")
  {
    pins.state[v1.toInt()] = 1;
    String rtn = "{\"Action\":\"" + cmd + "\"," + toneF(mpin(v1.toInt()), p2.toInt(), v2.toInt()) + "}";
    Serial.println(rtn);
  }
  else if (cmd == "noTone")
  {
    pins.state[v1.toInt()] = 0;
    String rtn = "{\"Action\":\"" + cmd + "\"," + noToneF(mpin(v1.toInt())) + "}";
    Serial.println(rtn);
  }
  else if (cmd == "reset")
  {
    reset();
    String rtn = "{\"Action\":\"" + cmd + "\"}";
    Serial.println(rtn);
  }

}

//Sensors pin was changed for node mcu
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

String servo(uint8_t pin, uint16_t degree) {
  uint8_t mapPin = mpin(pin);
  pinMode(mapPin, OUTPUT);
  uint16_t s = 615, e = 2500;

  switch (pin)
  {
    case 0 : myservo1.attach(mapPin, s, e); myservo1.write(degree); break;
    case 1 : myservo2.attach(mapPin, s, e); myservo2.write(degree); break;
    case 2 : myservo3.attach(mapPin, s, e); myservo3.write(degree); break;
    case 3 : myservo4.attach(mapPin, s, e); myservo4.write(degree); break;
    case 4 : myservo5.attach(mapPin, s, e); myservo5.write(degree); break;
    case 5 : myservo6.attach(mapPin, s, e); myservo6.write(degree); break;
    case 6 : myservo7.attach(mapPin, s, e); myservo7.write(degree); break;
    case 7 : myservo8.attach(mapPin, s, e); myservo8.write(degree); break;
    case 8 : myservo9.attach(mapPin, s, e); myservo9.write(degree); break;
  }

  delay(15);
  return "\"degree\":" + String(degree);
}

String toneF(uint8_t pin, uint16_t f, long t) {
  pinMode(pin, OUTPUT);
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
  ESP.restart();
}

void initPin()
{
  for (uint8_t i = 0; i < pinSize; i++)
    pins.state[i] = 1; //0:Read 1:Disable

  pins.pin[0] = 16; //D0
  pins.pin[1] = 5; //D1
  pins.pin[2] = 4; //D2
  pins.pin[3] = 0; //D3
  pins.pin[4] = 2; //D4
  pins.pin[5] = 14; //D5
  pins.pin[6] = 12; //D6
  pins.pin[7] = 13; //D7
  pins.pin[8] = 15; //D8
//9 ADC
  pins.pin[10] = 1; //Rx
  pins.pin[11] = 3; //Tx

  heartbeatEnabled = false;
  for (uint8_t i = 0; i < 9; i++)
  {
    pinMode(mpin(i), OUTPUT);
    analogWrite(mpin(i), LOW);

    pins.state[i] = 1;
  }


  //pinMode(A0, INPUT);
  pins.state[9] = 1;
  heartbeatEnabled = true;

}

uint8_t mpin(uint8_t p)
{
  return pins.pin[p];
}

