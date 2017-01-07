
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t lenght) {

  switch (type) {
    case WStype_DISCONNECTED:
      //Serial.printf("[%u] Disconnected!\n", num);
      break;
    case WStype_CONNECTED:
      {
        Serial.println("heartMode,1");
        //IPAddress ip = webSocket.remoteIP(num);
        //Serial.printf("[%u] Connected from %d.%d.%d.%d url: %s\n", num, ip[0], ip[1], ip[2], ip[3], payload);
      }
      break;
    case WStype_TEXT:
      //Serial.printf("[%u] get Text: %s\n Length: %d", num, payload, lenght);
      char buf[255];
      for (uint8_t i = 0; i < lenght; i++)
      {
        if(payload[i] == 10 || payload[i] == 13)
        {
          buf[i] = '\0';
          break;
        }
        else
          buf[i] = payload[i];
        
      }
      cmd = String(buf);
      Serial.println(cmd);
      // send data to all connected clients
      //webSocket.broadcastTXT(payload, lenght);
      break;
    case WStype_BIN:
      //Serial.printf("[%u] get binary lenght: %u\n", num, lenght);
      //hexdump(payload, lenght);

      // echo data back to browser
      //webSocket.sendBIN(num, payload, lenght);
      break;
  }

}

void socketBack(String data)
{
  char buf[255];
  uint8_t lenght = data.length();
  data.toCharArray(buf, lenght + 1);
  webSocket.broadcastTXT((uint8_t*)buf, lenght + 1);
}

