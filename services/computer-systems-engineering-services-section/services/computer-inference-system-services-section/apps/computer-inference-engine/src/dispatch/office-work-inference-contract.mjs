/** Keep receiver quality observations for a canonical office work apart from generic probes. */
export function officeWorkInferenceTaskClass(work) {
  if (typeof work !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(work)) throw new TypeError("office work inference requires a canonical work identifier");
  return `metroplat/office-work/${work}`;
}
export const METROPLAT_INFERENCE_MARKET_CUSTOMER = "urn:ame:metroplat";
