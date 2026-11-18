"use client";

import { useState, type FC } from "react";
import { GoogleIcon } from "@/components/icons/google";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const LoginForm: FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <main className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[#fdfcfc] px-4 py-10 text-[#1f1f1f] dark:bg-[#0c0c0c] dark:text-[#e3e3e3]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 h-[280px] w-[680px] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-[140px] bg-[#8fd9c8]/40 blur-[90px] dark:bg-[#0f4f4a]/40"
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 size-11 rounded-full bg-gradient-to-br from-[#177e89] to-[#8fd9c8]" />
          <h1 className="text-lg font-medium">Pixelspace AI Classroom</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sign in to continue
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-2xl border p-6 shadow-sm">
          <a
            href="/api/auth/signin/google"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full gap-2",
            )}
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </a>

          <div className="my-5 flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">
              or continue with email
            </span>
            <span className="bg-border h-px flex-1" />
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setNotice(
                "Email sign-in isn't enabled yet. Use Google to continue.",
              );
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@school.edu.my"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-9"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-9"
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              Sign in
            </Button>

            {notice ? (
              <p className="text-muted-foreground text-center text-xs">
                {notice}
              </p>
            ) : null}
          </form>
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          School &amp; MoE SSO sign-in is coming soon.
        </p>
      </div>
    </main>
  );
};
