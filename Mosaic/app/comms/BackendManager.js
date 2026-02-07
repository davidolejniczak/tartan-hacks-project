import { getMyID, startScan, stopScan } from './DualModeMesh';

const BACKEND_URL = 'http://localhost:8000';

let scanning = true; // on by default when the app opens
let onMatchCallback = null;

/**
 * Returns whether the manager is actively scanning.
 */
export const isScanningActive = () => scanning;

/**
 * Start the scan-and-match loop.
 * Continuously scans for nearby users via BLE. When one is found,
 * sends it to the backend for validation:
 *   - "badmatch" → automatically resumes scanning
 *   - "match"    → stops scanning and resolves the returned Promise
 *
 * Returns a Promise<string> that resolves with the matched user's ID.
 *
 * Usage:
 *   const matchedUser = await startMatchLoop();
 *   console.log('Matched:', matchedUser);
 */
export const startMatchLoop = () => {
  return new Promise((resolve) => {
    onMatchCallback = resolve;
    scanning = true;
    scanOnce();
  });
};

/**
 * Internal: run a single scan pass. When a user is found, check with
 * the backend. If badmatch, call scanOnce again. If match, resolve.
 */
const scanOnce = async () => {
  if (!scanning) return;

  try {
    const foundUser = await startScan();

    console.log('[BackendManager] User found:', foundUser, '— checking with backend...');

    const matchResult = await checkMatch(foundUser, 0);

    if (matchResult === 'badmatch') {
      console.log('[BackendManager] Bad match for', foundUser, '— continuing scan...');
      // Loop: scan again
      scanOnce();
    } else {
      // Good match — stop everything and notify caller
      console.log('[BackendManager] Good match:', foundUser);
      scanning = false;
      if (onMatchCallback) {
        onMatchCallback(foundUser);
        onMatchCallback = null;
      }
    }
  } catch (err) {
    console.error('[BackendManager] Scan error:', err);
    // On error, retry after a short delay
    if (scanning) {
      setTimeout(scanOnce, 1000);
    }
  }
};

/**
 * Send a found user to the backend and return the match result.
 * @param {string} foundUser - The discovered user's ID
 * @param {number} rssi - Signal strength
 * @returns {Promise<string>} "match" or "badmatch"
 */
const checkMatch = async (foundUser, rssi) => {
  const myID = getMyID();

  const response = await fetch(`${BACKEND_URL}/user_found`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ finder: myID, found: foundUser, rssi }),
  });

  const data = await response.json();
  return data.match; // "match" or "badmatch"
};

/**
 * Stop the match loop. Scanning will not resume until startMatchLoop
 * is called again.
 */
export const stopMatchLoop = async () => {
  scanning = false;
  onMatchCallback = null;
  await stopScan();
  console.log('[BackendManager] Match loop stopped');
};

/**
 * Resume the match loop after it was stopped.
 * Returns a Promise<string> that resolves on the next good match.
 */
export const resumeMatchLoop = () => {
  if (scanning) {
    return new Promise((resolve) => {
      onMatchCallback = resolve;
    });
  }
  return startMatchLoop();
};
