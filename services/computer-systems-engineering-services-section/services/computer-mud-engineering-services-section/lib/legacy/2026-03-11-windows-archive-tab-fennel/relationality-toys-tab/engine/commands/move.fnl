(local util (require :util))

(fn [client input]
  (if (= input "")
      (client:message "Include exit name.")
      (match (. client.location.exits input)
        exit (let [area (client.dimension.map:find-area exit)]
               (if area
                   (do (client:move area)
                       (client:look client.location))
                   (client:message "That exit doesn't work.")))
        _ (client:message "Invalid exit."))))
