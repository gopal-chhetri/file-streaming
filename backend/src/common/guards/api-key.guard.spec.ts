import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard, secretsMatch } from './api-key.guard';
import { validateProductionEnv } from '../../config/validate-env';

function contextWith(key?: string) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: key ? { 'x-api-key': key } : {} }) }),
  } as never;
}

describe('ApiKeyGuard', () => {
  const guard = (expected?: string) =>
    new ApiKeyGuard({ get: () => expected } as never);

  it('accepts the configured key', () => {
    expect(guard('s3cret-token').canActivate(contextWith('s3cret-token'))).toBe(true);
  });

  it('rejects a wrong or missing key', () => {
    expect(() => guard('s3cret-token').canActivate(contextWith('nope'))).toThrow(UnauthorizedException);
    expect(() => guard('s3cret-token').canActivate(contextWith())).toThrow(UnauthorizedException);
  });

  it('has no default key: unconfigured means every request is refused', () => {
    expect(() => guard(undefined).canActivate(contextWith('internal-worker-token'))).toThrow(
      UnauthorizedException,
    );
  });

  it('compares lengths safely', () => {
    expect(secretsMatch('abc', 'abcd')).toBe(false);
  });
});

describe('validateProductionEnv', () => {
  it('passes outside production', () => {
    expect(validateProductionEnv({ NODE_ENV: 'development' })).toEqual([]);
  });

  it('flags every insecure default in production', () => {
    const problems = validateProductionEnv({
      NODE_ENV: 'production',
      WORKER_API_TOKEN: 'internal-worker-token',
      CORS_ORIGINS: '*',
    });
    expect(problems.join(' ')).toMatch(/WORKER_API_TOKEN/);
    expect(problems.join(' ')).toMatch(/JWT/);
    expect(problems.join(' ')).toMatch(/CORS_ORIGINS/);
    expect(problems.join(' ')).toMatch(/COOKIE_DOMAIN/);
  });

  it('accepts a complete production configuration', () => {
    expect(
      validateProductionEnv({
        NODE_ENV: 'production',
        WORKER_API_TOKEN: 'x'.repeat(32),
        JWT_PRIVATE_KEY: 'k',
        JWT_PUBLIC_KEY: 'k',
        CORS_ORIGINS: 'https://streaming.soylab.dpdns.org',
        COOKIE_DOMAIN: '.soylab.dpdns.org',
      }),
    ).toEqual([]);
  });
});
