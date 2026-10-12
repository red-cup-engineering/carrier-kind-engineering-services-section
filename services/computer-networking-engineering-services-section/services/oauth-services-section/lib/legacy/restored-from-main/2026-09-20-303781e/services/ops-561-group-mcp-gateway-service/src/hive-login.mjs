import { htmlRepr, jsonRepr } from "@red-cup-engineering/form-http-response-representation-service";
import { createHiveLoginApp } from "@red-cup-engineering/hive-keychain-login-service";
import { readJsonBody } from "@red-cup-engineering/read-http-request-body-service";
import { renderLoginPage } from "./login-page.mjs";

/** Bind the generic HTTP/session carrier to the central Hive Keychain challenge capability. */
export function hiveLoginApp(params) {
  return createHiveLoginApp({ ...params, htmlRepr, jsonRepr, readJsonBody, renderLoginPage });
}
