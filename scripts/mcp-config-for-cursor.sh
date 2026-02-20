#!/usr/bin/env bash
# Prints the exact MCP config you can paste into Cursor Settings → MCP.
# Run from the credential-mcp-server folder: ./scripts/mcp-config-for-cursor.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INDEX_JS="$PROJECT_DIR/dist/index.js"

if [[ ! -f "$INDEX_JS" ]]; then
  echo "Run 'npm run build' first. $INDEX_JS not found."
  exit 1
fi

NODE_PATH=$(command -v node)
if [[ -z "$NODE_PATH" ]]; then
  echo "Could not find 'node' in PATH. Install Node.js or use the full path to node in the config."
  exit 1
fi

echo ""
echo "Paste this into Cursor → Settings → MCP (replace existing animoca-credentials entry if any):"
echo ""
cat << EOF
{
  "mcpServers": {
    "animoca-credentials": {
      "command": "$NODE_PATH",
      "args": ["$INDEX_JS"]
    }
  }
}
EOF
echo ""
