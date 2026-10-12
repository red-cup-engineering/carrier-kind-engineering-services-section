---
title: "Programmable Interface Architectures — Five Systems Where Using IS Programming"
description: "Source-level survey of Plan 9, Emacs, Oberon, Lisp Machines, and Smalltalk as systems where the interface layer is itself the programming API. Mapped onto the design of terminal interfaces for knowledge-graph systems."
date-created: 2026-04-06
domain: computing
sources:
  - title: "The Use of Name Spaces in Plan 9"
    url: "https://9p.io/sys/doc/names.html"
  - title: "Acme: A User Interface for Programmers"
    url: "https://9p.io/sys/doc/acme/acme.html"
    authors: ["Rob Pike"]
    year: 2000
  - title: "GNU Emacs Lisp Reference — Keymaps"
    url: "https://www.gnu.org/software/emacs/manual/html_node/elisp/Keymaps.html"
  - title: "Project Oberon"
    url: "https://people.inf.ethz.ch/wirth/ProjectOberon/"
    authors: ["Niklaus Wirth", "Jürg Gutknecht"]
  - title: "Pharo by Example — Reflection"
    url: "http://pharo.gforge.inria.fr/PBE1/PBE1ch15.html"
  - title: "TRAMP User Manual"
    url: "https://www.gnu.org/software/tramp/"
---

## Programmable Interface Architectures

Five systems from five decades share a structural property: the boundary between using the system and programming the system does not exist. The interface IS the programming surface. This text surveys the specific mechanisms each system uses, because the mechanisms — not the philosophy — are what an implementation can learn from.

## Plan 9 — Per-Process Namespaces and 9P

Plan 9 from Bell Labs (1992) eliminates the Unix global filesystem namespace. Each process has its own mutable namespace. When user A mounts a remote resource at `/home/work`, that mount exists only in processes spawned by A. User B's processes see a different namespace.

The mechanism is the 9P protocol — a request-response file protocol (stat, read, write, open, close) that operates over any bidirectional byte stream: TCP, pipes, serial. To access a remote resource:

```
import -a tcp!remote-host!9P-port /mnt/remote
```

This establishes a 9P connection and attaches it into the local namespace at `/mnt/remote`. All file operations on `/mnt/remote/*` are forwarded to the remote server via 9P. Mounts attach to arbitrary points in the namespace tree and only affect the mounting process's view.

