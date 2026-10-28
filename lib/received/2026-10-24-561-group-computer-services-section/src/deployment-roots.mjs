import { existsSync, readdirSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const directories = (path) => existsSync(path) ? readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort() : [];

/** Read actual machine-owned definitions; released layouts and explicit caller roots remain supported. */
export function deploymentRootsOf(deployments) {
  if (typeof deployments !== "string" || !isAbsolute(deployments)) {
    throw new TypeError("node-job: an explicit absolute deployments root is required");
  }
  const roots = new Map();
  const receive = (collection) => {
    for (const name of directories(collection)) {
      if (!existsSync(resolve(collection, name, "deploy/release.json"))) continue;
      if (roots.has(name)) throw new TypeError(`deployment ${name} has more than one source definition`);
      roots.set(name, resolve(collection, name));
    }
  };
  receive(deployments);
  const services = resolve(deployments, "../services");
  for (const section of directories(services)) {
    const records = resolve(services, section, "data/records/machine-deployment-service-records");
    for (const composition of directories(records)) receive(resolve(records, composition, "deployments"));
  }
  return roots;
}
