/**
 * Tools list for MCP tools/list.
 * Single source of truth: toolRegistry. This file re-exports for backward compatibility.
 */

import { getToolsList } from './toolRegistry.js';

/** @deprecated Prefer getToolsList() from toolRegistry. Exported for backward compatibility. */
export const TOOLS_LIST = getToolsList();
