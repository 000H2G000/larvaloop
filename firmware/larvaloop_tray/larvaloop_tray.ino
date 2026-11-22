#include <Arduino.h>
#include <Wire.h>
#include <DHT.h>
#include <U8g2lib.h>
#include <ESP32Servo.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =====================================================
// 1. PIN CONFIGURATION
// =====================================================
#define DHT_PIN 4
#define DHT_TYPE DHT22

#define LED_RED   25
#define LED_GREEN 26
#define LED_BLUE  27

#define FLAME_PIN 34
#define BUZZER_PIN 23

#define OLED_SDA 21
#define OLED_SCL 22
#define OLED_ADDRESS 0x3C

#define SERVO_PIN 18

// =====================================================
// 2. SYSTEM CONFIGURATION
// =====================================================
const float TEMP_WARNING_C = 28.0;
const float TEMP_CRITICAL_C = 30.0;
const float TEMP_HYSTERESIS_C = 1.0;

// Sensor reports fire when the pin reads HIGH (same as flame test code)
const int FLAME_ACTIVE_LEVEL = HIGH;
const bool RGB_COMMON_ANODE = false;
const bool BUZZER_ACTIVE_HIGH = true;

const int SERVO_CLOSED = 0;
const int SERVO_OPEN = 90;

const unsigned long SENSOR_INTERVAL = 2500;
const unsigned long DISPLAY_INTERVAL = 500;
const unsigned long SERIAL_INTERVAL = 3000;
const unsigned long BUZZER_INTERVAL = 300;

// ---------- Network configuration ----------
// WIFI_SSID, WIFI_PASSWORD and SERVER_URL live in secrets.h (not committed).
// Copy secrets.example.h to secrets.h and fill it in.
#include "secrets.h"

const char* DEVICE_ID = "ESP32_TRAY_01";
const char* TRAY_CODE = "TRAY_01";

const unsigned long SEND_INTERVAL = 5000;
const unsigned long WIFI_RETRY_INTERVAL = 10000;
const uint16_t HTTP_TIMEOUT_MS = 2000;

// =====================================================
// 3. OBJECTS
// =====================================================
DHT dht(DHT_PIN, DHT_TYPE);

// OLED 1.3" SH1106 128x64 (U8g2)
U8G2_SH1106_128X64_NONAME_F_HW_I2C display(U8G2_R0, U8X8_PIN_NONE);

Servo ventilationServo;

// =====================================================
// 4. GLOBAL VARIABLES
// =====================================================
float temperature = NAN;
float humidity = NAN;

bool flameDetected = false;
bool servoIsOpen = false;
bool oledAvailable = false;
bool buzzerState = false;

unsigned long lastSensorRead = 0;
unsigned long lastDisplayUpdate = 0;
unsigned long lastSerialUpdate = 0;
unsigned long lastBuzzerUpdate = 0;
unsigned long lastSend = 0;
unsigned long lastWifiAttempt = 0;

int servoAngle = SERVO_CLOSED;
bool dhtError = true;

// ---- Flame debounce ----
const unsigned long FLAME_DEBOUNCE_MS = 50;
int lastFlameRaw = LOW;
unsigned long lastFlameChange = 0;
int flameRawValue = LOW;   // raw GPIO34 value, for debugging

enum SystemStatus { NORMAL, WARNING, CRITICAL, FIRE_ALERT, SENSOR_ERROR };
SystemStatus systemStatus = SENSOR_ERROR;

const char* statusToString(SystemStatus s) {
  switch (s) {
    case NORMAL:       return "NORMAL";
    case WARNING:      return "WARNING";
    case CRITICAL:     return "CRITICAL";
    case FIRE_ALERT:   return "FIRE_ALERT";
    case SENSOR_ERROR: return "SENSOR_ERROR";
  }
  return "UNKNOWN";
}

// =====================================================
// 5. RGB LED
// =====================================================
void setColor(bool red, bool green, bool blue) {
  if (RGB_COMMON_ANODE) {
    digitalWrite(LED_RED, !red);
    digitalWrite(LED_GREEN, !green);
    digitalWrite(LED_BLUE, !blue);
  } else {
    digitalWrite(LED_RED, red);
    digitalWrite(LED_GREEN, green);
    digitalWrite(LED_BLUE, blue);
  }
}

void updateRGB() {
  switch (systemStatus) {
    case NORMAL:       setColor(false, true, false); break;
    case WARNING:      setColor(true, true, false);  break;
    case CRITICAL:
    case FIRE_ALERT:   setColor(true, false, false); break;
    case SENSOR_ERROR: setColor(false, false, true); break;
  }
}

// =====================================================
// 6. BUZZER
// =====================================================
void setBuzzer(bool state) {
  if (BUZZER_ACTIVE_HIGH) digitalWrite(BUZZER_PIN, state ? HIGH : LOW);
  else digitalWrite(BUZZER_PIN, state ? LOW : HIGH);
}

