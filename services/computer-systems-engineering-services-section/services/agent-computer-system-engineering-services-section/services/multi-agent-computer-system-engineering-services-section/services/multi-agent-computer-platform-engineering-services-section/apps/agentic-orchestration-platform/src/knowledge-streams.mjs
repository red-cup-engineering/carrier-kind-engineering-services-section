import { admitActionResearchSequenceInput, admitAperiodicDreamInput, aperiodicActionResearchCycles, aperiodicDreamConjectures } from "@red-cup-engineering/knowing/dreaming";
function argValue(argv, name) {
    const index = argv.indexOf(name);
    if (index < 0)
        return undefined;
    return argv[index + 1];
}
function nonNegativeIntegerArg(value, name) {
    if (value === undefined)
        return undefined;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0)
        throw new TypeError(`${name} must be a non-negative integer`);
    return parsed;
}
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function streamDream(argv, stdin) {
    const parsed = stdin.trim() === "" ? { observations: [] } : JSON.parse(stdin);
    const admitted = admitAperiodicDreamInput(parsed, "dream-stream");
    const limit = nonNegativeIntegerArg(argValue(argv, "--limit"), "--limit") ?? admitted.limit;
    const interval = nonNegativeIntegerArg(argValue(argv, "--interval-ms"), "--interval-ms") ?? 0;
    let emitted = 0;
    for (const candidate of aperiodicDreamConjectures(admitted.observations, {
        ...(admitted.start === undefined ? {} : { start: admitted.start }),
    })) {
        if (limit !== undefined && emitted >= limit)
            break;
        process.stdout.write(`${JSON.stringify(candidate)}\n`);
        emitted += 1;
        if (interval > 0)
            await wait(interval);
    }
    return 0;
}
async function streamCycles(argv, stdin) {
    const parsed = stdin.trim() === "" ? { before: [], batches: [] } : JSON.parse(stdin);
    const admitted = admitActionResearchSequenceInput(parsed, "cycle-stream");
    const cycleLimit = nonNegativeIntegerArg(argValue(argv, "--cycles"), "--cycles") ?? admitted.cycleLimit;
    const interval = nonNegativeIntegerArg(argValue(argv, "--interval-ms"), "--interval-ms") ?? 0;
    for (const event of aperiodicActionResearchCycles({
        ...admitted,
        ...(cycleLimit === undefined ? {} : { cycleLimit }),
    })) {
        process.stdout.write(`${JSON.stringify(event)}\n`);
        if (interval > 0)
            await wait(interval);
    }
    return 0;
}
export { streamDream, streamCycles };
