#!/usr/bin/env node
import fs from 'node:fs';
import { TelemetryDirector } from '../../js/core/telemetry-director.js';
import { buildTelemetryError, createTelemetrySpan, endTelemetrySpan } from '../telemetry/telemetryEvents.js';

function parseArgs(argv) {
    const args = argv.slice(2);
    const result = { command: args[0], flags: {}, positional: [] };

    for (let i = 1; i < args.length; i += 1) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const [key, value] = arg.replace(/^--/, '').split('=');
            result.flags[key] = value ?? true;
        } else {
            result.positional.push(arg);
        }
    }

    return result;
}

function readJson(filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

async function runTelemetryExport({ packPath, previewCount }) {
    const pack = readJson(packPath);
    const director = new TelemetryDirector();
    return director.exportPack(pack, { previewCount });
}

async function main() {
    const { command, flags, positional } = parseArgs(process.argv);
    const jsonOutput = Boolean(flags.json);
    const nonInteractive = Boolean(flags['non-interactive']);

    if (!command || command === '--help' || flags.help) {
        console.log('Usage: node tools/cli/agent-cli.js telemetry:export <pack.json> [--json] [--non-interactive] [--preview-count=4]');
        process.exit(0);
    }

    if (nonInteractive && !jsonOutput) {
        console.error('Non-interactive mode requires --json output.');
        process.exit(1);
    }

    if (command === 'telemetry:export') {
        const packPath = positional[0];
        if (!packPath) {
            console.error('Missing pack path for telemetry:export.');
            process.exit(1);
        }

        const span = createTelemetrySpan('telemetry.export', { packPath, previewCount: flags['preview-count'] });
        try {
            const result = await runTelemetryExport({
                packPath,
                previewCount: Number(flags['preview-count']) || 4,
            });
            const completedSpan = endTelemetrySpan(span, 'ok');

            if (jsonOutput) {
                console.log(JSON.stringify({ ...result, span: completedSpan }, null, 2));
            } else {
                console.log(result.summary);
            }
            return;
        } catch (error) {
            const completedSpan = endTelemetrySpan(span, 'error');
            const errorPayload = buildTelemetryError({
                code: 'INVALID_PACK_JSON',
                message: error.message || 'Failed to parse pack JSON.',
                suggestion: 'Ensure the pack file is valid JSON with scenes or states.',
                meta: { packPath },
            });

            if (jsonOutput) {
                console.log(JSON.stringify({ ...errorPayload, span: completedSpan }, null, 2));
            } else {
                console.error(errorPayload.error.message);
            }
            process.exit(1);
        }
    }

    console.error(`Unknown command: ${command}`);
    process.exit(1);
}

main();