void updateBuzzer() {
  bool alarmRequired = flameDetected || systemStatus == CRITICAL;

  if (!alarmRequired) {
    buzzerState = false;
    setBuzzer(false);
    return;
  }

  unsigned long now = millis();
  unsigned long interval = flameDetected ? 150 : BUZZER_INTERVAL;

  if (now - lastBuzzerUpdate >= interval) {
    lastBuzzerUpdate = now;
    buzzerState = !buzzerState;
    setBuzzer(buzzerState);
  }
}

// =====================================================
// 7. SERVO CONTROL
// =====================================================
void controlVentilation() {
  if (flameDetected) {
    if (servoIsOpen) {
      ventilationServo.write(SERVO_CLOSED);
      servoAngle = SERVO_CLOSED;
      servoIsOpen = false;
      Serial.println("FIRE ALERT: VENTILATION CLOSED");
    }
    return;
  }

  if (dhtError || isnan(temperature)) return;

  if (!servoIsOpen && temperature >= TEMP_WARNING_C) {
    ventilationServo.write(SERVO_OPEN);
    servoAngle = SERVO_OPEN;
    servoIsOpen = true;
    Serial.println("VENTILATION: OPEN");
  }
  else if (servoIsOpen && temperature < (TEMP_WARNING_C - TEMP_HYSTERESIS_C)) {
    ventilationServo.write(SERVO_CLOSED);
    servoAngle = SERVO_CLOSED;
    servoIsOpen = false;
    Serial.println("VENTILATION: CLOSED");
  }
}

// =====================================================
// 8. STATUS MANAGEMENT
// =====================================================
void updateSystemStatus() {
  if (flameDetected)                       systemStatus = FIRE_ALERT;
  else if (dhtError)                       systemStatus = SENSOR_ERROR;
  else if (temperature >= TEMP_CRITICAL_C) systemStatus = CRITICAL;
  else if (temperature >= TEMP_WARNING_C)  systemStatus = WARNING;
  else                                     systemStatus = NORMAL;

  updateRGB();
}

// =====================================================
// 9. SENSOR READING
// =====================================================
void readFlameSensor() {
  flameRawValue = digitalRead(FLAME_PIN);

  if (flameRawValue != lastFlameRaw) {
    lastFlameRaw = flameRawValue;
    lastFlameChange = millis();
  }

  // Accept the new state only after it has been stable for FLAME_DEBOUNCE_MS
  if (millis() - lastFlameChange >= FLAME_DEBOUNCE_MS) {
    flameDetected = (flameRawValue == FLAME_ACTIVE_LEVEL);
  }
}

void readDHTSensor() {
  unsigned long now = millis();
  if (now - lastSensorRead < SENSOR_INTERVAL) return;
  lastSensorRead = now;

  float newTemperature = dht.readTemperature();
  float newHumidity = dht.readHumidity();

  if (isnan(newTemperature) || isnan(newHumidity)) {
    dhtError = true;
    Serial.println("ERROR: DHT22 reading failed!");
  } else {
    temperature = newTemperature;
    humidity = newHumidity;
    dhtError = false;
  }
}

// =====================================================
// 10. OLED DISPLAY (U8g2 / SH1106)
// =====================================================
void updateDisplay() {
  if (!oledAvailable) return;

  unsigned long now = millis();
  if (now - lastDisplayUpdate < DISPLAY_INTERVAL) return;
  lastDisplayUpdate = now;

  char buf[24];

  display.clearBuffer();

  // ---- Header ----
  display.setFont(u8g2_font_6x10_tr);
  display.drawStr(0, 9, "ACORN2PROTEIN");

  const char* st = "";
  switch (systemStatus) {
    case NORMAL:       st = "NORMAL";   break;
    case WARNING:      st = "WARNING";  break;
    case CRITICAL:     st = "CRITICAL"; break;
    case FIRE_ALERT:   st = "FIRE!";    break;
    case SENSOR_ERROR: st = "ERROR";    break;
  }
  // right-aligned status
  display.drawStr(128 - display.getStrWidth(st), 9, st);

  display.drawHLine(0, 12, 128);

  // ---- Labels ----
  display.setFont(u8g2_font_6x10_tr);
  display.drawStr(0, 24, "TEMP");
  display.drawStr(75, 24, "HUM");

  // ---- Big values ----
  display.setFont(u8g2_font_logisoso16_tr);
  if (dhtError) snprintf(buf, sizeof(buf), "--.-");
  else          snprintf(buf, sizeof(buf), "%.1f", temperature);
  display.drawStr(0, 46, buf);
  int tw = display.getStrWidth(buf);

  if (dhtError) snprintf(buf, sizeof(buf), "--");
  else          snprintf(buf, sizeof(buf), "%.0f", humidity);
  display.drawStr(75, 46, buf);
  int hw = display.getStrWidth(buf);

  // ---- Units ----
  display.setFont(u8g2_font_6x10_tr);
  display.drawStr(tw + 3, 46, "C");
  display.drawStr(75 + hw + 3, 46, "%");

  display.drawHLine(0, 49, 128);

  // ---- Bottom row ----
  display.setFont(u8g2_font_5x7_tr);
  snprintf(buf, sizeof(buf), "FLAME:%s", flameDetected ? "YES" : "NO");
  display.drawStr(0, 60, buf);

  display.drawStr(58, 60, WiFi.status() == WL_CONNECTED ? "W" : "x");

  snprintf(buf, sizeof(buf), "SERVO:%s", servoIsOpen ? "OPEN" : "CLOSE");
  display.drawStr(70, 60, buf);

  display.sendBuffer();
}

