// booking.test.mjs — PROOF-OF-PLAY for the guard that stops two people booking one slot.
import { overlaps, conflictOf, canBook, addBooking, existingClashes, timeOf, lengthOf } from './booking.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ✓ ' : '  ✗ FAIL ') + m); };

const T = (h, m = 0) => new Date(Date.UTC(2026, 7, 20, h, m)).toISOString();
const NOW = Date.parse(T(9));
const at = (h, m, dur = 30, extra = {}) => ({ id: `b${h}${m}`, slot: T(h, m), duration: dur, ...extra });

console.log('\n=== §1 · ⚑ OVERLAP IS NOT EQUALITY ===');
{
  ok(overlaps(at(10, 0, 30), at(10, 0, 30)) === true, 'the same slot twice collides');
  ok(overlaps(at(10, 0, 60), at(10, 30, 30)) === true,
     '⚑ a 60-minute booking at 10:00 collides with one at 10:30 — the old check compared start times and missed this entirely');
  ok(overlaps(at(10, 30, 30), at(10, 0, 60)) === true, 'and it collides the other way round');
  ok(overlaps(at(10, 0, 30), at(11, 0, 30)) === false, 'an hour apart does not collide');

  ok(overlaps(at(10, 0, 30), at(10, 30, 30)) === false,
     '⚑ BACK-TO-BACK IS FINE — ending at 10:30 does not clash with starting at 10:30, or a day could never be filled');
  ok(overlaps(at(10, 0, 31), at(10, 30, 30)) === true, 'but one minute of overlap does clash');

  ok(overlaps(at(10, 0, 120), at(10, 45, 15)) === true, 'a long booking swallows a short one inside it');
  ok(overlaps(null, at(10, 0)) === false && overlaps(at(10, 0), null) === false, 'nothing collides with nothing');
  ok(overlaps({ slot: 'not a time', duration: 30 }, at(10, 0)) === false, 'an unreadable time collides with nothing');
  ok(overlaps({ slot: T(10), duration: 0 }, at(10, 0)) === false, 'nor does a zero-length booking');
}

console.log('\n=== §2 · ⚑ THE DOUBLE BOOK IS REFUSED ===');
{
  const held = [at(10, 0, 30)];
  const again = canBook(held, { slot: T(10, 0), duration: 30 }, {}, NOW);
  ok(again.ok === false, '⚑ booking a slot that is already taken is REFUSED — the old code just pushed it');
  ok(/just been taken/.test(again.reason), 'and says so in words a person waiting on a page understands');
  ok(again.conflict && again.conflict.id === 'b100', 'the clashing booking is named, not just denied');

  ok(canBook(held, { slot: T(11, 0), duration: 30 }, {}, NOW).ok === true, 'a free slot is allowed');
  ok(canBook(held, { slot: T(10, 30), duration: 30 }, {}, NOW).ok === true, 'and so is the slot straight after');
}

console.log('\n=== §3 · time itself ===');
{
  ok(canBook([], { slot: T(8, 0), duration: 30 }, {}, NOW).ok === false, 'the past cannot be booked');
  ok(/already passed/.test(canBook([], { slot: T(8), duration: 30 }, {}, NOW).reason), 'and it says why');
  ok(canBook([], { slot: T(9, 0), duration: 30 }, {}, NOW).ok === true, 'this very moment is still bookable');

  ok(canBook([], { slot: 'tuesday-ish', duration: 30 }, {}, NOW).ok === false, 'a time that is not a time is refused');
  ok(canBook([], { slot: T(10), duration: 0 }, {}, NOW).ok === false, 'so is a booking with no length');
  ok(canBook([], { slot: T(10), duration: 30 }, {}, 'broken').ok === false,
     '⚑ an unreadable CLOCK refuses everything — guessing the time would be guessing whether a slot is free');
}

console.log('\n=== §4 · the host’s own rules ===');
{
  const rules = { minNoticeMins: 120, maxAheadDays: 7 };
  ok(canBook([], { slot: T(10, 0), duration: 30 }, rules, NOW).ok === false, 'an hour away breaks a two-hour notice rule');
  ok(/2 hours|120 minutes/.test(canBook([], { slot: T(10), duration: 30 }, rules, NOW).reason), 'and the rule is quoted back');
  ok(canBook([], { slot: T(11, 0), duration: 30 }, rules, NOW).ok === true, 'exactly two hours away is allowed');

  const far = new Date(NOW + 8 * 24 * 3600000).toISOString();
  ok(canBook([], { slot: far, duration: 30 }, rules, NOW).ok === false, 'eight days ahead breaks a seven-day limit');
  const near = new Date(NOW + 6 * 24 * 3600000).toISOString();
  ok(canBook([], { slot: near, duration: 30 }, rules, NOW).ok === true, 'six days ahead is fine');

  ok(canBook([], { slot: T(10), duration: 30 }, {}, NOW).ok === true,
     '⚑ a rule that is not set does not forbid — a missing setting must never silently refuse everybody');
  ok(canBook([], { slot: T(10), duration: 30 }, null, NOW).ok === true, 'and neither does no rules object at all');
}

