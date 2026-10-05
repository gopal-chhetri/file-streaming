/**
 * Startup checks for production. Each of these silently falls back to an
 * insecure or broken default in development, which must never reach a real
 * deployment, so a missing value stops the app before it serves traffic.
 */
export const KNOWN_WEAK_WORKER_TOKENS = ['internal-worker-token', 'changeme', ''];

export function validateProductionEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const problems: string[] = [];

  const workerToken = env.WORKER_API_TOKEN ?? '';
  if (KNOWN_WEAK_WORKER_TOKENS.includes(workerToken) || workerToken.length < 24) {
    problems.push('WORKER_API_TOKEN must be a random value of at least 24 characters');
  }
  const hasPrivate = env.JWT_PRIVATE_KEY || env.JWT_PRIVATE_KEY_PATH;
  const hasPublic = env.JWT_PUBLIC_KEY || env.JWT_PUBLIC_KEY_PATH;
  if (!hasPrivate || !hasPublic) {
    problems.push('JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH (or JWT_PRIVATE_KEY/JWT_PUBLIC_KEY) must be set');
  }
  if (!env.CORS_ORIGINS || env.CORS_ORIGINS.trim() === '*') {
    problems.push('CORS_ORIGINS must list the allowed origins (credentialed requests cannot use "*")');
  }
  if (!env.COOKIE_DOMAIN) {
    problems.push('COOKIE_DOMAIN must be set (e.g. .soylab.dpdns.org) for the refresh-token cookie');
  }
  return problems;
}
