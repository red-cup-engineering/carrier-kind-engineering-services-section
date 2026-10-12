#!/usr/bin/env python3
"""
mud_peewee_server.py
Single-file MUD server using Peewee + asyncio.
- ECS over a typed edge store.
- Modalities: shape(Π→), box(□→), diamond(◇←), nabla(∇←).
- C = □◇ read slice, M = ◇□ write normalization.
- Telnet server, simple commands: look, go <dir>, say <msg>, who, hp, attack <name>, help, quit.

Requirements: Python 3.9+, peewee
Run: python mud_peewee_server.py
Connect: telnet 127.0.0.1 4000
"""

from __future__ import annotations

import asyncio
import json
import os
import signal
import sys
import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from peewee import (
    SqliteDatabase, Model, TextField, FloatField, AutoField, IntegerField, fn, DoesNotExist
)

# ---------- util ----------

def now_ts() -> float:
    return time.time()

def inf_ts() -> float:
    return 2**63 - 1

def gen_id() -> str:
    return str(uuid.uuid4())

DB_PATH = os.environ.get("MUD_DB", ":memory:")
db = SqliteDatabase(DB_PATH, pragmas={
    "journal_mode": "wal",
    "foreign_keys": 0,
    "cache_size": -64_000,
})

# ---------- schema ----------

class BaseModel(Model):
    class Meta:
        database = db

class Entity(BaseModel):
    id = TextField(primary_key=True)
    kind = TextField()

class Edge(BaseModel):
    id = AutoField()
    src = TextField()
    rel = TextField()
    dst = TextField()
    data = TextField(default="{}")
    t_valid_from = FloatField()
    t_valid_to = FloatField()

class Intent(BaseModel):
    id = TextField(primary_key=True)
    actor = TextField()
    op = TextField()
    payload = TextField()
    t_client = FloatField()
    t_ingest = FloatField()

def init_schema() -> None:
    db.connect(reuse_if_open=True)
    db.create_tables([Entity, Edge, Intent])

# ---------- world api ----------

def add_entity(kind: str, eid: Optional[str] = None) -> str:
    eid = eid or gen_id()
    Entity.insert(id=eid, kind=kind).on_conflict_replace().execute()
    return eid

def add_edge(src: str, rel: str, dst: str, data: Dict[str, Any] | None = None,
             t_from: Optional[float] = None, t_to: Optional[float] = None) -> int:
    return Edge.insert(
        src=src, rel=rel, dst=dst,
        data=json.dumps(data or {}),
        t_valid_from=t_from if t_from is not None else now_ts(),
        t_valid_to=t_to if t_to is not None else inf_ts(),
    ).execute()

def expire_edges(where: Any) -> int:
    return Edge.update(t_valid_to=now_ts()).where(where & (Edge.t_valid_to > now_ts())).execute()

def active_edges(where: Any) -> List[Edge]:
    return list(Edge.select().where(where & (Edge.t_valid_to > now_ts())))

def get_name(eid: str) -> str:
    row = Edge.select().where(
        (Edge.src == eid) & (Edge.rel == "has_name") & (Edge.dst == "name") & (Edge.t_valid_to > now_ts())
    ).order_by(Edge.t_valid_from.desc()).first()
    if row:
        try:
            return json.loads(row.data).get("value", eid)
        except Exception:
            return eid
    return eid

def set_name(eid: str, name: str) -> None:
    expire_edges((Edge.src == eid) & (Edge.rel == "has_name") & (Edge.dst == "name"))
    add_edge(eid, "has_name", "name", {"value": name})

def current_room(eid: str) -> Optional[str]:
    row = Edge.select().where(
        (Edge.src == eid) & (Edge.rel == "at") & (Edge.t_valid_to > now_ts())
    ).order_by(Edge.t_valid_from.desc()).first()
    return row.dst if row else None

def room_occupants(rid: str) -> List[str]:
    return [e.src for e in active_edges((Edge.rel == "at") & (Edge.dst == rid))]

def room_exits(rid: str) -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []
    for e in active_edges((Edge.rel == "exit") & (Edge.src == rid)):
        try:
            d = json.loads(e.data).get("dir", "?")
        except Exception:
            d = "?"
        out.append((d, e.dst))
    return out

def ingest_intent(actor: str, op: str, payload: Dict[str, Any], t_client: Optional[float] = None) -> None:
    Intent.insert(
        id=gen_id(), actor=actor, op=op, payload=json.dumps(payload),
        t_client=t_client if t_client is not None else now_ts(),
        t_ingest=now_ts()
    ).execute()

# ---------- modalities ----------

def shape() -> List[Edge]:
    return active_edges((Edge.rel.in_(("exit", "at"))))

