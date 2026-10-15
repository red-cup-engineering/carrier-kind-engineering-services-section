/** The work arena's transport input vocabulary. These contracts describe what a
 * caller says; player, hand, time, identity and law are supplied by the board.
 * Structural admission never replaces the arena's semantic or authority law.
 */
import { schemaFrom } from '@red-cup-engineering/json-schema-services-section/contracts';
import { OPENING_MOVES, RESPONSE_MOVES, REQUIREMENT_CLASSES, PRIORITIES,
  VERIFICATION_METHODS, OBSTACLE_KINDS, TAKER_OBSTACLES } from './work-arena.mjs';

const text = (title, maxLength, description) => ({ type: 'string', minLength: 1, title,
  ...(maxLength === undefined ? {} : { maxLength }), ...(description ? { description } : {}) });
const strings = title => ({ type: 'array', title, items: { type: 'string', minLength: 1 } });
const choice = (title, values) => ({ type: 'string', title, enum: values });
const number = title => ({ type: 'number', title });
const object = (title, properties, required = []) => ({ type: 'object', title, properties, required, additionalProperties: false });
const list = (title, item) => ({ type: 'array', title, items: item });
const statement = text('Statement', 400);
const optionalObject = title => ({ type: 'object', title });
const statementRecord = (title, properties) => object(title, { id: text('Identifier'), says: statement,
  kind: text('Kind'), ...properties }, ['says']);
const requirements = list('Requirements', { oneOf: [statement, statementRecord('Requirement', {
  class: choice('Class', REQUIREMENT_CLASSES), priority: choice('Priority', PRIORITIES),
  rationale: text('Rationale', 4000), traces: strings('Requirements this traces to'),
})] });
const conditions = list('Receiving conditions', { oneOf: [statement, statementRecord('Receiving condition', {
  verifies: strings('Requirement identifiers verified'), method: choice('Verification method', VERIFICATION_METHODS),
  assay: optionalObject('Executable assay'),
})] });
const terms = { requirements, conditions, scope: strings('Scope subjects'), returns: optionalObject('Result contract'),
  examples: list('Examples', optionalObject('Example')) };
const scope = { scope: strings('Scope subjects') };
const user = text('Whose outcome this serves', undefined, 'A typed subject naming the outside party whose outcome this is.');
const selection = { as: text('Act as office', undefined, 'Leave absent when the board can derive your office.'),
  officeService: object('Allocated office service', Object.fromEntries(['allocation','office','scope','subject','session'].map(key => [key, text(key)])), ['allocation','office','scope','subject','session']) };
const openingContext = { ...selection, context: text('Context', 4000), tags: strings('Tags'), sources: strings('Source locators'),
  serves: strings('Work this serves'), after: strings('Preceding work'), supersedes: strings('Work this restates'), relates: strings('Related work') };
