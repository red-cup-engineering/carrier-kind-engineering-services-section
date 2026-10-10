# Google Drive Services Section

This section publishes the house's content-addressed artifacts into Google Drive, where people and Gemini Notebook read them.
It writes through the `gdrive` rclone remote, which holds the Group's shared Google OAuth client and an offline Drive token.

- `src/publish-media.mjs` copies the files a media journal records into `561 Group/Media/<source>/<consumer>/` under their content-addressed names, with a `manifest.jsonl` that says what made each. rclone skips what Drive already holds, so a run sends only what is new.
  Google Flow's daily job runs it as its `finally` step, so Flow's output reaches Drive the run it is made.