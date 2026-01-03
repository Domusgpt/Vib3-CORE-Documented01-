#!/usr/bin/env node
import { readFile, stat, watch } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import Ajv from 'ajv';
import { createTelemetryFacade } from '../../src/product/telemetry/createTelemetryFacade.js';
import { telemetrySchema, telemetryControls } from '../../src/product/telemetry/schema.js';
import { createConsoleProvider, createJsonlFileProvider } from '../../src/product/telemetry/providers/referenceTelemetryProviders.js';

const defaultFile = 'telemetry/logs.jsonl';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

async function commandEmit(rawArgs) {
  const args = parseArgs(rawArgs);
  const event = args.event || 'custom';
  const filePath = args.file || defaultFile;

  const controls = {};
  telemetryControls.forEach((key) => {
    if (args[key] !== undefined) controls[key] = args[key];
  });

  const context = {
    system: args.system,
    geometry: args.geometry,
    variation: args.variation,
    controls: Object.keys(controls).length ? controls : undefined,
    source: args.source || 'cli'
  };

  if (args.automation) {
    try {
      context.automation = typeof args.automation === 'string' ? JSON.parse(args.automation) : args.automation;
    } catch (error) {
      console.warn('⚠️ Failed to parse automation payload, sending as string');
      context.automation = { raw: String(args.automation) };
    }
  }

  const metrics = {};
  if (args.frameTimeMs) metrics.frameTimeMs = Number(args.frameTimeMs);
  if (args.exportDurationMs) metrics.exportDurationMs = Number(args.exportDurationMs);

  const facade = createTelemetryFacade({
    filePath,
    providers: [createConsoleProvider(), createJsonlFileProvider({ filePath })],
    onValidationError: (error) => {
      console.error('Validation failed:', error.details || error.message);
    }
  });

  const result = await facade.emit(event, {
    sessionId: args.sessionId,
    context,
    metrics,
    meta: { cli: true, version: args.version }
  });

  if (result.ok) {
    console.log('✅ Telemetry emitted');
  } else {
    console.error('❌ Telemetry failed', result.errors);
    process.exitCode = 1;
  }
}

async function commandValidate(filePath) {
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const validate = ajv.compile(telemetrySchema);
  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  let failures = 0;

  lines.forEach((line, index) => {
    try {
      const event = JSON.parse(line);
      const ok = validate(event);
      if (!ok) {
        failures++;
        console.error(`Line ${index + 1} invalid:`, validate.errors);
      }
    } catch (error) {
      failures++;
      console.error(`Line ${index + 1} parse error:`, error.message);
    }
  });

  if (failures === 0) {
    console.log(`✅ ${lines.length} events valid`);
  } else {
    console.error(`❌ ${failures} invalid events`);
    process.exitCode = 1;
  }
}

async function commandTail(filePath) {
  try {
    await stat(filePath);
  } catch {
    console.log('No telemetry file yet; waiting for events...');
  }

  let position = 0;
  const stream = createReadStream(filePath, { encoding: 'utf8', flag: 'a+' });
  stream.on('data', (chunk) => {
    position += chunk.length;
    process.stdout.write(chunk);
  });

  const watcher = watch(filePath, { persistent: true });
  for await (const event of watcher) {
    if (event.eventType === 'change') {
      const stats = await stat(filePath);
      if (stats.size > position) {
        const deltaStream = createReadStream(filePath, { start: position, end: stats.size });
        position = stats.size;
        deltaStream.pipe(process.stdout);
      }
    }
  }
}

async function commandAutomate(rawArgs) {
  const args = parseArgs(rawArgs);
  const automation = { action: args.action || 'apply-state' };

  ['state', 'targetState', 'fromState', 'sequence', 'modulator', 'control', 'waveform', 'anchorState', 'pack'].forEach(
    (key) => {
      if (args[key] !== undefined) automation[key] = args[key];
    }
  );

  ['durationMs', 'periodMs', 'amplitude', 'center', 'clampMin', 'clampMax'].forEach((key) => {
    if (args[key] !== undefined) automation[key] = Number(args[key]);
  });

  if (args.steps) {
    try {
      automation.steps = JSON.parse(args.steps);
    } catch (error) {
      console.warn('⚠️ steps JSON parse failed, ignoring', error.message);
    }
  }

  if (args.rule) {
    try {
      automation.rule = JSON.parse(args.rule);
    } catch (error) {
      console.warn('⚠️ rule JSON parse failed, ignoring', error.message);
    }
  }

  if (args.definition) {
    try {
      automation.definition = JSON.parse(args.definition);
    } catch (error) {
      console.warn('⚠️ pack definition parse failed, ignoring', error.message);
    }
  }

  if (args.sweep) {
    try {
      automation.sweep = JSON.parse(args.sweep);
    } catch (error) {
      console.warn('⚠️ sweep JSON parse failed, ignoring', error.message);
    }
  }

  const facade = createTelemetryFacade({
    filePath: args.file || defaultFile,
    providers: [createConsoleProvider(), createJsonlFileProvider({ filePath: args.file || defaultFile })],
    onValidationError: (error) => {
      console.error('Validation failed:', error.details || error.message);
    }
  });

  const result = await facade.emit('automation-command', {
    sessionId: args.sessionId,
    context: { automation },
    meta: { cli: true, version: args.version }
  });

  if (result.ok) {
    console.log('✅ automation command emitted');
  } else {
    console.error('❌ automation command failed', result.errors);
    process.exitCode = 1;
  }
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'emit':
      await commandEmit(args);
      break;
    case 'validate':
      await commandValidate(args[0] || defaultFile);
      break;
    case 'tail':
      await commandTail(args[0] || defaultFile);
      break;
    case 'automate':
      await commandAutomate(args);
      break;
    default:
      console.log(
        `Usage:\n  node tools/telemetry/cli.js emit --event slider-change --system quantum --rot4dXY 0.5\n  node tools/telemetry/cli.js tail [file]\n  node tools/telemetry/cli.js validate [file]\n  node tools/telemetry/cli.js automate --action modulate --control speed --amplitude 0.4 --periodMs 2500`
      );
      process.exitCode = command ? 1 : 0;
  }
}

main();
