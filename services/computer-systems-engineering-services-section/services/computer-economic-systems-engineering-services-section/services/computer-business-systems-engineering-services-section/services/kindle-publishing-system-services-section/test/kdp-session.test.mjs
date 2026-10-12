import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  captureKdpLogin,
  isKdpSessionValid,
} from "../src/kdp-session.mjs";

function fakeBrowser({ url = "https://kdp.amazon.com/en_US/bookshelf", body = "Bookshelf", state = { cookies: [], origins: [] } } = {}) {
  const launches = [];
  const browser = {
    async newContext(options = {}) {
      launches.push(options);
      return {
        async newPage() {
          return {
            async goto() {},
            async waitForURL(predicate) { assert.equal(predicate(new URL(url)), true); },
            url: () => url,
            locator: () => ({ innerText: async () => body }),
          };
        },
        async storageState() { return state; },
      };
    },
    async close() {},
  };
  return { browser, launches };
}

test("sign-in capture is visible, writes private state, and prints no cookie values", async () => {
  const root = await mkdtemp(join(tmpdir(), "kdp-login-"));
  const path = join(root, "private", "kdp-storage-state.json");
  const secret = "SECRET_PASSWORD_COOKIE_VALUE";
  const fake = fakeBrowser({ state: { cookies: [{ name: "session-id", value: secret }], origins: [] } });
  let launchOptions;
  const capabilities = { window: "chromium", launchChromium: async (options) => { launchOptions = options; return fake.browser; } };
  const result = await captureKdpLogin({ storageStatePath: path }, capabilities);
  assert.deepEqual(launchOptions, { headless: false });
  assert.equal(result.cookieCount, 1);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  assert.equal((await stat(dirname(path))).mode & 0o777, 0o700);
  assert.match(await readFile(path, "utf8"), new RegExp(secret, "u"));
  assert.doesNotMatch(JSON.stringify(result), /SECRET|PASSWORD|COOKIE_VALUE/u);
  await assert.rejects(() => captureKdpLogin({ password: secret }, capabilities), /does not accept a password/u);
});

test("session check runs headless and distinguishes a bookshelf from sign-in", async () => {
  const root = await mkdtemp(join(tmpdir(), "kdp-session-"));
  const path = join(root, "state.json");
  await writeFile(path, '{"cookies":[],"origins":[]}\n', { mode: 0o600 });
  const valid = fakeBrowser();
  let validLaunch;
  assert.equal(await isKdpSessionValid({ storageState: path }, { launchChromium: async (options) => { validLaunch = options; return valid.browser; } }), true);
  assert.deepEqual(validLaunch, { headless: true });
  assert.deepEqual(valid.launches, [{ storageState: path }]);

  const expired = fakeBrowser({ url: "https://www.amazon.com/ap/signin", body: "Sign in to your account" });
  assert.equal(await isKdpSessionValid({ storageState: path }, { launchChromium: async () => expired.browser }), false);
  assert.equal(await isKdpSessionValid({ storageState: join(root, "missing.json") }, { launchChromium: async () => { throw new Error("must not launch"); } }), false);
});
