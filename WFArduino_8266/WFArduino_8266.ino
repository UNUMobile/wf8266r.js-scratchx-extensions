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
#include <EEPROM.h>
#include <Wire.h>
#include <Hash.h>
#include <Servo.h>
#include <OneWire.h>
#include <WebSocketsServer.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266httpUpdate.h>
#include <IRremoteESP8266.h>
#include "LiquidCrystal_I2C.h"
#include "DHT.h"
#include "PubSubClient.h"
#include "EEPROMAnything.h"

#define pinSize 15
#define romSize 60

struct pinData {
  uint8_t state[pinSize];
  uint8_t pin[pinSize];
} pins;

struct userData {
  bool isConnected;
  char ssid[37];
  char password[20];
} storage;

ESP8266WebServer server(80);
//WebSocket
WebSocketsServer webSocket = WebSocketsServer(81);
//MQTT
WiFiClient wclient;
PubSubClient clientMQTT(wclient);
//IR
bool isIREvent = false, isIRRaw = false;
String irCode = "", irType = "";
IRrecv irrecv;
decode_results IRData;
//LCD
LiquidCrystal_I2C lcd;
bool isLCDOpen = false;
String lcdText[] = {"", ""};
int lcdCol[] = {0, 0};

const char serverIndex[] PROGMEM = "<form method='POST' action='/update' enctype='multipart/form-data'><input type='file' name='update'><input type='submit' value='Update'></form>";

const char* product = "WFduino"; //WF8266R WF8266T WF8266T-HUD WF8266T-TFT WF8266R30 WF8266KD
const char* version = "2017.01.04";
Servo myservo1, myservo2, myservo3, myservo4, myservo5, myservo6, myservo7, myservo8, myservo9;
bool isRead = false, isGPIORead = false;
const uint8_t maxLength = 20;
const uint8_t bufferSize = 255;
uint8_t serialIndex = 0;

char serialBuffer[bufferSize];
bool isConnected = false;

String cmd = "";
unsigned long int heartbeat = 0;
bool heartbeatEnabled = false;
bool useWiFi = false;
bool isDHTRunning = false;


void setup() {
  initPin();
  Serial.begin(115200);
  Serial.flush();
  Serial.println();
  Serial.print(version);
  Serial.println(".WFduino8266.Ready");

  loadConfig();
  //web socket
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  configServerEvent();
  server.begin();
}

void callback(const MQTT::Publish& pub) {
  String topic = pub.topic();
  String data = pub.payload_string();

  processCallbackAction(topic, data);
}

void loop() {
  server.handleClient();
  //if (clientMQTT.connected())
  //  clientMQTT.loop();

  webSocket.loop();

  if (!useWiFi)
    listen();

  watchIR();

  if (heartbeatEnabled)
  {
    if (millis() - heartbeat > 100)
    {
      heartbeat = millis();
      cmd = "readGPIO";
      doCommand();
    }
  }

  /*if (WiFi.status() == WL_CONNECTED) {

    if (!clientMQTT.connected()) {
      clientMQTT.set_server("52.193.190.148", 1883);

      if (clientMQTT.connect(MQTT::Connect(String(ESP.getChipId()))
                             .set_auth("wf8266", "wf8266.com")))
      {
        clientMQTT.set_callback(callback);
        String topic = "unumobile.com/UNU-WF8266R/" + String(ESP.getChipId());
        clientMQTT.subscribe(topic);
        clientMQTT.publish("unumobile.com/UNU-WF8266R", "{'Action':'ON','ChipId':'" + String(ESP.getChipId()) + "','LocalIp':'" + getLocalIp() + "','Version':'" + product + ',' + version + "'}");
        //clientMQTTWF.publish("unumobile.com/UNU-WF8266R/API", "{'Action':'UTC','Topic':'" + topicWF + "','ChipId':'" + ESP.getChipId() + "'}");
      }
    }

    if (clientMQTT.connected())
    {
      isConnected = true;
      clientMQTT.loop();
    }
    }*/
}

void watchIR()
{
  if (isIREvent)
  {
    if (irrecv.decode(&IRData)) {
      if (IRData.value < 4294967295)
      {
        irCode = String(IRData.value, HEX);
        irCode.toUpperCase();
        irType = encoding(&IRData);
        if (irType == "UNKNOWN" || isIRRaw)
          irCode = irRaw(&IRData);
      }
      irrecv.resume();
    }
  }
}

