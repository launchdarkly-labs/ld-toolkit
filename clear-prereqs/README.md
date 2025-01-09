# Clear Prerequisites

This script removes all prerequisites from a LaunchDarkly feature flag by finding all dependent flags and removing the prerequisite rules.

## Usage

```bash
# set LD_API_KEY to your LaunchDarkly API key
LD_API_KEY=api-abc-xyz deno run --allow-net --allow-env clear-prereqs.ts <projectKey> <flagKey> [--execute]
```

## Options

- `--execute`: Really remove the prerequisites. If you do not pass this argument, the script will only print the prerequisites that would be removed.

