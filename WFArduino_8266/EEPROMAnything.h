#include <EEPROM.h>

template <class T> int EEPROM_writeAnything(int ee, const T& value,int romSize)
{
    EEPROM.begin(romSize);
    const byte* p = (const byte*)(const void*)&value;
    unsigned int i;
    for (i = 0; i < sizeof(value); i++)
    {
        EEPROM.write(ee++, *p++);
    }

    EEPROM.commit();
    EEPROM.end();
    return i;
}

template <class T> int EEPROM_readAnything(int ee, T& value, int romSize)
{
    EEPROM.begin(romSize);
    byte* p = (byte*)(void*)&value;
    unsigned int i;
    for (i = 0; i < sizeof(value); i++)
    {
        *p++ = EEPROM.read(ee++);
    }
    EEPROM.end();
    return i;
}
