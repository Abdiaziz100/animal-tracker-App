# 🐄 Livestock Tracker - Hardware Setup Guide

## 📦 Components Needed Per Tag

| Component | Model | Where to Buy | Cost (KES) |
|-----------|-------|-------------|------------|
| Microcontroller | ESP32 WROOM-32 | Nerokas Nairobi | 800 |
| 4G Module | SIM7600E | Ktronics Nairobi | 2,500 |
| GPS Module | NEO-8M | Nerokas Nairobi | 1,200 |
| Battery | LiPo 3000mAh 3.7V | Ktronics | 800 |
| Solar Panel | 5V 1W Mini | Jumia Kenya | 600 |
| Charger | TP4056 Module | Nerokas | 150 |
| Case | IP67 Waterproof | Alibaba | 400 |
| Ear Tag | Livestock Clip | Vet Supplies | 150 |
| PCB | Custom/Breadboard | Nerokas | 300 |
| SIM Card | Safaricom 4G | Safaricom Shop | 50 |
| **TOTAL** | | | **~6,950 KES** |

---

## 🔌 Wiring Diagram

```
                    ┌─────────────────┐
                    │   ESP32 WROOM   │
                    │                 │
GPS NEO-8M          │  GPIO16 (RX1) ←─┼── GPS TX
    TX ─────────────┤                 │
    RX ─────────────┤  GPIO17 (TX1) ──┼──→ GPS RX
    VCC ────────────┤  3.3V           │
    GND ────────────┤  GND            │
                    │                 │
SIM7600 4G          │  GPIO26 (RX2) ←─┼── SIM TX
    TX ─────────────┤                 │
    RX ─────────────┤  GPIO27 (TX2) ──┼──→ SIM RX
    VCC ────────────┤  5V (VIN)       │
    GND ────────────┤  GND            │
    PWR ────────────┤  GPIO4          │
                    │                 │
LED Indicator       │  GPIO2 (LED) ───┼──→ LED → 330Ω → GND
                    │                 │
Battery             │  VIN ←──────────┼── TP4056 OUT+
    LiPo+ ──────────┤  GND ←──────────┼── TP4056 OUT-
    LiPo- ──────────┤                 │
                    └─────────────────┘
                    
Solar Panel → TP4056 IN+ / IN-
```

---

## 💻 How to Flash the Firmware

### Step 1: Install Arduino IDE
- Download from arduino.cc
- Install ESP32 board package

### Step 2: Install Libraries
Open Arduino IDE → Tools → Manage Libraries:
- Search **TinyGPS++** → Install
- Search **ESP32** board → Install

### Step 3: Configure for Each Animal
Open `livestock_tracker.ino` and change:
```cpp
#define ANIMAL_ID  1    // ← Change this for each tag (must match app)
#define APN        "safaricom"  // ← Your SIM APN
```

### Step 4: Flash
- Connect ESP32 via USB
- Select board: **ESP32 Dev Module**
- Select port: **/dev/ttyUSB0** (Linux) or **COM3** (Windows)
- Click **Upload**

---

## 📱 How to Register in the App

1. Open Livestock Tracker app
2. Go to **Add Animal** tab
3. Fill in animal details
4. Note the **Animal ID** assigned (e.g. 1, 2, 3...)
5. Set that ID in firmware: `#define ANIMAL_ID 1`
6. Flash firmware to ESP32
7. Attach to animal ear
8. Watch tracking on Dashboard! ✅

---

## 🔋 Battery Life Estimates

| Update Interval | Without Solar | With Solar |
|----------------|---------------|------------|
| Every 10 sec | 1-2 days | Forever |
| Every 30 sec | 3-5 days | Forever |
| Every 60 sec | 7-10 days | Forever |
| Every 5 min | 20-30 days | Forever |

**Recommendation:** 30 second interval with solar panel

---

## 📶 SIM Card Setup

### Safaricom (Recommended)
- APN: `safaricom`
- Data bundle: Safaricom IoT SIM (cheapest)
- Cost: ~KES 200/month per tag

### Airtel Kenya
- APN: `airtel-ke`
- Cost: ~KES 150/month per tag

---

## 🧪 Testing Before Deployment

### Test 1: Serial Monitor
```
Open Arduino IDE → Serial Monitor → 115200 baud
Should see:
🐄 Livestock Tracker - GPS Ear Tag Starting...
📡 GPS module initialized
📶 SIM7600 module initialized
✅ Connected to 4G network
🛰️  Getting GPS fix...
📍 GPS Fix: -1.290000, 36.820000
✅ Location sent successfully
```

### Test 2: Check App
- Open your Livestock Tracker app
- Go to Dashboard
- Animal location should update every 30 seconds ✅

### Test 3: Geofence Alert
- Move tag outside your set geofence area
- App should show ⚠️ alert within 30 seconds ✅

---

## 🏭 Production Assembly Steps

```
1. Solder components on PCB
2. Connect battery and solar panel
3. Flash firmware with correct ANIMAL_ID
4. Test connection (check Serial Monitor)
5. Seal in waterproof IP67 case
6. Attach ear tag clip to case
7. Register animal in app
8. Attach to animal ear
9. Monitor from phone! 🎉
```

---

## ⚠️ Important Notes

- Each tag needs a **unique ANIMAL_ID** matching the app
- Use **Safaricom** for best coverage in Kenya
- **Solar panel** is highly recommended for continuous operation
- **IP67 case** is mandatory - animals get wet!
- Test indoors first before attaching to animal
- GPS needs **clear sky view** - works poorly indoors

---

## 📞 Support

If you have issues:
1. Check Serial Monitor for error messages
2. Verify SIM card has data bundle
3. Check GPS has clear sky view
4. Verify ANIMAL_ID matches app

**Your backend is ready at:**
https://animal-tracker-app.onrender.com
