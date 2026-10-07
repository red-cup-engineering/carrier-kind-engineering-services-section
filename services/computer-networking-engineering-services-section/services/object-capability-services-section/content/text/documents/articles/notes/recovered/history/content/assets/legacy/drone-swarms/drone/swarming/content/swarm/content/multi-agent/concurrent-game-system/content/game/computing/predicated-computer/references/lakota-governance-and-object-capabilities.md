# How Lakota governance and object capabilities relate

*An explainer for Edward L.
Platt.*

> **What this is.** A structural analogy between a centuries-old human governance tradition (the Lakota / Očhéthi Šakówiŋ) and a computer-security model (object capabilities, "ocaps").
> The claim is **not** that the Lakota "invented ocaps," nor that ocaps "explain" Lakota governance.
> It's that both refuse the same thing — *standing, ambient authority* — and both build legitimacy the same way: out of specific, granted, accountable, revocable relationships.
> Lakota governance is a living tradition, not a dead model; this document treats it with that respect and cites sources rather than paraphrasing from memory.

---

## Why you, specifically

Your work sits on exactly the seam this analogy runs along: large-scale deliberation and collective action, network science, and self-organized, member-run institutions (i3 Detroit, cooperative tech).
The interesting question for that audience isn't "is X like Y" — it's **what invariant does a decentralized authority structure have to preserve to stay legitimate and non-coercive at scale?** Ocaps answer that question for machines.
Lakota governance answers it for a nation.
They give the *same* answer, and seeing it twice tells you the answer is about the structure of authority itself, not about the substrate.

---

## Part 1 — Object capabilities, in one page

In the object-capability model, **authority is a thing you hold, not a property of who you are.** An actor can act on a resource if and only if it holds an unforgeable *reference* (a "capability") to that resource.
Hold the reference → you can act; don't hold it → the resource isn't even nameable to you.
[1][2]

The defining negative: **no ambient authority.** Most familiar systems (Unix permissions, ACLs, "is this user an admin?") work by checking, at the moment of action, a *standing context* — "who is the current user, and what is that user globally allowed to do?"
That standing, always-on authority is *ambient*.
Ocap systems delete it.
There is no "current user with global powers"; there are only specific references that specific actors specifically hold.
[1][3]

From that one move, the rest follows:

- **Designation *is* authority.** You can only act on what you can name, and you can only name what you've been handed.
  No "act on everything of this type."
  [2]
- **Delegation by passing.** I grant you authority by handing you a reference.
  No central administrator mediates it; authority flows peer-to-peer along the relationships that actually exist.
  [1][3]
- **Attenuation.** I can wrap a capability before handing it on, so you get a *narrower* one than I hold (read-only, this-resource-only, expires-soon).
  The recipient gets exactly what they need to do the job — **least privilege** as the default, not an afterthought.
  [3]
- **Revocation.** A delegated capability can be cut off; authority is contingent, not permanent.
- **No confused deputy.** Because authority travels *with* the specific reference rather than being looked up against an ambient identity, you don't get the class of failure where a privileged intermediary is tricked into wielding its standing powers on someone else's behalf.
  [2][3]

The whole thing is **compositional**: authority relationships chain to any depth, and the system stays analyzable, because every link is a specific grant rather than a global allowance.
[2]

(For what it's worth: the 561-group computer derives this same model from its own first principles, calling a capability a "charge" — *"authority = an unforgeable reference you hold, attenuable, delegable,"* where **delegation narrows the principal downstream while accountability stays at the apex.** That last clause matters for the Lakota mapping below.
[8])

---

## Part 2 — Lakota governance, in one page

The Lakota are part of the **Očhéthi Šakówiŋ**, the Seven Council Fires — an alliance of autonomous divisions, "each Council Fire autonomous, yet with an allegiance that unites the seven."
[4] The base unit of daily life is the **thiyóšpaye**, an extended-family band of several generations.
[4] The system is described by its own sources as "open, egalitarian, classless and cooperative," governed by **consensus** and led by respected people, not by a coercive central office.
[4][5]

The roles that matter for this analogy:

