/**
 * JSON Schema evaluation: the one evaluator every admission in the house
 * goes through (defineType/admit, typed operations, web-application request
 * validation, MCP tool arguments).
 *
 * The evaluator interprets the schema graph; it generates no code, so it
 * runs unchanged on Node, in a browser, and on runtimes that forbid dynamic
 * code generation (Cloudflare Workers).  It reproduces the observable
 * behaviour of the previous ajv-based evaluator — the same ValidationIssue
 * kinds, instance paths, keywords, message strings and ordering — so that
 * every existing consumer and test reads the same results; the differential
 * test in test/validation-differential.test.mts holds it to that.
 *
 * Supported: Draft 2020-12 and Draft 7 dialects; boolean schemas; $ref with
 * $id-relative resolution, $anchor, embedded $id, JSON-pointer fragments and
 * the explicit `references` graph (never a network fetch); type, enum,
 * const; properties, patternProperties, additionalProperties, propertyNames,
 * required, minProperties, maxProperties, dependentRequired,
 * dependentSchemas, unevaluatedProperties; prefixItems, items (schema, and
 * Draft 7 array form with additionalItems), contains, minContains,
 * maxContains, minItems, maxItems, uniqueItems, unevaluatedItems; minLength,
 * maxLength, pattern, format; minimum, maximum, exclusiveMinimum,
 * exclusiveMaximum, multipleOf; allOf, anyOf, oneOf, not, if/then/else;
 * Draft 7 definitions and dependencies.  Every other keyword is an
 * annotation.
 */
