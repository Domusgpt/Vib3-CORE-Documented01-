/**
 * VIB3+ Opt-in Error Reporter
 *
 * Captures unhandled errors and rejections for crash telemetry.
 * OFF by default. Must be explicitly enabled by the host application.
 *
 * Usage:
 *   import { ErrorReporter } from '@vib3/sdk/core/error-reporter';
 *   const reporter = new ErrorReporter({ endpoint: '/api/errors' });
 *   reporter.enable();
 *
 * No data is sent unless enable() is called. All reports are anonymized
 * (no user IDs, no cookies, no PII).
 */

export class ErrorReporter {

    /**
     * @param {Object} [options]
     * @param {string} [options.endpoint] - URL to POST error reports to
     * @param {Function} [options.onError] - Custom callback instead of HTTP POST
     * @param {number} [options.maxReports=50] - Max reports per session (rate limiting)
     * @param {boolean} [options.includeStack=true] - Include stack traces
     */
    constructor(options = {}) {
        this._endpoint = options.endpoint || null;
        this._onError = typeof options.onError === 'function' ? options.onError : null;
        this._maxReports = options.maxReports ?? 50;
        this._includeStack = options.includeStack !== false;
        this._reportCount = 0;
        this._enabled = false;
        this._boundOnError = this._handleError.bind(this);
        this._boundOnRejection = this._handleRejection.bind(this);
    }

    /** Enable error capture. Must be called explicitly. */
    enable() {
        if (this._enabled || typeof window === 'undefined') return;
        this._enabled = true;
        window.addEventListener('error', this._boundOnError);
        window.addEventListener('unhandledrejection', this._boundOnRejection);
    }

    /** Disable error capture and remove listeners. */
    disable() {
        if (!this._enabled || typeof window === 'undefined') return;
        this._enabled = false;
        window.removeEventListener('error', this._boundOnError);
        window.removeEventListener('unhandledrejection', this._boundOnRejection);
    }

    /** @returns {boolean} Whether the reporter is active */
    get isEnabled() {
        return this._enabled;
    }

    /** @private */
    _handleError(event) {
        this._report({
            type: 'error',
            message: event.message || 'Unknown error',
            filename: event.filename || '',
            lineno: event.lineno || 0,
            colno: event.colno || 0,
            stack: this._includeStack && event.error ? event.error.stack : undefined,
        });
    }

    /** @private */
    _handleRejection(event) {
        const reason = event.reason;
        this._report({
            type: 'unhandledrejection',
            message: reason instanceof Error ? reason.message : String(reason),
            stack: this._includeStack && reason instanceof Error ? reason.stack : undefined,
        });
    }

    /** @private */
    _report(data) {
        if (this._reportCount >= this._maxReports) return;
        this._reportCount++;

        const report = {
            ...data,
            timestamp: Date.now(),
            url: typeof location !== 'undefined' ? location.pathname : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            sdkVersion: '2.0.0',
        };

        // Custom callback takes priority
        if (this._onError) {
            try { this._onError(report); } catch (_) { /* swallow */ }
            return;
        }

        // HTTP POST if endpoint configured
        if (this._endpoint && typeof fetch === 'function') {
            fetch(this._endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report),
                keepalive: true,
            }).catch(() => { /* swallow network errors */ });
        }
    }

    /** Destroy reporter and clean up. */
    dispose() {
        this.disable();
        this._onError = null;
        this._endpoint = null;
    }
}

export default ErrorReporter;