def box(delta_t: float) -> List[Edge]:
    t = now_ts() + delta_t
    q = (Edge.t_valid_to > t) & ~Edge.select(fn.COUNT(Edge.id)).where(
        (Edge.src == Edge.alias("s").src)  # not directly usable; we handle with NOT EXISTS below
    )
    # Peewee NOT EXISTS for stuns
    s = Edge.alias("s")
    return list(
        Edge.select().where(
            (Edge.t_valid_to > t) &
            (~Edge.select(s.id).where(
                (s.src == Edge.src) & (s.rel == "stuns") & (s.t_valid_to > t)
            ).exists())
        )
    )

def diamond_for(observer: str) -> List[Edge]:
    vis = (Edge
           .select(Edge.dst.alias("target"))
           .where((Edge.rel == "can_see") & (Edge.src == observer) & (Edge.t_valid_to > now_ts())))
    return list(
        Edge.select().where(
            (Edge.t_valid_to > now_ts()) &
            ((Edge.dst.in_(vis)) | (Edge.src.in_(vis.select(vis.c.target))))
        )
    )

def nabla() -> List[Edge]:
    return active_edges(Edge.rel.in_(("member", "subscribed", "system_event", "msg")))

# ---------- C/M ----------

@dataclass
class Proposal:
    actor: str
    op: str
    data: Dict[str, Any]

def normalize_M(proposals: List[Proposal], delta_t: float) -> List[Proposal]:
    t = now_ts() + delta_t
    ok: List[Proposal] = []
    for p in proposals:
        stunned = Edge.select().where(
            (Edge.src == p.actor) & (Edge.rel == "stuns") & (Edge.t_valid_to > t)
        ).exists()
        if stunned:
            continue
        if p.op == "move":
            if not all(k in p.data for k in ("from_room", "to_room", "dir")):
                continue
            has_exit = Edge.select().where(
                (Edge.rel == "exit") & (Edge.src == p.data["from_room"]) &
                (Edge.dst == p.data["to_room"]) & (Edge.t_valid_to > t)
            ).exists()
            if not has_exit:
                continue
        ok.append(p)

    merged: Dict[Tuple[str, str], Proposal] = {}
    out: List[Proposal] = []
    for p in ok:
        if p.op == "damage":
            key = (p.data.get("target", ""), p.data.get("combat_id", ""))
            if key in merged:
                merged[key].data["amount"] = merged[key].data.get("amount", 0) + p.data.get("amount", 0)
            else:
                merged[key] = Proposal(p.actor, p.op, dict(p.data))
        else:
            out.append(p)
    out.extend(merged.values())
    return out

# ---------- systems ----------

def sys_movement() -> List[Proposal]:
    props: List[Proposal] = []
    for it in list(Intent.select().where(Intent.op == "move")):
        props.append(Proposal(actor=it.actor, op="move", data=json.loads(it.payload)))
    return props

def sys_chat() -> List[Proposal]:
    props: List[Proposal] = []
    for it in list(Intent.select().where(Intent.op == "chat")):
        props.append(Proposal(actor=it.actor, op="chat", data=json.loads(it.payload)))
    return props

def sys_basic_combat() -> List[Proposal]:
    t = now_ts()
    props: List[Proposal] = []
    # coloc
    coloc = list(Edge.select(Edge.src.alias("who"), Edge.dst.alias("room"))
                 .where((Edge.rel == "at") & (Edge.t_valid_to > t)))
    room_by = {}
    for r in coloc:
        room_by.setdefault(r.room, []).append(r.who)
    # hostile pairs in same room
    hostile = list(Edge.select().where((Edge.rel == "hostile") & (Edge.t_valid_to > t)))
    for h in hostile:
        for r, occupants in room_by.items():
            if h.src in occupants and h.dst in occupants:
                props.append(Proposal(actor=h.src, op="damage",
                                      data={"target": h.dst, "amount": 1, "combat_id": r}))
    return props

def perception_tick() -> None:
    t = now_ts()
    expire_edges((Edge.rel == "can_see"))
    coloc = list(Edge.select(Edge.src.alias("who"), Edge.dst.alias("room"))
                 .where((Edge.rel == "at") & (Edge.t_valid_to > t)))
    by_room: Dict[str, List[str]] = {}
    for r in coloc:
        by_room.setdefault(r.room, []).append(r.who)
    for occ in by_room.values():
        for a in occ:
            for b in occ:
                if a != b:
                    add_edge(a, "can_see", b, {}, t_from=t, t_to=t + 1.0)

# ---------- commit ----------

