interface AuditLogEntry {
  _id: string;
  date: number;
  kind: string;
  name: string;
  description: string;
  _links: {
    self: {
      href: string;
      type: string;
    };
    parent: {
      href: string;
      type: string;
    };
    canonical: {
      href: string;
      type: string;
    };
  };
  member: {
    firstName: string;
    lastName: string;
    email: string;
  };
  previousVersion?: {
    environments: {
      [key: string]: {
        contextTargets: Array<{
          contextKind: string;
          values: string[];
          variation: number;
        }>;
      };
    };
  };
  currentVersion?: {
    environments: {
      [key: string]: {
        contextTargets: Array<{
          contextKind: string;
          values: string[];
          variation: number;
        }>;
      };
    };
  };
}

interface AuditLogResponse {
  items: AuditLogEntry[];
  _links: {
    next?: {
      href: string;
    };
  };
}

async function getAuditLogEntry(id: string, apiToken: string): Promise<AuditLogEntry> {
  const response = await fetch(`https://app.launchdarkly.com/api/v2/auditlog/${id}`, {
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json',
      'ld-api-version': 'beta'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch audit log entry: ${response.statusText}`);
  }

  return response.json();
}

async function* getAuditLogEntries(apiToken: string, after: number, before: number): AsyncGenerator<AuditLogEntry> {
  let url = `https://app.launchdarkly.com/api/v2/auditlog?limit=20&after=${after}&before=${before}`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json',
        'ld-api-version': 'beta'
      },
      method: 'POST',
      body: JSON.stringify([
        {
          "resources": ["proj/*:env/*:flag/*"],
          "actions": ["updateTargets"],
          "effect": "allow"
        }
      ])
    });

    if (!response.ok) {
        const res = await response.text();
        console.log(res);
      throw new Error(`Failed to fetch audit log: ${response.statusText}`);
    }

    const data: AuditLogResponse = await response.json();
    
    for (const item of data.items) {
      yield item;
    }

    url = data._links.next?.href ? `https://app.launchdarkly.com${data._links.next.href}` : '';
  }
}

async function findContextChanges(contextKind: string, contextKey: string, apiToken: string) {
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  const changes: Array<{
    date: Date;
    flag: string;
    flagName: string;
    action: string;
    member: string;
    project: string;
    environment: string;
    variations: {
      previous: number[];
      current: number[];
    };
  }> = [];

  for await (const entry of getAuditLogEntries(apiToken, thirtyDaysAgo, now)) {
    const detailedEntry = await getAuditLogEntry(entry._id, apiToken);
    
    // Check all environments in both versions
    for (const envName in detailedEntry.currentVersion?.environments) {
      const prevTargets = detailedEntry.previousVersion?.environments[envName]?.contextTargets || [];
      const currTargets = detailedEntry.currentVersion?.environments[envName]?.contextTargets || [];

      // Get all variations the context was served in previous version
      const prevVariations = prevTargets
        .filter(target => target.contextKind === contextKind && target.values.includes(contextKey))
        .map(target => target.variation);

      // Get all variations the context is served in current version
      const currVariations = currTargets
        .filter(target => target.contextKind === contextKind && target.values.includes(contextKey))
        .map(target => target.variation);

      // Check if there's any difference in targeting
      const wasTargeted = prevVariations.length > 0;
      const isTargeted = currVariations.length > 0;
      const variationsChanged = !arraysEqual(prevVariations.sort(), currVariations.sort());

      if (wasTargeted !== isTargeted || variationsChanged) {
        let action: string;
        if (!wasTargeted && isTargeted) {
          action = 'added to';
        } else if (wasTargeted && !isTargeted) {
          action = 'removed from';
        } else {
          action = 'variation changed in';
        }
        const canonicalLink = detailedEntry._links.canonical.href;
        const [project, flag] = canonicalLink.split('/').slice(-2);
        changes.push({
          date: new Date(entry.date),
          flag: flag,
          flagName: entry.name,
          project: project,
          action,
          environment: envName,
          member: `${entry.member.firstName} ${entry.member.lastName} (${entry.member.email})`,
          variations: {
            previous: prevVariations,
            current: currVariations
          }
        });
      }
    }
  }

  return changes;
}

// Helper function to compare arrays
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Main execution
if (import.meta.main) {
  const apiToken = Deno.env.get("LD_API_KEY");
  if (!apiToken) {
    console.error("Please set LD_API_KEY environment variable");
    Deno.exit(1);
  }

  const args = Deno.args;
  if (args.length !== 2) {
    console.error("Usage: deno run --allow-net --allow-env changes-by-context-key.ts <contextKind> <contextKey>");
    Deno.exit(1);
  }

  const [contextKind, contextKey] = args;
  
  //console.log(`Searching for changes related to ${contextKind}:${contextKey}...`);
  
  try {
    const changes = await findContextChanges(contextKind, contextKey, apiToken);
    
    if (changes.length === 0) {
      console.log("No changes found");
    } else {
      // Print header
      console.log("date\tproject\tenvironment\tflag\tprevious variations\tcurrent variations");
      
      // Print changes
      changes.forEach(change => {
        console.log([
          change.date.toISOString(),
          change.project,
          change.environment,
          change.flag,
          change.variations.previous.join(',') || '-',
          change.variations.current.join(',') || '-'
        ].join('\t'));
      });
    }
  } catch (error) {
    console.error("Error:", error);
    Deno.exit(1);
  }
}
