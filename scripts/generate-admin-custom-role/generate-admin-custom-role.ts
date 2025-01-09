#!/usr/bin/env -S deno run --allow-net
import {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom@v0.1.49/deno-dom-wasm.ts";

const DOC_URL = "https://docs.launchdarkly.com/home/account/role-resources";
const DOC_HTML = await fetch(DOC_URL).then((res) => res.text());

const doc = new DOMParser().parseFromString(DOC_HTML, "text/html");
const TABLE_SELECTOR = "#about-resource-types-and-scopes ~ details div.content table tbody";
const COLUMN_SELECTOR = "tr > td:nth-of-type(4)";

const tbody = doc.querySelector(TABLE_SELECTOR);

if (tbody === null) {
  throw new Error(`Unable to find 'About resource types and scopes' table in docs. Check to see if the selector needs to be updated. Current selector: ${TABLE_SELECTOR}`);
}

const resources = Array.from(tbody.querySelectorAll(COLUMN_SELECTOR)).map(v => v.innerText.trim());

if (resources.length === 0) {
  throw new Error(`Unable to find 'Written expression' column in 'About resource types and scopes' table. Check to see if the selector needs to be updated. Current selector: ${COLUMN_SELECTOR}`);
}

const adminRole = resources.map((v) => {
    return {
        resources: [v],
        actions: ["*"],
        effect: "allow",
    }
});


console.log(JSON.stringify(adminRole, null, 2));