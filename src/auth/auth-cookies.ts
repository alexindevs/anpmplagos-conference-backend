import type { Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** Match `JWT_ACCESS_EXPIRES_IN` default in AuthService (15m) */
export const DEFAULT_ACCESS_COOKIE_MAX_AGE_SECONDS = 15 * 60;

/** Match `JWT_REFRESH_EXPIRY_DAYS` default in AuthService */
export const DEFAULT_REFRESH_COOKIE_MAX_AGE_DAYS = 7;

export function getDefaultRefreshCookieMaxAgeSeconds(): number {
  return DEFAULT_REFRESH_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Cross-origin SPA (different site than API) needs SameSite=None; browsers require Secure with None.
 * Default: enabled in production, or set AUTH_COOKIE_CROSS_SITE=true (e.g. HTTPS staging).
 * Local HTTP dev keeps Lax + insecure cookies unless AUTH_COOKIE_CROSS_SITE=true (then use HTTPS).
 */
function useCrossSiteAuthCookies(): boolean {
  const raw = process.env.AUTH_COOKIE_CROSS_SITE?.trim().toLowerCase();
  if (raw === 'true' || raw === '1') {
    return true;
  }
  if (raw === 'false' || raw === '0') {
    return false;
  }
  return isProduction;
}

function authCookieBaseOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'none' | 'lax';
  path: string;
} {
  const crossSite = useCrossSiteAuthCookies();
  if (crossSite) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    };
  }
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessMaxAgeSeconds: number,
  refreshMaxAgeSeconds: number,
) {
  const cookieOptions = authCookieBaseOptions();

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieOptions,
    maxAge: accessMaxAgeSeconds * 1000,
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...cookieOptions,
    maxAge: refreshMaxAgeSeconds * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  const cookieOptions = {
    ...authCookieBaseOptions(),
    maxAge: 0,
  };

  res.cookie(ACCESS_TOKEN_COOKIE, '', cookieOptions);
  res.cookie(REFRESH_TOKEN_COOKIE, '', cookieOptions);
}
