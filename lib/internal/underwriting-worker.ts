/**
 * An in-process capability used by the authenticated cron route.
 * Symbols cannot be serialized through a browser-triggered Server Action call,
 * so normal clients cannot opt into service-role worker execution.
 */
export const INTERNAL_UNDERWRITING_WORKER = Symbol('internal-underwriting-worker')
