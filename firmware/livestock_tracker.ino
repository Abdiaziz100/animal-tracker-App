/**
 * ============================================================
 *  LIVESTOCK TRACKER - GPS EAR TAG FIRMWARE
 *  Hardware: ESP32 + SIM7600 4G + NEO-8M GPS + Solar Battery
 *  Backend:  https://animal-tracker-app.onrender.com
 *  Author:   Livestock Tracker System
 * ============================================================
 * 
 * PIN CONNECTIONS:
 * ─────────────────────────────────────────
 * GPS NEO-8M:
 *   VCC  → 3.3V
 *   GND  → GND
 *   TX   → ESP32 GPIO 16 (RX)
 *   RX   → ESP32 GPIO 17 (TX)
 *
 * SIM7600 4G:
 *   VCC  → 5V
 *   GND  → GND
 *   TX   → ESP32 GPIO 26 (RX)
 *   RX   → ESP32 GPIO 27 (TX)
 *   PWR  → ESP32 GPIO 4
 *
 * LED Indicator:
 *   LED  → ESP32 GPIO 2 (built-in)
 *
 * Battery:
 *   Solar Panel → TP4056 Charger → LiPo 3000mAh → ESP32 VIN
 * ─────────────────────────────────────────
 */

#include <Arduino.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <esp_sleep.h>

// ── CONFIGURATION ─────────────────────────────────────────────
// ⚠️ CHANGE THIS FOR EACH TAG - must match Animal ID in your app
#define ANIMAL_ID         1

// ⚠️ Your SIM card APN (Safaricom = "safaricom", Airtel = "airtel-ke")
#define APN               "safaricom"

// ⚠️ Your backend URL
#define SERVER_URL        "https://animal-tracker-app.onrender.com/api/update-location"

// GPS update interval (seconds) - 30s normal, 10s if outside geofence
#define INTERVAL_NORMAL   30
#define INTERVAL_ALERT    10

// GPS timeout (seconds to wait for GPS fix)
#define GPS_TIMEOUT       60

// Max retries for HTTP request
#define MAX_RETRIES       3

// ── PIN DEFINITIONS ───────────────────────────────────────────
#define GPS_RX_PIN        16
#define GPS_TX_PIN        17
#define SIM_RX_PIN        26
#define SIM_TX_PIN        27
#define SIM_PWR_PIN       4
#define LED_PIN           2

// ── GLOBAL OBJECTS ────────────────────────────────────────────
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);
HardwareSerial simSerial(2);

// ── STATUS TRACKING ───────────────────────────────────────────
bool isOutsideGeofence = false;
int  failedAttempts    = 0;
int  updateInterval    = INTERVAL_NORMAL;

