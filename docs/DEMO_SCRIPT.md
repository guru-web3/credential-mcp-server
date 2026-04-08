# Demo Video Script — Animoca Credential MCP Server

A full walkthrough script for recording a 3-5 minute demo video. Use for interview presentations, portfolio showcases, or technical talks.

---

## Recording Setup

| Setting | Value |
|---|---|
| Resolution | 1920x1080 (1080p) |
| Terminal font | 16pt, dark theme (e.g. Dracula, One Dark) |
| Recording tool | OBS Studio or QuickTime (macOS) |
| Browser | Chrome or Arc, zoom 110% for readability |
| Environment | `CREDENTIAL_MCP_ENVIRONMENT=sandbox` |
| Prep | `clear && pnpm build` before recording |

**Post-production compression:**

```bash
ffmpeg -i raw-demo.mov -vcodec h264 -crf 26 -preset slow -vf "scale=1920:-2" -an assets/demo-full.mp4
```

---

## Script

### ACT 1 — The Problem (30 seconds)

**[Show: split screen — left: credential dashboard with many tabs, right: terminal with curl commands]**

> "Building a Web3 credential system on the AIR/MOCA ecosystem means juggling multiple dashboards, REST APIs, chain RPCs, and payment contracts.

> Creating a single credential schema, setting up pricing, deploying a verification program — each step lives in a different interface. And none of these systems are accessible to AI agents.

> I built an MCP server that changes that."

---

### ACT 2 — What It Is (20 seconds)

**[Show: README architecture diagram in GitHub, or the Mermaid rendered in a browser]**

> "This is the Animoca Credential MCP Server — 21 tools exposed through the Model Context Protocol. It lets AI agents in Cursor or Claude manage the entire credential lifecycle through natural language.

> Schema creation, pricing, issuance programs, verification programs, on-chain staking, x402 payments — all conversational."

---

### ACT 3 — Live Demo: MCP Inspector (90 seconds)

**[Terminal: run `pnpm inspector`]**

> "Let me show you. I'll start the MCP Inspector, which lets us call tools interactively."

**Step 1: Create a schema**

> "First, I'll create a credential schema. Think of this as defining what data a credential can hold."

- Tool: `credential_create_schema`
- Input:
  ```json
  {
    "schemaName": "employee-badge",
    "schemaType": "employeeBadge",
    "dataPoints": [
      {"name": "department", "type": "string"},
      {"name": "clearanceLevel", "type": "integer"},
      {"name": "yearsEmployed", "type": "number"}
    ],
    "description": "Employee identity and clearance credential"
  }
  ```
- **[Pause 2s on response]** Point out: `schemaId`, `status`, `nextSteps` array.

> "One tool call, and the schema is created and published. The response includes the schema ID and tells the agent what to do next."

**Step 2: Set up pricing**

> "Next, pricing. This determines whether verifiers pay per-attempt or only on success."

- Tool: `credential_setup_pricing`
- Input: `{"pricingModel": "each_attempt", "priceUsd": 0}`
- **[Pause 2s]**

> "Free pricing for all verification attempts. Done."

**Step 3: Create issuance program**

> "Now I'll create an issuance program — this is the template that will issue actual credentials."

- Tool: `credential_create_program`
- Input: `{}` (uses session state from previous calls)
- **[Pause 2s]** Point out: template ID, credential name auto-populated.

> "Notice I didn't pass any parameters. The server remembers the schema from the previous step and fills everything in."

**Step 4: Create verification programs**

> "Finally, verification programs — rules that credentials must satisfy."

- Tool: `credential_create_verification_programs`
- Input:
  ```json
  {
    "programs": [
      {
        "programName": "senior_engineer",
        "conditions": [
          {"attribute": "clearanceLevel", "operator": ">=", "value": 3},
          {"attribute": "yearsEmployed", "operator": ">", "value": 2}
        ]
      }
    ],
    "deploy": true
  }
  ```
- **[Pause 2s]** Point out: program deployed and active.

> "The program is deployed immediately. An agent or app can now use this to verify employee credentials on-chain."

---

### ACT 4 — Live Demo: Cursor Integration (60 seconds)

**[Switch to: Cursor IDE with mcp.json visible briefly]**

> "Now the real power — using this through Cursor as a natural language interface."

**[Open Cursor chat, type:]**

> `Create a credential schema called kyc-verified with fields: fullName (string), countryCode (string), riskScore (integer)`

**[Wait for agent to execute `credential_create_schema`]**

> "The agent automatically selects the right tool, maps my description to structured parameters, and executes it."

**[Follow up:]**

> `Set up free pricing for all verifications and create an issuance program`

**[Wait for chained calls: `credential_setup_pricing` → `credential_create_program`]**

> "Two tool calls, chained automatically. The agent carries the schema ID from the first call."

**[Follow up:]**

> `Create a verification program that checks riskScore is below 50 and countryCode equals US`

