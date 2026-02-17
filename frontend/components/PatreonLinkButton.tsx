"use client";
import { Button } from "@heroui/button";
import { useGetProfile, useGetSubscription } from "../app/functions/UserAPI";
import { Tooltip } from "@heroui/tooltip";

export function PatreonLinkButton() {
  const { data: profile, isLoading: profileLoading } = useGetProfile();
  const { data: subscription, isLoading: subscriptionLoading } = useGetSubscription();

  // Check if user is logged in
  const isLoggedIn = !!profile?.user;

  // Loading State
  if (profileLoading || subscriptionLoading) {
    return (
      <div className="h-10 w-32 bg-muted/50 rounded-lg animate-pulse border border-border" />
    );
  }

  // Check if user has Patreon linked
  const hasPatreonLinked = !!profile?.user?.patreonId;

  // Check if user has active subscription
  const hasActiveSubscription =
    profile?.user?.isSubscribed ||
    subscription?.isSubscribed ||
    ["active", "premium", "lifetime"].includes(
      subscription?.plan?.toLowerCase() || ""
    );

  // Not logged in
  if (!isLoggedIn) {
    return (
      <Button
        as="a"
        href="https://api.velbots.shop/payments/patreon/redirect"
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        className="bg-[#FF424D] text-white font-medium shadow-[0_0_15px_rgba(255,66,77,0.4)] hover:shadow-[0_0_25px_rgba(255,66,77,0.6)] transition-all"
        startContent={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
          </svg>
        }
      >
        Connect
      </Button>
    );
  }

  // Logged in but Patreon not linked
  if (!hasPatreonLinked) {
    const user = profile?.user;
    const userId = user?.id || user?._id;
    const linkUrl = userId ? `https://api.velbots.shop/payments/patreon/redirect?link=true&userId=${userId}` : "#";

    return (
      <Button
        as="a"
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        className="bg-secondary text-muted-foreground border border-border hover:border-[#FF424D] hover:text-[#FF424D] transition-colors"
        startContent={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
          </svg>
        }
      >
        Link Patreon
      </Button>
    );
  }

  // Patreon linked but not subscribed
  if (!hasActiveSubscription) {
    return (
      <Button
        as="a"
        href="https://www.patreon.com/velbots"
        target="_blank"
        rel="noopener noreferrer"
        size="sm"
        className="bg-zinc-100/50 dark:bg-zinc-900/50 border border-amber-500/50 text-amber-600 dark:text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-[0_0_10px_rgba(245,158,11,0.1)]"
      >
        Subscribe
      </Button>
    );
  }

  // Active subscription
  return (
    <Tooltip content="Premium Active - Thank you for your support!" delay={0} closeDelay={0}>
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 backdrop-blur-md">
        <div className="relative flex items-center justify-center w-2 h-2">
          <div className="absolute w-full h-full rounded-full bg-green-500 animate-ping opacity-75"></div>
          <div className="relative w-1.5 h-1.5 rounded-full bg-green-500"></div>
        </div>
        <span className="text-xs font-bold text-green-600 dark:text-green-500 tracking-wide uppercase">
          {subscription?.plan || "Premium"}
        </span>
      </div>
    </Tooltip>
  );
}
