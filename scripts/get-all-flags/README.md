# Get All Flags

A script that fetches all feature flags from a LaunchDarkly project and outputs them as NDJSON (one JSON object per line).

## Features

- Handles pagination automatically
- Retries on network errors and server errors (5xx)
- Respects rate limits using the X-RateLimit-Reset header
- Outputs in NDJSON format for easy processing

## Usage

```bash
deno run --allow-net --allow-env get-all-flags.ts <project-key>
```

Replace `<project-key>` with the actual key of your LaunchDarkly project.

### Arguments

- `project-key`: The LaunchDarkly project key to fetch flags from

### Environment Variables

- `LD_API_KEY`: Your LaunchDarkly API key (required)

### Example

```bash
LD_API_KEY=api-123 deno run --allow-net --allow-env get-all-flags.ts my-project > flags.ndjson
```

## Permissions Required

- `--allow-net`: Required to make HTTP requests to the LaunchDarkly API
- `--allow-env`: Required to read the LD_API_KEY environment variable
