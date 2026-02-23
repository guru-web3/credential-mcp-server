/**
 * Validation regexes aligned with credential-dashboard (define-schema-form, constants/regex).
 * Used for schemaType and version in create-schema.
 */

/** Alphanumeric only, no spaces (dashboard: alphanumericRegEx) */
export const alphanumericRegEx = /^[a-zA-Z0-9]+$/;

/** Numbers only - schemaType must NOT match this (dashboard: numberReg) */
export const numberOnlyReg = /^[1-9]\d*$/;

/** Version format e.g. 1.0, 1.0.1 (dashboard: versionRegEx) */
export const versionRegEx = /^(?:[1-9]\d{0,5})\.\d{1,6}(?:\.\d{1,6})?$/;
