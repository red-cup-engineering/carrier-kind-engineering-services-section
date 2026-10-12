---
title: "Note on the Kalshi desk in production, 2026-10-10"
date-created: 2026-10-10
description: "What the Kalshi desk on Cold Red Gate holds, earns and does as of 2026-10-10 19:00Z, why it places no orders, why its forecast cycle overruns, and the debts that follow, in causal order."
keywords:
  - kalshi
  - desk
  - forecast-edge
  - weather-engine
  - cold-red-gate
provenance:
  authors:
    - emsenn
  office: Red Cup Engineer Senior
  observed: 2026-10-10T18:40Z..19:10Z, read-only, from the host's ledger, job records, journal and the venue's own account reads
  realizes:
    - kalshi-one-system-for-more-and-better-predictions
    - kalshi-trading-on-determined-outcomes
---

The desk's aim is the largest long-run growth of the account that the Group's evidence supports. A gate that stops a trade without evidence that the trade loses is a defect. The requirements PF-1..PF-10 and CN-1..CN-12 in `561-group-financial-services-section/.../notes/2026/10/09/2026-10-09-note-on-the-kalshi-proven-false-lane.md` remain the requirements; this note states the system's current state against them.

## The account

- Cash USD 47.79, equity USD 47.79, no open position.
- Funding: USD 25.00 on 2026-10-03 and one deposit of about USD 49 on 2026-10-08 between 04:18Z and 07:01Z. USD 74 in, nothing out.
- 26 markets settled: 20 won, 6 lost. Fees paid USD 0.76. Net result USD -26.20.
- Each order is attributed by its `client_order_id`:

| Origin | Won / lost | Net |
| --- | --- | --- |
| The desk (`kd-`): forecast-edge USD 1.02, weather-tail-premium USD 0.61 | 5 / 0 | **USD +1.63** |
| The retired v1 desk (`wd-`, 2026-10-03..05) | 1 / 1 | USD -5.67 |
| The Leader's manual trades (no client id) | 14 / 5 | USD -22.16 |

- The losses: KXHIGHTTTN-26OCT08-B74.5 USD -19.99 (manual, 24 NO bought near 82c, settled YES); KXHIGHLAX-26OCT05-B101.5 USD -5.73 (v1 desk sold YES tails at 4-6c on model p 0.002 during the heat wave); KXLOWTLAX-26OCT07-B70.5 USD -2.99, KXHIGHTTTN-26OCT08-B76.5 USD -2.00 and two KXHIGHTOKC brackets USD -0.99 each (manual).
- The daily review's lane `unowned` is the manual trades plus the v1 loss.

## Why the desk places no orders

- **forecast-edge** (0 targets). The observation sweep finds no bracket that observation has decided and the book still misprices. It loses stations to api.weather.gov 503s (194 on 2026-10-10). The forecast surface is dropped as stale whenever the forecast cycle overruns, and when fresh it admits no model: all 60 of its contracts are observation bounds.
- **weather-tail-premium** (paused in the running release). The released pause counts temperature NO positions that settled YES in 30 days across the whole account, so the v1 LAX loss and three manual trades pause it although the lane's own record is 3 won, 0 lost. Pull request 57 gives every lane's `pausedFor` only the desk's settlements (`readAccount` `deskSettlements`, the filter the desk-wide halt uses); the lane resumes when Cold Red Gate runs it.
- **daily-rain** (65 targets, 0 certified): 42 lie outside the day-before decision window, 7 have no ask, 3 are neither a certified tail nor a favourite, 4 lack a declared city or settled history. Favourites are sized on a 5.5% upper-bound loss rate.
- **published-series-favorites** is at fraction 0 and is not surveyed (`apps/kalshi-desk.mjs:86`); it filled 0 of 33 resting orders.
- The ledger records 2,435 "too many requests" errors, 210 NWS observation failures and 29 fetch failures.

## The forecast cycle

- `kalshi-forecast` runs every 900 s with a limit of 840 s. Since 2026-10-08: 239 runs, 186 completed, 50 timed out, 3 failed. Timeouts rose from 8 of 96 runs on 2026-10-09 to 27 of 75 on 2026-10-10. The 18:45Z run failed with ENOSPC.
- Stage order (`services/forecasting-service/src/weather-engine.mjs:303-346`): score settled forecasts, discover series, collect evidence, update station science, run the per-contract models, then write `pending.json`, `latest.json` and `surface.json`. The surface the desk trades is written last, so an overrun loses it. The desk drops a surface older than 20 minutes.
- Station science (`src/station-weather-science.mjs:82`, `:119`) reads and rewrites a 95 MB `state.json` every cycle; it holds 23,291 pending entries kept 72 hours (`:100`). That stage took 3.7 minutes in a good run.
- Scoring (`weather-engine.mjs:198-202`) streams the 144 MB `resolved.jsonl` three times per cycle and reads 6,308 score files.
- The job runs at idle CPU and IO priority (`node-job.mjs:295`) on a host with 1 CPU, 1.6 GB RAM, 2.2-2.8 GB swap in use and load 6-11, beside FeltOS (420 MB), Guix builds, GitHub runners, a Chromium/Xvfb studio and rclone moving `weather/scores` to R2 while the cycle reads it.
- The evidence archive grows about 4 MB a cycle, and killed runs leave `pending.json.<pid>.tmp` files of 16-62 MB. The host disk is 92-95% full.

## The learning loop

