(fn [client input]
  (if (not= input "")
      (let [matches []]
        (client:message (.. "You attempt to look at '" input "'."))
        (when client.location
          (client.location:search-area input matches))
        (match (length matches)
          1 (client:look (. matches 1))
          0 (client:message "No match.")
          _ (client:message "Multiple matches.")))
      (if client.location
          (do (client:message "You look around the area.")
              (client:look client.location))
          (client:message "You aren't anyplace."))))
