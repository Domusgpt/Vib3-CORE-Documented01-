# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.0.x   | Yes       |
| < 2.0   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in VIB3+ CORE, please report it responsibly.

**Do NOT open a public GitHub issue.**

Instead, email: **Paul@clearseassolutions.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a timeline for a fix.

## Scope

Security concerns for VIB3+ include:
- XSS via parameter injection (shader uniforms, gallery state, URL params)
- WebGL/WebGPU resource exhaustion
- WASM memory safety
- MCP server input validation
- Export system file handling