// =====================================================
// 11. SERIAL MONITOR
// =====================================================
void printData() {
  unsigned long now = millis();
  if (now - lastSerialUpdate < SERIAL_INTERVAL) return;
  lastSerialUpdate = now;

  Serial.println();
  Serial.println("========== ACORN2PROTEIN ==========");

  Serial.print("Temperature: ");
  if (dhtError) Serial.println("ERROR");
  else { Serial.print(temperature, 1); Serial.println(" C"); }

  Serial.print("Humidity: ");
  if (dhtError) Serial.println("ERROR");
  else { Serial.print(humidity, 1); Serial.println(" %"); }

  Serial.print("GPIO34 = ");
  Serial.print(flameRawValue);
  Serial.println(flameDetected ? " | FIRE DETECTED" : " | NO FIRE");

  Serial.print("Servo: ");
  Serial.println(servoIsOpen ? "OPEN" : "CLOSED");

  Serial.print("WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");

  Serial.print("Status: ");
  Serial.println(statusToString(systemStatus));

  Serial.println("===================================");
}

// =====================================================
// 12. WIFI + HTTP
// =====================================================
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastWifiAttempt = millis();

  Serial.print("Connecting to WiFi");
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi not connected (will retry).");
  }
}

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastWifiAttempt >= WIFI_RETRY_INTERVAL) {
    lastWifiAttempt = now;
    Serial.println("WiFi lost. Reconnecting...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

String buildPayload() {
  JsonDocument doc;   // ArduinoJson v7

  doc["deviceId"] = DEVICE_ID;
  doc["trayCode"] = TRAY_CODE;

  if (dhtError) {
    doc["temperature"] = nullptr;
    doc["humidity"] = nullptr;
  } else {
    doc["temperature"] = round(temperature * 10.0) / 10.0;
    doc["humidity"]    = round(humidity * 10.0) / 10.0;
  }

  doc["flameDetected"] = flameDetected;
  doc["servoAngle"]    = servoAngle;
  doc["systemStatus"]  = statusToString(systemStatus);

  String json;
  serializeJson(doc, json);
  return json;
}

void sendData() {
  unsigned long now = millis();
  if (now - lastSend < SEND_INTERVAL) return;
  lastSend = now;

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("SEND SKIPPED: no WiFi");
    return;
  }

  String payload = buildPayload();

  HTTPClient http;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  bool ok;
  if (String(SERVER_URL).startsWith("https")) {
    secureClient.setInsecure();
    ok = http.begin(secureClient, SERVER_URL);
  } else {
    ok = http.begin(plainClient, SERVER_URL);
  }

  if (!ok) {
    Serial.println("HTTP begin failed");
    return;
  }

  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  // http.addHeader("x-api-key", API_KEY);

  int code = http.POST(payload);

  Serial.print("POST ");
  Serial.println(payload);

  if (code > 0) {
    Serial.printf("HTTP response: %d\n", code);
  } else {
    Serial.printf("HTTP error: %s\n", http.errorToString(code).c_str());
  }

  http.end();
}

// =====================================================
// 13. SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("Starting ACORN2PROTEIN...");

  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);

  pinMode(BUZZER_PIN, OUTPUT);
  setBuzzer(false);

  dht.begin();

  // OLED init with U8g2 (SH1106)
  Wire.begin(OLED_SDA, OLED_SCL);
  display.setI2CAddress(OLED_ADDRESS * 2);
  oledAvailable = display.begin();

  if (oledAvailable) {
    display.clearBuffer();
    display.setFont(u8g2_font_6x10_tr);
    display.drawStr(0, 28, "ACORN2PROTEIN");
    display.drawStr(0, 43, "System Starting...");
    display.sendBuffer();
    Serial.println("OLED SH1106 READY");
  } else {
    Serial.println("OLED initialization failed!");
  }

  ventilationServo.setPeriodHertz(50);
  ventilationServo.attach(SERVO_PIN, 500, 2400);
  ventilationServo.write(SERVO_CLOSED);
  servoAngle = SERVO_CLOSED;
  servoIsOpen = false;

  // Flame sensor init (same as the test code + debounce state)
  pinMode(FLAME_PIN, INPUT);
  lastFlameRaw = digitalRead(FLAME_PIN);
  flameRawValue = lastFlameRaw;
  flameDetected = (lastFlameRaw == FLAME_ACTIVE_LEVEL);
  lastFlameChange = millis();

  systemStatus = SENSOR_ERROR;
  updateRGB();

  connectWiFi();

  Serial.println("System initialized.");
}

// =====================================================
// 14. MAIN LOOP
// =====================================================
void loop() {
  readFlameSensor();
  readDHTSensor();
  updateSystemStatus();
  controlVentilation();
  updateBuzzer();
  updateDisplay();
  printData();

  maintainWiFi();
  sendData();

  delay(5);
}