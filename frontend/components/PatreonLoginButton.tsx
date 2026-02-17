"use client";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { useGetProfile, useGetSubscription, refreshPatreonStatus } from "../app/functions/UserAPI";
import { useState } from "react";
import { toast } from "react-toastify";

export function PatreonLoginButton() {
  const { data: profile, isLoading: isProfileLoading } = useGetProfile();
  const {
    data: subscription,
    isLoading: isSubscriptionLoading,
    mutate: mutateSubscription,
  } = useGetSubscription();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if user is logged in
  const isLoggedIn = !!profile?.user;

  // Check if user has Patreon linked
  const hasPatreonLinked = !!profile?.user?.patreonId;

  // Check if user has active subscription
  // We check multiple sources to be robust
  const hasActiveSubscription =
    profile?.user?.isSubscribed ||
    subscription?.isSubscribed ||
    ["active", "premium", "lifetime"].includes(
      subscription?.plan?.toLowerCase() || ""
    );

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await refreshPatreonStatus();
      await mutateSubscription(); // Re-fetch subscription data
      toast.success("Subscription status updated!");
    } catch (error) {
      toast.error("Failed to refresh status. Please try again.");
      console.error(error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const LoginButton = ({ text, onClick }: { text: string; onClick: () => void }) => (
    <Button
      onPress={onClick}
      className="w-full flex items-center justify-center gap-3 py-6 px-6 font-semibold rounded-xl bg-[#FF424D] hover:bg-[#E8384C] text-white transition-all duration-300 shadow-[0_0_20px_rgba(255,66,77,0.3)] hover:shadow-[0_0_30px_rgba(255,66,77,0.5)] hover:scale-[1.02]"
    >
      <svg
        className="w-6 h-6"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
      </svg>
      {text}
    </Button>
  );

  // Loading Skeleton
  if (isProfileLoading || isSubscriptionLoading) {
    return (
      <div className="w-full p-6 rounded-xl glass-card animate-pulse border border-border">
        <div className="h-10 bg-muted rounded-lg w-full mb-3" />
        <div className="h-4 bg-muted rounded w-2/3 mx-auto" />
      </div>
    );
  }

  // Not Logged In
  if (!isLoggedIn) {
    return (
      <div className="space-y-4">
        <LoginButton
          text="Login with Patreon"
          onClick={() =>
            (window.location.href = "https://api.velbots.shop/payments/patreon/redirect")
          }
        />
        <p className="text-xs text-center text-muted-foreground font-medium tracking-wide">
          SECURE LOGIN VIA PATREON
        </p>
      </div>
    );
  }

  // Logged In but No Patreon Linked (Rare edge case if they logged in via another method, but strictly speaking this app uses Patreon auth)
  if (!hasPatreonLinked) {
    return (
      <div className="space-y-4">
        <LoginButton
          text="Link Patreon Account"
          onClick={() =>
            (window.location.href = "https://api.velbots.shop/payments/patreon/redirect")
          }
        />
      </div>
    );
  }

  // Patreon Linked but No Active Subscription
  if (!hasActiveSubscription) {
    return (
      <div className="space-y-4 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-bold text-amber-500 tracking-wide">
              NO ACTIVE PLAN
            </span>
          </div>
          <Chip size="sm" className="bg-amber-500/20 text-amber-500 border border-amber-500/20">
            Free Tier
          </Chip>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Unlock the full power of the bot with our Premium plan.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            size="sm"
            className="w-full bg-[#FF424D] text-white hover:bg-[#E8384C]"
            onPress={() => window.open("https://www.patreon.com/velbots", "_blank")}
          >
            Subscribe
          </Button>
          <Button
            size="sm"
            variant="flat"
            isLoading={isRefreshing}
            onPress={handleRefreshStatus}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Check Status
          </Button>
        </div>
      </div>
    );
  }

  // Active Subscription
  return (
    <div className="space-y-4 p-1 rounded-xl glass-card neon-border relative overflow-hidden group">
      {/* Glow Effect */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <div className="absolute inset-0 w-full h-full bg-green-500 rounded-full animate-ping opacity-20"></div>
            </div>
            <span className="text-sm font-bold text-green-500 tracking-wide neon-text">
              PREMIUM ACTIVE
            </span>
          </div>
          <Button
            size="sm"
            variant="light"
            className="h-6 min-w-0 px-2 text-muted-foreground hover:text-foreground"
            onPress={handleRefreshStatus}
            isLoading={isRefreshing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9" /></svg>
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-border">
            <span className="text-xs text-muted-foreground">Current Plan</span>
            <span className="text-sm font-bold text-foreground capitalize">
              {subscription?.plan || "Premium"}
            </span>
          </div>

          {(profile?.user?.subscriptionEndsAt || subscription?.subscriptionEndsAt) && (
            <div className="flex items-center justify-between px-3">
              <span className="text-xs text-muted-foreground">Renews</span>
              <span className="text-xs font-medium text-foreground/80">
                {new Date(
                  (profile?.user?.subscriptionEndsAt || subscription?.subscriptionEndsAt) as string
                ).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
        </div>

        <Button
          size="sm"
          variant="flat"
          className="w-full mt-4 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border transition-colors"
          onPress={() => window.open("https://www.patreon.com/settings/memberships", "_blank")}
        >
          Manage Subscription
        </Button>
      </div>
    </div>
  );
}