/** JSON Schema dialects the evaluator supports explicitly. */
export const SUPPORTED_DIALECTS = Object.freeze([
    "https://json-schema.org/draft/2020-12/schema",
    "http://json-schema.org/draft-07/schema#",
]);
const DRAFT_07 = "http://json-schema.org/draft-07/schema#";
const DRAFT_07_HTTPS = "https://json-schema.org/draft-07/schema#";
const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";
const MAX_DEPTH = 512;
const VALID = Object.freeze({ valid: true, issues: Object.freeze([]) });
const TYPE_NAMES = Object.freeze(["array", "boolean", "integer", "null", "number", "object", "string"]);
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isSchema(value) {
    return typeof value === "boolean" || isObject(value);
}
function issue(kind, path, keyword, message) {
    return Object.freeze({ kind, path, keyword, message });
}
function schemaIssue(error) {
    return issue("schema", "", "schema", error instanceof Error ? error.message : String(error));
}
function refused(issues) {
    return Object.freeze({ valid: false, issues: orderIssues(issues) });
}
function orderIssues(issues) {
    return Object.freeze([...issues].sort((left, right) => {
        for (const [a, b] of [[left.kind, right.kind], [left.path, right.path], [left.keyword, right.keyword], [left.message, right.message]]) {
            if (a < b)
                return -1;
            if (a > b)
                return 1;
        }
        return 0;
    }));
}
function schemaDialect(schema) {
    if (typeof schema === "boolean")
        return "2020-12";
    const declared = schema["$schema"];
    if (declared === undefined)
        return "2020-12";
    if (declared === DRAFT_07 || declared === DRAFT_07_HTTPS)
        return "draft-07";
    if (declared === DRAFT_2020_12)
        return "2020-12";
    throw new TypeError(`unsupported JSON Schema dialect ${String(declared)}`);
}
const regexFormat = (pattern) => Object.freeze({ type: "string", validate: (value) => pattern.test(value) });
const stringFormat = (validate) => Object.freeze({ type: "string", validate });
const numberFormat = (validate) => Object.freeze({ type: "number", validate });
function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
const DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function date(text) {
    const matches = DATE.exec(text);
    if (!matches)
        return false;
    const year = +matches[1];
    const month = +matches[2];
    const day = +matches[3];
    return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
}
const TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
function timeOf(strictTimeZone) {
    return (text) => {
        const matches = TIME.exec(text);
        if (!matches)
            return false;
        const hour = +matches[1];
        const minute = +matches[2];
        const second = +matches[3];
        const zone = matches[4];
        const zoneSign = matches[5] === "-" ? -1 : 1;
        const zoneHour = +(matches[6] || 0);
        const zoneMinute = +(matches[7] || 0);
        if (zoneHour > 23 || zoneMinute > 59 || (strictTimeZone && !zone))
            return false;
        if (hour <= 23 && minute <= 59 && second < 60)
            return true;
        const utcMinute = minute - zoneMinute * zoneSign;
        const utcHour = hour - zoneHour * zoneSign - (utcMinute < 0 ? 1 : 0);
        return (utcHour === 23 || utcHour === -1) && (utcMinute === 59 || utcMinute === -1) && second < 61;
    };
}
const DATE_TIME_SEPARATOR = /t|\s/i;
function dateTimeOf(strictTimeZone) {
    const time = timeOf(strictTimeZone);
    return (text) => {
        const parts = text.split(DATE_TIME_SEPARATOR);
        return parts.length === 2 && date(parts[0]) && time(parts[1]);
    };
}
const NOT_URI_FRAGMENT = /\/|:/;
const URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
const BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const Z_ANCHOR = /[^\\]\\Z/;
const MIN_INT32 = -(2 ** 31);
const MAX_INT32 = 2 ** 31 - 1;
function regex(text) {
    if (Z_ANCHOR.test(text))
        return false;
    try {
        new RegExp(text);
        return true;
    }
    catch {
        return false;
    }
}
/** The asserted formats, by name. */
const JSON_SCHEMA_FORMATS = Object.freeze({
    date: stringFormat(date),
    time: stringFormat(timeOf(true)),
    "date-time": stringFormat(dateTimeOf(true)),
    "iso-time": stringFormat(timeOf(false)),
    "iso-date-time": stringFormat(dateTimeOf(false)),
    duration: regexFormat(/^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/),
    uri: stringFormat((text) => NOT_URI_FRAGMENT.test(text) && URI.test(text)),
    "uri-reference": regexFormat(/^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i),
    "uri-template": regexFormat(/^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i),
    url: regexFormat(/^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu),
    email: regexFormat(/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i),
    hostname: regexFormat(/^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i),
    ipv4: regexFormat(/^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/),
    ipv6: regexFormat(/^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i),
    regex: stringFormat(regex),
    uuid: regexFormat(/^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i),
    "json-pointer": regexFormat(/^(?:\/(?:[^~/]|~0|~1)*)*$/),
    "json-pointer-uri-fragment": regexFormat(/^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i),
    "relative-json-pointer": regexFormat(/^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/),
    byte: stringFormat((text) => BYTE.test(text)),
    int32: numberFormat((value) => Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32),
    int64: numberFormat((value) => Number.isInteger(value)),
    float: numberFormat(() => true),
    double: numberFormat(() => true),
    password: stringFormat(() => true),
    binary: stringFormat(() => true),
});
/** Whether `value` satisfies the named format; an unknown format, or a value of another type, is not refused. */
function satisfiesFormat(name, value) {
    const format = JSON_SCHEMA_FORMATS[name];
    if (format === undefined)
        return true;
    if (format.type === "string")
        return typeof value !== "string" || format.validate(value);
    return typeof value !== "number" || format.validate(value);
}
// ---------------------------------------------------------------------------
// Values
function deepEqual(left, right) {
    if (left === right)
        return true;
    if (typeof left !== "object" || typeof right !== "object" || left === null || right === null)
        return false;
    if (Array.isArray(left) !== Array.isArray(right))
        return false;
    if (Array.isArray(left)) {
        const other = right;
        return left.length === other.length && left.every((item, index) => deepEqual(item, other[index]));
    }
    const leftKeys = Object.keys(left);
    const rightRecord = right;
    if (leftKeys.length !== Object.keys(rightRecord).length)
        return false;
    return leftKeys.every((key) => Object.hasOwn(rightRecord, key) && deepEqual(left[key], rightRecord[key]));
}
function hasType(value, type) {
    switch (type) {
        case "null": return value === null;
        case "boolean": return typeof value === "boolean";
        case "string": return typeof value === "string";
        case "number": return typeof value === "number";
        case "integer": return typeof value === "number" && Number.isInteger(value);
        case "array": return Array.isArray(value);
        case "object": return isObject(value);
        default: return false;
    }
}
function codePointLength(text) {
    let length = 0;
    for (const _ of text)
        length += 1;
    return length;
}
// ---------------------------------------------------------------------------
// Schema document admission (the dialect's structural rules for keyword values)
const SCHEMA_KEYWORDS = Object.freeze(["additionalProperties", "additionalItems", "propertyNames", "contains", "not", "if", "then", "else", "unevaluatedProperties", "unevaluatedItems", "items"]);
const SCHEMA_MAP_KEYWORDS = Object.freeze(["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"]);
const SCHEMA_LIST_KEYWORDS = Object.freeze(["allOf", "anyOf", "oneOf", "prefixItems"]);
const NON_NEGATIVE_KEYWORDS = Object.freeze(["minLength", "maxLength", "minItems", "maxItems", "minProperties", "maxProperties", "minContains", "maxContains"]);
const NUMBER_KEYWORDS = Object.freeze(["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"]);
const STRING_KEYWORDS = Object.freeze(["$ref", "$id", "$anchor", "$dynamicRef", "$dynamicAnchor", "$comment", "format", "pattern", "title", "description", "$schema", "contentMediaType", "contentEncoding"]);
const STRING_LIST_KEYWORDS = Object.freeze(["required"]);
function documentIssues(schema, path, dialect, issues) {
    if (typeof schema === "boolean")
        return;
    if (!isObject(schema)) {
        issues.push(issue("schema", path, "type", "must be object,boolean"));
        return;
    }
    const at = (key) => `${path}/${key.replace(/~/gu, "~0").replace(/\//gu, "~1")}`;
    for (const [key, value] of Object.entries(schema)) {
        if (key === "type") {
            const valid = typeof value === "string" ? TYPE_NAMES.includes(value) : Array.isArray(value) && value.every((item) => typeof item === "string" && TYPE_NAMES.includes(item));
            if (!valid) {
                issues.push(issue("schema", at(key), "enum", "must be equal to one of the allowed values"));
                issues.push(issue("schema", at(key), "type", "must be array"));
                issues.push(issue("schema", at(key), "anyOf", "must match a schema in anyOf"));
            }
        }
        else if (SCHEMA_KEYWORDS.includes(key)) {
            if (key === "items" && Array.isArray(value)) {
                if (dialect === "2020-12")
                    issues.push(issue("schema", at(key), "type", "must be object,boolean"));
                else
                    value.forEach((item, index) => documentIssues(item, `${at(key)}/${index}`, dialect, issues));
            }
            else
                documentIssues(value, at(key), dialect, issues);
        }
        else if (SCHEMA_MAP_KEYWORDS.includes(key)) {
            if (!isObject(value))
                issues.push(issue("schema", at(key), "type", "must be object"));
            else
                for (const [name, subschema] of Object.entries(value))
                    documentIssues(subschema, `${at(key)}/${name.replace(/~/gu, "~0").replace(/\//gu, "~1")}`, dialect, issues);
        }
        else if (SCHEMA_LIST_KEYWORDS.includes(key)) {
            if (!Array.isArray(value))
                issues.push(issue("schema", at(key), "type", "must be array"));
            else
                value.forEach((item, index) => documentIssues(item, `${at(key)}/${index}`, dialect, issues));
        }
        else if (NON_NEGATIVE_KEYWORDS.includes(key)) {
            if (typeof value !== "number" || !Number.isInteger(value))
                issues.push(issue("schema", at(key), "type", "must be integer"));
            else if (value < 0)
                issues.push(issue("schema", at(key), "minimum", "must be >= 0"));
        }
        else if (NUMBER_KEYWORDS.includes(key)) {
            if (typeof value !== "number")
                issues.push(issue("schema", at(key), "type", "must be number"));
        }
        else if (key === "multipleOf") {
            if (typeof value !== "number")
                issues.push(issue("schema", at(key), "type", "must be number"));
            else if (value <= 0)
                issues.push(issue("schema", at(key), "exclusiveMinimum", "must be > 0"));
        }
        else if (STRING_KEYWORDS.includes(key)) {
            if (typeof value !== "string")
                issues.push(issue("schema", at(key), "type", "must be string"));
        }
        else if (STRING_LIST_KEYWORDS.includes(key)) {
            if (!Array.isArray(value))
                issues.push(issue("schema", at(key), "type", "must be array"));
            else
                value.forEach((item, index) => { if (typeof item !== "string")
                    issues.push(issue("schema", `${at(key)}/${index}`, "type", "must be string")); });
        }
        else if (key === "enum") {
            if (!Array.isArray(value))
                issues.push(issue("schema", at(key), "type", "must be array"));
        }
        else if (key === "uniqueItems") {
            if (typeof value !== "boolean")
                issues.push(issue("schema", at(key), "type", "must be boolean"));
        }
        else if (key === "dependentRequired" || (key === "dependencies" && dialect === "draft-07")) {
            if (!isObject(value))
                issues.push(issue("schema", at(key), "type", "must be object"));
            else
                for (const [name, entry] of Object.entries(value)) {
                    if (Array.isArray(entry))
                        entry.forEach((item, index) => { if (typeof item !== "string")
                            issues.push(issue("schema", `${at(key)}/${name}/${index}`, "type", "must be string")); });
                    else if (key === "dependentRequired")
                        issues.push(issue("schema", `${at(key)}/${name}`, "type", "must be array"));
                    else
                        documentIssues(entry, `${at(key)}/${name}`, dialect, issues);
                }
        }
    }
}
/** Admit one JSON Schema document without resolving application-specific references. */
export function validateJsonSchemaDocument(schema) {
    try {
        const issues = [];
        documentIssues(schema, "", schemaDialect(schema), issues);
        return issues.length === 0 ? VALID : refused(issues);
    }
    catch (error) {
        return refused([schemaIssue(error)]);
    }
}
function isAbsoluteUri(text) {
    return /^[a-z][a-z0-9+\-.]*:/iu.test(text);
}
function splitFragment(uri) {
    const hash = uri.indexOf("#");
    return hash === -1 ? [uri, undefined] : [uri.slice(0, hash), uri.slice(hash + 1)];
}
/** RFC 3986 reference resolution over a hierarchical base; non-hierarchical bases only take absolute and fragment references. */
function resolveUri(base, reference) {
    if (isAbsoluteUri(reference))
        return reference;
    if (reference.startsWith("#"))
        return splitFragment(base)[0] + reference;
    if (base === "")
        return reference;
    try {
        return new URL(reference, base).href;
    }
    catch {
        return reference;
    }
}
function unescapePointer(segment) {
    return decodeURIComponent(segment).replace(/~1/gu, "/").replace(/~0/gu, "~");
}
class SchemaGraph {
    documents = new Map();
    anchors = new Map();
    bases = new WeakMap();
    dialect;
    constructor(root, references) {
        this.dialect = schemaDialect(root);
        for (const reference of references) {
            if (schemaDialect(reference) !== this.dialect)
                throw new TypeError("cross-schema references must use the root schema dialect");
            if (typeof reference === "boolean" || typeof reference["$id"] !== "string")
                throw new TypeError("reference schemas must declare $id");
        }
        this.index(root, "");
        this.documents.set("", { schema: root, base: this.baseOf(root) });
        for (const reference of references)
            this.index(reference, "");
    }
    register(uri, resolved) {
        const [document, fragment] = splitFragment(uri);
        if (fragment === undefined || fragment === "") {
            if (!this.documents.has(document))
                this.documents.set(document, resolved);
        }
        else
            this.anchors.set(uri, resolved);
    }
    index(schema, parentBase) {
        if (typeof schema === "boolean")
            return;
        let base = parentBase;
        const id = schema["$id"];
        if (typeof id === "string" && id !== "") {
            const [document, fragment] = splitFragment(resolveUri(parentBase, id));
            if (document !== "" && (fragment === undefined || fragment === "")) {
                base = document;
                this.register(document, { schema, base });
            }
            else if (fragment !== undefined && fragment !== "" && !fragment.startsWith("/")) {
                this.anchors.set(`${splitFragment(parentBase)[0]}#${fragment}`, { schema, base: parentBase });
            }
        }
        this.bases.set(schema, base);
        for (const key of ["$anchor", "$dynamicAnchor"]) {
            const anchor = schema[key];
            if (typeof anchor === "string")
                this.anchors.set(`${base}#${anchor}`, { schema, base });
        }
        for (const [key, value] of Object.entries(schema)) {
            if (key === "enum" || key === "const" || key === "default" || key === "examples")
                continue;
            if (isSchema(value) && typeof value !== "boolean")
                this.index(value, base);
            if (Array.isArray(value))
                for (const item of value)
                    if (isObject(item))
                        this.index(item, base);
            if (isObject(value) && (SCHEMA_MAP_KEYWORDS.includes(key) || key === "dependencies"))
                for (const item of Object.values(value))
                    if (isObject(item))
                        this.index(item, base);
        }
    }
    baseOf(schema) {
        return typeof schema === "boolean" ? "" : this.bases.get(schema) ?? "";
    }
    resolve(reference, from) {
        const base = this.baseOf(from);
        const target = resolveUri(base, reference);
        const [document, fragment] = splitFragment(target);
        const anchored = this.anchors.get(target);
        if (anchored !== undefined)
            return anchored;
        const root = this.documents.get(document);
        if (root === undefined)
            throw new TypeError(`can't resolve reference ${reference} from id ${base === "" ? "#" : base}`);
        if (fragment === undefined || fragment === "")
            return root;
        if (!fragment.startsWith("/"))
            throw new TypeError(`can't resolve reference ${reference} from id ${base === "" ? "#" : base}`);
        let current = root.schema;
        let currentBase = root.base;
        for (const segment of fragment.slice(1).split("/")) {
            const key = unescapePointer(segment);
            if (Array.isArray(current))
                current = current[Number(key)];
            else if (isObject(current))
                current = current[key];
            else
                current = undefined;
            if (current === undefined)
                throw new TypeError(`can't resolve reference ${reference} from id ${base === "" ? "#" : base}`);
            if (isObject(current))
                currentBase = this.bases.get(current) ?? currentBase;
        }
        if (!isSchema(current))
            throw new TypeError(`can't resolve reference ${reference} from id ${base === "" ? "#" : base}`);
        return { schema: current, base: currentBase };
    }
    /** Resolve every $ref in the graph eagerly so an unresolvable reference is a compile-time schema issue. */
    checkReferences(schema, seen) {
        if (typeof schema === "boolean" || seen.has(schema))
            return;
        seen.add(schema);
        for (const [key, value] of Object.entries(schema)) {
            if ((key === "$ref" || key === "$dynamicRef") && typeof value === "string")
                this.checkReferences(this.resolve(value, schema).schema, seen);
            if (key === "enum" || key === "const" || key === "default" || key === "examples")
                continue;
            if (Array.isArray(value)) {
                for (const item of value)
                    if (isSchema(item))
                        this.checkReferences(item, seen);
            }
            else if (isObject(value) && (SCHEMA_MAP_KEYWORDS.includes(key) || key === "dependencies")) {
                for (const item of Object.values(value))
                    if (isSchema(item))
                        this.checkReferences(item, seen);
            }
            else if (isSchema(value))
                this.checkReferences(value, seen);
        }
    }
}
function annotations() {
    return { properties: new Set(), items: new Set() };
}
function absorb(into, from) {
    for (const name of from.properties)
        into.properties.add(name);
    for (const index of from.items)
        into.items.add(index);
}
class Evaluator {
    graph;
    constructor(graph) { this.graph = graph; }
    /** Evaluate `value` against `schema`; issues are appended to `issues`, evaluated members reported through `evaluated`. */
    evaluate(schema, value, path, issues, evaluated, depth = 0) {
        if (depth > MAX_DEPTH)
            throw new TypeError("schema reference recursion exceeds the evaluator's depth");
        if (schema === true)
            return true;
        if (schema === false) {
            issues.push(issue("instance", path, "false schema", "boolean schema is false"));
            return false;
        }
        const before = issues.length;
        const dialect = this.graph.dialect;
        const local = annotations();
        const sub = (subschema, subvalue, subpath, into, collected) => this.evaluate(subschema, subvalue, subpath, into, collected, depth + 1);
        // --- references
        for (const key of ["$ref", "$dynamicRef"]) {
            const reference = schema[key];
            if (typeof reference !== "string")
                continue;
            const target = this.graph.resolve(reference, schema);
            const collected = annotations();
            if (sub(target.schema, value, path, issues, collected))
                absorb(local, collected);
        }
        // --- generic
        const type = schema["type"];
        if (type !== undefined) {
            const types = Array.isArray(type) ? type : [type];
            if (!types.some((candidate) => hasType(value, candidate)))
                issues.push(issue("instance", path, "type", `must be ${types.join(",")}`));
        }
        if (Object.hasOwn(schema, "const") && !deepEqual(value, schema["const"]))
            issues.push(issue("instance", path, "const", "must be equal to constant"));
        const enumeration = schema["enum"];
        if (Array.isArray(enumeration) && !enumeration.some((candidate) => deepEqual(candidate, value)))
            issues.push(issue("instance", path, "enum", "must be equal to one of the allowed values"));
        // --- strings
        if (typeof value === "string") {
            const minLength = schema["minLength"];
            const maxLength = schema["maxLength"];
            const pattern = schema["pattern"];
            const format = schema["format"];
            if (typeof minLength === "number" && codePointLength(value) < minLength)
                issues.push(issue("instance", path, "minLength", `must NOT have fewer than ${minLength} characters`));
            if (typeof maxLength === "number" && codePointLength(value) > maxLength)
                issues.push(issue("instance", path, "maxLength", `must NOT have more than ${maxLength} characters`));
            if (typeof pattern === "string" && !new RegExp(pattern, "u").test(value))
                issues.push(issue("instance", path, "pattern", `must match pattern "${pattern}"`));
            if (typeof format === "string" && !satisfiesFormat(format, value))
                issues.push(issue("instance", path, "format", `must match format "${format}"`));
        }
        // --- numbers
        if (typeof value === "number") {
            const format = schema["format"];
            const minimum = schema["minimum"];
            const maximum = schema["maximum"];
            const exclusiveMinimum = schema["exclusiveMinimum"];
            const exclusiveMaximum = schema["exclusiveMaximum"];
            const multipleOf = schema["multipleOf"];
            if (typeof minimum === "number" && !(value >= minimum))
                issues.push(issue("instance", path, "minimum", `must be >= ${minimum}`));
            if (typeof maximum === "number" && !(value <= maximum))
                issues.push(issue("instance", path, "maximum", `must be <= ${maximum}`));
            if (typeof exclusiveMinimum === "number" && !(value > exclusiveMinimum))
                issues.push(issue("instance", path, "exclusiveMinimum", `must be > ${exclusiveMinimum}`));
            if (typeof exclusiveMaximum === "number" && !(value < exclusiveMaximum))
                issues.push(issue("instance", path, "exclusiveMaximum", `must be < ${exclusiveMaximum}`));
            if (typeof multipleOf === "number" && !Number.isInteger(value / multipleOf))
                issues.push(issue("instance", path, "multipleOf", `must be multiple of ${multipleOf}`));
            if (typeof format === "string" && !satisfiesFormat(format, value))
                issues.push(issue("instance", path, "format", `must match format "${format}"`));
        }
        // --- arrays
        if (Array.isArray(value))
            this.evaluateArray(schema, value, path, issues, local, dialect, sub);
        // --- objects
        if (isObject(value))
            this.evaluateObject(schema, value, path, issues, local, dialect, sub);
        // --- applicators
        const allOf = schema["allOf"];
        if (Array.isArray(allOf)) {
            const collected = annotations();
            let valid = true;
            for (const branch of allOf)
                if (isSchema(branch) && !sub(branch, value, path, issues, collected))
                    valid = false;
            if (valid)
                absorb(local, collected);
        }
        const anyOf = schema["anyOf"];
        if (Array.isArray(anyOf)) {
            const branchIssues = [];
            let valid = false;
            for (const branch of anyOf) {
                if (!isSchema(branch))
                    continue;
                // A tuple with a different literal tag cannot contribute a successful
                // branch or evaluated-item annotations. Defer its diagnostics until
                // the union actually fails, instead of traversing its recursive tail.
                const prefix = typeof branch === "object" ? branch["prefixItems"] : undefined;
                const tag = Array.isArray(prefix) ? prefix[0] : undefined;
                if (Array.isArray(value) && value.length > 0 && isObject(tag)
                    && Object.hasOwn(tag, "const") && !deepEqual(value[0], tag["const"]))
                    continue;
                const collected = annotations();
                if (sub(branch, value, path, branchIssues, collected)) {
                    valid = true;
                    absorb(local, collected);
                }
            }
            if (!valid) {
                // Preserve complete diagnostics and original branch order on refusal.
                for (const branch of anyOf)
                    if (isSchema(branch))
                        sub(branch, value, path, issues, annotations());
                issues.push(issue("instance", path, "anyOf", "must match a schema in anyOf"));
            }
        }
        const oneOf = schema["oneOf"];
        if (Array.isArray(oneOf)) {
            const branchIssues = [];
            let matches = 0;
            let matched;
            for (const branch of oneOf) {
                if (!isSchema(branch))
                    continue;
                const collected = annotations();
                if (sub(branch, value, path, branchIssues, collected)) {
                    matches += 1;
                    matched = collected;
                }
            }
            if (matches === 1 && matched)
                absorb(local, matched);
            else
                issues.push(...(matches === 0 ? branchIssues : []), issue("instance", path, "oneOf", "must match exactly one schema in oneOf"));
        }
        const not = schema["not"];
        if (isSchema(not) && sub(not, value, path, [], annotations()))
            issues.push(issue("instance", path, "not", "must NOT be valid"));
        const condition = schema["if"];
        if (isSchema(condition)) {
            const collected = annotations();
            const branchKey = sub(condition, value, path, [], collected) ? "then" : "else";
            if (branchKey === "then")
                absorb(local, collected);
            const branch = schema[branchKey];
            if (isSchema(branch)) {
                const branchIssues = [];
                const branchCollected = annotations();
                if (sub(branch, value, path, branchIssues, branchCollected))
                    absorb(local, branchCollected);
                else
                    issues.push(...branchIssues, issue("instance", path, "if", `must match "${branchKey}" schema`));
            }
        }
        // --- unevaluated
        if (isObject(value)) {
            const unevaluatedProperties = schema["unevaluatedProperties"];
            if (isSchema(unevaluatedProperties)) {
                for (const name of Object.keys(value)) {
                    if (local.properties.has(name))
                        continue;
                    if (unevaluatedProperties === false)
                        issues.push(issue("instance", path, "unevaluatedProperties", "must NOT have unevaluated properties"));
                    else
                        sub(unevaluatedProperties, value[name], `${path}/${escapePath(name)}`, issues, annotations());
                    local.properties.add(name);
                }
            }
        }
        if (Array.isArray(value)) {
            const unevaluatedItems = schema["unevaluatedItems"];
            if (isSchema(unevaluatedItems)) {
                for (let index = 0; index < value.length; index += 1) {
                    if (local.items.has(index))
                        continue;
                    if (unevaluatedItems === false) {
                        issues.push(issue("instance", path, "unevaluatedItems", `must NOT have more than ${index} items`));
                        break;
                    }
                    sub(unevaluatedItems, value[index], `${path}/${index}`, issues, annotations());
                    local.items.add(index);
                }
            }
        }
        const valid = issues.length === before;
        if (valid)
            absorb(evaluated, local);
        return valid;
    }
    evaluateArray(schema, value, path, issues, local, dialect, sub) {
        const prefixItems = schema["prefixItems"];
        const items = schema["items"];
        const additionalItems = schema["additionalItems"];
        let prefixed = 0;
        const tuple = Array.isArray(prefixItems) ? prefixItems : dialect === "draft-07" && Array.isArray(items) ? items : undefined;
        const tail = Array.isArray(prefixItems) || (dialect === "draft-07" && Array.isArray(items)) ? (Array.isArray(prefixItems) ? items : additionalItems) : items;
        const tailKeyword = Array.isArray(prefixItems) ? "items" : dialect === "draft-07" && Array.isArray(items) ? "additionalItems" : "items";
        if (tuple !== undefined) {
            prefixed = Math.min(tuple.length, value.length);
            for (let index = 0; index < prefixed; index += 1) {
                const item = tuple[index];
                if (isSchema(item))
                    sub(item, value[index], `${path}/${index}`, issues, annotations());
                local.items.add(index);
            }
        }
        if (tail === false) {
            if (value.length > prefixed)
                issues.push(issue("instance", path, tailKeyword, `must NOT have more than ${prefixed} items`));
        }
        else if (isSchema(tail)) {
            for (let index = prefixed; index < value.length; index += 1) {
                sub(tail, value[index], `${path}/${index}`, issues, annotations());
                local.items.add(index);
            }
        }
        const contains = schema["contains"];
        if (isSchema(contains)) {
            const minContains = typeof schema["minContains"] === "number" ? schema["minContains"] : 1;
            const maxContains = schema["maxContains"];
            const itemIssues = [];
            let count = 0;
            for (let index = 0; index < value.length; index += 1) {
                if (sub(contains, value[index], `${path}/${index}`, itemIssues, annotations())) {
                    count += 1;
                    local.items.add(index);
                }
            }
            const bound = typeof maxContains === "number" ? `must contain at least ${minContains} and no more than ${maxContains} valid item(s)` : `must contain at least ${minContains} valid item(s)`;
            if (count < minContains)
                issues.push(...(minContains === 1 ? itemIssues : []), issue("instance", path, "contains", bound));
            else if (typeof maxContains === "number" && count > maxContains)
                issues.push(issue("instance", path, "contains", bound));
        }
        const minItems = schema["minItems"];
        const maxItems = schema["maxItems"];
        if (typeof minItems === "number" && value.length < minItems)
            issues.push(issue("instance", path, "minItems", `must NOT have fewer than ${minItems} items`));
        if (typeof maxItems === "number" && value.length > maxItems)
            issues.push(issue("instance", path, "maxItems", `must NOT have more than ${maxItems} items`));
        if (schema["uniqueItems"] === true) {
            const duplicate = findDuplicate(value, isObject(items) ? items["type"] : undefined);
            if (duplicate)
                issues.push(issue("instance", path, "uniqueItems", `must NOT have duplicate items (items ## ${duplicate[0]} and ${duplicate[1]} are identical)`));
        }
    }
    evaluateObject(schema, value, path, issues, local, dialect, sub) {
        const required = schema["required"];
        if (Array.isArray(required)) {
            for (const name of required)
                if (typeof name === "string" && value[name] === undefined)
                    issues.push(issue("instance", path, "required", `must have required property '${name}'`));
        }
        const minProperties = schema["minProperties"];
        const maxProperties = schema["maxProperties"];
        const count = Object.keys(value).length;
        if (typeof minProperties === "number" && count < minProperties)
            issues.push(issue("instance", path, "minProperties", `must NOT have fewer than ${minProperties} properties`));
        if (typeof maxProperties === "number" && count > maxProperties)
            issues.push(issue("instance", path, "maxProperties", `must NOT have more than ${maxProperties} properties`));
        const dependencyKeyword = dialect === "draft-07" && isObject(schema["dependencies"]) ? "dependencies" : "dependentRequired";
        const dependentRequired = schema[dependencyKeyword];
        if (isObject(dependentRequired)) {
            for (const [name, dependents] of Object.entries(dependentRequired)) {
                if (value[name] === undefined)
                    continue;
                if (Array.isArray(dependents)) {
                    for (const dependent of dependents)
                        if (typeof dependent === "string" && value[dependent] === undefined)
                            issues.push(issue("instance", path, dependencyKeyword, `must have property ${dependent} when property ${name} is present`));
                }
                else if (isSchema(dependents)) {
                    const collected = annotations();
                    if (sub(dependents, value, path, issues, collected))
                        absorb(local, collected);
                }
            }
        }
        const dependentSchemas = schema["dependentSchemas"];
        if (isObject(dependentSchemas)) {
            for (const [name, dependent] of Object.entries(dependentSchemas)) {
                if (value[name] === undefined || !isSchema(dependent))
                    continue;
                const collected = annotations();
                if (sub(dependent, value, path, issues, collected))
                    absorb(local, collected);
            }
        }
        const propertyNames = schema["propertyNames"];
        if (isSchema(propertyNames)) {
            for (const name of Object.keys(value)) {
                if (!sub(propertyNames, name, path, issues, annotations()))
                    issues.push(issue("instance", path, "propertyNames", "property name must be valid"));
            }
        }
        const properties = schema["properties"];
        const patternProperties = schema["patternProperties"];
        const additionalProperties = schema["additionalProperties"];
        const patterns = isObject(patternProperties) ? Object.entries(patternProperties).map(([pattern, subschema]) => [new RegExp(pattern, "u"), subschema]) : [];
        for (const [name, member] of Object.entries(value)) {
            const memberPath = `${path}/${escapePath(name)}`;
            let evaluatedHere = false;
            if (isObject(properties) && Object.hasOwn(properties, name)) {
                const subschema = properties[name];
                if (isSchema(subschema) && member !== undefined)
                    sub(subschema, member, memberPath, issues, annotations());
                evaluatedHere = true;
            }
            for (const [pattern, subschema] of patterns) {
                if (!pattern.test(name))
                    continue;
                if (isSchema(subschema))
                    sub(subschema, member, memberPath, issues, annotations());
                evaluatedHere = true;
            }
            if (!evaluatedHere && additionalProperties !== undefined) {
                if (additionalProperties === false)
                    issues.push(issue("instance", path, "additionalProperties", "must NOT have additional properties"));
                else if (isSchema(additionalProperties))
                    sub(additionalProperties, member, memberPath, issues, annotations());
                evaluatedHere = true;
            }
            if (evaluatedHere)
                local.properties.add(name);
        }
    }
}
function escapePath(name) {
    return name.replace(/~/gu, "~0").replace(/\//gu, "~1");
}
const SCALAR_TYPES = Object.freeze(["string", "number", "integer", "boolean", "null"]);
/** The first duplicate pair the previous evaluator reported: index-map scan for declared scalar item types, pairwise deep equality otherwise. */
function findDuplicate(items, itemType) {
    const scalar = typeof itemType === "string" ? SCALAR_TYPES.includes(itemType) : Array.isArray(itemType) && itemType.length > 0 && itemType.every((type) => SCALAR_TYPES.includes(type));
    if (scalar) {
        const seen = new Map();
        for (let index = items.length - 1; index >= 0; index -= 1) {
            const key = `${typeof items[index]}:${String(items[index])}`;
            const previous = seen.get(key);
            if (previous !== undefined)
                return [previous, index];
            seen.set(key, index);
        }
        return undefined;
    }
    for (let index = items.length - 1; index >= 0; index -= 1) {
        for (let other = index - 1; other >= 0; other -= 1)
            if (deepEqual(items[index], items[other]))
                return [other, index];
    }
    return undefined;
}
// ---------------------------------------------------------------------------
// Public surface
/**
 * Compile one schema graph without altering its documents or retaining ambient references.
 * The graph is snapshotted at compile time: a later mutation of the caller's schema objects
 * does not change what the compiled evaluator admits.
 */
export function compileJsonSchema(schema, options = {}) {
    try {
        const references = structuredClone(options.references ?? []);
        schema = structuredClone(schema);
        const dialect = schemaDialect(schema);
        const documentProblems = [];
        documentIssues(schema, "", dialect, documentProblems);
        if (documentProblems.length > 0) {
            const order = { enum: 0, type: 1, anyOf: 2 };
            const described = [...documentProblems].sort((a, b) => (order[a.keyword] ?? 9) - (order[b.keyword] ?? 9)).map((problem) => `data${problem.path} ${problem.message}`);
            throw new TypeError(`schema is invalid: ${described.join(", ")}`);
        }
        const graph = new SchemaGraph(schema, references);
        graph.checkReferences(schema, new Set());
        return Object.freeze({ validate(value) {
                try {
                    const issues = [];
                    new Evaluator(graph).evaluate(schema, value, "", issues, annotations());
                    return issues.length === 0 ? VALID : refused(issues);
                }
                catch (error) {
                    return refused([schemaIssue(error)]);
                }
            } });
    }
    catch (error) {
        const result = refused([schemaIssue(error)]);
        return Object.freeze({ validate: () => result });
    }
}
/**
 * Validate a JSON-compatible value against a schema graph.
 *
 * @param value Value to validate.
 * @param schema Root Draft 2020-12 or Draft 7 schema.
 * @param options Explicit schemas available to cross-schema `$ref`.
 * @returns A deterministic, structured validation result without mutating the input value or schema graph.
 */
export function validateJsonSchema(value, schema, options = {}) {
    return compileJsonSchema(schema, options).validate(value);
}
/**
 * Validates a JSON value against a JSON Schema document with a corpus of referenced schemas.
 * The request form of validateJsonSchema: { value, schema, schemas? } to { valid, errors }.
 */
export function validateJson(request) {
    if (request?.schema === undefined)
        throw new TypeError("schema is required");
    const result = validateJsonSchema(request.value, request.schema, { references: Array.isArray(request.schemas) ? request.schemas : [] });
    return { valid: result.valid, errors: result.issues };
}
/** The request form of validateJsonSchema with explicit references: { value, schema, references? } to { valid, errors }. */
export function validateJsonSchemaInstance(request) {
    if (request?.schema === undefined)
        throw new TypeError("schema is required");
    const result = validateJsonSchema(request.value, request.schema, request.references === undefined ? undefined : { references: request.references });
    return { valid: result.valid, errors: result.issues };
}
