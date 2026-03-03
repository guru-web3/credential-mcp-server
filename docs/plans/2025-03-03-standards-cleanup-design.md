# Credential MCP Server – Standards & Cleanup Design

**Date:** 2025-03-03

## Goal

Clean up the codebase to follow standard Node/TypeScript and MCP server practices: linting, formatting, security (no hardcoded secrets), structured logging, type safety, and project hygiene.

## Gaps vs Standard Approach

| Area | Current | Standard |
|------|---------|----------|
| Linting | No root ESLint (only signer-app) | ESLint + @typescript-eslint for main package |
| Formatting | None | Prettier or editorconfig |
| API key | Hardcoded in `utils/api.ts` | Env var (e.g. `CREDENTIAL_API_SIGNATURE_KEY`) |
| Debug logging | Unconditional console.log (curl, bodies) | Env-gated (e.g. `CREDENTIAL_MCP_DEBUG`) |
| Types | `any` in types.ts, api.ts | Explicit types; avoid `any` |
| Contract types | `any` + eslint-disable in contracts.ts | Use viem contract types or minimal interface |
| Scripts in src | test-create-issuer.ts in src/ | scripts/ and exclude from main build |
| Backup files | index.ts.bak in src | Remove; add *.bak to .gitignore |
| package.json | prepare runs full build | prepublishOnly for build; add lint/format scripts |

## Implementation Summary

1. **ESLint + Prettier** – Add configs; fix only the two eslint-disable sites by typing contracts properly.
2. **Config & logging** – Move signature key to env; gate verbose API logging behind `CREDENTIAL_MCP_DEBUG`.
3. **Types** – Replace `ApiResponse<T = any>` with `ApiResponse<T = unknown>`; type api.ts params/errors.
4. **Contracts** – Type as `ReturnType<typeof getContract>` with ABI + WalletClient (or minimal interface).
5. **Hygiene** – Delete `index.ts.bak`; move `test-create-issuer.ts` to `scripts/` and run via `node dist/` or ts-node from scripts; exclude scripts from main tsconfig or use separate entry.
6. **Scripts** – Add `lint`, `format`, `format:check`; change `prepare` to `prepublishOnly` for build.

## Out of Scope

- Changing test runner (keep node --test + compiled tests).
- Adding new features or API changes.
