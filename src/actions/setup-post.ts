import * as core from "@actions/core";
import {execSync} from "child_process";

export async function run(): Promise<void> {
    try {
        execSync(`srcpush logout`)
    } catch (err) {
        core.setFailed(`srcpush/srcpush-github-action failed with: ${err}`);
    }
}

if (require.main === module) {
    run();
}