- **Itȟáŋčhaŋ** (leader/chief) — a position of honor, conferred by a council.
  It was *usually* hereditary but not necessarily; exceptional people could be raised to it by council endorsement — **and the council "reserved the power to depose him."** Authority here is granted and recallable, not owned.
  [5][6]
- **Wakíčhuŋze** (administrators/advisors) — typically four, serving roughly one-year terms.
  The itȟáŋčhaŋ **delegated** day-to-day governance to them; they mediated disputes.
  Power was distributed precisely so no one person held it unilaterally.
  [5][6]
- **Akíčhita** (marshals / "camp police") — and this is the sharpest piece.
  Before a buffalo hunt or a camp move, the council appointed akíčhita to keep order, with real authority to enforce — **for that event.** "A marshal might be appointed for a specific time, as for the movement of the camp, a hunting party, a war party."
  When the hunt ended, **"the marshals gave up their control of the camp, and life returned to normal."** [6][7] The authority was scoped to a task and dissolved when the task did.

Two cross-cutting principles hold the whole thing together:

- **Mutual accountability, no exemption.** "Even the omníčhiye [council], the itȟáŋčhaŋ, and the wakíčhuŋzas were not exempt from the judgment and sentences of the akíčhita."
  Authority over others never bought immunity.
  [5]
- **Consent and the freedom to withdraw.** Routine governance "relies on deliberation, consensus, and delegation."
  [5] Because bands were autonomous, a thiyóšpaye that disagreed could decline to follow — legitimacy rested on ongoing consent, not on a monopoly of force.

---

## Part 3 — The mapping

This is the heart of it.
Read each row as: *the same invariant, expressed once in a nation and once in a kernel.*

| The shared invariant | Lakota governance | Object capabilities |
|---|---|---|
| **No ambient authority** | No standing office with blanket coercive power over everyone; even chiefs are deposable and not exempt [5] | No "current user" with global powers; delete the ambient context entirely [1][3] |
| **Authority is held, not had** | A leader *carries* a mandate granted by the council; it is conferred, not intrinsic to the person [5][6] | Authority is an unforgeable reference you hold, not an attribute of your identity [1][2] |
| **Scoped to a task** | Akíčhita are appointed *for the hunt, the move, the war party* — and only that [6][7] | A capability designates *this resource, this operation* — and only that [2] |
| **Dissolves when the task ends** | "The marshals gave up their control… and life returned to normal" [7] | Capabilities expire / are revoked; authority is contingent, not permanent |
| **Least privilege / attenuation** | Day-to-day power split across four wakíčhuŋze on one-year terms so no one holds it all [5][6] | Hand on a *narrower* capability than you hold; recipients get exactly what the job needs [3] |
| **Delegation along real relationships** | The itȟáŋčhaŋ delegates to wakíčhuŋze; the council appoints akíčhita — peer-to-peer, not via a sovereign [5] | I grant authority by *passing a reference*; no central administrator mediates [1][3] |
| **Accountability stays at the apex** | Delegated marshals act, but the council retains the power to judge and depose [5] | Delegation narrows the principal downstream while the accountable party stays at the apex [8] |
| **Legitimacy from consent, not force** | Autonomous bands; governance by deliberation and consensus; the freedom to withhold agreement [4][5] | Authority can't be ambiently asserted onto you; it only exists where it was specifically granted [3] |

---

## Part 4 — Where the analogy is strong, and where it breaks

Being honest about the seams is what makes this worth your time rather than a slogan.

**Where it's genuinely the same shape:**

- Both are *capability discipline*: authority = a specific, granted, scoped, revocable thing, never a standing global power.
- Both treat **delegation without abdication** as the central trick — authority flows outward to do work while accountability stays anchored.
  (Wakíčhuŋze / akíčhita act, council retains the power to depose; downstream principal narrows, apex stays accountable.
  Same move.
  [5][8])
- Both make the **confused-deputy** failure structurally hard: an akíčhita's authority is tied to *this* appointed task, not to a rank that could be borrowed for other ends — much as ocap authority rides the specific reference, not an ambient role.
  [2]

