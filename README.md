# ld-toolkit
Assorted utilities and scripts for LaunchDarkly


## Scripts
Standalone scripts and utilities for LaunchDarkly.

- [clear-prereqs](./scripts/clear-prereqs/README.md): Given a feature flag, find all dependent flags and remove prerequisite rules. This is useful when you need to remove a flag that is used as a prerequisite.
- [generate-admin-custom-role](./scripts/generate-admin-custom-role/README.md): Generate a custom role policy with admin-level permissions by scraping the LaunchDarkly documentation.
- [changes-by-context-key](./scripts/changes-by-context-key/README.md): Given a context kind and context key, find all changes to invidiual targeting that affect the context.
- [get-all-flags](./scripts/get-all-flags/README.md): Fetch all feature flags from a LaunchDarkly project and output them as NDJSON (one JSON object per line). Handles pagination and rate limiting.

