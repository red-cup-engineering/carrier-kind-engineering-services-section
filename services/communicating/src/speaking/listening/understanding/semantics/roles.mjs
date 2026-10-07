

/** Extract semantic role frames from a parse result. */
export function roles(result) {
  const frames = [];

  const verbs = result.words.filter((w) => w.tags.includes("verb"));

  for (const verb of verbs) {

    const headArcs = result.arcs.filter((a) => a.head === verb.id);

    const depArcs = result.arcs.filter((a) => a.dependent === verb.id);

    let agent = null;
    let patient = null;
    let instrument = null;
    let recipient = null;
    let location = null;

    for (const arc of headArcs) {
      switch (arc.rel) {
        case "nsubj":

          agent = arc.depText;
          break;
        case "dobj":
          patient = arc.depText;
          break;
        case "prep": {

          const pobj = result.arcs.find((a) => a.head === arc.dependent && a.rel === "pobj");
          const prepWord = result.words.find((w) => w.id === arc.dependent);
          const prep = prepWord?.text.toLowerCase();
          if (pobj) {
            if (prep === "by") agent = pobj.depText;
            else if (prep === "with") instrument = pobj.depText;
            else if (prep === "to") recipient = pobj.depText;
            else if (prep === "in" || prep === "at" || prep === "on") location = pobj.depText;
          }
          break;
        }
      }
    }

    frames.push({ verb: verb.text, agent, patient, instrument, recipient, location });
  }

  return frames;
}