def apply(proposals: List[Proposal]) -> None:
    t_now = now_ts()
    for p in proposals:
        if p.op == "move":
            actor = p.actor
            to_room = p.data["to_room"]
            expire_edges((Edge.src == actor) & (Edge.rel == "at"))
            add_edge(actor, "at", to_room, {"via": p.data.get("dir", "")}, t_from=t_now)
            add_edge(actor, "system_event", "moved", {"to": to_room}, t_from=t_now, t_to=t_now + 5)
        elif p.op == "chat":
            chan = p.data["channel"]
            text = p.data["text"]
            add_edge(chan, "msg", p.actor, {"text": text, "t": t_now}, t_from=t_now, t_to=t_now + 60)
        elif p.op == "damage":
            target = p.data["target"]
            amt = int(p.data.get("amount", 0))
            hp_row = (Edge.select()
                      .where((Edge.src == target) & (Edge.rel == "has_stat") & (Edge.dst == "hp") & (Edge.t_valid_to > t_now))
                      .order_by(Edge.t_valid_from.desc()).first())
            cur_hp = 10
            if hp_row:
                try:
                    cur_hp = json.loads(hp_row.data).get("value", 10)
                except Exception:
                    cur_hp = 10
                expire_edges((Edge.id == hp_row.id))
            new_hp = max(0, cur_hp - amt)
            add_edge(target, "has_stat", "hp", {"value": new_hp}, t_from=t_now)
            if new_hp == 0:
                add_edge(target, "system_event", "downed", {"by": p.actor}, t_from=t_now, t_to=t_now + 10)
    Intent.delete().execute()

# ---------- engine ----------

class Engine:
    def __init__(self, delta_t: float = 0.100):
        self.delta_t = delta_t
        self._lock = asyncio.Lock()

    async def tick(self, observer: Optional[str] = None) -> None:
        async with self._lock:
            perception_tick()
            # C slice used implicitly by systems
            props: List[Proposal] = []
            props += sys_movement()
            props += sys_chat()
            props += sys_basic_combat()
            props = normalize_M(props, self.delta_t)
            apply(props)

    async def run(self, interval: float = 0.100) -> None:
        while True:
            await self.tick()
            await asyncio.sleep(interval)

# ---------- bootstrap world ----------

def bootstrap() -> Dict[str, str]:
    # rooms
    r1, r2, r3 = add_entity("room"), add_entity("room"), add_entity("room")
    # exits with dir
    add_edge(r1, "exit", r2, {"dir": "east"})
    add_edge(r2, "exit", r1, {"dir": "west"})
    add_edge(r2, "exit", r3, {"dir": "east"})
    add_edge(r3, "exit", r2, {"dir": "west"})
    # global channel
    chan = add_entity("channel")
    return {"room1": r1, "room2": r2, "room3": r3, "chan": chan}

# ---------- renderer ----------

def render_view(pid: str) -> str:
    rid = current_room(pid)
    if not rid:
        return "You are nowhere."
    name = get_name(pid)
    # room header
    s = []
    s.append(f"Room {rid}")
    # occupants
    occ = room_occupants(rid)
    occ_names = [get_name(o) for o in occ if o != pid]
    s.append("You see: " + (", ".join(occ_names) if occ_names else "no one"))
    # exits
    ex = room_exits(rid)
    if ex:
        s.append("Exits: " + ", ".join(sorted(d for d, _ in ex)))
    else:
        s.append("Exits: none")
    # hp
    hp_row = (Edge.select()
              .where((Edge.src == pid) & (Edge.rel == "has_stat") & (Edge.dst == "hp") & (Edge.t_valid_to > now_ts()))
              .order_by(Edge.t_valid_from.desc()).first())
    if hp_row:
        try:
            hp = json.loads(hp_row.data).get("value", 10)
        except Exception:
            hp = 10
    else:
        hp = 10
    s.append(f"HP: {hp}")
    # recent messages in room channel (room-local)
    msgs = list(Edge.select().where(
        (Edge.src == rid) & (Edge.rel == "msg") & (Edge.t_valid_to > now_ts())
    ).order_by(Edge.t_valid_from.desc()).limit(5))
    if msgs:
        s.append("Recent chatter:")
        for m in reversed(msgs):
            d = json.loads(m.data)
            s.append(f"  {get_name(m.dst)}: {d.get('text','')}")
    return "\n".join(s)

# ---------- command parser ----------

