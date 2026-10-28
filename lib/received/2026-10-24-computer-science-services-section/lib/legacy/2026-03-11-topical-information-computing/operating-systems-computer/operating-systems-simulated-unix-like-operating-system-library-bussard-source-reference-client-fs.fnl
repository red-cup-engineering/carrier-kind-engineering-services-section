;; functions for the ship computer's onboard filesystem

(local lume (require :polywell.lib.lume))
(local frontend (require :polywell.frontend))

(local root "client/disk/")

(fn read [path] (love.filesystem.read (.. root path)))

(fn write [path contents]
  (let [segments (lume.split path "/")
        _ (table.remove segments)
        dir (table.concat segments "/")]
    (love.filesystem.createDirectory (.. root dir))
    (assert (love.filesystem.write (.. root path) contents))))

(fn ls [path] (love.filesystem.getDirectoryItems (.. root path)))

(fn type [path] (. (or (love.filesystem.getInfo (.. root path)) {}) :type))

(local sandboxed {:read read :write write :ls ls :type type})

(fn wrap [name]
  (fn [path ...]
    (if (: path :find "^/")
        ((. frontend name) (: path :sub 2) ...)
        ((. sandboxed name) path ...))))

{:read (wrap :read) :write (wrap :write) :ls (wrap :ls) :type (wrap :type)}
