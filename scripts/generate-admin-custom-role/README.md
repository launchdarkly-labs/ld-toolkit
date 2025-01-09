# Generate Admin Custom Role

This script generates a LaunchDarkly custom role policy with admin-level permissions by scraping the [LaunchDarkly documentation](https://docs.launchdarkly.com/home/account/role-resources).

## Usage

```bash
deno run --allow-net scripts/generate-admin-custom-role/generate-admin-custom-role.ts
```

## Output

The script outputs the policy to the console. You can redirect the output to a file if you want to save it.

```json
[
  {
    "resources": [
      "acct"
    ],
    "actions": [
      "*"
    ],
    "effect": "allow"
  },
  {
    "resources": [
      "application/*"
    ],
    "actions": [
      "*"
    ],
    "effect": "allow"
  },
  ...one statement for every resource...
]
```