**[Wait for `credential_create_verification_programs`]**

> "And now we have a full credential system — schema, pricing, issuance, verification — all set up through three sentences."

---

### ACT 5 — App Scaffolding (30 seconds)

**[In Cursor chat:]**

> `What are the steps to deploy the issuance app?`

**[Wait for `credential_app_steps` response]**

> "The server also generates deployment guides. Clone the template, install, configure — it even generates the .env file with all the right IDs pre-filled."

**[Follow up:]**

> `Generate the .env configuration for the issuance app`

**[Wait for `credential_issuance_app_config` response]**

> "Ready to paste into the template app. No more hunting through dashboards for IDs."

---

### ACT 6 — Technical Highlights (30 seconds)

**[Show: `src/server/toolRegistry.ts` in editor, scrolling through tool entries]**

> "Under the hood — a few design decisions I'm proud of:

> **Central tool registry** — every tool is defined in one file with its name, zod schema, and handler. No scattered switch statements.

> **LLM-resilient argument normalization** — zod union types with string transforms mean the agent can say 'per issuance' or 'each attempt' and it maps correctly.

> **Session state** — the server tracks schema IDs, issuer DIDs, and template IDs across calls, so the agent doesn't have to pass them repeatedly.

> **Dual transport** — STDIO for local Cursor integration, HTTP with OAuth for remote clients."

---

### ACT 7 — Closing (15 seconds)

> "This MCP server turns what was 30-60 minutes of dashboard navigation into a single conversation. It's the infrastructure layer that makes AI-driven credential management possible — and it's the foundation for delegated verification in the ERC-8004 framework.

> 21 tools, 71 passing tests, TypeScript strict mode, and ready for production."

---

## Shorter Variants

### 60-Second Lightning Talk

Use ACT 1 (trim to 10s) → ACT 3 Steps 1+4 only (30s) → ACT 7 (15s).

### 2-Minute Interview Demo

Use ACT 1 (15s) → ACT 2 (10s) → ACT 4 full (60s) → ACT 7 (15s).

### README Clips (3 separate videos)

See `docs/DEMO.md` for individual clip scripts:
1. `demo-credential-lifecycle.mp4` — MCP Inspector walkthrough
2. `demo-cursor-integration.mp4` — Cursor natural language demo
3. `demo-app-scaffolding.mp4` — App template setup

---

## Talking Points for Q&A

**"Why MCP instead of a REST API?"**
> MCP is purpose-built for AI agent tooling. It handles tool discovery, schema validation, and session management. A REST API would require the agent to read docs, manage auth tokens, and build request bodies — MCP abstracts all of that.

**"How do you handle LLMs sending wrong parameter formats?"**
> Every tool schema uses zod unions with string transforms. If the LLM says "pay per issuance" instead of "pay_on_success", it normalizes. Invalid operators default to "=". We test for this — 71 tests include normalization edge cases.

**"What about security?"**
> Private keys never leave the local environment. STDIO mode has no network surface. The OAuth flow uses PKCE with JWTs signed by jose. On-chain calls go through viem's wallet client with explicit gas estimation.

**"How would this scale?"**
> Each MCP server instance is stateless beyond the session. For multi-tenant HTTP deployment, sessions are per-connection. The tool registry is a flat array lookup — O(1) dispatch. The bottleneck is the upstream credential API, not this server.

**"What's the hardest part you solved?"**
> Getting the zod schemas to be simultaneously strict enough for type safety and lenient enough for LLM input. The union-with-transform pattern was the key insight — the enum branch handles valid input at compile time, the transform branch handles LLM quirks at runtime.



Here are the **Cursor chat prompts** from `docs/DEMO_SCRIPT.md` you can run in order during the demo (ACT 4 + ACT 5). ACT 3 is MCP Inspector with JSON — those are not natural-language prompts.

---

### Cursor — credential lifecycle (ACT 4)

**1 — Create schema**

```text
Create a credential schema called kyc-verified with fields: fullName (string), countryCode (string), riskScore (integer)
```

**2 — Pricing + issuance**

```text
Set up free pricing for all verifications and create an issuance program
```

**3 — Verification program**

```text
Create a verification program that checks riskScore is below 50 and countryCode equals US
```

---

### Cursor — app scaffolding (ACT 5)

**4 — Steps**

```text
What are the steps to deploy the issuance app?
```

**5 — Env snippet**

```text
Generate the .env configuration for the issuance app
```

---

### Optional: one-shot (if you want a single follow-up)

```text
Using the credential MCP tools, list my schemas and my verification programs.
```

---

**Note:** Ensure the Animoca credential MCP server is enabled in Cursor and `CREDENTIAL_MCP_ENVIRONMENT` is set to a working API (e.g. **staging** if sandbox is 503). The script still says `sandbox` in the Recording Setup table — for a live demo, align that with your `.env`.