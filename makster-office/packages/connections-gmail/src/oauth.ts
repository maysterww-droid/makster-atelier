import type { GoogleOAuthConfig, GoogleOAuthTokenResponse } from './types.js';
import { MAKSTER_GMAIL_SCOPES } from './types.js';

function formBody(values: Record<string,string>): string {
  return new URLSearchParams(values).toString();
}

export class GoogleOAuthClient {
  constructor(private readonly config: GoogleOAuthConfig, private readonly fetchImpl: typeof fetch = fetch) {
    if (!config.clientId || !config.clientSecret || !config.redirectUri) throw new Error('google_oauth_config_incomplete');
  }

  buildAuthorizationUrl(input: { state: string; loginHint?: string; promptConsent?: boolean; scopes?: readonly string[] }): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('scope', [...(input.scopes ?? MAKSTER_GMAIL_SCOPES)].join(' '));
    url.searchParams.set('state', input.state);
    if (input.loginHint) url.searchParams.set('login_hint', input.loginHint);
    if (input.promptConsent) url.searchParams.set('prompt', 'consent');
    return url.toString();
  }

  async exchangeCode(code: string): Promise<GoogleOAuthTokenResponse> {
    if (!code) throw new Error('google_oauth_code_required');
    return this.tokenRequest({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokenResponse> {
    if (!refreshToken) throw new Error('google_refresh_token_required');
    return this.tokenRequest({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });
  }

  async revokeToken(token: string): Promise<void> {
    if (!token) return;
    const response = await this.fetchImpl('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({ token }),
    });
    if (!response.ok && response.status !== 400) throw new Error(`google_oauth_revoke_failed:${response.status}`);
  }

  private async tokenRequest(values: Record<string,string>): Promise<GoogleOAuthTokenResponse> {
    const response = await this.fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody(values),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`google_oauth_token_failed:${response.status}:${text}`);
    const raw = JSON.parse(text) as Record<string,unknown>;
    if (typeof raw.access_token !== 'string' || typeof raw.expires_in !== 'number') throw new Error('google_oauth_token_response_invalid');
    return {
      accessToken: raw.access_token,
      expiresIn: raw.expires_in,
      tokenType: typeof raw.token_type === 'string' ? raw.token_type : 'Bearer',
      ...(typeof raw.scope === 'string' ? { scope: raw.scope } : {}),
      ...(typeof raw.refresh_token === 'string' ? { refreshToken: raw.refresh_token } : {}),
      ...(typeof raw.refresh_token_expires_in === 'number' ? { refreshTokenExpiresIn: raw.refresh_token_expires_in } : {}),
    };
  }
}
