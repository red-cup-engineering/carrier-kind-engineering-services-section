// articulate — utterance -> { potential: cell }. The aperiodic regime's constitutive generator.
// Pure: no validation; a malformed utterance throws natively where it is destructured.
export default function articulate(utterance) {
  return { potential: [[...utterance], [[], []]] };
}
