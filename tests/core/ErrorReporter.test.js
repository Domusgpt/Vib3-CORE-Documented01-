/**
 * ErrorReporter Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorReporter } from '../../src/core/ErrorReporter.js';

describe('ErrorReporter', () => {
    let reporter;

    beforeEach(() => {
        reporter = new ErrorReporter({
            onError: vi.fn(),
            maxReports: 10,
        });
    });

    describe('constructor', () => {
        it('creates with options', () => {
            expect(reporter).toBeTruthy();
        });

        it('starts disabled', () => {
            expect(reporter.isEnabled).toBe(false);
        });
    });

    describe('enable/disable', () => {
        it('enables', () => {
            reporter.enable();
            expect(reporter.isEnabled).toBe(true);
        });

        it('disables', () => {
            reporter.enable();
            reporter.disable();
            expect(reporter.isEnabled).toBe(false);
        });
    });

    describe('dispose', () => {
        it('disposes without error', () => {
            reporter.enable();
            expect(() => reporter.dispose()).not.toThrow();
            expect(reporter.isEnabled).toBe(false);
        });

        it('disposes when already disabled', () => {
            expect(() => reporter.dispose()).not.toThrow();
        });
    });
});
