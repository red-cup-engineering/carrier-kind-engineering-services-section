import { htmlRepr, jsonRepr } from "@red-cup-engineering/http-services-section/representation";

import { createHiveLoginApp } from "@red-cup-engineering/hive-keychain-login-service";
import { readJsonBody } from "@red-cup-engineering/http-services-section/body";
import { renderLoginPage } from "./login-page.mjs";

/** Bind the generic HTTP/session carrier to the central Hive Keychain challenge capability. */
export function hiveLoginApp(params) {
  return createHiveLoginApp({ ...params, htmlRepr, jsonRepr, readJsonBody, renderLoginPage });
}
