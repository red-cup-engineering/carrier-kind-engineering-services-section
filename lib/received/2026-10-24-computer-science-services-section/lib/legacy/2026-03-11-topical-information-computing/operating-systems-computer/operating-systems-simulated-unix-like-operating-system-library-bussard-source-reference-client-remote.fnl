(local editor (require :polywell))
(local lume (require :polywell.lib.lume))
(local rpcs (require :rpcs))
(local fennel (require :lib.fennel))

(local channels {})
(local sessions {})

(var debug? false)
(fn dbg [...] (when debug? (print ...)))

(λ hostname [name]
  (-> name (: :lower) (: :gsub " " "-")))

;; TODO: implement
(λ in-range? [with] true)

(λ send [channel session-id range! msg]
  (if (and (= (type msg) :table) msg.op)
      (do (range!)
          (set msg.session_id session-id)
          (dbg "->" (fennel.view msg))
          (: channel :push msg))
      (= (type msg) :string)
      (send channel session-id range! {:op :stdin :stdin msg})
      (error (.. "Unsupported message type " (tostring msg)))))

(λ recv [port-name channel write close]
  (let [msg (: channel :pop)]
    (when msg
      (dbg "<-" (fennel.view msg))
      (when msg.out (write msg.out))
      (if (= msg.op :disconnect)
          (close)
          (= msg.op :rpc)
          (let [op (. rpcs msg.fn)
                args (and msg.args (lume.deserialize msg.args))
                response (and op [(op port-name (unpack args))])]
            (dbg "r>" (fennel.view response))
            (when msg.chan (: msg.chan :push response))))
      msg)))

(λ connecter [channel count]
  (assert (< count 64) "No response from remote side.")
  (love.timer.sleep 0.01)
  (or (: channel :pop) (connecter channel (+ count 1))))

(λ connect [target-name username password write close]
  (let [channels (assert (. channels target-name) "no channels")]
    (fn range! []
      (assert (in-range? target-name) (.. target-name " is out of range!")))
    (range!)
    (: channels.output :push {:op :login :username username :password password})
    (let [response (connecter channels.input 0)]
      (write response.out)
      (when response.ok
          (tset sessions response.session_id
                (lume.merge {:port target-name :write write :close close}
                            channels))
          (partial send channels.output response.session_id range!)))))

(λ update []
  (each [_ session (pairs sessions)]
    (while (: session.input :peek)
      (recv session.port session.input session.write session.close)))
  (coroutine.yield)
  (update))

(λ init [system]
  (each [name body (pairs system)]
    (when body.os
      (let [input (love.thread.newChannel)
            output (love.thread.newChannel)]
        (tset channels body.name {:input input :output output})
        (doto (love.thread.newThread "os/server.lua")
          (: :start input output body.os (hostname body.name) [])))))
  (editor.start update))

{:init init
 :connect connect
 :hostname hostname
 :update update}
