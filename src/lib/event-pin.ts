/**
 * Event PIN security helpers.
 * Stores PIN in localStorage and tracks unlocked session in sessionStorage.
 */

const PIN_PREFIX = "parkir:pin:";
const UNLOCKED_PREFIX = "parkir:unlocked:";

export function getEventPin(eventId: string): string | null {
  try {
    return window.localStorage.getItem(PIN_PREFIX + eventId);
  } catch {
    return null;
  }
}

export function setEventPin(eventId: string, pin: string): void {
  try {
    window.localStorage.setItem(PIN_PREFIX + eventId, pin.trim());
  } catch {}
}

export function hasEventPin(eventId: string): boolean {
  return !!getEventPin(eventId);
}

export function isEventUnlocked(eventId: string): boolean {
  try {
    const pin = getEventPin(eventId);
    if (!pin) return false;
    return window.sessionStorage.getItem(UNLOCKED_PREFIX + eventId) === "true";
  } catch {
    return false;
  }
}

export function unlockEvent(eventId: string, enteredPin: string): boolean {
  const pin = getEventPin(eventId);
  if (pin && pin === enteredPin.trim()) {
    try {
      window.sessionStorage.setItem(UNLOCKED_PREFIX + eventId, "true");
    } catch {}
    return true;
  }
  return false;
}

export function lockEvent(eventId: string): void {
  try {
    window.sessionStorage.removeItem(UNLOCKED_PREFIX + eventId);
  } catch {}
}
