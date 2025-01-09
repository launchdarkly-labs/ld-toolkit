#!/usr/bin/env -S deno run --allow-net --allow-env

interface DependentFlagEnvironment {
    name: string;
    key: string;
}

type LinkType = "application/json" | "text/html";

interface DependentFlag {
    name: string;
    key: string;
    environments: DependentFlagEnvironment[];
    _links: {
        flag: {
            href: string;
            type: LinkType;
        };
        self: {
            href: string;
            type: LinkType;
        };
    };
    _site: {
        href: string;
        type: LinkType;
    };
}

interface ListAPIResponse<T> {
    items: T[];
    _links: {
        self: {
            href: string;
            type: LinkType;
        };
        _site: {
            href: string;
            type: LinkType;
        };
    };
}

type SemanticPatch = {
    environmentKey: string;
    comment: string;
    instructions: SemanticPatchInstruction[];
};
type RemovePrerequisiteInstruction = {
    kind: "removePrerequisite";
    key: string;
};
type SemanticPatchInstruction = RemovePrerequisiteInstruction;

const LD_API_KEY = Deno.env.get("LD_API_KEY");
const LD_API_URL = Deno.env.get("LD_API_ENDPOINT") ||
    "https://app.launchdarkly.com/";

if (!LD_API_KEY) {
    throw new Error("LD_API_KEY is not set");
}

const [projectKey, flagKey, execute] = Deno.args;
let isDryRun = true;

if (!projectKey || !flagKey) {
    throw new Error("Usage: clear-prereqs <projectKey> <flagKey> [--execute]");
}

if (execute === "--execute") {
    isDryRun = false;
} else if (execute !== null && execute !== undefined && execute !== "") {
    throw new Error(
        `Unreconized argument ${execute}.\nUsage: clear-prereqs <projectKey> <flagKey> [--execute]`,
    );
}

// log to stderr
function log(message: string) {
    // write to stderr
    Deno.stderr.writeSync(new TextEncoder().encode(message + "\n"));
}

async function get<T>(path: string | URL): Promise<T> {
    const url = new URL(path, LD_API_URL);
    const response = await fetchWithRateLimitRetry(
        new Request(url, {
            headers: {
                "Authorization": `${LD_API_KEY}`,
                "LD-API-Version": "beta",
            },
        }),
    );
    return response.json();
}

async function patch(path: string | URL, body: any) {
    const url = new URL(path, LD_API_URL);
    const response = await fetchWithRateLimitRetry(
        new Request(url, {
            method: "PATCH",
            headers: {
                "Authorization": `${LD_API_KEY}`,
                "LD-API-Version": "beta",
                "Content-Type":
                    "application/json; domain-model=launchdarkly.semanticpatch",
            },
            body: JSON.stringify(body),
        }),
    );
    return response;
}

async function fetchWithRateLimitRetry(request: Request): Promise<Response> {
    const retryRequest = request.clone();
    let response = await fetch(request);
    while (response.status === 429) {
        const retryAfter = response.headers.get("X-Ratelimit-Reset") || 2000;
        log(`\u274C Rate limit exceeded, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, Number(retryAfter)));
        response = await fetch(retryRequest.clone());
    }
    return response;
}

function displayDependentFlags(dependentFlags: ListAPIResponse<DependentFlag>) {
    for (const flag of dependentFlags.items) {
        console.log(
            flag.name,
            flag.key,
            flag.environments.map((env) => env.key).join(", "),
        );
    }
}

// Get flag dependencies with proper typing
const dependentFlags = await get<ListAPIResponse<DependentFlag>>(
    `/api/v2/flags/${projectKey}/${flagKey}/dependent-flags`,
);

if (isDryRun) {
    log(`\u2139\uFE0F  Found ${dependentFlags.items.length} dependent flags`);
    if (dependentFlags.items.length > 0) {
        log(`\u26A1\uFE0F Run again with --execute to delete the associated rules`);
    }
    displayDependentFlags(dependentFlags);
} else {
    for (const flag of dependentFlags.items) {
        const ops = flag.environments.map((env) => ({
            "environmentKey": env.key,
            "comment":
                `Clearing prerequesites on ${flagKey} via ld-toolkit/clear-prereqs`,
            "instructions": [{ "kind": "removePrerequisite", "key": flagKey }],
        }));
        for (const op of ops) {
            const res = await patch(
                `/api/v2/flags/${projectKey}/${flagKey}`,
                op,
            );
            if (!res.ok) {
                log(
                    `\u274C Failed to remove prerequesite on ${flag.name} (${flag.key}) in ${
                        op.environmentKey
                    }`,
                );
                const result = await res.json();
                console.error(result);
            } else {
                log(
                    `\u2705 Removed prerequesite on ${flag.name} (${flag.key}) in ${
                        op.environmentKey
                    }`,
                );
            }
        }
    }
}