const openingFields = {
  aim: { properties: { purpose: text('State to maintain', 400), measures: list('Measures', { oneOf: [statement, statementRecord('Measure', {
    unit: text('Unit'), better: choice('Better direction', ['more','less']), assay: optionalObject('Executable measure'),
  })] }), ...scope, user }, required: ['purpose'] },
  request: { properties: { need: text('Needed state of affairs', 400), ...terms, user, to: text('Addressed enterprise'), assayer: text('Receiver'),
    offer: object('Offer', { amount: number('Amount'), perDay: number('Per day'), ceiling: number('Ceiling'), currency: text('Currency') }),
    plan: optionalObject('Structured work intent') }, required: ['need'] },
  propose: { properties: { idea: text('Idea', 400), rationale: text('Rationale', 4000), addresses: strings('Issues this answers'), ...scope }, required: ['idea'] },
  report: { properties: { observation: text('Observed condition', 800), law: text('Law'), subject: text('Subject'),
    obstacle: choice('Obstacle', OBSTACLE_KINDS), obstructs: strings('Work obstructed'), evidence: strings('Evidence addresses'), ...scope }, required: ['observation'] },
  ask: { properties: { question: text('Question', 400), to: text('Addressed party'), assayer: text('Receiver'), ...scope }, required: ['question'] },
  declare: { properties: { ruling: text('Ruling', 800), rationale: text('Rationale', 4000), ...scope }, required: ['ruling'] },
  supply: { properties: { resource: text('Resource'), amount: number('Guaranteed quantity'), unit: text('Unit'), until: text('Window ends'),
    costs: optionalObject('Costs by produced kind'), admits: choice('Admission', ['open','whole']), ...scope }, required: ['resource','amount','unit','until'] },
};
const responseFields = {
  hold: { subject: text('Work subject') }, promise: { subject: text('Work subject') },
  wager: { measure: text('Measure'), target: number('Target'), until: text('Period ends'),
    benchmark: object('External benchmark', { of: text('Whose performance'), value: number('Value'), evidence: strings('Benchmark evidence') }, ['of','value','evidence']),
    stake: object('Value-added stake', { upside: number('Upside share'), downside: number('Downside share') }, ['upside','downside']) },
  draw: { amount: number('Quantity drawn'), kind: text('Produced kind'), count: number('Produced count'), serves: strings('Requests served') },
  return: { amount: number('Quantity returned') },
  observe: { measure: text('Measure'), value: number('Observed value'), observed: text('Observed at'), evidence: strings('Observation evidence') },
  attach: { subject: text('Work subject') },
  leave: { reason: text('Reason'), obstacle: choice('Own obstacle', TAKER_OBSTACLES) },
  decline: { reason: text('Reason') }, refine: { ...terms, completes: text('Order completed'), evidence: strings('Evidence') },
  counter: { ...terms, reason: text('Reason') }, agree: { to: text('Whose counter-offer') }, release: { reason: text('Reason'), obstacle: choice('Own obstacle', TAKER_OBSTACLES) },
  deliver: { evidence: strings('Delivery evidence'), claims: list('Claims', object('Claim', { condition: text('Condition'), evidence: strings('Claim evidence') }, ['condition','evidence'])) },
  accept: { of: text('Whose delivery or answer'), evidence: strings('Receiving evidence') },
  reject: { of: text('Whose delivery'), unmet: strings('Unmet condition identifiers'), reason: text('Reason'), evidence: strings('Receiving evidence') },
  withdraw: { reason: text('Reason') }, adopt: { request: text('Request'), subject: text('Work subject') },
  argue: { stance: choice('Stance', ['for','against']), says: statement, evidence: strings('Argument evidence') },
  corroborate: { evidence: strings('Corroborating evidence'), observation: text('Observation') },
  resolve: { evidence: strings('Resolving evidence') }, answer: { says: text('Answer'), evidence: strings('Answer evidence') },
};
const requiredResponse = {
  wager: ['measure','target','until','benchmark','stake'], draw: ['amount','serves'], return: ['amount'],
  observe: ['measure','value'], attach: ['subject'], decline: ['reason'],
  refine: ['requirements','conditions'], counter: ['requirements','conditions'], agree: ['to'],
  deliver: ['evidence'], accept: ['of'], reject: ['of','unmet'], argue: ['stance','says'],
  corroborate: ['evidence'], resolve: ['evidence'], answer: ['says'],
};
const variants = (moves, fields, responses) => moves.map(move => object(move,
  { move: { const: move, title: 'Move' }, ...(responses ? { ...selection, thread: text('Thread') } : openingContext),
    ...(responses ? fields[move] : fields[move].properties) },
  ['move', ...(responses ? ['thread', ...(requiredResponse[move] ?? [])] : fields[move].required)]));

export const workOpenDomain = schemaFrom({ $id: 'organizing/work/open-input', oneOf: variants(OPENING_MOVES, openingFields, false) });
export const workMoveDomain = schemaFrom({ $id: 'organizing/work/move-input', oneOf: variants([...new Set(Object.values(RESPONSE_MOVES).flat())], responseFields, true) });

/** Select a declared move's input, optionally projecting the human surface.
 * Office-service envelopes are derived by an allocated execution, never composed by a form.
 */
export function workInputSchemaOf(kind, move, { human = false } = {}) {
  const contract = kind === 'open' ? workOpenDomain : kind === 'move' ? workMoveDomain : undefined;
  const schema = contract?.schema.oneOf.find(item => item.properties.move.const === move);
  if (!schema) throw new TypeError('Unknown work input kind or move');
  if (!human) return schema;
  const { officeService, ...properties } = schema.properties;
  return { ...schema, properties };
}

/** Project a stored opening back to what its caller said. Derived custody fields
 * never cross the work-open boundary when a person supersedes their opening. */
export function workOpeningInputOf(opening) {
  const properties = workInputSchemaOf('open', opening.move).properties;
  return Object.fromEntries(Object.keys(properties).filter(key => Object.hasOwn(opening, key)).map(key => [key, opening[key]]));
}
