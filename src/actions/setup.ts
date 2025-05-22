import path from 'path';

import * as core from '@actions/core';
import * as toolCache from '@actions/tool-cache';
import {computeVersion, installSRCPushCLI, presence} from "../utils";
import {execSync} from "child_process";

export async function run(): Promise<void> {
    try {
        let requestedVersionSpec = presence(core.getInput('version'));
        const token = presence(core.getInput('accessKey'));

        let version = await computeVersion(requestedVersionSpec);

        // Install the srcpush if not already present
        const toolPath = toolCache.find('srcpush', version);
        if (toolPath !== '') {
            core.debug(`Got cached version of srcpush matching "${version}" `);
            core.addPath(path.join(toolPath, '/node_modules/.bin'));
        } else {
            core.debug(`No version of srcpush matching "${version}" is installed. Will install it`);
            await installSRCPushCLI(version);
        }

        if (!token) {
            core.info(`Skipped authentication: 'accessKey' not provided.`);
        } else {
            execSync(`srcpush login --accessKey ${token}`)
        }

        core.setOutput('version', version);
    } catch (err) {
        core.setFailed(`srcpush/srcpush-github-action failed with: ${err}`);
    }
}

if (require.main === module) {
    run();
}
