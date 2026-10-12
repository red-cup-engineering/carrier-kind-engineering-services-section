/**
 * zuya — the war-expedition as a scope-bounded overlay (Zuyá / Ozúye), wičhózani tier.
 *
 * Corpus: content/_archive/existence/lakota/.../lakotaean-governance/.../zuya. A zuya is
 * a scope-bounded closure-rule subsystem 𝒮_zuya that OVERLAYS on 𝒮_wolak for the
 * duration of a specific scope-action. The load-bearing structural fact is
 * COMPOSITION-NOT-REPLACEMENT: 𝒮_total = 𝒮_wolak ∪ 𝒮_zuya, both firing at once. The
 * overlay ADDS enemy-engagement permissions (raid, capture, counting coup); it does NOT
 * suspend any rule of 𝒮_wolak. Kin-cells keep firing (warriors stay kin, even to kin in
 * the enemy polity); the four virtues are still evaluated; withdrawal stays available
 * (participation is consent-based per engagement); harm still installs repair-required
 * cells. The polity stays the polity during war — this is what distinguishes Lakota war
 * from total-war forms.
 *
 * Like the akicita, the overlay retracts at SCOPE-COMPLETION: when the objective is met
 * the war-permissions are withdrawn and 𝒮_total returns to 𝒮_wolak. A zuya is NOT a
 * Westphalian war-state (no continuous war-condition between polities), NOT extermination
 * (objectives are circumscribed), NOT total mobilization (warriors enroll voluntarily).
 * A joint zuya constituted at confederacy scope is what met the U.S. cavalry at the
 * Greasy Grass in 1876. lakotaTerm: "Zuyá".
 */
import { wolakota } from "../wolakota.mjs";

/** A zuya: the war-overlay composed onto the standing wólakȟota discipline. */

  

      

    

 ﻿﻿   ﻿

  

const ADDS = Object.freeze([
  "raid-on-enemy-property and capture of enemy resources (horses; sometimes captives)",
  "counted-coup-on cells at the four grades",
  "the blotáhuŋka's command over war-party-internal cells",
  "the war-akicita's enforcement of war-party discipline",
]);

const DOES_NOT_SUSPEND = Object.freeze([
  "W1 kin-propagation — warriors stay kin to each other and to relatives, including kin in the enemy polity",
  "W2 conduct-evaluation — the four virtues are still evaluated (wóohitika, wówačhiŋtȟaŋka especially)",
  "W6 withdrawal — a warrior may iyúhášni from the zuya at any time without standing-loss",
  "W7 restorative — harm-cells install repair-required cells (killing requires purification)",
  "the wakȟáŋ-marking discipline — sacred relations remain bound",
]);

/** Constitute a zuya: the war-overlay over the standing discipline, scope-active. */
export function constituteZuya(
  enemy,
  objective,
  blotahunka,
  wakhanMarked,
) {
  return Object.freeze({
    kind: "organizing-as-lakota.zuya",
    enemy,
    objective,
    blotahunka,
    wakhanMarked,
    scopeActive: true,
    composesWith: wolakota(),
    adds: ADDS,
    doesNotSuspend: DOES_NOT_SUSPEND,
  });
}

/**
 * Complete the zuya's objective: the overlay retracts (scope-active → ⊥) and 𝒮_total
 * returns to 𝒮_wolak. The polity returns to its peacetime substrate.
 */
export function completeZuya(zuya) {
  return Object.freeze({ ...zuya, scopeActive: false });
}
