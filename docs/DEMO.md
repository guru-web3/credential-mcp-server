# Demo Recording Scripts

Step-by-step instructions for recording demo videos of the Animoca Credential MCP Server.

## General Setup

- Terminal: Clean terminal, 14-16pt font, dark theme, clear scrollback before recording
- Window: 1280x720 or 1920x1080
- Tool: QuickTime (macOS: File > New Screen Recording) or OBS. Record terminal/browser window only.
- Pacing: Pause 1-2s after each command output so viewers can read
- Sensitive data: Use sandbox environment. Redact API keys in post-production.

## Compression

After recording, convert .mov to compressed MP4:

```bash
ffmpeg -i input.mov -vcodec h264 -crf 28 -preset slow -vf "scale=1280:-2" -an assets/demo-name.mp4
```

Target under 10MB per clip (25MB max for GitHub inline rendering).

---

## Video 1: demo-credential-lifecycle.mp4

**Duration:** ~45-60 seconds
**Shows:** Full credential lifecycle from schema to verification via MCP Inspector

### Recording Flow

1. Open MCP Inspector:
   ```bash
   pnpm inspector
   ```
   Wait for it to load in browser.

2. Call `credential_create_schema`:
   - schemaName: "employee-badge"
   - schemaType: "employee-badge"  
   - dataPoints: `[{"name":"department","type":"string"},{"name":"clearanceLevel","type":"integer"},{"name":"yearsEmployed","type":"number"}]`
   - **Pause** on response to show: `schemaId`, `storageId`, `status`, `nextSteps`

3. Call `credential_list_schemas` with defaults
   - **Pause** to show the new schema appearing in the list

4. Call `credential_setup_pricing`:
   - pricingModel: "pay_on_success"
   - priceUsd: 0
   - **Pause** on success response

5. Call `credential_create_program`:
   - Use the returned schemaId from step 2
   - credentialName: "Employee Badge"
   - expirationDuration: 365
   - **Pause** on template creation response

6. Call `credential_list_templates`
   - **Pause** to show the new template

7. Call `credential_create_verification_programs`:
   - programs: `[{"programName":"senior_clearance","conditions":[{"attribute":"clearanceLevel","operator":">=","value":"3"},{"attribute":"yearsEmployed","operator":">","value":"2"}]}]`
   - deploy: true
   - **Pause** on deployed program response

8. Call `credential_list_programs`
   - **Pause** to show the deployed program

9. Call `credential_docs` with flow: "both"
   - **Pause** to show generated issuance and verification documentation

---

## Video 2: demo-cursor-integration.mp4

**Duration:** ~30-40 seconds
**Shows:** Natural language credential management in Cursor

### Prerequisites

- Credential MCP server configured in `.cursor/mcp.json`
- Server running (sandbox environment)

### Recording Flow

1. Briefly show `.cursor/mcp.json` config (2 seconds)

2. In Cursor chat, type:
   > "Create a credential schema called kyc-verified with fields: fullName (string), countryCode (string), riskScore (integer)"
   
   Watch the agent:
   - Select `credential_create_schema`
   - Build parameters automatically
   - Execute and return schemaId
   **Pause** on result

3. Follow up:
   > "Set up free pricing for it and create an issuance program"
   
   Watch chained tool calls:
   - `credential_setup_pricing` (pricingModel: "pay_on_success", priceUsd: 0)
   - `credential_create_program`
   **Pause** on results

4. Follow up:
   > "Now create a verification program that checks riskScore less than 50"
   
   Watch:
   - `credential_create_verification_programs` with conditions [{attribute: "riskScore", operator: "<", value: "50"}]
   **Pause** on deployed program result

---

## Video 3: demo-app-scaffolding.mp4

**Duration:** ~30 seconds
**Shows:** Issuance and verifier app setup via MCP tools

### Recording Flow

1. Call `credential_template_info`:
   - appType: "issuance"
   - **Pause** to show repo URL and clone command

2. Call `credential_app_steps`:
   - appType: "issuance"
   - **Pause** to show ordered deploy steps

3. Call `credential_issuance_app_config`
   - **Pause** to show generated .env configuration

4. Call `credential_template_info`:
   - appType: "verifier"
   - **Pause** to show verifier repo info

5. Call `credential_verifier_app_config`
   - **Pause** to show verifier .env configuration

---

## Checklist

- [ ] Record Video 1 (credential lifecycle)
- [ ] Record Video 2 (Cursor integration)
- [ ] Record Video 3 (app scaffolding)
- [ ] Compress all videos with ffmpeg
- [ ] Verify each file is under 25MB
- [ ] Place in `assets/` directory
- [ ] Verify README video tags render on GitHub
