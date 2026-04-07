# VS Code build guide: feature-onboarding orchestrator

A step-by-step guide to build the [agentic feature-onboarding orchestrator](CLAUDE-AGENT-E2E-GUIDE.md) **in VS Code (or Cursor)**. Use this doc while coding: open it in the sidebar and follow the phases.

**Related:** [CLAUDE-AGENT-E2E-GUIDE.md](CLAUDE-AGENT-E2E-GUIDE.md) (full spec), implementation plan (`.cursor/plans/` or repo root).

---

## 1. Prerequisites

- **VS Code** or **Cursor** (latest).
- **Node.js 18+** and **pnpm** (or npm) on your PATH.
- **Git** (for worktrees).
- **OpenRouter API key** ([openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)).

---

## 2. Recommended VS Code extensions

Install these for a smoother build:

| Extension | Purpose |
|-----------|--------|
| **ESLint** (`dbaeumer.vscode-eslint`) | Lint TypeScript. |
| **Prettier** (`esbenp.prettier-vscode`) | Format TS/JSON/YAML. |
| **YAML** (`redhat.vscode-yaml`) | Edit `config/pipeline.yaml` with schema. |
| **Thunder Client** or **REST Client** | Call orchestrator HTTP API (start run, webhook). |
| **GitLens** (optional) | Inspect worktrees and branches. |

In VS Code: `Ctrl+Shift+X` (or `Cmd+Shift+X`) → search and install.

---

## 3. Workspace setup

### Option A: New repo (recommended)