// ═══════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(SIM_PWR_PIN, OUTPUT);

  Serial.println("🐄 Livestock Tracker - GPS Ear Tag Starting...");
  Serial.println("Animal ID: " + String(ANIMAL_ID));

  // Start GPS
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("📡 GPS module initialized");

  // Start SIM7600
  simSerial.begin(115200, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
  Serial.println("📶 SIM7600 module initialized");

  // Power on SIM7600
  powerOnSIM();

  // Connect to 4G network
  if (connectToNetwork()) {
    Serial.println("✅ Connected to 4G network");
    blinkLED(3, 200); // 3 blinks = connected
  } else {
    Serial.println("❌ Failed to connect to network");
    blinkLED(10, 100); // 10 fast blinks = error
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═══════════════════════════════════════════════════════════════
void loop() {
  Serial.println("\n─────────────────────────────");
  Serial.println("🛰️  Getting GPS fix...");

  // Get GPS coordinates
  float lat = 0, lng = 0;
  bool gpsFixed = getGPSFix(lat, lng);

  if (gpsFixed) {
    Serial.println("📍 GPS Fix: " + String(lat, 6) + ", " + String(lng, 6));
    Serial.println("🎯 Accuracy: " + String(gps.hdop.hdop()) + " HDOP");
    Serial.println("🛰️  Satellites: " + String(gps.satellites.value()));

    // Send to backend
    bool sent = sendLocationWithRetry(lat, lng);

    if (sent) {
      Serial.println("✅ Location sent successfully");
      failedAttempts = 0;
      blinkLED(1, 500); // 1 blink = success
    } else {
      failedAttempts++;
      Serial.println("❌ Failed to send. Attempt: " + String(failedAttempts));
      blinkLED(2, 200); // 2 blinks = failed

      // If too many failures, reconnect
      if (failedAttempts >= 3) {
        Serial.println("🔄 Reconnecting to network...");
        connectToNetwork();
        failedAttempts = 0;
      }
    }
  } else {
    Serial.println("❌ No GPS fix - sending last known location");
    blinkLED(5, 100); // 5 fast blinks = no GPS
  }

  // Sleep to save battery
  Serial.println("💤 Sleeping for " + String(updateInterval) + " seconds...");
  Serial.flush();

  esp_sleep_enable_timer_wakeup((uint64_t)updateInterval * 1000000ULL);
  esp_light_sleep_start();
}

// ═══════════════════════════════════════════════════════════════
//  GPS FUNCTIONS
// ═══════════════════════════════════════════════════════════════
bool getGPSFix(float &lat, float &lng) {
  unsigned long startTime = millis();
  unsigned long timeout   = GPS_TIMEOUT * 1000;

  while (millis() - startTime < timeout) {
    while (gpsSerial.available()) {
      gps.encode(gpsSerial.read());
    }

    if (gps.location.isValid() && gps.location.isUpdated()) {
      lat = gps.location.lat();
      lng = gps.location.lng();
      return true;
    }

    delay(100);
  }

  // Return last known location if available
  if (gps.location.isValid()) {
    lat = gps.location.lat();
    lng = gps.location.lng();
    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════
//  HTTP / NETWORK FUNCTIONS
// ═══════════════════════════════════════════════════════════════
bool sendLocationWithRetry(float lat, float lng) {
  for (int i = 0; i < MAX_RETRIES; i++) {
    if (sendLocation(lat, lng)) {
      return true;
    }
    Serial.println("Retry " + String(i + 1) + "/" + String(MAX_RETRIES));
    delay(2000);
  }
  return false;
}

bool sendLocation(float lat, float lng) {
  // Build JSON payload
  String payload = "{\"id\":" + String(ANIMAL_ID) +
                   ",\"lat\":" + String(lat, 6) +
                   ",\"lng\":" + String(lng, 6) + "}";

  Serial.println("📤 Sending: " + payload);

  // Send HTTP POST via AT commands
  String response = sendHTTPPost(SERVER_URL, payload);

  if (response.indexOf("200") >= 0 || response.indexOf("\"status\"") >= 0) {
    // Check if animal is outside geofence
    if (response.indexOf("\"OUT\"") >= 0) {
      isOutsideGeofence = true;
      updateInterval    = INTERVAL_ALERT; // Update faster when outside
      Serial.println("⚠️  ANIMAL OUTSIDE GEOFENCE - Increasing update frequency");
    } else {
      isOutsideGeofence = false;
      updateInterval    = INTERVAL_NORMAL;
    }
    return true;
  }

  return false;
}

String sendHTTPPost(String url, String payload) {
  String response = "";

  // Set HTTP parameters
  sendATCommand("AT+HTTPINIT", 2000);
  sendATCommand("AT+HTTPPARA=\"CID\",1", 1000);
  sendATCommand("AT+HTTPPARA=\"URL\",\"" + url + "\"", 1000);
  sendATCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000);

  // Send data
  String dataCmd = "AT+HTTPDATA=" + String(payload.length()) + ",10000";
  sendATCommand(dataCmd, 1000);
  delay(500);
  simSerial.print(payload);
  delay(2000);

  // Execute POST
  sendATCommand("AT+HTTPACTION=1", 5000);
  delay(3000);

  // Read response
  sendATCommand("AT+HTTPREAD", 3000);
  response = readSIMResponse(3000);

  sendATCommand("AT+HTTPTERM", 1000);

  Serial.println("📥 Response: " + response);
  return response;
}

// ═══════════════════════════════════════════════════════════════
//  SIM7600 FUNCTIONS
// ═══════════════════════════════════════════════════════════════
void powerOnSIM() {
  Serial.println("🔌 Powering on SIM7600...");
  digitalWrite(SIM_PWR_PIN, HIGH);
  delay(3000);
  digitalWrite(SIM_PWR_PIN, LOW);
  delay(5000);
  Serial.println("✅ SIM7600 powered on");
}

bool connectToNetwork() {
  Serial.println("📶 Connecting to " + String(APN) + "...");

  // Check if SIM is ready
  if (!sendATCommand("AT", 2000).indexOf("OK") >= 0) {
    Serial.println("❌ SIM not responding");
    return false;
  }

  // Check SIM card
  sendATCommand("AT+CPIN?", 2000);

  // Check signal strength
  String signal = sendATCommand("AT+CSQ", 2000);
  Serial.println("📶 Signal: " + signal);

  // Set APN
  sendATCommand("AT+CGDCONT=1,\"IP\",\"" + String(APN) + "\"", 2000);

  // Activate data connection
  sendATCommand("AT+CGACT=1,1", 5000);

  // Check connection
  String ipResponse = sendATCommand("AT+CGPADDR=1", 3000);
  if (ipResponse.indexOf("0.0.0.0") >= 0 || ipResponse.length() < 10) {
    Serial.println("❌ No IP address assigned");
    return false;
  }

  Serial.println("✅ IP: " + ipResponse);
  return true;
}

String sendATCommand(String command, int timeout) {
  simSerial.println(command);
  return readSIMResponse(timeout);
}

String readSIMResponse(int timeout) {
  String response = "";
  unsigned long startTime = millis();

  while (millis() - startTime < timeout) {
    while (simSerial.available()) {
      char c = simSerial.read();
      response += c;
    }
    delay(10);
  }

  return response;
}

// ═══════════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void printStatus() {
  Serial.println("═══════════════════════════════");
  Serial.println("🐄 LIVESTOCK TRACKER STATUS");
  Serial.println("═══════════════════════════════");
  Serial.println("Animal ID:    " + String(ANIMAL_ID));
  Serial.println("GPS Valid:    " + String(gps.location.isValid() ? "YES" : "NO"));
  Serial.println("Satellites:   " + String(gps.satellites.value()));
  Serial.println("Outside:      " + String(isOutsideGeofence ? "YES ⚠️" : "NO ✅"));
  Serial.println("Interval:     " + String(updateInterval) + "s");
  Serial.println("Failed:       " + String(failedAttempts));
  Serial.println("═══════════════════════════════");
}
