"use client";
import { Button } from "@heroui/button";
import { useGetProfile, useGetSubscription } from "../app/functions/UserAPI";

export function PatreonLinkButton() {
  const { data: profile } = useGetProfile();
  const { data: subscription } = useGetSubscription();

  // Check if user is logged in
  const isLoggedIn = !!profile?.user;

  // Check if user has Patreon linked
  const hasPatreonLinked = !!profile?.user?.patreonId;

  // Check if user has active subscription
  const hasActiveSubscription =
    profile?.user?.isSubscribed ||
    subscription?.isSubscribed ||
    ["active", "premium", "lifetime"].includes(
      subscription?.plan?.toLowerCase() || ""
    );

  // Not logged in - show "Connect with Patreon" button (no parameters)
  if (!isLoggedIn) {
    return (
      <Button
        as="a"
        href="https://api.velbots.shop/payments/patreon/redirect"
        target="_blank"
        rel="noopener noreferrer"
        variant="bordered"
        className="bg-gradient-to-r from-[#FF424D] to-[#E8384C] text-white border-none hover:scale-105 transition-transform"
        startContent={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
          </svg>
        }
      >
        Connect with Patreon
      </Button>
    );
  }

  // Logged in but Patreon not linked - include userId in URL
  if (!hasPatreonLinked) {
    const userId = profile?.user?._id;
    const linkUrl = userId
      ? `https://api.velbots.shop/payments/patreon/redirect?link=true&userId=${userId}`
      : "https://api.velbots.shop/payments/patreon/redirect?link=true";

    return (
      <Button
        as="a"
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        variant="bordered"
        className="bg-gradient-to-r from-[#FF424D] to-[#E8384C] text-white border-none hover:scale-105 transition-transform"
        startContent={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
          </svg>
        }
      >
        Link my Patreon account
      </Button>
    );
  }

  // Patreon linked but not subscribed
  if (!hasActiveSubscription) {
    return (
      <Button
        as="a"
        href="https://api.velbots.shop/payments/patreon/redirect"
        target="_blank"
        rel="noopener noreferrer"
        variant="bordered"
        className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none hover:scale-105 transition-transform animate-pulse"
        startContent={
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
          </svg>
        }
      >
        Subscribe
      </Button>
    );
  }

  // Active subscription - show success state
  return (
    <Button
      as="a"
      href="https://www.patreon.com/settings/memberships"
      target="_blank"
      rel="noopener noreferrer"
      variant="bordered"
      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-none hover:scale-105 transition-transform"
      startContent={<span className="text-lg">✓</span>}
    >
      {subscription?.plan || "Subscribed"}
    </Button>
  );
}
