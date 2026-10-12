import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openWorldStore} from '@red-cup-engineering/feltos/world-host';
import {tell,value,declareFunctional,exitsOf} from '@red-cup-engineering/feltos/world';
import {practice} from '@red-cup-engineering/feltos/skills';
import {agencyMoved,releaseAgency} from '@red-cup-engineering/organizing/agency/held';
import {createMetroplex} from '../src/metroplex.mjs';

test('a standalone enterprise city retains people, agent skills and authored worlds through restart and agency rebuild',async()=>{
 const root=mkdtempSync(join(tmpdir(),'metro-persistent-world-'));
 const section=join(root,'services','workshop');mkdirSync(section,{recursive:true});
 writeFileSync(join(section,'README.md'),'# Workshop\n\nAn inhabited workshop.\n');
 writeFileSync(join(section,'package.json'),JSON.stringify({name:'fixture-workshop',version:'1.0.0',description:'A shared workshop',exports:{'.':'./src/index.mjs'}}));
 const notes=join(section,'content/text/documents/articles/notes/2026/10/07');mkdirSync(notes,{recursive:true});writeFileSync(join(notes,'practice.md'),'A practiced workshop.');
 const binding={agencyRoot:root,dataRoot:join(root,'state')};
 const options={binding,operations:()=>[],identity:{title:'Living enterprise'}};
 const frontier=join(binding.dataRoot,'world','frontier.json');
 try{
  let city=createMetroplex(options);
  const visitor=await city.connect('visitor'),agent=await city.connect('agent-worker');
  const travel=await city.command('visitor','travel services/workshop');
  assert.equal(travel.situation.place,'section:workshop');
  assert.match(travel.messages.join('\n'),/inhabited workshop/);
  const holdings=await city.command('visitor','look the package fixture-workshop');
  assert.match(holdings.messages.join('\n'),/shared workshop/);
  let store=openWorldStore({kind:'file',path:frontier}),engine=store.load().engine;
  const garden='world:living-garden',orchard='orchard',area='growing-beds';
  const method={verb:'read',capability:'metroplat.metroplex',description:'Read the growing book',requires:{skills:{gardening:20},areas:[area]}};
  let world=declareFunctional(engine.world,['exit:orchard','exit:back','exit-requires:orchard','offers-action:read:metroplat.metroplex']);
  world=tell(world,[
   {subject:garden,predicate:'kind',object:'world'},
   {subject:garden,predicate:'name',object:'The living garden'},
   {subject:garden,predicate:'part-of',object:engine.game.dimension},
   {subject:garden,predicate:'action-policy',object:'authored'},
   {subject:garden,predicate:'offers-action:read:metroplat.metroplex',object:method},
   {subject:area,predicate:'kind',object:'area'},
   {subject:area,predicate:'name',object:'The growing beds'},
   {subject:area,predicate:'part-of',object:garden},
   {subject:orchard,predicate:'kind',object:'room'},
   {subject:orchard,predicate:'name',object:'The orchard'},
   {subject:orchard,predicate:'description',object:'A world authored after startup.'},
   {subject:orchard,predicate:'part-of',object:area},
   {subject:orchard,predicate:'exit:back',object:'metroplex'},
   {subject:'metroplex',predicate:'exit:orchard',object:orchard},
   {subject:'metroplex',predicate:'exit-requires:orchard',object:{skills:{gardening:20}}},
  ],{source:'world-author'});
  world=practice(world,agent.actor,'gardening',25).world;
  store.save({...engine,world});store.close();
  city=createMetroplex(options);
  assert.equal((await city.connect('visitor')).actor,visitor.actor);
  assert.equal((await city.command('visitor','where')).situation.place,'section:workshop');
  await city.command('visitor','travel plaza');
  const refused=await city.command('visitor','go orchard');
  assert.equal(refused.situation.place,'metroplex');
  assert.match(refused.messages.join('\n'),/requires gardening 20/);
  assert.equal((await city.connect('agent-worker')).actor,agent.actor);
  const entered=await city.command('agent-worker','go orchard',undefined,{frame:true});
  assert.equal(entered.situation.world,garden);
  assert.equal(entered.situation.area,area);
  assert(entered.situation.actions.some(action=>action.command==='read'));
  assert.deepEqual(entered.frame.situation,entered.situation);
  const offices=join(section,'lib/agency/offices');mkdirSync(offices,{recursive:true});
  writeFileSync(join(offices,'gardener.json'),JSON.stringify({id:'office:gardener',name:'Garden office',kind:'office','normative-structure':'Care for the living rooms','deontic-profile':{}}));
  agencyMoved(root,'services/workshop/lib/agency/offices/gardener.json');
  const revised=await city.command('agent-worker','where');
  assert.equal(revised.situation.place,orchard,'an actual agency revision preserves the inhabited graph');
  assert((await city.atlas()).rooms.some(room=>room.things?.office===1),'the same revision introduces the authored office');
  await city.rebuild();
  const rebuilt=await city.command('agent-worker','where');
  assert.equal(rebuilt.situation.place,orchard);
  assert.equal(rebuilt.situation.world,garden);
  store=openWorldStore({kind:'file',path:frontier});engine=store.load().engine;
  assert.equal(value(engine.world,agent.actor,'skill:gardening'),25);
  assert.equal(value(engine.world,visitor.actor,'skill:gardening'),null);
  assert.equal(JSON.parse(readFileSync(frontier,'utf8')).kind,'content-reference.frontier.v1');
  store.close();
 }finally{releaseAgency(root);rmSync(root,{recursive:true,force:true});}
});

test('city travel uses the current skill-gated route instead of bypassing a withheld exit',async()=>{
 const root=mkdtempSync(join(tmpdir(),'metro-route-admission-'));
 const section=join(root,'services','workshop');mkdirSync(section,{recursive:true});writeFileSync(join(section,'README.md'),'# Workshop\n\nA shared workshop.\n');writeFileSync(join(section,'package.json'),JSON.stringify({name:'fixture-workshop',version:'1.0.0',description:'A shared workshop'}));
 const binding={agencyRoot:root,dataRoot:join(root,'state')},options={binding,operations:()=>[],identity:{title:'A routed city'}};
 try{
  let city=createMetroplex(options);const actor=(await city.connect('visitor')).actor;
  const path=join(binding.dataRoot,'world','frontier.json');let store=openWorldStore({kind:'file',path}),engine=store.load().engine;
  const exit=exitsOf(engine.world,'metroplex').find(e=>e.destination==='section:workshop');assert(exit);
  engine={...engine,world:tell(declareFunctional(engine.world,['exit-requires:'+exit.direction]),{subject:'metroplex',predicate:'exit-requires:'+exit.direction,object:{skills:{building:20}}},{source:'world-author'})};
  store.save(engine);store.close();city=createMetroplex(options);
  const refused=await city.command('visitor','travel services/workshop');assert.equal(refused.situation.place,'metroplex');assert.match(refused.messages.join('\n'),/no eligible route/);
  store=openWorldStore({kind:'file',path});engine=store.load().engine;store.save({...engine,world:practice(engine.world,actor,'building',25).world});store.close();city=createMetroplex(options);
  const travelled=await city.command('visitor','travel services/workshop');assert.equal(travelled.situation.place,'section:workshop');assert.match(travelled.messages.join('\n'),/shared workshop/);
 }finally{releaseAgency(root);rmSync(root,{recursive:true,force:true});}
});
