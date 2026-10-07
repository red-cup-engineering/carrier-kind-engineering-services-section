/**
 * US representation leads: foreign device establishments read from the FDA's registration and
 * listing data, one row per establishment with the US agent it pays, the market of US agents,
 * and a score for who to call first. Pure: the caller supplies the listings.
 * @packageDocumentation
 */

const DEVICE_CLASS_NAMES = Object.freeze({ 1: "class I", 2: "class II", 3: "class III", U: "unclassified", N: "not classified", F: "HDE" });

const clean = (value) => (typeof value === "string" ? value.trim().replace(/,+$/, "").trim() : value) || null;
const phoneOf = (area, number, extension) => {
  const digits = [area, number].map((part) => clean(part) ?? "").join("");
  if (!digits) return null;
  return extension ? `${digits} x${clean(extension)}` : digits;
};

function agentOf(agent) {
  if (!agent) return null;
  const name = clean(agent.name);
  const business = clean(agent.business_name);
  if (!name && !business) return null;
  return Object.freeze({
    name, business, key: (business ?? name).toUpperCase(),
    phone: phoneOf(agent.bus_phone_area_code, agent.bus_phone_num, agent.bus_phone_extn),
    email: clean(agent.email_address), city: clean(agent.city), state: clean(agent.state_code),
  });
}

/**
 * Establishments from device registration and listing records: records sharing a registration
 * number merge into one establishment carrying every device it lists.
 * @param {object[]} listings openFDA `device/registrationlisting` results
 */
export function establishmentsFrom(listings) {
  const byNumber = new Map();
  for (const listing of listings) {
    const registration = listing.registration ?? {};
    const number = clean(registration.registration_number) ?? clean(registration.fei_number);
    if (!number) continue;
    const owner = registration.owner_operator ?? {};
    const correspondent = owner.official_correspondent ?? {};
    const entry = byNumber.get(number) ?? {
      key: number,
      registrationNumber: number,
      fei: clean(registration.fei_number),
      name: clean(registration.name),
      owner: clean(owner.firm_name),
      address: [registration.address_line_1, registration.address_line_2].map(clean).filter(Boolean).join(", ") || null,
      city: clean(registration.city),
      province: clean(owner.contact_address?.state_province),
      country: clean(registration.iso_country_code),
      expiryYear: Number(registration.reg_expiry_date_year) || null,
      initialImporter: registration.initial_importer_flag === "Y",
      usAgent: agentOf(registration.us_agent),
      correspondent: Object.freeze({
        name: [correspondent.first_name, correspondent.last_name].map(clean).filter(Boolean).join(" ") || null,
        phone: clean(correspondent.phone_number)?.replace(/-x$/, "") ?? null,
      }),
      establishmentTypes: new Set(),
      devices: new Set(),
      productCodes: new Set(),
      classes: new Set(),
      specialties: new Set(),
      listings: 0,
    };
    entry.listings += 1;
    for (const type of listing.establishment_type ?? []) entry.establishmentTypes.add(type);
    for (const product of listing.products ?? []) {
      if (product.product_code) entry.productCodes.add(product.product_code);
      const fda = product.openfda ?? {};
      if (fda.device_name) entry.devices.add(fda.device_name);
      if (fda.device_class) entry.classes.add(String(fda.device_class));
      if (fda.medical_specialty_description) entry.specialties.add(fda.medical_specialty_description);
    }
    for (const name of listing.proprietary_name ?? []) if (entry.devices.size < 40) entry.devices.add(name);
    byNumber.set(number, entry);
  }
  return [...byNumber.values()].map((entry) => Object.freeze({
    ...entry,
    establishmentTypes: Object.freeze([...entry.establishmentTypes]),
    devices: Object.freeze([...entry.devices].slice(0, 12)),
    productCodes: Object.freeze([...entry.productCodes]),
    classes: Object.freeze([...entry.classes].sort().map((c) => DEVICE_CLASS_NAMES[c] ?? c)),
    specialties: Object.freeze([...entry.specialties]),
  }));
}

