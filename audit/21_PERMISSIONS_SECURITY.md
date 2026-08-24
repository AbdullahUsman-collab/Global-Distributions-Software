# 21 — PERMISSIONS AND SECURITY

## Authentication
**Method:** Session-based ASP.NET authentication
**Login:** Username + Password (plaintext over HTTP)
**Session:** Server-side session state

## Roles Observed
| Role | Access Level |
|------|-------------|
| Administrator | Full access to all modules |

## Permission Model (Inferred)
**UNKNOWN** — No role/permission management screen observed in the navigation.

The "Create New User" function exists under Utilities but its permission model is unknown.

## Security Observations
- Passwords transmitted in plaintext (HTTP, not HTTPS)
- No CAPTCHA on login
- No account lockout observed
- No session timeout configuration visible
- No audit trail for data changes visible
- ViewState used for page state (potential security concern)

## Areas NOT VERIFIED
- Whether role-based access control exists
- Whether field-level permissions exist
- Whether audit logging exists
- Whether password policy is enforced
- Whether session timeout is configured
- Whether HTTPS is available
