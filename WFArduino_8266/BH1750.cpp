/*

*/

#include "BH1750.h"

BH1750::BH1750() {

}

void BH1750::begin(uint8_t mode) {
  digitalWrite(4,0);
  digitalWrite(5,0);
  Wire.begin(4,5);
  init(BH1750_I2CADDR, mode);
  delay(200);
}


uint16_t BH1750::read(int address){
  uint16_t level=0;
  if(2==readData(address))
  {
    level=((buff[0]<<8)|buff[1])/1.2;
    return level;
  }  
}


/*********************************************************************/

void BH1750::init(int address, uint8_t mode){
  Wire.beginTransmission(BH1750_I2CADDR);
  Wire.write(mode);//1lx reolution 120ms
  Wire.endTransmission();
}

uint8_t BH1750::readData(int address) {
  uint8_t i=0;
  Wire.beginTransmission(BH1750_I2CADDR);
  Wire.requestFrom(BH1750_I2CADDR, 2);
  while(Wire.available()) //
  {
    buff[i] = Wire.read();  // receive one byte
    i++;
  }
  Wire.endTransmission();  
  return i;
}

