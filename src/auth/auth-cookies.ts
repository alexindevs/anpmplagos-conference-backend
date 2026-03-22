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

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessMaxAgeSeconds: number,
  refreshMaxAgeSeconds: number,
) {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  };

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
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };

  res.cookie(ACCESS_TOKEN_COOKIE, '', cookieOptions);
  res.cookie(REFRESH_TOKEN_COOKIE, '', cookieOptions);
}