void listen() {
  while (Serial.available() > 0 )
  {
    uint8_t val = Serial.read();
    if (val == 10)
    {
      serialBuffer[serialIndex - 1] = '\0';
      cmd = String(serialBuffer);
      Serial.println(cmd);
      serialIndex = 0;
      useWiFi = false;
      doCommand();
    }
    else
    {
      //save to buffer
      serialBuffer[serialIndex++] = (char)val;
      if (serialIndex > bufferSize - 1)
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
    else if (v1.toInt() == 2)
    {
      pinMode(mpin(p1.toInt()), INPUT_PULLUP);
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
    uint8_t offset = 0;

    if (isGPIORead)
      return;
    isGPIORead = true;

    uint16_t gpios[pinSize];

    if (useWiFi)
      offset = 2;
    else
    {
      offset = 0;
      gpios[9] = 0;
      gpios[10] = 0;
    }


    for (uint8_t i = 0; i < 9 + offset; i++) //D0~D8 , websocket D0~D10
    {
      if (pins.state[i] == 0)
        gpios[i] = digitalRead(mpin(i));
      else
        gpios[i] = 0;
    }
    //ADC
    if (pins.state[14] == 0)
      gpios[14] = analogRead(A0);
    else
      gpios[14] = 0;

    char buf[100];
    sprintf(buf, "%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d,%d",
            gpios[0], gpios[1], gpios[2], gpios[3], gpios[4], gpios[5], gpios[6], gpios[7], gpios[8], gpios[9], gpios[10],
            0, 0, 0, gpios[14], 0, 0, 0, 0, 0, 0, 0);
    String rtn = "{\"Action\":\"" + cmd + "\",\"Value\":\"" + String(buf) + "\"}";
    if (isRead)
    {
      //wf8266r.println(rtn);
      isRead = false;
    }
    else
    {
      sendBack(rtn);
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
    int val = v1.toInt();
    if (val >= 255)
      val = 1024;
    else
      val = val * 4;

    analogWrite(mpin(p1.toInt()), val);
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
      sendBack(rtn);
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
      sendBack(rtn);
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
        digitalWrite(mpin(pin), value);
      }
      else
      {
        analogWrite(mpin(pin), value);
      }
    }

    String rtn = "{\"Action\":\"" + cmd + "\"}";
    sendBack(rtn);
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
    sendBack(rtn);
  }
  else if (cmd == "servo")
  {
    pins.state[v1.toInt()] = 1;
    String rtn = "{\"Action\":\"" + cmd + "\"," + servo(v1.toInt(), v2.toInt()) + "}";
    sendBack(rtn);
  }
  else if (cmd == "tone")
  {
    pins.state[v1.toInt()] = 1;
    String rtn = "{\"Action\":\"" + cmd + "\"," + playTone(mpin(v1.toInt()), p2.toInt(), v2.toInt()) + "}";
    sendBack(rtn);
  }
  else if (cmd == "noTone")
  {
    pins.state[v1.toInt()] = 0;
    String rtn = "{\"Action\":\"" + cmd + "\"," + noToneF(mpin(v1.toInt())) + "}";
    sendBack(rtn);
  }
  else if (cmd == "reset")
  {
    reset();
    String rtn = "{\"Action\":\"" + cmd + "\"}";
    sendBack(rtn);
  }
  else if (cmd == "scanWiFi")
  {
    heartbeatEnabled = false;
    String rtn = "{\"Action\":\"" + cmd + "\",\"data\":\"" + scanWiFi() + "\"}";
    sendBack(rtn);
    heartbeatEnabled = true;
  }
  else if (cmd == "connWiFi")
  {
    heartbeatEnabled = false;
    String rtn = "{\"Action\":\"" + cmd + "\",\"data\":\"" + connWiFi(p1, v1) + "\"}";
    sendBack(rtn);
    heartbeatEnabled = true;
  }
  else if (cmd == "loadConfig")
  {
    heartbeatEnabled = false;
    String rtn = "{\"Action\":\"" + cmd + "\",\"data\":\"" + loadConfig() + "\"}";
    sendBack(rtn);
    heartbeatEnabled = true;
  }
  else if (cmd == "dht")
  {
    pins.state[v1.toInt()] = 1;
    String rtn = "{\"Action\":\"" + cmd + "\"," + dht(v1.toInt(), v2.toInt()) + "}";
    sendBack(rtn);
  }
  else if (cmd == "ircode")
  {
    pins.state[v1.toInt()] = 1;
    String rtn = "{\"Action\":\"" + cmd + "\"," + readIRCode(v1.toInt()) + "}";
    sendBack(rtn);
  }
  else if (cmd == "irsend")
  {
    pins.state[v1.toInt()] = 1;
    irSend(v1.toInt(), 38, "", v2);
    String rtn = "{\"Action\":\"" + cmd + "\"}";
    sendBack(rtn);
    pins.state[v1.toInt()] = 0;
  }
  else if (cmd == "lcd")
  {
    pins.state[5] = 1;
    pins.state[4] = 1;
    lcdShow(p2.toInt(), p1.toInt(), v1.toInt(), v2);
    String rtn = "{\"Action\":\"" + cmd + "\"}";
    sendBack(rtn);
  }
  else if (cmd == "lcdAct")
  {
    lcdAction(v1);
    String rtn = "{\"Action\":\"" + cmd + "\"}";
    sendBack(rtn);
  }
}

void sendBack(String data)
{
  if (useWiFi)
    socketBack(data);
  else
    Serial.println(data);
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

String playTone(uint8_t pin, uint16_t f, long t) {
  pinMode(pin, OUTPUT);
  analogWriteFreq(f);
  analogWrite(pin, 512);
  delay(t);
  analogWrite(pin, 0);
  return "\"f\":" + String(f);
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
  //ESP.restart();
  initPin();
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

  pins.pin[9] = 3; //Rx
  pins.pin[10] = 1; //Tx



  uint8_t offset = 0;
  if (useWiFi)
    offset = 2;
  else
    offset = 0;

  heartbeatEnabled = false;
  for (uint8_t i = 0; i < 9 + offset; i++)
  {
    pinMode(mpin(i), OUTPUT);
    analogWrite(mpin(i), LOW);

    pins.state[i] = 1;
  }


  //pinMode(A0, INPUT);
  pins.state[14] = 1;
  heartbeatEnabled = true;

}

uint8_t mpin(uint8_t p)
{
  return pins.pin[p];
}

String dht(uint8_t pin, uint8_t model) //model 11,22,21
{
  uint8_t mapPin = mpin(pin);
  pinMode(mapPin, INPUT);
  DHT dht(mapPin, model, 15);

  if (!isDHTRunning)
  {
    dht.begin();
    isDHTRunning = true;
  }

  float h = dht.readHumidity();
  float c = dht.readTemperature();
  float f = dht.readTemperature(true);
  isDHTRunning = false;

  return "\"H\":\"" + String(h)
         + "\",\"C\":\""
         + String(c)
         + "\",\"F\":\""
         + String(f) + "\"";
}

void lcdShow(uint8_t addr, uint8_t col, uint8_t row, String text)
{
  if (!isLCDOpen) {
    lcd.init(addr, 16, 2);
    lcd.backlight();
    isLCDOpen = true;
  }
  lcd.setCursor(col, row);
  lcd.print(text);
  lcdText[row] = text;
  lcdCol[row] = col;
}

void lcdReshow(uint8_t row)
{
  String text = lcdText[row];
  uint8_t col = 0;
  if(lcdCol[row] < 0)
  {
    col = 0;
    text = text.substring(0-lcdCol[row], text.length()+1);
  }
  else
    col = lcdCol[row];
  
  lcd.setCursor(col, row);
  lcd.print(text);
}

void lcdAction(String act)
{
  if (!isLCDOpen) {
    return;
  }

  if (act == "clear")
    lcd.clear();
  else if (act == "blink")
    lcd.blink();
  else if (act == "noBlink")
    lcd.noBlink();
  else if (act == "backlight")
    lcd.backlight();
  else if (act == "noBacklight")
    lcd.noBacklight();
  else if (act == "move_left")
  {
    lcdCol[0] -= 1;
    lcd.clear();
    lcdReshow(0);
  }
  else if (act == "move_right")
  {
    lcdCol[0] += 1;
    lcd.clear();
    lcdReshow(0);
  }
}


uint8_t queryI2C() {
  uint8_t address, error;
  for (address = 1; address < 127; address++ )
  {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0)
    {
      if (address < 16)
        return 0;
      return address;
    }
  }
}

