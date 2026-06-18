export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  confirmationCode: string;
}

export interface ResendRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface MfaChallengeRequest {
  email: string;
  session: string;
  userCode: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  username?: string;
}

export interface RefreshRequest {
  refreshToken: string;
  username: string;
}

export interface MfaChallengeResponse {
  challengeName: 'SOFTWARE_TOKEN_MFA';
  session: string;
}

export type LoginResponse = AuthTokens | MfaChallengeResponse;

export function isMfaChallenge(r: LoginResponse): r is MfaChallengeResponse {
  return (r as MfaChallengeResponse).challengeName === 'SOFTWARE_TOKEN_MFA';
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
}
