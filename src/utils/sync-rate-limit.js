// Create a map to track last sync times per channelId
const lastSyncMap = new Map();

/**
 * Checks if sync should be triggered for the given channelId.
 * @param {string} channelId - The channel identifier.
 * @returns {boolean} - Returns true if 2 minutes have passed since last sync or if no sync has been recorded.
 */
function shouldTriggerSync(channelId) {
  const now = Date.now(); // current time in ms
  const twoMinutes = 2 * 60 * 1000; // 2 minutes in ms

  const lastSyncTime = lastSyncMap.get(channelId);
  if (!lastSyncTime || now - lastSyncTime >= twoMinutes) {
    // Update the map with the current timestamp
    lastSyncMap.set(channelId, now);
    return true;
  }
  return false;
}
module.exports = shouldTriggerSync