**Where it breaks (don't oversell it):**

- **Kinship is the substrate, and it has no computational analogue.** Lakota authority is embedded in *thiyóšpaye* relationship, ceremony, generosity, and earned respect (akíčhita were chosen for "generosity, leadership, and most of all, their bravery" [6]).
  Ocaps are deliberately *amoral* and contextless — a reference confers authority regardless of who holds it or whether they're worthy.
  The Lakota system's legitimacy machinery is exactly the part the ocap model abstracts away.
- **Revocation works differently.** Ocap revocation is mechanical and clean.
  Lakota recall — deposing a leader, the council overruling — is a *social* act embedded in consensus and relationship.
  The invariant ("authority is revocable") is shared; the mechanism is not.
- **It's a living tradition, not a finished spec.** The Očhéthi Šakówiŋ govern today; sources here describe traditional structures and shouldn't be read as a closed historical artifact to be data-mined for CS metaphors.
  The analogy is a lens, offered with respect, not a claim of equivalence.

---

## Part 5 — Why this is more than a cute parallel

For someone working on large-scale deliberation and cooperative institutions, the payoff is a **design invariant you can carry between domains:**

> A decentralized authority structure stays non-coercive exactly to the degree that it refuses ambient authority — replacing "who are you and what are you globally allowed?" with "what specific, scoped, revocable grant do you hold, and who stays accountable for it?"

That the Lakota arrived at this for a nation, and capability-security researchers arrived at it for kernels and distributed systems, is **convergent evidence about the structure of legitimate authority itself.** It suggests that the failure mode ocaps are built to prevent (the confused deputy, ambient over-reach, privilege that can't be attenuated) and the failure mode Lakota governance is built to prevent (the standing coercive sovereign exempt from its own people) are *the same failure mode* — and that the cure has the same shape whether you're designing a cooperative, a federation protocol, or a permission system.

It also reframes a debate you've lived inside: "decentralization" is not primarily about *topology* (no central node).
It's about *authority semantics* (no ambient power).
You can have a graph with a center that's still non-coercive if authority is capability-shaped, and a flat graph that's tyrannical if authority is ambient.
The network diagram doesn't tell you which; the authority model does.

---

## Sources

1. [Object-capability model — Wikipedia](https://en.wikipedia.org/wiki/Object-capability_model)
2. [Capability Myths Demolished (summary) — the morning paper](https://blog.acolyer.org/2016/02/16/capability-myths-demolished/)
3. [Authorizing Capabilities — ocaps guide](https://tersesystems.github.io/ocaps/guide/authorization.html) / [Introducing Capabilities](https://tersesystems.github.io/ocaps/guide/introduction.html)
4. [Oceti Sakowin — Seven Council Fires, Aktá Lakota Museum & Cultural Center](https://aktalakota.stjo.org/oceti-sakowin-seven-council-fires/)
5. [Traditional Lakota Governance — Howe & Katz, *Rootstalk* (Grinnell)](https://rootstalk.grinnell.edu/issues/volume-i-issue-1/howe-katz/)
6. [Sioux Societies — Shipwreck Library](https://shipwrecklibrary.com/deadlands/sioux-societies/) · [Lakota Society — Project MUSE](https://muse.jhu.edu/pub/17/oa_edited_volume/chapter/4228922)
7. [The Lakota Bison Hunt — North Dakota Studies](https://www.ndstudies.gov/gr8/content/unit-ii-time-transformation-1201-1860/lesson-2-making-living/topic-3-bison-hunting/section-2-lakota-bison-hunt)
8. 561-group computer, dev journal: *"accounts are players, not records"* (`computer/docs/dev/journal/2026-06-05-accounts-are-players-not-records.md`) — the repo's own derivation of capability-as-charge, delegation as principal-narrowing with accountability at the apex.

---

*Note on terminology and spelling:* Lakota terms appear in sources with varying orthography (e.g. *akicita / akíčhita*, *wakiconze / wakíčhuŋze*, *tiospaye / thiyóšpaye*, *Oceti Sakowin / Očhéthi Šakówiŋ*).
This document uses the standardized Lakota orthography where possible and keeps source spellings inside quotations.
