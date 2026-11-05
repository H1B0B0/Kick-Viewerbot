"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { register } from "../functions/UserAPI";
import { useLocale } from "../../i18n/LocaleProvider";

export default function RegisterPage() {
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      const formData = new FormData(e.currentTarget);
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (password !== confirmPassword) {
        setError(t("passwordsMismatch"));

        return;
      }

      await register({
        username: formData.get("username") as string,
        TwitchUsername: formData.get("twitchUsername") as string,
        email: formData.get("email") as string,
        password: password,
      });
      router.push("/login");
    } catch (err: any) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 text-zinc-100 font-sans">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            {t("createAccount")}
          </h2>
          <p className="text-zinc-400 mt-1 text-sm">{t("createAccountBody")}</p>
        </div>

        <form className="space-y-4" onSubmit={handleRegister}>
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-md border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-zinc-300"
              htmlFor="register-username"
            >
              {t("username")}
            </label>
            <input
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              id="register-username"
              name="username"
              type="text"
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-zinc-300"
              htmlFor="register-email"
            >
              {t("email")}
            </label>
            <input
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              id="register-email"
              name="email"
              type="email"
            />
          </div>
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium text-zinc-300"
              htmlFor="register-channel"
            >
              {t("targetChannel")}
            </label>
            <input
              required
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              id="register-channel"
              name="twitchUsername"
              type="text"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-zinc-300"
                htmlFor="register-password"
              >
                {t("password")}
              </label>
              <input
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                id="register-password"
                name="password"
                type="password"
              />
            </div>
            <div className="space-y-1.5">
              <label
                className="text-sm font-medium text-zinc-300"
                htmlFor="register-confirm-password"
              >
                {t("confirmPassword")}
              </label>
              <input
                required
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
              />
            </div>
          </div>

          <button
            className="w-full py-2 mt-2 bg-white hover:bg-zinc-200 text-black font-medium text-sm rounded-md transition-colors disabled:opacity-50"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? t("creating") : t("signUp")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          {t("alreadyAccount")}{" "}
          <button
            className="text-white hover:underline"
            onClick={() => router.push("/login")}
          >
            {t("signIn")}
          </button>
        </div>
      </div>
    </div>
  );
}
