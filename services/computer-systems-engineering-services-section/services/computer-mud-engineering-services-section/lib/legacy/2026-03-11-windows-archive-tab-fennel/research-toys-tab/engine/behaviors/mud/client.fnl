;;;; MUD client behaviors

(local util (require :util))

(fn message [client msg]
  (set client.buffer (.. client.buffer msg "\n")))

(fn look [client thing]
  (client:message (.. "You look at " (thing:fname)))
  (let [parts [(thing:fname) (.. "  " (thing:describe))]]
    (when thing.contents
      (let [names (icollect [_ item (ipairs thing.contents)]
                    (when item.notable (item:fname)))]
        (when (> (length names) 0)
          (table.insert parts
                        (.. "Contents: " (util.quibble-strings names))))))
    (when thing.exits
      (table.insert parts
                    (.. "Exits: "
                        (util.quibble-strings
                         (util.collect-keys thing.exits true)))))
    (client:message (table.concat parts "\n"))))

(fn move [client area]
  (client:message (.. "You move to " (area:fname)))
  (area:receive-object client))

(fn parser [client input]
  (let [(command line) (input:match "([^ ]+) ?(.*)")]
    (if (util.find-element client.command-list command)
        ((util.lookup-command command) client line)
        (client:message
         "Invalid command. Type `commands` for a list."))))

(fn parse [client input]
  (util.log :debug (.. "Parsing from " client.name ": " input))
  (parser client input))

{: message : look : move : parser : parse}