console.log('\n=== §5 · cancelling and rescheduling ===');
{
  const held = [at(10, 0, 30, { cancelled: true })];
  ok(canBook(held, { slot: T(10, 0), duration: 30 }, {}, NOW).ok === true,
     'a cancelled booking frees its slot');

  const mine = [at(10, 0, 30)];
  ok(canBook(mine, { id: 'b100', slot: T(10, 0), duration: 60 }, {}, NOW).ok === true,
     '⚑ a booking does not clash with ITSELF — otherwise nothing could ever be rescheduled');
  ok(canBook(mine, { id: 'other', slot: T(10, 0), duration: 60 }, {}, NOW).ok === false, 'but somebody else still clashes');
}

console.log('\n=== §6 · ⚑ THE ONLY SAFE WAY TO ADD ONE ===');
{
  const held = [at(10, 0, 30)];
  const good = addBooking(held, { id: 'new', slot: T(11, 0), duration: 30 }, {}, NOW);
  ok(good.ok === true && good.bookings.length === 2, 'a free slot is added');
  ok(held.length === 1, '⚑ and the original list is NOT mutated — an audit of what was booked must not shift underfoot');

  const bad = addBooking(held, { id: 'clash', slot: T(10, 0), duration: 30 }, {}, NOW);
  ok(bad.ok === false && bad.bookings.length === 1, 'a clashing slot is refused and nothing is added');
  ok(bad.conflict !== null, 'and the clash is handed back');
  ok(addBooking(null, { slot: T(11), duration: 30 }, {}, NOW).ok === true, 'no list at all still works');
}

console.log('\n=== §7 · clashes that were written before the guard existed ===');
{
  const messy = [at(10, 0, 60), at(10, 30, 30), at(12, 0, 30)];
  const found = existingClashes(messy);
  ok(found.length === 1, '⚑ a guard added today does not clean up yesterday — the host is TOLD what already collides');
  ok(found[0][0].id === 'b100' && found[0][1].id === 'b1030', 'and both sides of the collision are named');
  ok(existingClashes([at(10, 0), at(11, 0)]).length === 0, 'a clean diary reports nothing');
  ok(existingClashes([at(10, 0, 60, { cancelled: true }), at(10, 30, 30)]).length === 0, 'cancelled bookings do not count');
  ok(existingClashes(null).length === 0, 'garbage has no clashes');
}

console.log('\n=== §9 · both sides of every edge ===');
{
  // Back-to-back, checked from BOTH directions. One direction alone leaves half the overlap test
  // unpinned, and half a guard is not a guard.
  ok(overlaps(at(10, 30, 30), at(10, 0, 30)) === false,
     '⚑ starting at 10:30 does not clash with one that ENDED at 10:30, whichever way round they are asked');
  ok(overlaps(at(10, 30, 30), at(10, 0, 31)) === true, 'and one minute of overlap clashes from that side too');

  // The null guard, one argument at a time — a guard that only holds when BOTH sides are broken is
  // no guard at all.
  ok(overlaps(at(10, 0), { slot: 'not a time', duration: 30 }) === false, 'an unreadable time on the SECOND side collides with nothing');
  ok(overlaps(at(10, 0), { slot: T(10), duration: 0 }) === false, 'nor does a zero-length booking on the second side');
  ok(overlaps({ slot: T(10), duration: 30 }, { duration: 30 }) === false, 'a booking with no time at all collides with nothing');

  // ⚑ A MISSING DURATION IS NOT A ZERO-LENGTH ONE. Without the guard, a booking with a real start
  // and no length is treated as instantaneous, and an existing booking that STARTED earlier and is
  // still running reads as a collision — arithmetic on a missing number quietly inventing an answer.
  ok(overlaps({ slot: T(10, 30), duration: null }, at(10, 0, 60)) === false,
     '⚑ a booking with no length collides with nothing, even sitting inside a longer one');
  ok(overlaps(at(10, 0, 60), { slot: T(10, 30), duration: null }) === false, 'and the same the other way round');

  // The exact edge of the how-far-ahead rule.
  const rules = { minNoticeMins: 120, maxAheadDays: 7 };
  const exactly7 = new Date(NOW + 7 * 24 * 3600000).toISOString();
  ok(canBook([], { slot: exactly7, duration: 30 }, rules, NOW).ok === true,
     '⚑ exactly seven days ahead is INSIDE a seven-day limit — the boundary belongs to the person booking');
  const justOver = new Date(NOW + 7 * 24 * 3600000 + 60000).toISOString();
  ok(canBook([], { slot: justOver, duration: 30 }, rules, NOW).ok === false, 'and a minute past it is not');
}

console.log('\n=== §8 · pure under garbage ===');
{
  const junk = [null, undefined, '', 0, [], {}, NaN, 'x', [null], [{}]];
  let threw = null;
  for (const j of junk) {
    try { overlaps(j, j); conflictOf(j, j, j); canBook(j, j, j, j); addBooking(j, j, j, j); existingClashes(j); timeOf(j); lengthOf(j); }
    catch (e) { threw = `${JSON.stringify(j)} → ${e.message}`; }
  }
  ok(threw === null, 'no input throws' + (threw ? ' — ' + threw : ''));
  ok(canBook([], {}, {}, NOW).ok === false, '⚑ and an empty candidate is refused, never booked by default');
}

console.log(`\n${fail === 0 ? '✓ ALL PASS' : '✗ FAILURES'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
