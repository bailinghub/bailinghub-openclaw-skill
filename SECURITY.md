# Security policy

Please do not report credentials, private task data, or exploitable details in a public issue.

For a suspected vulnerability, use GitHub private vulnerability reporting in this repository. Include the affected version, deployment mode, expected boundary, observed behavior, and a minimal reproduction with all secrets removed.

The integration assumes:

- BailingHub and OpenClaw are independently administered;
- executor tokens are target-scoped and stored outside source control;
- the business system remains the final authorization authority;
- the host and model provider are permitted to process the claimed task data.

See `skills/bailinghub-executor/references/security.md` for the complete runtime boundary.