def parse_and_ingest(pid: str, line: str) -> str:
    parts = line.strip().split()
    if not parts:
        return ""
    cmd, *args = parts
    cmd = cmd.lower()
    if cmd in ("look", "l"):
        return render_view(pid)
    if cmd in ("say", "'"):
        if not args:
            return "Say what?"
        rid = current_room(pid)
        if not rid:
            return "You are nowhere."
        text = " ".join(args)
        add_edge(rid, "msg", pid, {"text": text, "t": now_ts()}, t_to=now_ts() + 30)
        return "You say it."
    if cmd in ("go", "move"):
        if not args:
            return "Go where?"
        dir_ = args[0].lower()
        rid = current_room(pid)
        if not rid:
            return "You are nowhere."
        # find exit by dir
        target = None
        for d, dst in room_exits(rid):
            if d.lower().startswith(dir_):
                target = dst
                break
        if not target:
            return "No exit that way."
        ingest_intent(pid, "move", {"from_room": rid, "to_room": target, "dir": dir_})
        return "You start moving."
    if cmd == "who":
        players = list(Entity.select().where(Entity.kind == "player"))
        return "Players: " + ", ".join(sorted(get_name(p.id) for p in players)) if players else "No players."
    if cmd == "hp":
        return render_view(pid).splitlines()[-2]  # HP line
    if cmd == "attack":
        if not args:
            return "Attack whom?"
        # resolve visible by name prefix
        rid = current_room(pid)
        if not rid:
            return "You are nowhere."
        occ = [o for o in room_occupants(rid) if o != pid]
        target = None
        for o in occ:
            if get_name(o).lower().startswith(" ".join(args).lower()):
                target = o
                break
        if not target:
            return "Target not found."
        # set hostility to drive AI loop
        add_edge(pid, "hostile", target, {})
        return f"You engage {get_name(target)}."
    if cmd in ("help", "?"):
        return ("Commands: look|l, say <msg>, go <dir>, who, hp, attack <name>, quit\n"
                "Dirs: north south east west (use first letter).")
    if cmd in ("quit", "exit"):
        raise KeyboardInterrupt
    return "Unknown."

# ---------- sessions ----------

class Session:
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter, engine: Engine, seed: Dict[str,str]):
        self.r = reader
        self.w = writer
        self.engine = engine
        self.ids = seed
        self.pid: Optional[str] = None
        self.addr = writer.get_extra_info("peername")

    async def send(self, s: str) -> None:
        self.w.write((s + "\n").encode())
        await self.w.drain()

    async def prompt(self) -> None:
        self.w.write(b"> ")
        await self.w.drain()

    async def login(self) -> None:
        await self.send("Name:")
        name = (await self.r.readline()).decode().strip()
        if not name:
            name = f"Player-{uuid.uuid4().hex[:4]}"
        # load or create
        p = Entity.select().where((Entity.kind == "player")).join(Edge, join_type="LEFT OUTER", on=(Edge.src == Entity.id)).first()
        # find existing by has_name
        found: Optional[str] = None
        q = (Edge.select(Edge.src)
             .where((Edge.rel == "has_name") & (Edge.dst == "name") & (Edge.t_valid_to > now_ts())))
        for e in q:
            try:
                if json.loads(e.data).get("value", "").lower() == name.lower():
                    found = e.src
                    break
            except Exception:
                pass
        self.pid = found or add_entity("player")
        set_name(self.pid, name)
        # spawn if needed
        if not current_room(self.pid):
            add_edge(self.pid, "at", self.ids["room1"], {})
            add_edge(self.pid, "has_stat", "hp", {"value": 10})
        # join global channel
        add_edge(self.pid, "member", self.ids["chan"], {})
        await self.send(f"Welcome, {name}. Type 'help'.")

    async def loop(self) -> None:
        assert self.pid
        await self.send(render_view(self.pid))
        await self.prompt()
        while True:
            line = await self.r.readline()
            if not line:
                break
            try:
                out = parse_and_ingest(self.pid, line.decode())
            except KeyboardInterrupt:
                break
            if out:
                await self.send(out)
            # give the engine a chance to process
            await self.engine.tick(observer=self.pid)
            await self.send(render_view(self.pid))
            await self.prompt()

async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter, engine: Engine, seed: Dict[str,str]):
    sess = Session(reader, writer, engine, seed)
    try:
        await sess.login()
        await sess.loop()
    except Exception as e:
        # silent close
        pass
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass

# ---------- main ----------

async def main(host: str = "0.0.0.0", port: int = 4000):
    init_schema()
    seed = bootstrap()

    # demo NPC in room2
    gob = add_entity("npc")
    set_name(gob, "Goblin")
    add_edge(gob, "at", seed["room2"], {})
    add_edge(gob, "has_stat", "hp", {"value": 5})

    engine = Engine(delta_t=0.100)
    loop_task = asyncio.create_task(engine.run(0.100))

    server = await asyncio.start_server(lambda r, w: handle_client(r, w, engine, seed), host, port)
    print(f"Listening on {host}:{port}")
    async with server:
        await server.serve_forever()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nBye.")
