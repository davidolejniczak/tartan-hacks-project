import { NativeModules, NativeEventEmitter } from 'react-native';
import BleManager from 'react-native-ble-manager';
import BlePeripheral from 'react-native-ble-peripheral';
import { startMatchLoop } from './BackendManager';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// CONFIGURATION
const SERVICE_UUID = '12345678-1234-5678-1234-56789abc0001';

// ADD AUTH TO MOSAICID 
let myID = `User-${Math.floor(Math.random() * 10000)}`;
let initialized = false;
let activeListener = null;

/**
 * Returns the local device's user ID.
 */
export const getMyID = () => myID;

/**
 * Initialize BLE and start advertising.
 * Safe to call multiple times — only runs once.
 */
export const initBLE = async () => {
  if (initialized) return;
  initialized = true;

  await BleManager.start({ showAlert: false });

  BlePeripheral.setName(myID);
  BlePeripheral.addService(SERVICE_UUID, true);

  try {
    await BlePeripheral.start();
    console.log(`[Advertiser] Started. Broadcasting: ${myID}`);
  } catch (error) {
    console.log('[Advertiser] Error:', error);
  }

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
 * found user's ID string. Scanning stops as soon as one is found.
 *
 * This is a low-level primitive — use BackendManager.startMatchLoop()
 * for the full scan-check-resume flow.
 *
 * Usage:
 *   const foundUserID = await startScan();
 */
export const startScan = () => {
  return new Promise((resolve, reject) => {
    // Clean up any previous listener
    if (activeListener) {
      activeListener.remove();
      activeListener = null;
    }

    activeListener = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      (peripheral) => {
        const foundName = peripheral.name;

        if (foundName && foundName.startsWith('User-') && foundName !== myID) {
          BleManager.stopScan()
            .then(() => {
              console.log('[Scanner] Stopped — user found:', foundName);
              if (activeListener) {
                activeListener.remove();
                activeListener = null;
              }
              resolve(foundName);
            })
            .catch(reject);
        }
      }
    );

    BleManager.scan([SERVICE_UUID], 0, true)
      .then(() => console.log('[Scanner] Scanning started...'))
      .catch((err) => {
        if (activeListener) {
          activeListener.remove();
          activeListener = null;
        }
        reject(err);
      });
  });
};

/**
 * Stop BLE scanning.
 */
export const stopScan = async () => {
  if (activeListener) {
    activeListener.remove();
    activeListener = null;
  }
  await BleManager.stopScan();
  console.log('[Scanner] Stopped');
};

/**
 * Stop all BLE activity (scanning + advertising).
 */
export const stopBLE = async () => {
  await stopScan();
  await BlePeripheral.stop();
  console.log('[BLE] Stopped all activity');
};