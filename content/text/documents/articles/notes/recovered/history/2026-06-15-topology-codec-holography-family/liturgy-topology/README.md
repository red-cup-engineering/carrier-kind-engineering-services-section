# @561-group/liturgy-topology

Liturgical calendars and lectionaries as structure over
`@561-group/calendar-topology` (its only dependency).

- **vocabulary** — a Season is a named closed interval of the liturgical
  year; an ObservanceRank the standard grading (solemnity, feast, memorial,
  …); a LiturgicalDay a date with its season coordinate, witnessed
  observances, and lectionary cycle identifiers.
- **roman** — the General Roman Calendar: the seven seasons (Advent through
  Ordinary Time after Pentecost) as an exact partition of the liturgical
  year, computable for any year from the computus and the Advent retraction.
  `romanDay` is the chart date → LiturgicalDay; Ordinary Time after
  Pentecost is numbered backward from Christ the King (week 34), as the
  calendar itself does. Day-granularity simplifications (where Lent ends,
  where the Triduum closes) are stated in the module head, not hidden.
- **rcl** — the Revised Common Lectionary's cycle structure. The A/B/C rule:
  the cycle letter is the advent year mod 3, with advent years divisible by
  3 beginning Year A (anchors: Advent 2016 and Advent 2025 both began
  Year A). Proper numbers for Sundays after Pentecost are read off
  seven-day civil windows (Proper 4 = the Sunday between May 29 and
  June 4). `dailyRelation` reads the daily lectionary's structure:
  Thursday–Saturday prepare the coming Sunday, Monday–Wednesday reflect on
  the previous.
- **lectionary-data** — reading tables are data, with provenance on every
  entry: Year A Sunday propers for June–July 2026 and daily readings for
  June 2026, all transcribed from the Vanderbilt Divinity Library's online
  RCL. Nothing is composed from memory; coverage limits are stated in the
  module head.
- **lection** — `lectionFor(date, tradition)` returns the entry or a typed
  "no entry recorded" outcome — absence is a statement about the recorded
  tables, reported honestly, never a throw and never a null surprise.

```ts
import { romanDay, rclYear, properOfSunday, lectionFor } from "@561-group/liturgy-topology";

const day = romanDay("2026-06-11"); // ordinary-time-ii, week 10, cycles A/II
const cycle = rclYear("2026-06-11"); // "A"
const proper = properOfSunday("2026-06-14"); // { kind: "proper", proper: 6, ordinaryTimeSunday: 11 }
const lection = lectionFor("2026-06-14", "rcl"); // { outcome: "found", entry: … }
```
