/** Run beneath the parent's lean.slice scope, lock and deadline. Both Lake
 * stages inherit that scope; the parent kills all descendants on completion. */
import { spawnSync } from "node:child_process";
const [lake, module, program] = process.argv.slice(2);
for (const args of [["build", module], ["env", "lean", program]]) {
    const result = spawnSync(lake, args, { stdio: "inherit", env: process.env });
    if (result.error) {
        process.stderr.write(`${result.error.message}\n`);
        process.exit(1);
    }
    if (result.status !== 0) process.exit(result.status ?? 1);
}