- `reviews/judgments.json` is read every cycle (`apps/kalshi-desk.mjs:63-68`), so the daily review changes what the desk trades. It needs 30 settled positions per lane; the lanes hold 2, 3 and 0.
- Loss rates are constants in `content/config/kalshi-lane-expectations.json`; settlements never update them. A falsified lane stays at 0 until the base policy changes. A desk-wide halt needs a manual re-arm: the halts of 2026-10-04, 10-05 and 10-07 cost about 3.5 of the desk's first 8 days.
- The hypothesis engine has no job and no state directory; it has produced nothing.
- Every model in `weather/grades.json` is unadmitted. Pooled Brier against the market mid is 0.03-0.10 worse over 3-4 dates, a gap large enough to point at a systematic error (bias, rounding, or the climate-day boundary) as well as at weak models.
- Kalshi settles highs and lows on the NWS climate day, midnight to midnight local standard time (01:00 to 01:00 local daylight time until 2026-11-01). Whether `forecast-edge.mjs` (`localDate(timeZone, now)`) and the observation windows use the standard-time day is not yet tested.

## Fees and sizing

- The fee code is correct: taker `ceil(0.07 × multiplier × C × P(1-P))` with the multiplier read from `/series`, no maker fee on the plain quadratic series (231 of 237 sampled), a YES sell priced as a NO buy, no fee at settlement. Kalshi rebates whole-cent rounding across the fills of one order (https://docs.kalshi.com/getting_started/fee_rounding); the code rounds per order, which is exact for single fills and at most 1c high otherwise. Exact fees per contract: 0.27c at 96c, 0.20c at 97c, 0.14c at 98c, 0.07c at 99c. A one-contract order always pays 1c.
- Policy v11 sizes by full Kelly at the posterior-mean loss rate, lane fractions 1/1/1 (favourites 0), 0.5 of equity per event, 1.0 per date and open, an equity floor of USD 5. On 2026-10-09 it staked 0.867 of a USD 25 account on one 3c bracket. At 98c with a 0.4% loss rate Kelly asks about 80% of equity; at 1% about 50%.

## Source and branches

- `red-cup-engineering/kalshi-engineering-services-section` `main` is `51e6ee1` (pull request 61), and the superrepo's gitlink names it. It carries pull requests 57 (lane falsifiers count only the desk's own settlements, so the tail lane's pause no longer counts hand trades), 58 (the desk's tests state the regime the Leader directed; 85 of 85 pass), 59 (the forecast cycle writes the surface before it scores and removes dead runs' temporary files), 60 (model grades exclude look-ahead rows; the static-question path) and 61 (the rain lane's admission stated). `emsenn/cold-red-gate` pins `6a65ac1` until its next source advance.
- The repository's only branch is `main`. `refs/archive/2026-10-10/rescue/info-local-weather-2026-10-07` (`a7686df`) holds work to carry: the arena queue-position fill model (`weather-participation`, `weather-capital`, `market-game-observations`) for the desk's shadow scoring, `weather-precipitation`'s observation witnesses as the rain evidence adapter (PF-7), and the ECMWF decoder environment. `release/github-guix` (superseded by admission under the founder's strategy criteria, pull request 41) and `claude/happy-carson-7zxp4d` (already landed) are judged and removed.
- Five copies of the section sit in `@561-group/bare-cedar-fog` under `web3-gambling-platform-services-section/lib/legacy/restored-from-main/{2026-09-21-e5dd28b,2026-09-26-2941769,2026-09-29-20c4bf1,2026-10-03-8856752,2026-10-05-865b13c}/services/kalshi-services-section`. The 2026-10-05 copy holds 25 files main lacks (the pre-desk stake-path pipeline that `2aeba1c` and `6bf74f3` replaced); the 2026-09-29 copy holds `gather-question-evidence.mjs` and its test, which main lacks. The legacy job `kalshi-weather-desk.json` names `apps/kalshi-weather-desk.mjs`, which no longer exists.
- `prediction-market-engineering-services-section`: seven merged `claude/*` branches and a `release/github-guix` patch-equivalent to main; production pins `b7e0f68`, 5 behind `875adf9`. `polymarket-engineering-services-section` is clean.

## Debts, in causal order

1. Station science: split the small learned state the surface reads from the 95 MB `state.json` it rewrites each cycle, so the cycle never rewrites the bulk before the surface (kalshi-keeps-only-data-that-cannot-be-requeried).
2. Read every transaction the venue records for the account (deposits, withdrawals, transfers, orders and fills live and archived, settlements) and reconcile cash to the cent; the client reads none of the first three today.
3. Read observations within the venue's and NWS's rate limits, honouring `Retry-After`, so every station is read every cycle.
4. Test the standard-time climate day across the DST boundary.
5. Carry what `rescue/info-local-weather-2026-10-07` and the five legacy copies hold into the section (the arena queue-position fill model, the precipitation evidence adapter), then remove the copies and the ref (CN-12).
6. Replace hand-entered loss rates with per-lane posteriors from live and shadow settlements; promote, demote and recover lanes from them without a manual re-arm; schedule the hypothesis engine and issue 31's forward shadows.
7. Find the systematic error behind the models' Brier deficit to the market (after 4).
8. Port the Python research and decoding scripts into MetroPlat applications downstream of SignCell.
9. The forecasting suite's `runForecastingDailyCycle` scores 0 of 2 on a settled question.
10. Place the four Kalshi sections the Leader laid out on 2026-10-10 (see the note on the Leader's trading direction) and move parameters, agentics, code and research into them (after 5).