/**
 * The market of US agents: each agent (by business, or by name when no business is named) with
 * how many establishments name it, their provinces, and its contact details.
 */
export function agentMarket(establishments) {
  const agents = new Map();
  let without = 0;
  for (const row of establishments) {
    if (!row.usAgent) { without += 1; continue; }
    const entry = agents.get(row.usAgent.key) ?? { agent: row.usAgent.business ?? row.usAgent.name, business: row.usAgent.business, names: new Set(), emails: new Set(), states: new Set(), provinces: new Map(), clients: 0 };
    entry.clients += 1;
    if (row.usAgent.name) entry.names.add(row.usAgent.name);
    if (row.usAgent.email) entry.emails.add(row.usAgent.email);
    if (row.usAgent.state) entry.states.add(row.usAgent.state);
    if (row.province) entry.provinces.set(row.province, (entry.provinces.get(row.province) ?? 0) + 1);
    agents.set(row.usAgent.key, entry);
  }
  const ranked = [...agents.values()].sort((a, b) => b.clients - a.clients).map((entry) => Object.freeze({
    agent: entry.agent,
    business: entry.business,
    clients: entry.clients,
    share: establishments.length ? Number((entry.clients / establishments.length).toFixed(4)) : 0,
    names: [...entry.names].slice(0, 5),
    emails: [...entry.emails].slice(0, 3),
    states: [...entry.states],
    provinces: [...entry.provinces].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([province, count]) => ({ province, count })),
  }));
  return Object.freeze({ establishments: establishments.length, withAgent: establishments.length - without, withoutAgent: without, agents: ranked.length, ranked: Object.freeze(ranked) });
}

/**
 * Who to call first, and why. Registrations due this season, agents holding very many clients
 * (a named person who answers is the offer), no agent at all, and class II/III devices (which a
 * US sales representative can sell to clinics and distributors) all raise the score.
 */
export function scoreEstablishment(row, { year = new Date().getUTCFullYear(), agentClients = new Map(), volumeAgentAt = 500 } = {}) {
  const reasons = [];
  let score = 0;
  if (row.expiryYear !== null && row.expiryYear <= year) { score += 5; reasons.push(`registration renews by Dec 31, ${year}`); }
  if (!row.usAgent) { score += 4; reasons.push("names no US agent"); }
  else {
    const clients = agentClients.get(row.usAgent.key) ?? 0;
    if (clients >= volumeAgentAt) { score += 3; reasons.push(`its US agent (${row.usAgent.business ?? row.usAgent.name}) holds ${clients} establishments`); }
  }
  if (row.classes.includes("class II") || row.classes.includes("class III")) { score += 2; reasons.push(`${row.classes.filter((c) => c !== "class I").join(" and ")} devices`); }
  if (row.listings >= 5) { score += 1; reasons.push(`${row.listings} device listings`); }
  if (row.initialImporter) { score += 1; reasons.push("registered as initial importer"); }
  if (row.correspondent?.phone) score += 1;
  return Object.freeze({ score, reasons: Object.freeze(reasons) });
}

/** Scored lead rows for a list of establishments, highest first. */
export function leadRows(establishments, options = {}) {
  const market = agentMarket(establishments);
  const agentClients = new Map(market.ranked.map((entry) => [(entry.business ?? entry.agent).toUpperCase(), entry.clients]));
  return establishments
    .map((row) => ({ ...row, ...scoreEstablishment(row, { ...options, agentClients }) }))
    .sort((a, b) => b.score - a.score || String(a.name).localeCompare(String(b.name)));
}

/** A client's key for its engagements: a slug of its name. */
export const clientKey = (name) => String(name ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9一-鿿]+/g, "-").replace(/(^-|-$)/g, "");
