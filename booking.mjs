// booking.mjs — you cannot be in two places at once.
//
// ⚑ WHAT WAS MISSING. fallslot marked a taken slot as booked IN THE UI and then never checked again.
// confirmBooking() read the selected slot and pushed it onto the list — no test that it was still
// free, still in the future, or still inside the host's own rules. Two people on the page at the same
// time both saw a free slot and both booked it. For a tool whose entire job is booking, the
// double-booking guard is the product.
//
// ⚑ AND EQUALITY IS NOT OVERLAP. The only thing resembling a check compared start times exactly
// on start time alone. Change the slot length from 30 minutes to 60 and an existing 10:00 booking
// no longer blocks a new one at 10:30 — they collide for half an hour and nothing notices. Two
// meetings overlap when one starts before the other ends, which is a comparison of intervals.
//
// Pure: no clock, no storage. The caller passes `now`.

export const MINUTE = 60000;

/**
 * Milliseconds, or null when it is not a usable time.
 *
 * ⚑ A NUMBER IS A TIME. The first version stringified everything and handed it to Date.parse, so a
 * plain `Date.now()` — the single most likely thing a caller passes — came back NaN and every
 * booking was refused for having an unreadable clock. Refusing everything is not a safe default; it
 * is a different bug wearing a safe-looking coat.
 */
export function timeOf(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const t = Date.parse(String(value));
  return Number.isFinite(t) ? t : null;
}

/** Minutes, or null. A booking with no length is not a booking. */
export function lengthOf(minutes) {
  const n = Number(minutes);
  return (Number.isFinite(n) && n > 0) ? n : null;
}

/**
 * Do two bookings collide?
 *
 * Half-open intervals: a meeting that ends at 10:30 does NOT clash with one starting at 10:30.
 * Back-to-back is the normal case and must stay bookable, or a full day can never be filled.
 */
export function overlaps(a, b) {
  const aStart = timeOf(a && a.slot), bStart = timeOf(b && b.slot);
  const aLen = lengthOf(a && a.duration), bLen = lengthOf(b && b.duration);
  if (aStart === null || bStart === null || aLen === null || bLen === null) return false;
  return aStart < bStart + bLen * MINUTE && bStart < aStart + aLen * MINUTE;
}

/**
 * The FIRST existing booking a candidate collides with, or null.
 *
 * Returns the booking itself rather than a boolean so the caller can say who it clashes with — "that
 * time has gone" is useless to a host looking at their own calendar.
 */
export function conflictOf(bookings, candidate, opts) {
  const o = (opts && typeof opts === 'object') ? opts : {};
  const list = Array.isArray(bookings) ? bookings : [];
  const skip = o.ignoreId;
  for (const b of list) {
    if (!b || typeof b !== 'object') continue;
    if (skip != null && b.id === skip) continue;      // rescheduling must not clash with itself
    if (b.cancelled === true) continue;               // a cancelled slot is free again
    if (overlaps(b, candidate)) return b;
  }
  return null;
}

/**
 * Everything that must be true before a booking is written.
 *
 * Returns a reason, never a bare false: a person told "no" and not told why will try again.
 */
export function canBook(bookings, candidate, rules, now) {
  const c = (candidate && typeof candidate === 'object') ? candidate : {};
  const r = (rules && typeof rules === 'object') ? rules : {};
  const t = timeOf(now);
  const start = timeOf(c.slot);
  const len = lengthOf(c.duration);

  if (start === null) return { ok: false, reason: 'that is not a real time' };
  if (len === null) return { ok: false, reason: 'a booking needs a length' };
  if (t === null) return { ok: false, reason: 'the clock is unreadable, so nothing can be booked safely' };

  if (start < t) return { ok: false, reason: 'that time has already passed' };

  // The host's own rules. Absent means unrestricted — a missing setting must not silently forbid.
  const notice = lengthOf(r.minNoticeMins);
  if (notice !== null && start < t + notice * MINUTE) {
    return { ok: false, reason: `bookings need at least ${notice} minutes' notice` };
  }
  const ahead = lengthOf(r.maxAheadDays);
  if (ahead !== null && start > t + ahead * 24 * 60 * MINUTE) {
    return { ok: false, reason: `bookings can only be made ${ahead} days ahead` };
  }

  const clash = conflictOf(bookings, { slot: start, duration: len }, { ignoreId: c.id });
  if (clash) {
    return { ok: false, reason: 'that slot has just been taken', conflict: clash };
  }
  return { ok: true, reason: 'free' };
}

/**
 * ⚑ THE ONLY SAFE WAY TO ADD ONE. Returns a NEW list, or refuses. Callers that push directly are how
 * the guard gets bypassed six months later by somebody who did not know it existed.
 */
export function addBooking(bookings, candidate, rules, now) {
  const check = canBook(bookings, candidate, rules, now);
  if (!check.ok) return { ok: false, reason: check.reason, conflict: check.conflict || null, bookings: Array.isArray(bookings) ? bookings : [] };
  return { ok: true, reason: 'booked', bookings: [...(Array.isArray(bookings) ? bookings : []), candidate] };
}

/**
 * Every collision already sitting in a list.
 *
 * A guard added today does not clean up what was written before it existed, and a host deserves to
 * be told rather than left to find out when two people arrive.
 */
export function existingClashes(bookings) {
  const list = (Array.isArray(bookings) ? bookings : []).filter(b => b && typeof b === 'object' && b.cancelled !== true);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (overlaps(list[i], list[j])) out.push([list[i], list[j]]);
    }
  }
  return out;
}

export default { MINUTE, timeOf, lengthOf, overlaps, conflictOf, canBook, addBooking, existingClashes };
