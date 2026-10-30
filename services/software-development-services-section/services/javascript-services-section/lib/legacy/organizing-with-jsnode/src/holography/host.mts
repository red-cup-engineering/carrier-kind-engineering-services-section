// host.mts — JavaScript host/runtime capability readings.
//
// This is downstream of the relational substrate: the generic kernel only knows
// that a platform component can be bound. This module reads a concrete JS host
// as charge values.

import type { ChargeValueName as MemeCharge } from "@emsenn/relating";
import { createStateChargeCarrier, type StateChargeCarrier } from "./charge-carrier.mjs";

export const HOST_JS_PLATFORM_KIND = "plat.host-js" as const;

export const HOST_JS_PLATFORM_STATES = Object.freeze([
  "software",
  "hardware",
  "filesystem",
  "process",
  "timer",
  "crypto",
  "network",
  "stdio",
] as const);
export type HostJsPlatformState = typeof HOST_JS_PLATFORM_STATES[number];

export type HostJsPlatform = Readonly<{
  kind: typeof HOST_JS_PLATFORM_KIND;
  id: string;
  name: string;
  type: "software";
  runtime: Readonly<{
    name: "node";
    version: string;
    platform: string;
    arch: string;
  }>;
  capabilities: Readonly<Record<string, MemeCharge>>;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type HostJsPlatformProjection = Readonly<{
  id: string;
  name: string;
  point: string;
  type: "software";
  runtime: HostJsPlatform["runtime"];
  software: boolean;
  hardware: boolean;
  filesystem: boolean;
  process: boolean;
  timer: boolean;
  crypto: boolean;
  network: MemeCharge;
  stdio: boolean;
}>;

export function createHostJsPlatform(options: {
  id?: string;
  name?: string;
  network?: MemeCharge;
  capabilities?: Record<string, MemeCharge>;
  metadata?: Record<string, unknown>;
} = {}): HostJsPlatform {
  const capabilities: Record<string, MemeCharge> = {
    filesystem: "potential",
    process: "potential",
    timer: "potential",
    crypto: "potential",
    network: options.network ?? "absurd",
    stdio: "potential",
    ...(options.capabilities ?? {}),
  };

  return Object.freeze({
    kind: HOST_JS_PLATFORM_KIND,
    id: String(options.id ?? "host-js"),
    name: String(options.name ?? "host-js"),
    type: "software" as const,
    runtime: Object.freeze({
      name: "node" as const,
      version: process.versions?.node ?? "",
      platform: process.platform,
      arch: process.arch,
    }),
    capabilities: Object.freeze(capabilities),
    metadata: Object.freeze({ ...(options.metadata ?? {}) }),
  });
}

export function platformPoint(platformOrId: string | HostJsPlatform): string {
  const id = typeof platformOrId === "string" ? platformOrId : platformOrId.id;
  if (!id) throw new TypeError("platformPoint: platform id is required");
  return `platform:${id}`;
}

export function platformCarrier(
  platformOrInput: HostJsPlatform | Parameters<typeof createHostJsPlatform>[0] = {},
): StateChargeCarrier<HostJsPlatformState> {
  const platform = isHostJsPlatform(platformOrInput) ? platformOrInput : createHostJsPlatform(platformOrInput);
  const point = platformPoint(platform);

  return createStateChargeCarrier([point], HOST_JS_PLATFORM_STATES, (_point, state) => {
    switch (state) {
      case "software":
        return "potential";
      case "hardware":
        return "active";
      case "filesystem":
      case "process":
      case "timer":
      case "crypto":
      case "network":
      case "stdio":
        return platform.capabilities[state] ?? "absurd";
    }
  });
}

export function platformProjection(
  platformOrInput: HostJsPlatform | Parameters<typeof createHostJsPlatform>[0] = {},
): HostJsPlatformProjection {
  const platform = isHostJsPlatform(platformOrInput) ? platformOrInput : createHostJsPlatform(platformOrInput);
  const carrier = platformCarrier(platform);
  const point = platformPoint(platform);

  return Object.freeze({
    id: platform.id,
    name: platform.name,
    point,
    type: platform.type,
    runtime: platform.runtime,
    software: carrier.at(point, "software") === "potential",
    hardware: carrier.at(point, "hardware") === "potential",
    filesystem: carrier.at(point, "filesystem") === "potential",
    process: carrier.at(point, "process") === "potential",
    timer: carrier.at(point, "timer") === "potential",
    crypto: carrier.at(point, "crypto") === "potential",
    network: carrier.at(point, "network"),
    stdio: carrier.at(point, "stdio") === "potential",
  });
}

function isHostJsPlatform(value: unknown): value is HostJsPlatform {
  return !!value && typeof value === "object" && (value as HostJsPlatform).kind === HOST_JS_PLATFORM_KIND;
}
