# micropub-services-section

The Micropub protocol (W3C Recommendation): request parsing, the post source and what updates do to
it, scopes, and the endpoint application. Consumed by the web server; carries no server of its own.
Storage-neutral: `write(command, authorization, { before, after })`, `source(url)`, `writeMedia(file)`
and `observe(observation)` are the seams.

- **Syntax** (3.1-3.3): JSON, `application/x-www-form-urlencoded` and `multipart/form-data`; `name[]`
  is an array and the same property as `name`; `h` is the type (default `h-entry`); `mp-*` are server
  commands in `command.mp`, never post properties; `access_token` is never stored.
- **Create** answers 201 (or 202 when the writer accepts asynchronously) with `Location`. File parts
  of a multipart create go to `writeMedia` and their URLs are filed under the property they were sent
  as, or are handed to `write` as `command.files`.
- **Update** (3.4): `applyMicropubUpdate(source, command)` is the normative replace / add / delete
  semantics. It answers 204, 200 with a body, or 201 with `Location` when the URL changed. **Delete**
  and **undelete** (3.5) likewise.
- **Queries** (3.7): `q=config`, `q=syndicate-to`, `q=source` (the whole source with `type`, or only the
  requested `properties`).
- **Authentication**: the token in the `Authorization` header or the form `access_token` (a token by
  both is `invalid_request`). Errors follow 3.8: no token is 401 `unauthorized`; a token without
  permission is 403 `forbidden`; too little scope is 401 `insufficient_scope`.
- **Monotone store**: `micropubChangeRelations(subject, before, after)` tells a change as relations,
  what left against and what arrived for, so a delete is a recorded denial and an undelete its
  re-affirmation. The endpoint observes updates and deletes this way when it can read the source.

`test/micropub-conformance.test.mjs` states the micropub.rocks server test families (form and JSON
create, update, delete, queries, authentication) as tests.
