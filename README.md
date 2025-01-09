# ld-toolkit
Assorted utilities and scripts for LaunchDarkly


## Scripts
Standalone scripts and utilities for LaunchDarkly.

- [clear-prereqs](./scripts/clear-prereqs/README.md): Given a feature flag, find all dependent flags and remove prerequisite rules. This is useful when you need to remove a flag that is used as a prerequisite.
- [generate-admin-custom-role](./scripts/generate-admin-custom-role/README.md): Generate a custom role policy with admin-level permissions by scraping the LaunchDarkly documentation.
