# Credential MCP Server – Next steps and todos

Aligns with the [Credentials Overview](https://docs.moca.network/airkit/usage/credential/credentials-flow) and use cases in the workspace flow docs (01-issuance-flow.md, 02-verification-flow.md).

---

## Endpoints and headers (from dashboard)

- **Base URL:** `session.get('apiUrl')` (staging/production).
- **All authenticated requests:** `x-dashboard-auth` (dashboard token), `x-signature`, `x-timestamp`, `x-appversion: zkserapi_1.0.0` (see `utils/api.ts` `generateApiHeaders`).
- **Issuer APIs:** add `x-issuer-id: <issuerId>` (from session).
- **Verifier / management program APIs:** add `x-verifier-id: <verifierId>` (from session).

| Tool / use case | Method | Path | Request body | Extra headers |
|-----------------|--------|------|--------------|--------------|
| List credential templates | POST | `/issuer/credentialTemplateQuery` | `{ size, page, searchStr?, issuer_id, sorts }` | `x-issuer-id` |
| List verification programs | POST | `/management/program/query` | `{ page, size, verifierId, searchStr?, sorts }` | `x-verifier-id` |
| List schemas | POST | `/management/scheme/query` | `{ size, page, searchStr?, filterType, issuer_id, sorts }` | `x-issuer-id` |

Success: `code === 80000000`. Templates: `data.page.records`, `data.page.total`. Programs: `data.list.records`, `data.list.total`.

---

## Completed

- [x] **credential_list_templates** – List issuer credential templates (issuance program IDs).
- [x] **credential_list_programs** – List verifier verification programs.
- [x] **credential_docs** – Return issuance and/or verification steps and doc links.
- [x] **credential_list_schemas** – List schemas (own_schemas or other_schemas). POST `/management/scheme/query` with x-issuer-id.

---

## Todos (optional / later)

- [ ] **credential_verify_credential** – Trigger a verification (credential/storage ID + program ID), return compliant/non-compliant (for IDE testing). Requires verifier verify API path and body from docs.
- [ ] **credential_deploy_to_netlify** – Run or return `netlify deploy` with env from session (or config).
- [ ] **credential_scaffold_issuance_app** – Clone/generate from issuance template and inject partner/schema/env.
- [ ] **credential_deploy_program** – If verifier program “apply”/deploy is a separate API call, add a tool or document dashboard-only.
- [ ] Publish MCP server to npm and document Cursor/Claude/VS Code setup.

---

## Reference: dashboard API usage

- **Credential list:** [credential-dashboard/src/pages/credential/index.tsx](https://github.com/...) – `requestCredentialList(params)` → `POST /issuer/credentialTemplateQuery`, params: `size`, `page`, `searchStr`, `issuer_id`, `sorts`.
- **Program list:** [credential-dashboard/src/pages/verification/index.tsx](https://github.com/...) – `requestProgramList(params)` → `POST /management/program/query`, params: `page`, `size`, `verifierId`, `searchStr`, `sorts`.
- **Issuer HTTP client:** [credential-dashboard/src/api/issuer/index.ts](https://github.com/...) – `x-issuer-id`, `x-dashboard-auth`, `signHeaders(body)`.
- **Verifier HTTP client:** [credential-dashboard/src/api/verifier/index.ts](https://github.com/...) – `x-verifier-id`, `x-dashboard-auth`, `signHeaders(body)`.

If you capture a Chrome DevTools session (Network tab) for “list credentials” and “list programs”, we can confirm request/response shapes and align any edge cases.
