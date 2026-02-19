/**
 * Session and API types for credential MCP server
 */

export interface SessionState {
  // Authentication
  dashboardToken?: string;
  tokenExpiry?: Date;
  issuerId?: string;
  issuerDid?: string;
  partnerId?: string;
  verifierId?: string;
  verifierDid?: string;
  walletAddress?: string;
  
  // Workflow state
  schemaId?: string;
  schemaName?: string;
  schemaType?: string;
  schemaContext?: string;
  schemaDstorageId?: string;  // Added for OSS storage tracking
  credentialTemplateId?: string;
  programIds?: string[];
  verifierIds?: string[];
  
  // Environment
  environment: 'development' | 'staging' | 'production';
  apiUrl: string;
}

export interface ApiResponse<T = any> {
  code: string;
  message: string;
  data: T;
}

export interface SchemaDataPoint {
  name: string;
  type: 'string' | 'integer' | 'number' | 'boolean';
  description?: string;
}

export interface VerificationCondition {
  attribute: string;
  operator: '>' | '>=' | '<' | '<=' | '=' | '!=';
  value: string | number | boolean;
}

export interface VerificationProgram {
  programName: string;
  conditions: VerificationCondition[];
}
