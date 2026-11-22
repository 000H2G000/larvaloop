/**
 * DEV/TEST ONLY - simulated ESP32 for testing the API and dashboard without hardware.
 * Readings are synthetic. Use a separate device + tray (default SIM_ESP32_01 / SIM_TRAY)
 * so simulated data never mixes with the real tray.
 *
 *   npm run device:register -- SIM_ESP32_01 SIM_TRAY "Simulator"
 *   SIM_API_KEY=<key> npm run simulate -- [scenario]
 *
 * Scenarios: normal | heat | fire | sensor-error | humid
 * Env: SIM_URL (default http://localhost:4000/api/v1/telemetry), SIM_DEVICE_ID, SIM_TRAY_CODE, SIM_INTERVAL_MS
 */
const URL = process.env.SIM_URL ?? 'http://localhost:4000/api/v1/telemetry';
const DEVICE_ID = process.env.SIM_DEVICE_ID ?? 'SIM_ESP32_01';
const TRAY_CODE = process.env.SIM_TRAY_CODE ?? 'SIM_TRAY';
const API_KEY = process.env.SIM_API_KEY;
const INTERVAL = Number(process.env.SIM_INTERVAL_MS ?? 5000);
const scenario = process.argv[2] ?? 'normal';

const SCENARIOS = ['normal', 'heat', 'fire', 'sensor-error', 'humid'];
if (!API_KEY) {
  console.error('Set SIM_API_KEY (from: npm run device:register -- SIM_ESP32_01 SIM_TRAY)');
  process.exit(1);
}
if (!SCENARIOS.includes(scenario)) {
  console.error(`Unknown scenario "${scenario}". Use one of: ${SCENARIOS.join(', ')}`);
  process.exit(1);
}

// Same rules as the firmware: 28 °C warning / open vent, 30 °C critical, 1 °C hysteresis, vent closes on fire.
const WARN = 28, CRIT = 30, HYST = 1;
let temperature = 25.5, humidity = 62, servoAngle = 0, seq = 0, tick = 0;

const drift = (v, target, step, noise) => v + Math.sign(target - v) * Math.min(step, Math.abs(target - v)) + (Math.random() - 0.5) * noise;
const round1 = (v) => Math.round(v * 10) / 10;

function nextReading() {
  tick++;
  // heat: ramp to ~31.5 °C for ~2 min, then cool back down, repeat.
  const heatTarget = scenario === 'heat' ? (tick % 48 < 24 ? 31.5 : 25) : 25.5;
  temperature = drift(temperature, heatTarget, 0.4, 0.2);
  humidity = drift(humidity, scenario === 'humid' ? 86 : 62, 1.5, 0.8);

  const flameDetected = scenario === 'fire' && tick % 12 >= 4 && tick % 12 < 9;
  const sensorFailed = scenario === 'sensor-error' && tick % 10 >= 4 && tick % 10 < 7;

  if (flameDetected) servoAngle = 0;
  else if (!sensorFailed && servoAngle === 0 && temperature >= WARN) servoAngle = 90;
  else if (!sensorFailed && servoAngle === 90 && temperature < WARN - HYST) servoAngle = 0;

  const systemStatus = flameDetected ? 'FIRE_ALERT' : sensorFailed ? 'SENSOR_ERROR'
    : temperature >= CRIT ? 'CRITICAL' : temperature >= WARN ? 'WARNING' : 'NORMAL';

  return {
    deviceId: DEVICE_ID,
    trayCode: TRAY_CODE,
    temperature: sensorFailed ? null : round1(temperature),
    humidity: sensorFailed ? null : round1(humidity),
    flameDetected,
    servoAngle,
    systemStatus,
    sequence: ++seq,
  };
}

async function send() {
  const body = nextReading();
  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Id': DEVICE_ID, 'X-Api-Key': API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
    const json = await res.json().catch(() => ({}));
    console.log(`${res.status} T=${body.temperature} H=${body.humidity} flame=${body.flameDetected} servo=${body.servoAngle} ${body.systemStatus}${res.ok ? '' : ` -> ${json.message}`}`);
  } catch (err) {
    console.log(`send failed: ${err.message}`);
  }
}

console.log(`[SIMULATOR - synthetic data] ${DEVICE_ID}/${TRAY_CODE} scenario=${scenario} every ${INTERVAL} ms -> ${URL}`);
send();
setInterval(send, INTERVAL);
