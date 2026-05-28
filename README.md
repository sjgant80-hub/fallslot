# FallSlot

**Share a calendar link. Without the £2,400/year bill.**

One HTML file. Opens in any browser. Booker sees a clean booking page. Host sees their availability rules and the list of confirmed meetings. Every confirmed booking generates a proper `.ics` calendar invite.

**Live:** https://sjgant80-hub.github.io/fallslot/

---

## The grift it obsoletes

> **Calendly · 2026 pricing**
> - $10/user/mo Standard
> - $16/user/mo Teams (10-person team = **$2,400/year**)
> - **$15,000/year minimum** for Enterprise
> - SSO add-on: **+$36/user/year** (basic security, gated)
> - Renewal price hikes — top customer complaint

For sending a link to a calendar.

FallSlot does the same thing in 47 KB. £0/month. Your data on your device.

---

## What it does

| Tab | What you see |
|-----|-------------|
| 📅 Booking | The public page anyone with your link sees — pick a slot, fill name/email/notes, confirm |
| ⚙ Rules | Active days · start/end times · slot length · buffer · min notice · block dates |
| ✓ Booked | List of confirmed bookings · upcoming + past · download .ics anytime · cancel |
| 🔗 Share | Your bookable URL · copy · email signature · backup all data |

### How a booking works

1. You share your FallSlot URL (e.g. `sjgant80-hub.github.io/fallslot/`) in your email signature, LinkedIn, business card
2. Person opens it on their phone, picks a slot, fills name/email/notes
3. FallSlot:
   - Saves the booking to your device (localStorage)
   - Generates a proper `.ics` file (RFC 5545) — they download it to add to their calendar
   - Opens your mail client pre-filled to notify you (no third-party server)
   - Broadcasts the booking on `fall-signal` so other Fall* tools learn (KCC, FallForce, etc.)
4. You see it under the Booked tab. Download the .ics for your own calendar.

### What it does NOT do

- ❌ Sit on a server — there is no server
- ❌ Send transactional email on your behalf — your mail client handles host notifications
- ❌ Charge per user — there are no users, it's one HTML
- ❌ Send a Slack/Teams/Zoom link — paste the link in the event description; or fork and add it
- ❌ Integrate with Google Calendar live — that needs OAuth + server. Instead, the .ics file works with every calendar (Google, Apple, Outlook, anything)

This is the sovereign trade-off: no integrations magic, no server costs, but **your data stays on your phone and you pay nothing forever**.

---

## ƒ(build) gate · 14/14

```
□ 1  single HTML · works from file:// · sovereign        ✓ 47 KB
□ 2  <400KB                                              ✓ 12% used
□ 3  L1 FACE · 4 views (booking · rules · booked · share) ✓
□ 4  L2 SWARM · Ω + α slot generator + β ICS builder    ✓
□ 5  L3 CASCADE · T0 always · T3 optional               ✓
□ 6  L4 BLOOM · rule eval · slot scoring                 ✓
□ 7  L5 PERSIST · localStorage · JSON export            ✓
□ 8  L6 SKIN · dark + amber · mobile-first · big buttons ✓
□ 9  L7 ASS · "Pick a slot" empty state                 ✓
□ 10 Konomi licence shim · sovereign tier               ✓
□ 11 fall-signal · prime 263 · hello + booking broadcast ✓
□ 12 PWA manifest · standalone                          ✓
□ 13 README two-audience · MIT LICENSE                   ✓
□ 14 Pages live · responding 200                         ✓
```

---

## For developers

### Architecture

- **Single HTML** · 47 KB · no build · no deps
- **Vanilla JS** · no framework
- **localStorage** for rules + bookings + settings
- **BroadcastChannel** `fall-signal` (prime 263) · booking events broadcast to other Fall* tabs
- **postMessage API** for cross-tool query (e.g. FallForce reads available slots)

### postMessage API

```js
// from another Fall* tool
window.postMessage({ target: 'fallslot', action: 'available' }, '*');
// → { data: [{ date, label, slots: [{ iso, label, booked }] }] }

window.postMessage({ target: 'fallslot', action: 'bookings' }, '*');
// → { data: [{ id, slot, name, email, notes, duration }] }
```

### Customise & fork

```bash
gh repo fork sjgant80-hub/fallslot --clone=true
cd fallslot
# Update state.settings defaults · brand the booking page
gh repo edit --enable-pages --pages-branch main
```

### File responsibilities

```
fallslot/
├── index.html      · 47 KB · the deliverable
├── README.md       · this file
├── LICENSE         · MIT
├── .nojekyll       · Pages serves as-is
└── .gitignore
```

---

## Roadmap

- ✅ Availability rules · day-of-week toggle · time range · slot length · buffer
- ✅ Block specific dates (holidays, focus days)
- ✅ Public booking page · slot grid · selected slot form
- ✅ .ics generator (RFC 5545)
- ✅ Booked list · upcoming + past · cancel
- ✅ Share link · email signature copy · backup JSON
- ✅ fall-signal broadcast on booking
- ⬜ Multiple event types (15 min · 30 min · 60 min) per host
- ⬜ Team mode — round-robin or collective availability across multiple hosts (replaces Calendly Teams)
- ⬜ Reschedule / cancel link sent to booker (signed URL via Konomi keypair)
- ⬜ Webhook on booking — POST to user's own endpoint (Zapier-equivalent without Zapier)
- ⬜ Native Google Calendar / Outlook OAuth (optional, requires lightweight server)

---

## Licence

MIT · see [LICENSE](LICENSE). Use it, fork it, brand it, sell setup services.

---

## Credit

- **Architecture & build:** Simon Gant · [@sjgant80-hub](https://github.com/sjgant80-hub) · [LinkedIn](https://www.linkedin.com/in/simon-gant-295b56180/)

◊·κ=1 · share a calendar link without the $2,400 bill · sovereign · single HTML · your data your device
