---
title: Groundhog Operating System (GOS) Overview
date-created: 2023-04-01T00:00:00
date-updated: 2023-04-01T00:00:00
authors: Unknown
aliases: Unknown
type: topic
keywords:
  - OperatingSystem
  - Insurrection
  - NotesManagement
  - SystemDevelopment
description: Overview of the Groundhog Operating System (GOS), its use, and querying capabilities.
target-discipline: technology
triage-enriched-by: "infer-triage-frontmatter-v3-by-phi4-mini:latest"
date-triage-enriched: 2026-03-09T04:24:45
---

# Groundhog Operating System (GOS) ***ions for insurrection***

(This document is for users of GOS, whether through the REPL or another interface.
If you're a system developer, try [dev.md](dev.md).

So the idea is basically you can write some sort of notes, indepenedent of the GOS, and then come and triage those notes as events, and then at some future point the events can get processed and that changes the system's memory, which can then be queried.

Separating out the entry of data from its processing from its interpretation lets the different parts of the system get written as-needed, without slowing down the ability to add data to the system.

# Use In the terminal type `fennel` then `(local gos (require :gos))`.

To start the system, do `(gos.sys.start)`

## Triaging events

One of the most common things you'll do with the GOS is triage an event, by doing something like:

`(gos.triage {:act :weather-observation :cover "light clouds"})`

Each event is basically a table of data, with at least two pieces always included: an `act` and a `time`.
(If the time isn't included, it'll be added in by the `triage` function, but you always need to include an act.)

Triaged events get saved to disk, but otherwise, nothing is done with them, until the triage is processed.

When they're processed, they'll get run through a function based on the `act` named in the event, which usually requires other kinds of data.
If you want to make sure your event has what it'll need, you can check the act's schema, by doing something like

`(gos.acts.weather-observation.schema)`

This'll tell you what data the act expects, and for each: whether its required, a brief description of hwat it represents, and what format that data is expected to be in; something like:

```lisp
{"cover" [:optional "A description of the cloud cover." "String, one of: clear, few, scattered, broken, overcast, obscured, part obscured"]}
```

*(There'd be more, but let's keep it brief.)*

## Processing the triage

In order for the events in the triage to change anything about the system, they need to be processed.
First, each event in the triage will get validated, and only if they all pass will the triage be processed.

But, if they pass, each event will get sent to its act's processor, which'll (usually) do things that change the system memory.

## Querying the system

One half, roughly speaking, of the GOS is data entry.
The other is querying the system for information.
Right now, most of that is done through the CPU.
Here's some examples of things you can do to query the system:
