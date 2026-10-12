#!/usr/bin/env node
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';

// Machine buyers must be able to reach the x402 payment challenge using their
// normal HTTP clients. Override only Browser Integrity Check on this host.
const rule = {
  ref: 'market_561_machine_buyers',
  description: 'Allow standard HTTP clients to reach the paid software market',
  expression: 'http.host eq "market.561.group"',
  action: 'set_config', action_parameters: { bic: false }, enabled: true,
};

export async function configureMarketCloudflare({ zoneId, token, fetchImpl = fetch }) {
  if (!/^[a-f0-9]{32}$/.test(zoneId ?? '') || !token) throw new Error('Scoped Cloudflare token and zone ID are required');
  const base = `https://api.cloudflare.com/client/v4/zones/${zoneId}`;
  async function api(path, method = 'GET', body, allowMissing = false) {
    const response = await fetchImpl(base + path, {
      method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
    });
    const data = await response.json();
    if (allowMissing && response.status === 404 && data.errors?.some(e => e.code === 10003)) return null;
    if (!response.ok || !data.success) throw new Error(`Cloudflare ${method} ${path}: HTTP ${response.status}; codes ${(data.errors ?? []).map(e => e.code).join(',')}`);
    return data.result;
  }
  const zone = await api('');
  if (zone.name !== '561.group') throw new Error('Market configuration requires the 561.group zone');
  const entrypoint = '/rulesets/phases/http_config_settings/entrypoint';
  let ruleset = await api(entrypoint, 'GET', undefined, true);
  const matches = candidate => Object.entries(rule).every(([key, value]) => JSON.stringify(candidate[key]) === JSON.stringify(value));
  let changed = false;
  if (!ruleset) {
    ruleset = await api('/rulesets', 'POST', {
      name: '561.group configuration', kind: 'zone', phase: 'http_config_settings', rules: [rule],
    });
    changed = true;
  } else {
    const own = (ruleset.rules ?? []).filter(r => r.ref === rule.ref);
    if (own.length > 1) throw new Error('Duplicate market rules require reconciliation');
    if (!own.length) {
      await api(`/rulesets/${ruleset.id}/rules`, 'POST', rule);
      changed = true;
    } else if (!matches(own[0])) {
      await api(`/rulesets/${ruleset.id}/rules/${own[0].id}`, 'PATCH', rule);
      changed = true;
    }
  }
  const verified = await api(entrypoint);
  const current = verified.rules?.find(r => r.ref === rule.ref);
  if (!current || !matches(current)) throw new Error('Cloudflare did not retain the requested market rule');
  return { changed, hostname: 'market.561.group', rulesetId: verified.id, ruleId: current.id, browserIntegrityCheck: false };
}

if (import.meta.main) {
  try {
    setDefaultAutoSelectFamilyAttemptTimeout(2000);
    console.log(JSON.stringify(await configureMarketCloudflare({
      zoneId: process.env.CLOUDFLARE_ZONE_ID, token: process.env.CLOUDFLARE_API_TOKEN,
    })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
