# Default step-wise issuance setup

Use **animoca-credentials** MCP if found.

## Copy-paste query (working default)

```
Use animoca-credentials MCP if found. Query for the schema created today—only one will be there. I want to set up the issuance app: find an issuance program for this schema, then clone the template repo, generate .env.local with credential_issuance_app_config (so dataPoints from the schema are in the config for mocking), run generate-keys and set env. Don't edit the user-data route when you're only mocking. Rely on the template's built-in mock driven by NEXT_PUBLIC_CREDENTIALS_CONFIG and its dataPoints. Mock by type: string → "test", integer/number → 0, boolean → false. Add a TODO for when you plug in a real API later in app/(home)/api/user/user-data/route.ts. Run the app (pnpm dev) on port 3000—kill anything already using that port. Start pnpm tunnel or npx instatunnel 3000. Pick the tunnel URL only after both the app and the tunnel are running. Call credential_configure_issuer_jwks with the tunnel URL (not localhost), then open http://localhost:3000 to test.
```

## Default behaviors (when config not given)

1. **Keys not given** – If `NEXT_PUBLIC_PARTNER_PUBLIC_KEY` or `PARTNER_PRIVATE_KEY` is not set, run `pnpm run generate-keys` and populate `.env.local`.
2. **No API reference** – If no proper API is given for user data, use the mock approach: do not edit the user-data route; rely on the built-in mock (NEXT_PUBLIC_CREDENTIALS_CONFIG + dataPoints), mock by type (string → "test", integer/number → 0, boolean → false), and add a TODO in `app/(home)/api/user/user-data/route.ts` for plugging in a real API later.
3. **No endpoint/tunnel setup** – For local e2e testing, run the tunnel (pnpm tunnel or npx instatunnel 3000) and configure JWKS with the tunnel URL.

See [TOOLS.md](./TOOLS.md) for full flow and tool reference.
