import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { startMatchLoop } from './BackendManager';

const manager = new BleManager();

// CONFIGURATION
const SERVICE_UUID = '12345678-1234-5678-1234-56789abc0001';

// ADD AUTH TO MOSAICID
let mosaicID = `1`;
let initialized = false;
let scanSubscription = null;

/**
 * Returns the local device's mosaic ID.
 */
export const getMosaicID = () => mosaicID;

/**
 * Initialize BLE: request permissions and start advertising + match loop.
 * Safe to call multiple times — only runs once.
 */
export const initBLE = async () => {
  if (initialized) return;
  initialized = true;

  if (Platform.OS === 'android') {
    try {
      if (Platform.Version >= 31) {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);
      } else {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
      }
    } catch (error) {
      console.warn('[BLE] Permission request error:', error);
    }
  }

  // Wait for BLE to be powered on
  await new Promise((resolve) => {
    const sub = manager.onStateChange((state) => {
      if (state === 'PoweredOn') {
        sub.remove();
        resolve();
      }
    }, true);
  });

  console.log(`[BLE] Powered on. Mosaic ID: ${mosaicID}`);

  // Automatically start the scan → match loop on app load
  startMatchLoop()
    .then((matchedUser) => {
      console.log(`[BLE] Final match found: ${matchedUser}`);
    })
    .catch((err) => {
      console.error('[BLE] Match loop error:', err);
    });
};

/**
 * Start a BLE scan. Returns a Promise that resolves with the first
 * found user's ID string (from the device's local name).
 *
 * This is a low-level primitive — use BackendManager.startMatchLoop()
 * for the full scan-check-resume flow.
 */
export const startScan = () => {
  return new Promise((resolve, reject) => {
    // Clean up any previous scan
    if (scanSubscription) {
      manager.stopDeviceScan();
      scanSubscription = null;
    }

    try {
      manager.startDeviceScan(
        [SERVICE_UUID],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            console.error('[Scanner] Error:', error);
            reject(error);
            return;
          }

          const foundName = device.localName || device.name;

          if (foundName && foundName !== mosaicID) {
            manager.stopDeviceScan();
            scanSubscription = null;
            console.log('[Scanner] Stopped — user found:', foundName);
            resolve(foundName);
          }
        },
      );
      scanSubscription = true;
      console.log('[Scanner] Scanning started...');
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Stop BLE scanning.
 */
export const stopScan = async () => {
  manager.stopDeviceScan();
  scanSubscription = null;
  console.log('[Scanner] Stopped');
};

/**
 * Stop all BLE activity.
 */
export const stopBLE = async () => {
  await stopScan();
  manager.destroy();
  console.log('[BLE] Stopped all activity');
};