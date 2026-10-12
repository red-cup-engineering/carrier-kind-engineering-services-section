;;;; TAB engine core
;;;;
;;;; Things with Attributes and Behaviors.
;;;; A thing is a table of attributes whose methods come from named
;;;; behaviors, resolved at creation time into a cached dispatch table.
;;;; Models are data; behaviors are code. Composition is additive.

(local fennel (require :fennel))
(local conf (require :conf))

(local util {})

;; ──────────────────────────────────────
;; Logging
;; ──────────────────────────────────────

(local log-levels {:critical 1 :error 2 :warning 3
                   :info 4 :debug 5 :spam 6})

(fn util.log [level message]
  (when (>= (. log-levels conf.log-level)
            (. log-levels level))
    (print (.. (os.date "%Y%m%d:%H%M" (os.time))
               "> " level ": " message))))

;; ──────────────────────────────────────
;; Strings
;; ──────────────────────────────────────

(fn util.split-string [s ?sep]
  "Split S on whitespace (or ?SEP pattern). Return a sequential table."
  (icollect [word (s:gmatch (or ?sep "%S+"))] word))

(fn util.quibble-strings [strings ?sort]
  "Join STRINGS with commas and 'and'. Oxford comma."
  (let [strs (if ?sort
                 (doto (icollect [_ s (ipairs strings)] s)
                       (table.sort))
                 strings)
        n (length strs)]
    (match n
      0 ""
      1 (. strs 1)
      2 (.. (. strs 1) " and " (. strs 2))
      _ (let [parts (icollect [i s (ipairs strs)]
                      (if (= i n) (.. "and " s)
                          (.. s ",")))]
          (table.concat parts " ")))))

;; ──────────────────────────────────────
;; Files
;; ──────────────────────────────────────

;; Module-level cache: path → evaluated contents.
(local file-cache {})