1. **New folder:** Create a folder for the orchestrator (e.g. `feature-onboarding-orchestrator`).
2. **Open in VS Code:** File → Open Folder → select that folder.
3. **Initialize project:**
   - Terminal (`Ctrl+`` or View → Terminal):
     ```bash
     pnpm init
     pnpm pkg set type="module"
     pnpm add @anthropic-ai/claude-agent-sdk dotenv zod
     pnpm add -D typescript @types/node
     npx tsc --init
     ```
   - Create `.env` and `.env.example` with OpenRouter vars (see below).
   - Create the folder structure from the [implementation plan](CLAUDE-AGENT-E2E-GUIDE.md) (e.g. `src/`, `config/`, `prompts/`).

### Option B: Inside an existing monorepo

1. Under `apps/` (e.g. `apps/feature-onboarding-orchestrator/`), create the same structure.
2. Open the **monorepo root** in VS Code so you have one workspace; use the terminal with `cd apps/feature-onboarding-orchestrator` when running commands.

### .env.example (root of orchestrator project)

```env
# OpenRouter (required for Claude Agent SDK)
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_AUTH_TOKEN=
ANTHROPIC_API_KEY=

# Optional: use env var for the key
OPENROUTER_API_KEY=sk-or-...

# State store (Phase 2+)
STATE_STORE=file
STATE_STORE_PATH=./data

# Approval (Phase 3+) — optional; leave empty if not using Slack
SLACK_WEBHOOK_URL=
SLACK_SIGNING_SECRET=

# Optional: MCP / integrations (Phase 4+)
# JIRA_API_URL= https://your-domain.atlassian.net
# JIRA_API_TOKEN=
# NOTION_TOKEN=
# GITHUB_TOKEN=
```

Copy to `.env` and set `ANTHROPIC_AUTH_TOKEN` (or `OPENROUTER_API_KEY`); leave `ANTHROPIC_API_KEY` empty so OpenRouter is used.

---

## 4. .vscode folder (optional but useful)

Create `.vscode` in the orchestrator project root with the following so you can run and debug from VS Code.

### .vscode/tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "build",
      "type": "shell",
      "command": "pnpm run build",
      "group": { "kind": "build", "isDefault": true }
    },
    {
      "label": "dev",
      "type": "shell",
      "command": "pnpm run dev",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "run:architect",
      "type": "shell",
      "command": "node -r dotenv/config dist/scripts/run-architect.js",
      "problemMatcher": []
    }
  ]
}
```

Run tasks: `Ctrl+Shift+B` (build), or Terminal → Run Task → choose `dev` / `run:architect`.

### .vscode/launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch orchestrator",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "cwd": "${workspaceFolder}",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug current script",
      "type": "node",
      "request": "launch",
      "program": "${file}",
      "cwd": "${workspaceFolder}",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

Use Run and Debug (`F5` or Ctrl+Shift+D) to start the orchestrator or debug the current file.

### .vscode/extensions.json (recommended extensions)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "redhat.vscode-yaml"
  ]
}
```

When someone opens the folder, VS Code will suggest these extensions.

---

## 5. Phase-by-phase build steps (in VS Code)

Follow in order. Each phase ends with something you can run or test in the editor.

### Phase 1: Foundation

1. **Create `src/scripts/hello-agent.ts`**  
   - Single file that sets OpenRouter env (or rely on `.env`), imports Claude Agent SDK, calls `query()` with a fixed prompt and `allowedTools: ["Read", "Bash"]`, and logs the response.
2. **Add script in `package.json`:**  
   `"hello-agent": "tsx src/scripts/hello-agent.ts"` (or use `ts-node`; ensure `tsconfig` has `"module": "NodeNext"` etc.).
3. **Run:** Terminal → `pnpm hello-agent`. Confirm output and that OpenRouter is hit (check OpenRouter dashboard).
4. **Checkpoint:** You have one agent call working with OpenRouter.

### Phase 2: Single-stage agent and state

1. **Create `src/types.ts`**  
   - Define `PipelineState`, `RunConfig` (see guide §5.2: run_id, thread_id, prd_summary, tech_spec, worktree_path, etc.).
2. **Create `src/interfaces/StateStore.ts`**  
   - Interface: `get(runId)`, `set(runId, state)`, `delete(runId)`.
3. **Create `src/implementations/stateStoreFile.ts`**  
   - Persist state as JSON under `./data/runs/<run_id>.json`; create `data/runs` if missing.
4. **Create `prompts/architect_system.md` and `prompts/architect_user.txt`**  
   - Copy content from guide §8.2; use placeholders `{{prd_summary}}`, `{{prd_answers}}`, `{{repo_context}}`.
5. **Create `src/orchestrator/stages/architect.ts`**  
   - Load prompts from `prompts/`, substitute from state, call SDK, parse markdown spec and return; orchestrator (or a small script) writes result to state via StateStore.
6. **Add a script or HTTP route** that accepts run_id + prd_summary + prd_answers, runs Architect, and saves tech_spec to state.
7. **Run:** e.g. `pnpm run:architect` (or POST to a local route) with test inputs; open `data/runs/<run_id>.json` in VS Code and confirm `tech_spec` is present.
8. **Checkpoint:** Architect stage runs and state is persisted.

### Phase 3: Multi-stage workflow and interrupt

1. **Create `src/orchestrator/stateMachine.ts`**  
   - State machine: stages in order (PRD → Architect → Engineer → QA); after each stage, if config says “approval gate”, call ApprovalChannel and set status to `awaiting_approval`, then return (do not advance).
2. **Create `src/interfaces/ApprovalChannel.ts`**  
   - `sendInterrupt(runId, threadId, stage, summary, actions)` and a way to “resume” (e.g. webhook calls back).
3. **Create `src/implementations/approvalSlack.ts`**  
   - Post to Slack with run_id, stage, summary, and Approve/Reject buttons (or link to webhook with payload). Implement webhook handler that receives approval and calls state machine “resume”.
4. **Implement PRD stage** in `src/orchestrator/stages/prd.ts` (same pattern as Architect: load prompts, call SDK, write to state).
5. **Expose HTTP:** e.g. `POST /runs` (start run, run PRD, then interrupt) and `POST /webhook/approve` (body: run_id, thread_id, approved, payload; load state, append approval, advance state machine).
6. **Test:** Use Thunder Client or REST Client in VS Code: POST to start run → check Slack → POST to webhook with approve → confirm next stage runs.
7. **Checkpoint:** Full PRD → gate → Architect → gate with Slack and resume.

### Phase 4: MCP and run config

1. **Add run config fields** to `RunConfig` / state: jira_issue_key, notion_page_id, docs_urls[].
2. **Implement in-process tools** (or MCP clients): Jira (fetch issue), Notion (fetch page), web_fetch (allowlisted URL). Register them with the SDK when the stage allowlist includes them.
3. **Update PRD and Architect prompts** so the user prompt includes “if jira_issue_key … fetch Jira” etc. when run config has those fields.
4. **Test:** Start a run with jira_issue_key or docs_urls; confirm agent receives and uses the fetched content.
5. **Checkpoint:** Optional Jira/Notion/docs wired and used in PRD/Architect.

### Phase 5: Engineer and QA (worktree + sandbox)

1. **Create `src/interfaces/SandboxProvider.ts`**  
   - `create(runId): Promise<{ worktreePath }>`, `destroy(runId): Promise<void>`.
2. **Create `src/implementations/sandboxWorktree.ts`**  
   - Create git worktree under `./worktrees/run-<run_id>`, branch `feature/run-<run_id>`; return path. Destroy: `git worktree remove` + delete branch.
3. **Before Engineer:** In state machine, call SandboxProvider.create(run_id), write worktree_path to state.
4. **Create `src/orchestrator/stages/engineer.ts`** and **`qa.ts`**  
   - Load prompts from `prompts/`, substitute worktree_path and spec; call SDK with Read, Edit, Bash (and web_fetch). For QA add browser if available; optional Figma comparison.
5. **Wire Engineer/QA** into the state machine; after QA add “Ship?” gate and cleanup (SandboxProvider.destroy) on approve.
6. **Test:** Run full pipeline with a small repo (e.g. a minimal Next or Nest app); confirm worktree is created, code is written, tests run, and worktree is removed after ship or teardown.
7. **Checkpoint:** Full PRD → Architect → Engineer → QA with worktree and optional browser/Figma.

### Phase 6: Monitoring and cleanup

1. **Cleanup job:** Script or cron that lists runs in terminal state and calls SandboxProvider.destroy for each; optionally archive or delete state files.
2. **Monitoring job:** Script that reads state for shipped runs, runs a simple health check (e.g. HTTP GET), and posts to Slack on failure.
3. **Checkpoint:** Cleanup and monitoring run (manually or on schedule).

### Phase 7: Hardening and reuse

1. **Config-driven:** Load `config/pipeline.yaml` for stage order, gates, timeouts, tool allowlists. Use it in state machine.
2. **Prompts from files only:** Ensure no prompts are hardcoded; all from `prompts/` with placeholders.
3. **Docker:** Add Dockerfile (Node image, copy src + config + prompts) and docker-compose.yml; mount config and prompts. Document env vars in README.
4. **Checkpoint:** Same codebase runs with different configs; Docker runs orchestrator.

---

## 6. Quick reference: key files and commands

| What | Where / command |
|------|------------------|
| Pipeline state type | `src/types.ts` |
| State store | `src/interfaces/StateStore.ts`, `src/implementations/stateStoreFile.ts` |
| Approval (Slack) | `src/interfaces/ApprovalChannel.ts`, `src/implementations/approvalSlack.ts` |
| Sandbox (worktree) | `src/interfaces/SandboxProvider.ts`, `src/implementations/sandboxWorktree.ts` |
| State machine | `src/orchestrator/stateMachine.ts` |
| Stages | `src/orchestrator/stages/prd.ts`, `architect.ts`, `engineer.ts`, `qa.ts` |
| Prompts | `prompts/*.md` or `prompts/*.txt` |
| Config | `config/pipeline.yaml` |
| Build | `pnpm run build` or Ctrl+Shift+B |
| Run orchestrator | `pnpm start` or F5 (Launch orchestrator) |
| Run one stage (dev) | `pnpm run:architect` (or similar task) |

---

## 7. Testing and debugging in VS Code

- **Unit tests:** Add a `tests/` folder and use `node --test` (or Jest/Vitest); run tests via Terminal or the Testing sidebar.
- **API calls:** Use Thunder Client or REST Client to hit `POST /runs`, `POST /webhook/approve`; save requests in `.vscode` or `scripts/` for reuse.
- **Debug:** Set breakpoints in `stateMachine.ts` or stage files; F5 with “Launch orchestrator” or “Debug current script” to step through.
- **Logs:** Use `console.log` or a small logger; output appears in the Integrated Terminal. For production, replace with a proper logger and structured logs.

---

## 8. Reference to the full spec

- **Full E2E and design:** [CLAUDE-AGENT-E2E-GUIDE.md](CLAUDE-AGENT-E2E-GUIDE.md)
- **Implementation plan:** See `.cursor/plans/` or the plan doc referenced in the guide (phases, repo structure, interfaces).

Use this VS Code guide as the “how I build it in the editor”; use the E2E guide for the “what and why.”
