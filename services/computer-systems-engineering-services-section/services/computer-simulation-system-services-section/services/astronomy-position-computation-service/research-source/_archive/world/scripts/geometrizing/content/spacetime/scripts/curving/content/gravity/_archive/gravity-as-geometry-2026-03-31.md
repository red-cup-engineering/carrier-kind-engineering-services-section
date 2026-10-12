---

title: "Gravity as Geometry"
description: "Newton said that masses attract each other with a force proportional to their masses and inversely proportional to the square of the distance between them. This works extraordinarily well for most purposes. It sent Apollo to the Moon and Voyager past Neptune. It is also wrong -- or rather, it is an approximation of something deeper."
date-created: 2026-03-31
teaches:
  - gravity
  - general-relativity
requires:
  - spacetime
---

Newton said that masses attract each other with a force proportional to their masses and inversely proportional to the square of the distance between them. This works extraordinarily well for most purposes. It sent Apollo to the Moon and Voyager past Neptune. It is also wrong -- or rather, it is an approximation of something deeper.

## The elevator thought experiment

Einstein began with a simple observation: if you are in a sealed elevator in free fall, you cannot tell whether you are falling in a gravitational field or floating in empty space. Gravity and acceleration are locally indistinguishable. This is the equivalence principle, and it was Einstein's starting point for [general relativity](../terms/general-relativity.md).

If gravity and acceleration are the same thing, then gravity is not a force pulling objects together. It is a property of the space in which objects move.

## Curvature instead of force

In general relativity, massive objects curve [spacetime](../terms/spacetime.md). Objects in free fall follow the straightest possible paths through that curved spacetime -- these paths are called geodesics. On a flat surface, the straightest path is a straight line. On a curved surface (like the surface of a sphere), the straightest path is a great circle. Near a massive body, spacetime is curved, and the "straightest path" is what Newton would have called an orbit.

There is no gravitational force in this picture. A planet orbiting a star is not being pulled. It is following the geometry of spacetime, which is curved by the star's mass. An apple falling from a tree is following a geodesic through the spacetime curved by Earth's mass.

The rubber-sheet analogy -- a bowling ball on a trampoline -- captures something of this but misleads in important ways. It suggests gravity pulls things "down," but there is no "down" in spacetime. The curvature is intrinsic to the four-dimensional geometry, not a deformation toward some external direction.

## The Einstein field equations

The quantitative content of general relativity is encoded in the Einstein field equations:

$$G_{\mu\nu} + \Lambda g_{\mu\nu} = \frac{8\pi G}{c^4} T_{\mu\nu}$$

The left side ($G_{\mu\nu}$) describes spacetime curvature. The right side ($T_{\mu\nu}$) describes the distribution of mass and energy. The equation says: given the contents of the universe, here is the geometry. Given the geometry, here is how the contents move. The two sides constrain each other simultaneously.

The full mathematical apparatus requires differential geometry, which is beyond the scope of this library. But the conceptual content is essential: cosmology is applied general relativity. The [Friedmann equations](theories/evolution/terms/friedmann-equations.md) that govern the expansion of the universe are what you get when you apply the Einstein field equations to a universe that satisfies the [cosmological principle](../terms/cosmological-principle.md) -- one that is homogeneous and isotropic on large scales.

## Why this matters

Every major result in cosmology follows from treating gravity as geometry. The expansion of the universe, the Big Bang, [black holes](theories/black-holes/terms/black-hole.md), [gravitational lensing](theories/observation/terms/gravitational-lensing.md), gravitational waves -- all are predictions of general relativity. Understanding gravity as the curvature of spacetime is not a philosophical preference. It is the theoretical foundation on which the entire field stands.
