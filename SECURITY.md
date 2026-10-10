# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Report them privately through
[GitHub Security Advisories](../../security/advisories/new) for this repository. Include steps to
reproduce and the impact you observed. We aim to respond within 7 days.

## Security measures in this project

| Area | Measure |
| --- | --- |
| Secrets | No credentials in the repository. Configuration comes from environment variables (`.env.example`), and `.env*` files are git-ignored. The Gemini API key is server-side only. |
| Authentication | Firebase Authentication (Email/Password). Passwords are never handled by this app's server. |
| Authorization | Role-based route guards. Student accounts cannot use the supervisor portal, and supervisor access is limited to `NEXT_PUBLIC_SUPERVISOR_EMAILS` in Firebase mode. |
| AI endpoint | The server action requires a verified Firebase ID token (in Firebase mode). It is rate limited per user/IP (5/min) and globally (60/min), and inputs are sanitized and size-limited. Model output is re-validated against prerequisite rules and credit limits, and user goals are delimited as untrusted text against prompt injection. |
| HTTP headers | Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Cross-Origin-Opener-Policy` and `Permissions-Policy`. `X-Powered-By` is removed. |
| XSS | React escaping only (no `dangerouslySetInnerHTML`), plus a restrictive CSP (`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`). |
| Intrusion detection | Hex Sentinel Lite traps common scanner paths (`/.env`, `/.git/*`, `/wp-login.php`, …). It responds `404`, logs structured JSON with log-injection-safe encoding and clipped fields, and sends throttled HTTPS-only webhook alerts. |
| Dependencies | `npm audit --omit=dev` reports **0 vulnerabilities**. Dependabot and CI keep it that way. |

## Known limitations

- **Demo mode** (no Firebase configured) stores accounts and data in the browser's `localStorage`. It is meant for local evaluation only and is not a security boundary. Configure Firebase for any real deployment.
- **Application data** (plans, meetings, notes) is stored per browser. Before production use with real student data, move `src/lib/store.ts` to Cloud Firestore with security rules and Firebase custom claims for server-enforced RBAC.
- **Rate limiting** is in memory per server instance. Use a shared store (e.g. Redis) when running several instances.
- **CSP** allows `'unsafe-inline'` scripts because Next.js and the theme script inject inline bootstrapping code. Switch to nonce-based CSP if you need a stricter policy.
- **Dev-only advisory:** `braces` (via `eslint-config-next` → `fast-glob` → `micromatch`) has an open DoS advisory with no upstream patch yet. It only runs at lint time on this repository's own glob patterns and is not part of the deployed app.

## Supported versions

Only the latest `main` branch receives security fixes.
