/**
 * Normalize raw tool arguments so LLM output (snake_case, string numbers, etc.) is accepted.
 * Maps alternate key names to canonical camelCase and ensures types can be coerced by Zod.
 */

type Raw = Record<string, unknown>;

const SNakeToCamel: Record<string, string> = {
  schema_id: 'schemaId',
  schema_name: 'schemaName',
  schema_type: 'schemaType',
  data_points: 'dataPoints',
  credential_name: 'credentialName',
  scheme_type: 'schemeType',
  scheme_title: 'schemeTitle',
  scheme_id: 'schemaId',
  pricing_model: 'pricingModel',
  price_usd: 'priceUsd',
  compliance_access_key_enabled: 'complianceAccessKeyEnabled',
  payment_fee_schema_id: 'paymentFeeSchemaId',
  expiration_duration: 'expirationDuration',
  issue_max: 'issueMax',
  accessible_start_at: 'accessibleStartAt',
  accessible_end_at: 'accessibleEndAt',
  revoke_flag: 'revokeFlag',
  program_name: 'programName',
  credential_template_id: 'credentialTemplateId',
  program_id: 'programId',
  app_type: 'appType',
  search_str: 'searchStr',
  sort_field: 'sortField',
  filter_type: 'filterType',
  wallet_address: 'walletAddress',
  credentials_json: 'credentialsJson',
  private_key: 'privateKey',
  verifier_address: 'verifierAddress',
  issuer_address: 'issuerAddress',
  amount_usd: 'amountUsd',
  amount_moca: 'amountMoca',
};

function snakeToCamel(key: string): string {
  return SNakeToCamel[key] ?? key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeKeys(obj: Raw): Raw {
  const out: Raw = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const canon = snakeToCamel(k);
    if (Array.isArray(v)) {
      out[canon] = v.map((item) =>
        typeof item === 'object' && item !== null && !(item instanceof Date) ? normalizeKeys(item as Raw) : item
      );
    } else if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      out[canon] = normalizeKeys(v as Raw);
    } else {
      out[canon] = v;
    }
  }
  return out;
}

function pickFirst<T>(...values: (T | undefined | null)[]): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return undefined;
}

/**
 * Normalize arguments for a given tool so that alternate keys and types are accepted.
 * Call this before passing args to any tool's Zod schema parse.
 */
export function normalizeToolArgs(toolName: string, args: Raw): Raw {
  const raw = normalizeKeys(args ?? {});

  switch (toolName) {
    case 'credential_setup_pricing': {
      const priceUsd = pickFirst<unknown>(raw.priceUsd, raw.price_usd, raw.usd, raw.price);
      return { ...raw, priceUsd: priceUsd ?? 0 };
    }
    case 'credential_create_program':
      return {
        ...raw,
        schemaId: pickFirst(raw.schemaId, raw.schemeId),
        credentialName: pickFirst(raw.credentialName, raw.credential_name),
        schemeType: pickFirst(raw.schemeType, raw.scheme_type),
        schemeTitle: pickFirst(raw.schemeTitle, raw.scheme_title),
      };
    case 'credential_create_schema':
      return {
        ...raw,
        schemaName: pickFirst(raw.schemaName, raw.schema_name),
        schemaType: pickFirst(raw.schemaType, raw.schema_type),
        dataPoints: pickFirst(raw.dataPoints, raw.data_points),
      };
    case 'credential_create_verification_programs':
      return { ...raw, schemaId: pickFirst(raw.schemaId, raw.schemeId) };
    case 'credential_list_schemas':
      return {
        ...raw,
        filterType: pickFirst(raw.filterType, raw.filter_type) ?? 'own_schemas',
      };
    case 'credential_list_templates':
    case 'credential_list_programs':
      return raw;
    case 'credential_issuance_app_config':
      return {
        ...raw,
        credentialTemplateId: pickFirst(raw.credentialTemplateId, raw.credential_template_id, raw.templateId),
      };
    case 'credential_verifier_app_config':
      return { ...raw, programId: pickFirst(raw.programId, raw.program_id) };
    case 'credential_template_info':
    case 'credential_app_steps':
      return { ...raw, appType: pickFirst(raw.appType, raw.app_type) };
    case 'credential_set_price':
      return {
        ...raw,
        paymentFeeSchemaId: pickFirst(raw.paymentFeeSchemaId, raw.payment_fee_schema_id),
        priceUsd: pickFirst(raw.priceUsd, raw.price_usd),
      };
    case 'credential_payment_deposit':
    case 'credential_payment_withdraw':
      return {
        ...raw,
        verifierAddress: pickFirst(raw.verifierAddress, raw.verifier_address),
        amountUsd: pickFirst(raw.amountUsd, raw.amount_usd),
      };
    case 'credential_payment_claim_fees':
      return { ...raw, issuerAddress: pickFirst(raw.issuerAddress, raw.issuer_address) };
    case 'credential_stake_moca':
    case 'credential_unstake_moca':
      return { ...raw, amountMoca: pickFirst(raw.amountMoca, raw.amount_moca) };
    case 'credential_claim_unstake_moca':
      return raw;
    default:
      return raw;
  }
}
