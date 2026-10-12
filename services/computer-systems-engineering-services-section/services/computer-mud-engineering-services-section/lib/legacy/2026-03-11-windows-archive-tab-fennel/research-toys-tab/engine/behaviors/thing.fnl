;;;; thing behaviors — the base of everything

(local util (require :util))

(fn fname [thing]
  "Formatted name with article."
  (let [article (and thing.grammar thing.grammar.article)]
    (.. (match article
          "" ""
          a (.. a " ")
          _ (if (util.find-element [:a :e :i :o :u]
                                   (string.sub thing.name 1 1))
                "an " "a "))
        thing.name)))

(fn describe [thing]
  (or thing.description
      (.. "This is " (fname thing) ".")))

(fn name=? [thing term]
  (= thing.name term))

(fn noun=? [thing term]
  (when (and thing.grammar thing.grammar.nouns)
    (let [words (util.split-string term)
          noun (. words (length words))]
      (or (= noun thing.name)
          (util.find-element thing.grammar.nouns noun)))))

(fn adjectives=? [thing term]
  (let [words (util.split-string term)]
    (if (<= (length words) 1) true
        (not (and thing.grammar thing.grammar.adjectives)) true
        (let [adjs (doto (icollect [_ w (ipairs words)] w)
                         (table.remove))]
          (accumulate [ok true _ adj (ipairs adjs) &until (not ok)]
            (util.find-element thing.grammar.adjectives adj))))))

(fn term=? [thing term]
  (or (name=? thing term)
      (and (noun=? thing term)
           (adjectives=? thing term))))

{: fname : describe : name=? : noun=? : adjectives=? : term=?}
