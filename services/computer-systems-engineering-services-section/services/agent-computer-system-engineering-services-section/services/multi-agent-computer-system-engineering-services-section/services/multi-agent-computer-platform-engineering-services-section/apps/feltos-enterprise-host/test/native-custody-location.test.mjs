import assert from "node:assert/strict";
import test, {after} from "node:test";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import { enterpriseWebConfig } from "../src/instance-config.mjs";
const installed={identity:{id:"fixture",title:"Fixture"},applications:[],schedules:[],capabilities:[],web:{companions:[],networkSources:[]}};
const settings={METROPLAT_REPOSITORY_ROOT:"/not-a-live-repository",METROPLAT_WEB_STATE_DIR:"/not-a-live-state",METROPLAT_DATA_ROOT:"/not-a-live-data",PUBLIC_BASE_URL:"https://fixture.invalid",SESSION_SECRET:"fixture-only-not-a-secret",ACTIVITYPUB_ORIGIN:"https://fixture.invalid",ACTIVITYPUB_IDENTIFIER:"fixture",ACTIVITYPUB_ACTOR_NAME:"Fixture",ACTIVITYPUB_ACTOR_SUMMARY:"Fixture",ACTIVITYPUB_KEYS_PATH:"/not-a-live-key"};
const directory=mkdtempSync(join(tmpdir(),"native-location-"));
writeFileSync(join(directory,"pnpm-workspace.yaml"),"packages: []\n");
after(()=>rmSync(directory,{recursive:true,force:true}));
const configure=extra=>enterpriseWebConfig(installed,join(directory,"instance.json"),{...settings,...extra});
test("host forwards an explicit native receiving directory without inventing a SQL locator",()=>{
 for(const mode of [{},{ACTIVITYPUB_NODE_HOST:"fixture.invalid"}]) {
  const config=configure({...mode,ACTIVITYPUB_STATE_DIR:"/not-a-live-received-state"});
  assert.equal(config.activityPub.stateDirectory,"/not-a-live-received-state");
  assert.equal(Object.hasOwn(config.activityPub,"statePath"),false);
 }
});
test("historical configuration retains its obstruction locator and rejects contradictory native selection",()=>{
 assert.equal(configure({}).activityPub.statePath,"/not-a-live-state/activitypub.sqlite");
 assert.equal(configure({ACTIVITYPUB_SQLITE_PATH:"/not-a-live-historical.sqlite"}).activityPub.statePath,"/not-a-live-historical.sqlite");
 for(const mode of [{},{ACTIVITYPUB_NODE_HOST:"fixture.invalid"}]) assert.throws(()=>configure({...mode,ACTIVITYPUB_STATE_DIR:"/not-a-live-received-state",ACTIVITYPUB_SQLITE_PATH:"/not-a-live-historical.sqlite"}),/cannot be combined/);
});