(fn util.load-file [path ?fallback]
  "Load and eval a .fnl file, caching the result. Returns nil on missing file
   unless ?FALLBACK is provided (in which case it's saved and returned)."
  (match (. file-cache path)
    cached cached
    _ (let [f (io.open (.. path ".fnl") :r)]
        (if f
            (let [data (fennel.eval (f:read "*all"))]
              (f:close)
              (tset file-cache path data)
              data)
            (when ?fallback
              (util.save-file ?fallback path)
              (tset file-cache path ?fallback)
              ?fallback)))))

(fn util.save-file [data path]
  "Write DATA as a Fennel literal to PATH.fnl."
  (match (io.open (.. path ".fnl") :w)
    f (do (f:write (fennel.view data)) (f:close))
    (_ err) (do (os.execute (.. "mkdir -p "
                                (string.match path "(.*[/\\])")))
                (util.save-file data path))))

(fn util.scan-directory [path ?recurse ?type ?strip-ext]
  "List files under PATH using `find`. Returns sequential table of relative paths."
  (let [cmd (.. "find \"" path "\""
                (if ?recurse "" " -maxdepth 1")
                (if ?type (.. " -type " ?type) ""))
        results (io.popen cmd)
        matches []]
    (each [line (results:lines)]
      (let [rel (line:sub (+ 2 (length path)))]
        (when (> (length rel) 0)
          (table.insert matches (if ?strip-ext (rel:sub 1 -5) rel)))))
    matches))

;; ──────────────────────────────────────
;; Tables & sequences
;; ──────────────────────────────────────

(fn util.clone-table [tab ?addn]
  "Shallow-copy TAB. Merge ?ADDN keys if given."
  (let [clone (collect [k v (pairs tab)] k v)]
    (when ?addn
      (each [k v (pairs ?addn)] (tset clone k v)))
    clone))

(fn util.collect-keys [tbl ?sort]
  "Return a sequential table of TBL's keys."
  (let [keys (icollect [k _ (pairs tbl)] k)]
    (when ?sort (table.sort keys))
    keys))

(fn util.find-element [seq query]
  "Does SEQ contain QUERY?"
  (accumulate [found false _ v (ipairs seq) &until found]
    (= v query)))

(fn util.drop-dupes [seq]
  "Return SEQ with duplicates removed (first occurrence kept)."
  (let [seen {} out []]
    (each [_ v (ipairs seq)]
      (when (not (. seen v))
        (tset seen v true)
        (table.insert out v)))
    out))

(fn util.remove-value [seq val]
  "Return SEQ with VAL removed (first occurrence)."
  (icollect [_ v (ipairs seq)]
    (when (not= v val) v)))

;; ──────────────────────────────────────
;; Model loading & merging
;; ──────────────────────────────────────

(fn util.load-model [model-name]
  "Load a model definition from the models directory."
  (let [path (.. (or conf.models-folder :models) "/" model-name)]
    (or (util.load-file path)
        (do (util.log :error (.. "Failed to load model: " model-name))
            nil))))

(fn util.clone-model [model-name]
  (let [m (util.load-model model-name)]
    (when m (collect [k v (pairs m)] k v))))

(fn util.collect-bases [thing ?collection ?prepend]
  "Walk the :base chain recursively, collecting model names.
   Deeper bases end up earlier in the list."
  (let [coll (or ?collection [])]
    (when thing.base
      (let [bases (match (type thing.base)
                    :string [thing.base]
                    :table  thing.base)]
        (each [_ base-name (ipairs bases)]
          (let [model (util.load-model base-name)]
            (when (and model model.base)
              (util.collect-bases model coll true))
            (if ?prepend
                (table.insert coll 1 base-name)
                (table.insert coll base-name))))
        (set thing.base nil)))
    coll))

(fn util.merge-models [base addn]
  "Merge ADDN into BASE. Additive-attributes accumulate; grammar
   merges nouns/adjectives; everything else overwrites."
  (fn additive? [k]
    (or (and base.additive-attributes
             (util.find-element base.additive-attributes k))
        (and addn.additive-attributes
             (util.find-element addn.additive-attributes k))))
  (each [k v (pairs addn)]
    (match k
      ;; Additive attributes: accumulate list entries
      (where k (additive? k))
      (do (when (not (. base k)) (tset base k []))
          (each [q p (pairs v)]
            (if (= (type q) :number)
                (when (not (util.find-element (. base k) p))
                  (table.insert (. base k) p))
                (tset (. base k) q p))))
      ;; Grammar: accumulate nouns and adjectives
      :grammar
      (do (when (not base.grammar) (set base.grammar {}))
          (each [gk gv (pairs v)]
            (match gk
              (where (or :noun :nouns))
              (do (when (not base.grammar.nouns)
                    (set base.grammar.nouns []))
                  (if (= gk :noun)
                      (table.insert base.grammar.nouns gv)
                      (each [_ n (ipairs gv)]
                        (when (not (util.find-element base.grammar.nouns n))
                          (table.insert base.grammar.nouns n)))))
              :adjectives
              (do (when (not base.grammar.adjectives)
                    (set base.grammar.adjectives []))
                  (each [_ a (ipairs gv)]
                    (when (not (util.find-element base.grammar.adjectives a))
                      (table.insert base.grammar.adjectives a))))
              _ (tset base.grammar gk gv))))
      ;; Everything else: overwrite
      _ (tset base k v)))
  base)

;; ──────────────────────────────────────
;; Behavior dispatch
;; ──────────────────────────────────────

;; Behavior file cache (separate from data file cache since behaviors
;; are code tables, not data tables).
(local behavior-cache {})

(fn util.load-behavior [behavior-name]
  "Load a behavior file, returning its method table. Cached."
  (match (. behavior-cache behavior-name)
    cached cached
    _ (let [b (util.load-file (.. "behaviors/" behavior-name))]
        (when b (tset behavior-cache behavior-name b))
        b)))

(fn util.build-dispatch [behaviors]
  "Build a dispatch table from a behaviors list.
   Later (more specific) behaviors override earlier (more general) ones."
  (let [dispatch {}]
    (each [_ behavior-name (ipairs behaviors)]
      (let [b (util.load-behavior behavior-name)]
        (when b
          (each [method-name method (pairs b)]
            (tset dispatch method-name method)))))
    dispatch))

;; No wrapper needed — we use the dispatch table directly as __index.
;; Lua checks __index tables automatically after checking the thing's
;; own fields, so normal field access (dim.mudserver etc.) still works.

;; ──────────────────────────────────────
;; Thing construction
;; ──────────────────────────────────────

(fn util.make-model [model-name ?addn ?dimension]
  "Create a thing from MODEL-NAME with optional additional attributes.
   Resolves the full inheritance chain, merges additively, caches
   behavior dispatch."
  (let [made {}
        bases []
        model (util.clone-model model-name)]
    (when (not model)
      (util.log :error (.. "Cannot make model: " model-name))
      (lua "return nil"))
    ;; Collect all bases from the model and any additions
    (util.collect-bases model bases)
    (when ?addn (util.collect-bases ?addn bases))
    ;; Merge bases in order: general → specific
    (let [ordered (-> bases util.drop-dupes)]
      (each [_ base-name (ipairs ordered)]
        (let [base-model (util.load-model base-name)]
          (when base-model
            (util.merge-models made base-model)))))
    ;; Merge the model itself, then any additions
    (set model.base nil)
    (util.merge-models made model)
    (when ?addn
      (set ?addn.base nil)
      (util.merge-models made ?addn))
    ;; Default to [:thing] if no behaviors
    (when (or (not made.behaviors) (= (length made.behaviors) 0))
      (set made.behaviors [:thing]))
    (set made.behaviors (util.drop-dupes made.behaviors))
    ;; Build cached dispatch and set metatable
    (let [dispatch (util.build-dispatch made.behaviors)]
      (setmetatable made {:__index dispatch}))
    ;; Attach dimension if provided
    (when ?dimension (set made.dimension ?dimension))
    made))

(fn util.responds-to? [thing method-name]
  "Does THING have METHOD-NAME in its dispatch?"
  (not= nil (. (. (getmetatable thing) :__index) method-name)))

;; ──────────────────────────────────────
;; Term matching
;; ──────────────────────────────────────

(fn util.search-things-by-term [things term ?matches]
  "Search THINGS for any that match TERM. Accumulate into ?MATCHES."
  (let [matches (or ?matches [])]
    (each [_ item (ipairs things)]
      (when (and item.term=? (item:term=? term))
        (table.insert matches item)))
    matches))

;; ──────────────────────────────────────
;; Commands
;; ──────────────────────────────────────

(fn util.lookup-command [command]
  (util.load-file (.. "commands/" command)))

util
