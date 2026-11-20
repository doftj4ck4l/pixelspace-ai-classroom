"use client";

import { authClient } from "@/lib/auth-client";

export type AuthUser = { role?: unknown } & Record<string, unknown>;

export type AuthError = {
  code?: string;
  message?: string;
  status?: number;
} | null;

type AuthResponse = {
  data: { user?: AuthUser | null } | null;
  error: AuthError;
};

type UsernameSignIn = (args: {
  username: string;
  password: string;
  rememberMe: boolean;
}) => Promise<AuthResponse>;

export const signInWithIdentifier = async (
  identifier: string,
  password: string,
  rememberMe: boolean,
): Promise<{ user: AuthUser | null; error: AuthError }> => {
  const result = identifier.includes("@")
    ? ((await authClient.signIn.email({
        email: identifier,
        password,
        rememberMe,
      })) as unknown as AuthResponse)
    : await (
        authClient.signIn as unknown as { username: UsernameSignIn }
      ).username({ username: identifier, password, rememberMe });
  return { user: result.data?.user ?? null, error: result.error ?? null };
};

export type SignUpInput = {
  email: string;
  password: string;
  name: string;
  username: string;
  role: "student" | "teacher";
  schoolId: string;
  displayName?: string;
  yearLabel?: string;
};

export const signUpAccount = async (input: SignUpInput): Promise<AuthError> => {
  const result = await (
    authClient.signUp.email as unknown as (
      args: SignUpInput,
    ) => Promise<AuthResponse>
  )(input);
  return result.error ?? null;
};

export const sendVerification = async (email: string) => {
  await authClient
    .sendVerificationEmail({ email, callbackURL: "/" })
    .catch(() => null);
};
