/**
 * Registers a device (or rotates its key) and prints its API key ONCE.
 *
 *   npm run device:register -- <DEVICE_ID> <TRAY_CODE> ["Display name"]
 *   npm run device:register -- ESP32_TRAY_01 TRAY_01
 *
 * Put the printed key in the firmware as the X-Api-Key header. Only its hash is stored;
 * if it is lost, run this again to issue a new one (the old key stops working).
 */
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { registerDevice } from '../src/services/deviceService.js';

const [deviceId, trayCode, name] = process.argv.slice(2);
const CODE = /^[A-Za-z0-9_-]{1,40}$/;

if (!CODE.test(deviceId ?? '') || !CODE.test(trayCode ?? '')) {
  console.error('Usage: npm run device:register -- <DEVICE_ID> <TRAY_CODE> ["Display name"]');
  process.exit(1);
}

try {
  await connectDatabase();
  const { device, apiKey } = await registerDevice({ deviceId, trayCode, name });
  console.log(`\nDevice ${device.deviceId} -> tray ${device.trayCode}`);
  console.log(`X-Api-Key: ${apiKey}\n`);
  console.log('Shown once. Store it in the firmware; it cannot be recovered (re-run to rotate).');
} catch (err) {
  console.error('Registration failed:', err.message);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
  await mongoose.disconnect();
}
