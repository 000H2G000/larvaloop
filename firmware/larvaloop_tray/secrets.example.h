// Copy to secrets.h (git-ignored) and fill in.
#pragma once

const char* WIFI_SSID     = "your-hotspot-name";
const char* WIFI_PASSWORD = "your-hotspot-password";

// Dashboard compatibility route (no API key needed on the device; the dashboard adds it server-side):
const char* SERVER_URL = "http://<PC-LAN-IP>:3000/api/readings";
// Or call the backend directly (then add X-Device-Id / X-Api-Key headers in sendData()):
// const char* SERVER_URL = "http://<PC-LAN-IP>:4000/api/v1/telemetry";