**Acme** (Rob Pike's editor) exposes each window as a 9P directory at `/mnt/acme/{window-id}/`. Inside: `body` and `tag` (text content), `addr` and `data` (random-access position/content), `ctl` (commands: get, del, write), and `event` (notification stream of edits and clicks). External programs script windows by reading and writing these files. A build pipeline writes code to one window's `body`, reads compiler errors from another, modifies specific ranges via `addr`/`data`. The editor surface is a file-system API.

**What this means for a TUI.** The per-process namespace is the boundary model: each user's view of the system IS their namespace, composed at connection time, not filtered at query time. 9P as the protocol between user environment and system resources means: any resource the TUI can show is a file the user can script against. Acme's window-as-file-server means: any view in the TUI could expose itself as a queryable/writable resource to user scripts.

## GNU Emacs — Keymap Inheritance and the Buffer Abstraction

Emacs maintains an ordered list of active keymaps, consulted in precedence order on each keystroke:

1. Minor-mode keymaps (in the order they were enabled, stored in `minor-mode-map-alist`)
2. Local keymap (the major mode's keymap)
3. Global keymap

A major mode is exclusive — one per buffer. It is defined via `define-derived-mode`, which creates a new keymap that inherits from a parent mode's keymap. Minor modes are composable — multiple can be active simultaneously, each contributing bindings via its keymap. Enabling a minor mode registers its keymap; disabling removes it.

Everything in Emacs is a buffer — files, directory listings (Dired), Git interfaces (Magit), shell sessions (Eshell), network connections. A buffer is a gap buffer of text with metadata (encoding, major mode, point, mark). File I/O, network I/O, and process I/O all funnel through `insert-file-contents` / `write-region`, which are overridable per mode. TRAMP exploits this: opening `/ssh:user@host:/path/file` hooks the I/O functions to establish SSH connections and execute remote commands, making remote files indistinguishable from local ones.

**What this means for a TUI.** The keymap inheritance model is the mode system: a navigation mode inherits from a base mode and adds spatial commands. A REPL mode inherits from base and adds evaluation. An editor mode adds file manipulation. The buffer-as-everything abstraction means: a room view, a REPL session, an entity inspector, and a channel feed are all the same kind of thing (a buffer/view with mode-specific behavior). TRAMP's transparent remote access means: entities in the knowledge graph could be accessed as if they were local files, with the boundary handling the translation.

## Oberon — Text as Command Invocation Surface

Oberon (Wirth and Gutknecht, 1992) tiles the display with non-overlapping viewers, each showing text. Any exported parameterless procedure in any loaded module is a valid command, named `Module.Procedure`.

When you middle-click on text:

1. The window manager identifies the viewer at the click position
2. The text handler extracts the word containing the clicked character
3. If the word matches `M.P` (module dot procedure), it dynamically loads module M and calls procedure P
4. Output appears in a designated viewer

This makes the entire display a command prompt. You write a procedure call in a comment, in documentation, in a note — anywhere — and middle-click it to execute. Procedures read parameters from a global parse state (`Oberon.OpenPar`), consuming typed values from a shared input stream.

**What this means for a TUI.** The "any text is a command" pattern maps to: entity IDs in the scrollback are clickable/actionable. If the output shows `task-123 [open]`, the user can act on `task-123` directly — `look task-123`, `dispatch task-123`, or (in an Oberon-like model) simply click/select it. The scrollback is not passive output — it's a surface of actionable references. Every entity ID the system renders is a handle the user can grab.

## Lisp Machines — The Unified Programmable Environment

Genera (Symbolics, 1982-) ran everything in one Lisp image. The editor (Zmacs), the debugger, the network browser, the mail client, and the window manager were not separate applications — they were packages in the same Lisp environment sharing the same object space. Modifying the editor meant evaluating a Lisp form that redefined a method. Debugging a network error meant inspecting the same objects the network stack used. There was no boundary between "the system" and "user code" — the system was Lisp objects, and the user wrote Lisp that touched them.

**What this means for a TUI.** The single-image model is what "programmable boundary surface" means concretely: the user's REPL and the system's internals share the same object space (in our case, the FARS entity graph). When the user evaluates `message("task-123")` in the REPL, they're calling the same function the daemon calls. The boundary restricts what entities are visible, but the mechanism is identical. There is no "user API" separate from "system API" — there is one API (`message()`) with scoping.

## Smalltalk — Reflective Object Model and Inspector Navigation

Smalltalk's method dispatch is uniform. When you send a message to an object:

1. Look up the object's class
2. Check the class's method dictionary (selector → CompiledMethod)
3. If found, execute; if not, walk the inheritance chain
4. If still not found, send `doesNotUnderstand:` (allowing dynamic interception)

The Inspector shows an object's state: instance variables on the left, values on the right. Clicking "inspect" on a value opens a new Inspector on that object. This creates a navigational path through the object graph — you click from object to object, inspecting fields, modifying state, sending arbitrary messages.

The Workspace is a text buffer where you write and execute Smalltalk. Select an expression and: "do it" executes, "print it" shows the return value inline, "inspect it" opens an Inspector on the result. All tools share the same object model and dispatch, so they compose: a workspace sends messages to objects, an inspector modifies state and sends messages, the debugger shows stack frames where you can inspect variables and resend messages.

**What this means for a TUI.** Inspector navigation IS spatial navigation. The knowledge graph is an object graph. `look` opens an inspector on the current entity. Following a relation (an exit) is clicking "inspect" on a reference. The REPL is a Workspace: evaluate expressions, inspect results, navigate from there. The entity's fiber IS its instance variables — `message(entity)` returns them the way `instVarAt:` does. The entire system is explorable by sending messages and inspecting results, which is exactly what `message()` + the TUI provides.

## The Converging Pattern

| System | Interface mechanism | Programming mechanism | Boundary between them |
|---|---|---|---|
| Plan 9 | Filesystem namespace | 9P read/write | None — the interface IS file operations |
| Emacs | Buffers with keymaps | Elisp evaluation | None — buffers ARE Lisp objects |
| Oberon | Tiled text viewers | Middle-click procedure calls | None — text IS executable |
| Genera | Lisp windows | Lisp evaluation | None — windows ARE Lisp objects |
| Smalltalk | Inspectors + workspaces | Message sends | None — inspecting IS messaging |

All five eliminate the same boundary. The interface is not a view OVER the programming model — it IS the programming model rendered for human interaction. Using the system and programming the system are the same act performed at different levels of intention.

For a knowledge-graph TUI, the mapping is: entities are objects (Smalltalk), fibers are instance variables, rooms are inspectors, navigation is following references, commands are message sends, the REPL evaluates against the current fiber context, and the scrollback is an actionable surface of entity references (Oberon). The user's namespace (Plan 9) scopes what they can see. Their modes (Emacs) determine what keystrokes do. Their environment (Genera) shares the system's object space. Using the TUI and programming the system are the same act.
