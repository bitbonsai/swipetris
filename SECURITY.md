# Security policy

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that could expose credentials, user data, or production infrastructure.

Report it privately through [GitHub Security Advisories](https://github.com/bitbonsai/swipetris/security/advisories/new). Include reproduction steps, impact, and any suggested mitigation. You should receive an acknowledgement within seven days.

## Scope and trust model

Swipetris has no user accounts and stores only arcade initials, scores, game statistics, and submission timestamps. Leaderboard submissions originate in an untrusted browser. Server-side validation and rate limiting reduce abuse but do not prove that a score came from an unmodified client.

Secrets belong only in local `.env` files or deployment-platform environment variables. Security controls must not depend on repository privacy or hidden client code.
