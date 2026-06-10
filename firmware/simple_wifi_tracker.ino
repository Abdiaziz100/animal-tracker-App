/**
 * ============================================================
 *  SIMPLE GPS TRACKER - WiFi Version
 *  Hardware: ESP32 + NEO-6M GPS + LiPo Battery
 *  No SIM card needed - uses WiFi
 * ============================================================
 * 
 * WIRING:
 *  GPS TX  → ESP32 GPIO16
 *  GPS RX  → ESP32 GPIO17
 *  GPS VCC → ESP32 3.3V
 *  GPS GND → ESP32 GND
 *  Battery → ESP32 VIN + GND
 */

#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ── CHANGE THESE ──────────────────────────────────────────────
#define ANIMAL_ID     1                    // Animal ID from your app
#define WIFI_SSID     "YOUR_WIFI_NAME"     // Your WiFi name
#define WIFI_PASS     "YOUR_WIFI_PASSWORD" // Your WiFi password
#define SERVER_URL    "https://animal-tracker-app.onrender.com/api/update-location"
#define SEND_INTERVAL 30                   // Send every 30 seconds
// ─────────────────────────────────────────────────────────────

TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
  pinMode(2, OUTPUT); // LED

  Serial.println("🐄 GPS Tracker Starting...");

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(2, !digitalRead(2)); // Blink while connecting
  }
  Serial.println("\n✅ WiFi Connected: " + WiFi.localIP().toString());
  digitalWrite(2, HIGH); // LED on = connected
}

void loop() {
  // Read GPS for up to 60 seconds
  Serial.println("🛰️ Getting GPS fix...");
  unsigned long start = millis();
  
  while (millis() - start < 60000) {
    while (gpsSerial.available()) {
      gps.encode(gpsSerial.read());
    }
    if (gps.location.isUpdated()) break;
  }

  if (gps.location.isValid()) {
    float lat = gps.location.lat();
    float lng = gps.location.lng();

    Serial.println("📍 Lat: " + String(lat, 6) + " Lng: " + String(lng, 6));
    Serial.println("🛰️ Satellites: " + String(gps.satellites.value()));

    // Send to backend
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      String body = "{\"id\":" + String(ANIMAL_ID) +
                    ",\"lat\":" + String(lat, 6) +
                    ",\"lng\":" + String(lng, 6) + "}";

      int code = http.POST(body);
      String response = http.getString();

      if (code == 200) {
        Serial.println("✅ Sent! Response: " + response);
        // Check if outside geofence
        if (response.indexOf("OUT") >= 0) {
          Serial.println("⚠️ ANIMAL OUTSIDE FARM!");
          // Fast blink = alert
          for (int i = 0; i < 10; i++) {
            digitalWrite(2, HIGH); delay(100);
            digitalWrite(2, LOW);  delay(100);
          }
        }
      } else {
        Serial.println("❌ Failed: " + String(code));
      }
      http.end();
    } else {
      // Reconnect WiFi if disconnected
      WiFi.reconnect();
    }
  } else {
    Serial.println("❌ No GPS fix yet...");
  }

  // Wait before next update
  Serial.println("⏳ Waiting " + String(SEND_INTERVAL) + " seconds...");
  delay(SEND_INTERVAL * 1000);
}
