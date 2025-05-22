import * as core from "@actions/core";
import * as path from 'path';
import {ok} from 'assert'
import * as semver from 'semver';
import * as toolCache from '@actions/tool-cache';

import {execSync} from "child_process";

const NPM_SRCPUSH_CLI_NAME = "@srcpush/code-push-cli"

export function presence(input: string | null | undefined): string | undefined {
    return (input || '').trim() || undefined;
}

export async function installSRCPushCLI(version: string): Promise<string> {
    const url = execSync(`npm view ${NPM_SRCPUSH_CLI_NAME}@${version} dist.tarball`).toString().trim();
    core.debug(`Tarball URL: ${url}`)
    const filename = path.basename(url);
    let tempDirectory = _getTempDirectory();

    const downloadedTool = await toolCache.downloadTool(url, `${tempDirectory}/${filename}`, undefined);
    core.debug(`Download path: ${downloadedTool}`)

    const installToPath = `${tempDirectory}/${path.parse(filename).name}` // delete extension such as .tgz
    core.debug(`Install to path: ${installToPath}`)

    execSync(`npm install --no-audit --prefix ${installToPath} ${downloadedTool}`)
    await toolCache.cacheDir(installToPath, 'srcpush', version);

    core.addPath(`${installToPath}/node_modules/.bin`);

    return installToPath
}

export async function computeVersion(version?: string) {
    let spec
    if (!version || version === 'latest') {
        core.debug(`Version was unset, defaulting to any version`);
        spec = '> 0.0.0';
    } else {
        spec = version
    }

    let result = computeBestVersion(spec, getVersions());
    core.debug(`Computed version resolved to "${result}"`);
    return result;
}

function getVersions(): string[] {
    return JSON.parse(execSync(`npm view ${NPM_SRCPUSH_CLI_NAME} versions --json`).toString().trim()) as string[]
}

function computeBestVersion(spec: string, versions: string[]): string {
    versions = versions.sort((a, b) => {
        return semver.gt(a, b) ? 1 : -1;
    });

    // Find the latest version that still satisfies the spec.
    let resolved = '';
    for (let i = versions.length - 1; i >= 0; i--) {
        const candidate = versions[i];
        if (semver.satisfies(candidate, spec)) {
            resolved = candidate;
            break;
        }
    }

    if (!resolved) {
        throw new Error(`Failed to find any versions matching "${spec}"`);
    }
    return resolved;
}

function _getTempDirectory(): string {
    const tempDirectory = process.env['RUNNER_TEMP'] || ''
    ok(tempDirectory, 'Expected RUNNER_TEMP to be defined')
    return tempDirectory
}
