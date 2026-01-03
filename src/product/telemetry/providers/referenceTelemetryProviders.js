import { dirname } from 'node:path';
import { appendFile, mkdir } from 'node:fs/promises';

export function createConsoleProvider(options = {}) {
  const { summary = true } = options;
  return {
    id: 'console',
    async send(event) {
      if (summary) {
        const headline = [
          event.event,
          event.context?.system,
          event.context?.geometry,
          event.metrics?.frameTimeMs ? `${event.metrics.frameTimeMs.toFixed?.(2) ?? event.metrics.frameTimeMs}ms` : undefined
        ].filter(Boolean).join(' | ');
        console.log(`🛰️  ${headline}`);
      }
      console.debug('telemetry:event', event);
    }
  };
}

export function createJsonlFileProvider(options = {}) {
  const filePath = options.filePath || 'telemetry/logs.jsonl';
  const ensureDirectory = async () => {
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });
  };

  return {
    id: 'jsonl-file',
    async send(event) {
      await ensureDirectory();
      await appendFile(filePath, `${JSON.stringify(event)}\n`, 'utf8');
    }
  };
}

export function createHttpProvider(options = {}) {
  const endpoint = options.endpoint || '';
  const headers = options.headers || { 'Content-Type': 'application/json' };

  return {
    id: 'http',
    async send(event) {
      if (!endpoint) return;
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(event)
        });
      } catch (error) {
        console.warn('⚠️ Telemetry HTTP provider failed:', error.message);
      }
    }
  };
}

export const defaultProviders = ({ filePath } = {}) => [
  createConsoleProvider(),
  createJsonlFileProvider({ filePath })
];
