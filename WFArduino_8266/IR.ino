String readIRCode(uint8_t pin) {
  if (!isIREvent)
  {
    irrecv.disableIRIn();
    irrecv.setRecvPin(mpin(pin));
    irrecv.enableIRIn();
    isIREvent = true;
  }

  return "\"type\":\"" + irType
         + "\",\"code\":\""
         + String(irCode)
         + "\"";
}

void irSend(uint8_t pin, uint8_t f, String type, String code)
{
  isIREvent = false;
  pin = mpin(pin);
  pinMode(pin, OUTPUT);
  IRsend irsend(pin);

  if (code.length() > 8)
  {
    int index = code.indexOf(',');
    int len = code.substring(0, index).toInt();
    code = code.substring(index + 1, code.length());
    unsigned int buf[len];

    for (int i = 0; i < len; i++)
    {
      index = code.indexOf(',');
      buf[i] = code.substring(0, index).toInt();
      code = code.substring(index + 1, code.length());
    }
    irsend.sendRaw(buf, len, f);
  }
  else
  {
    char codeValue[code.length() + 1];
    code.toCharArray(codeValue, code.length() + 1);
    if (type == "NEC" || type == "")
      irsend.sendNEC(hex2int(codeValue, code.length()), f);
  }
}

unsigned long hex2int(char *a, unsigned int len)
{
  int i;
  unsigned long val = 0;

  for (i = 0; i < len; i++)
    if (a[i] <= 57)
      val += (a[i] - 48) * (1 << (4 * (len - 1 - i)));
    else
      val += (a[i] - 55) * (1 << (4 * (len - 1 - i)));
  return val;
}

String dump(decode_results *results) {
  int count = results->rawlen;
  String code = "";

  /*if (results->decode_type == UNKNOWN)
    irCodeType = 255;
  else
    irCodeType = results->decode_type;
    */

  code = String(count - 1) + ",";
  for (int i = 1; i < count; i++) {
    code += String(results->rawbuf[i] * USECPERTICK);
    if (i < count - 1)
      code += ",";
  }

  return code;
}

String irRaw(decode_results *results) {
  int count = results->rawlen;
  String code = "";

  code = String(count - 1) + ",";
  for (int i = 1; i < count; i++) {
    code += String(results->rawbuf[i] * USECPERTICK);
    if (i < count - 1)
      code += ",";
  }

  return code;
}

String  encoding (decode_results *results)
{
  switch (results->decode_type) {
    default:
    case UNKNOWN:      return "UNKNOWN";       break ;
    case NEC:          return "NEC";           break ;
    case SONY:         return "SONY";          break ;
    case RC5:          return "RC5";           break ;
    case RC6:          return "RC6";           break ;
    case DISH:         return "DISH";          break ;
    case SHARP:        return "SHARP";         break ;
    case JVC:          return "JVC";           break ;
    case SANYO:        return "SANYO";         break ;
    case MITSUBISHI:   return "MITSUBISHI";    break ;
    case SAMSUNG:      return "SAMSUNG";       break ;
    case LG:           return "LG";            break ;
    case WHYNTER:      return "WHYNTER";       break ;
    case AIWA_RC_T501: return "AIWA_RC_T501";  break ;
    case PANASONIC:    return "PANASONIC";     break ;
  }
}
