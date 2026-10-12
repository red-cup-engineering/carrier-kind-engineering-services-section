/**
 * Rigid-body kinematics for Holofoam flight and structure: 3-vectors, unit quaternions [w, x, y, z] and the
 * inertia of point masses with a small spherical self-inertia per part. Deterministic: only + − × ÷ and
 * Math.sqrt (IEEE correctly rounded), in a fixed order; no transcendental functions.
 *
 * Inertia approximation: a part is a point mass plus the inertia of a solid sphere of its `radius`
 * (default 0.5 m), (2/5) m r² on each axis. The tensor is the full 3x3 (parallel-axis summed), inverted by
 * its adjugate. The self-inertia keeps a collinear stack's tensor invertible. Propellant mass flow is not
 * modelled: a part's mass is constant.
 */
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const length = (a) => Math.sqrt(dot(a, a));

export const IDENTITY_QUATERNION = Object.freeze([1, 0, 0, 0]);
export const quatMul = (p, q) => [
  p[0] * q[0] - p[1] * q[1] - p[2] * q[2] - p[3] * q[3],
  p[0] * q[1] + p[1] * q[0] + p[2] * q[3] - p[3] * q[2],
  p[0] * q[2] - p[1] * q[3] + p[2] * q[0] + p[3] * q[1],
  p[0] * q[3] + p[1] * q[2] - p[2] * q[1] + p[3] * q[0],
];
export function quatNormalize(q) {
  const n = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  if (n === 0) throw new RangeError("quaternion has zero norm");
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}
export const quatConjugate = (q) => [q[0], -q[1], -q[2], -q[3]];
/** Rotate a vector by a unit quaternion (v' = v + 2w(u×v) + 2u×(u×v)). */
export function rotate(q, v) {
  const u = [q[1], q[2], q[3]];
  const t = scale(cross(u, v), 2);
  return add(add(v, scale(t, q[0])), cross(u, t));
}
export const unrotate = (q, v) => rotate(quatConjugate(q), v);

/** The 3x3 inverse by adjugate (rows of rows); throws on a singular tensor. */
export function invert3(m) {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h, B = f * g - d * i, C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (det === 0) throw new RangeError("inertia tensor is singular");
  return [[A / det, (c * h - b * i) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, (c * d - a * f) / det], [C / det, (b * g - a * h) / det, (a * e - b * d) / det]];
}
export const mulMatVec = (m, v) => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];

/** Mass, centre of mass and inertia of parts [{ id, mass, at, radius? }], summed in the given order. */
export function massProperties(parts) {
  let mass = 0, moment = [0, 0, 0];
  for (const part of parts) { mass += part.mass; moment = add(moment, scale(part.at, part.mass)); }
  if (!(mass > 0)) throw new RangeError("a body needs positive mass");
  const centre = scale(moment, 1 / mass);
  const inertia = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const part of parts) {
    const r = sub(part.at, centre), rr = dot(r, r), radius = part.radius ?? 0.5, own = 0.4 * part.mass * radius * radius;
    for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) inertia[i][j] += part.mass * ((i === j ? rr : 0) - r[i] * r[j]) + (i === j ? own : 0);
  }
  return Object.freeze({ mass, centre: Object.freeze(centre), inertia: Object.freeze(inertia.map((row) => Object.freeze(row))), inverse: Object.freeze(invert3(inertia)) });
}

/** Angular acceleration of a body (body frame): I⁻¹(τ − ω×Iω). */
export const angularAcceleration = (properties, torque, omega) => mulMatVec(properties.inverse, sub(torque, cross(omega, mulMatVec(properties.inertia, omega))));
