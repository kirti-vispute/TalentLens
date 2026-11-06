"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "@/lib/actions";
import { Button, FieldError } from "@/components/ui";
import { motion, AnimatePresence } from "@/components/motion";

const initialState: ActionResult | null = null;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <motion.form
      action={formAction}
      className="flex flex-col gap-4"
      animate={state?.error ? { x: [0, -8, 8, -6, 6, 0] } : undefined}
      transition={{ duration: 0.4 }}
    >
      <div>
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="you@talentlens.app"
          className="input mt-1"
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="input mt-1"
        />
      </div>
      <AnimatePresence>{state?.error && <FieldError>{state.error}</FieldError>}</AnimatePresence>
      <Button type="submit" className="w-full" loading={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </motion.form>
  );
}
