/*
  WFduino for ESP01
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
#include <WebSocketsServer.h>
#include "EEPROMAnything.h"

#define romSize 60

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

const char serverIndex[] PROGMEM = "<form method='POST' action='/update' enctype='multipart/form-data'><input type='file' name='update'><input type='submit' value='Update'></form>";

const char* product = "WFduinoESP"; 
const char* version = "2017.01.05";
const uint8_t maxLength = 20;
const uint8_t bufferSize = 255;
uint8_t serialIndex = 0;

char serialBuffer[bufferSize];
bool isConnected = false;
String cmd = "";

void setup(){
  Serial.begin(115200);
  Serial.flush();
  Serial.println();
  
  loadConfig();

  //web socket
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  configServerEvent();
  server.begin();
}

void loop(){
  server.handleClient();
  webSocket.loop();
  listen();
}

void listen() {
  while (Serial.available() > 0 )
  {
    uint8_t val = Serial.read();
    if (val == 10)
    {
      serialBuffer[serialIndex - 1] = '\0';
      cmd = String(serialBuffer);
      serialIndex = 0;
      socketBack(cmd);
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

