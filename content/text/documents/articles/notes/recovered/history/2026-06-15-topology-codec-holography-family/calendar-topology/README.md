# @561-group/calendar-topology

Calendar mathematics as a carrier. Zero runtime dependencies.

The carrier is Z, the integers read as days (day 0 = 1970-01-01, proleptic
Gregorian). Everything calendrical is structure on that line:

- **iso-date** — the civil chart (year, month, day) ↔ day number, mutually
  inverse bijections in pure integer arithmetic (Hinnant's civil algorithms;
  no Date object, no timezone). `addDays` is the translation action,
  `dayOfWeek` the quotient Z → Z7, and the
  `weekdayOnOrAfter` / `weekdayOnOrBefore` family the retractions onto a
  weekday's fiber.
- **computus** — Gregorian Easter as a total function of the year (the
  Anonymous Gregorian algorithm, Meeus–Jones–Butcher). Tests pin the known
  dates 1943–2030 and verify the classical law: always a Sunday, always
  within March 22 – April 25.
- **cycles** — calendrical residues: the golden number (the year's 1-based
  Metonic residue), day of year, and the ISO 8601 week coordinate.
- **feast** — a feast is nothing but a rule assigning a date to each year: a
  fixed (month, day) or an (anchor, offset) pair anchored to the computus.
  `feastDate` is the resolver. Calendar mathematics only — church content
  lives in `@561-group/liturgy-topology`.

The only throw anywhere is TypeError for malformed shapes; every reading is
total on valid input.

```ts
import { easterDate, addDays, dayOfWeek, movableFeast, feastDate } from "@561-group/calendar-topology";

const easter = easterDate(2026); // "2026-04-05"
const pentecost = feastDate(movableFeast(49), 2026); // "2026-05-24"
const weekday = dayOfWeek(addDays(easter, 39)); // "thursday" (Ascension)
```
