"use client";

import { useState, type FC, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH === "1";

/** Shared sign-in / sign-up card, styled like the app (teal glow, rounded). */
export const AuthForm: FC<{ mode: "login" | "register" }> = ({ mode }) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isRegister = mode === "register";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = isRegister
        ? await signUp.email({ name: name.trim() || email.split("@")[0]!, email, password })
        : await signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message ?? "Authentication failed");
        setPending(false);
        return;
      }
      router.push("/chat");
      router.refresh();
    } catch {
      setError("Something went wrong — try again.");
      setPending(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[#fdfcfc] px-4 text-[#1f1f1f] dark:bg-[#0c0c0c] dark:text-[#e3e3e3]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-[260px] w-[680px] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-[140px] bg-[#8fd9c8]/60 blur-[90px] dark:bg-[#0f4f4a]/50"
      />
      <form
        onSubmit={onSubmit}
        className="relative z-10 flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-white p-6 shadow-lg shadow-black/5 dark:bg-[#1e1f20]"
      >
        <div className="flex flex-col items-center gap-1 pb-2">
          <div className="mb-2 size-11 rounded-full bg-gradient-to-br from-[#177e89] to-[#8fd9c8]" />
          <h1 className="text-lg font-semibold">Pixelspace AI Classroom</h1>
          <p className="text-sm text-[#5e6063] dark:text-[#9aa0a6]">
            {isRegister ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {isRegister && (
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            autoComplete="name"
            className="h-10"
          />
        )}
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          autoComplete="email"
          autoFocus
          required
          className="h-10"
        />
        <Input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          className="h-10"
        />
        {isRegister && (
          <p className="text-muted-foreground -mt-2 text-xs">
            At least 12 characters.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          type="submit"
          disabled={pending || !email || !password || (isRegister && password.length < 12)}
          className="h-10 bg-[#1b8a7f] text-white hover:bg-[#23a093]"
        >
          {pending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : isRegister ? (
            "Create account"
          ) : (
            "Sign in"
          )}
        </Button>

        {googleEnabled && (
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => void signIn.social({ provider: "google", callbackURL: "/chat" })}
          >
            Continue with Google
          </Button>
        )}

        <p className="text-muted-foreground text-center text-sm">
          {isRegister ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/register" className="text-foreground underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
};
