"use client";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { useGetProfile, useGetSubscription } from "../app/functions/UserAPI";

export function PatreonLoginButton() {
  const { data: profile } = useGetProfile();
  const { data: subscription, isLoading: isSubscriptionLoading } =
    useGetSubscription();

  // Check if user is logged in
  const isLoggedIn = !!profile?.user;

  // Check if user has Patreon linked
  const hasPatreonLinked = !!profile?.user?.patreonId;

  // Check if user has active subscription (check both profile and subscription endpoint)
  const hasActiveSubscription =
    profile?.user?.isSubscribed ||
    subscription?.isSubscribed ||
    ["active", "premium", "lifetime"].includes(
      subscription?.plan?.toLowerCase() || ""
    );

  // If user is not logged in, show standard login button
  if (!isLoggedIn) {
    return (
      <div className="space-y-2">
        <Button
          onPress={() =>
            (window.location.href =
              "https://api.velbots.shop/payments/patreon/redirect")
          }
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-default-300 text-sm font-medium rounded-lg bg-[#FF424D] hover:bg-[#E8384C] text-white transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
          </svg>
          Login with Patreon
        </Button>
        <p className="text-xs text-center text-default-500">
          Connect with your Patreon account
        </p>
      </div>
    );
  }

  // If user is logged in but no Patreon linked
  if (!hasPatreonLinked) {
    return (
      <div className="space-y-3">
        <Button
          onPress={() =>
            (window.location.href =
              "https://api.velbots.shop/payments/patreon/redirect")
          }
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-default-300 text-sm font-medium rounded-lg bg-[#FF424D] hover:bg-[#E8384C] text-white transition-colors duration-200 shadow-sm hover:shadow-md"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
          </svg>
          Link Patreon Account
        </Button>
      </div>
    );
  }

  // If user has Patreon linked but no active subscription
  if (!hasActiveSubscription && !isSubscriptionLoading) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[#FF424D]"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
              </svg>
              <span className="text-sm font-semibold text-default-700">
                Patreon Linked
              </span>
            </div>
            <Chip size="sm" color="warning" variant="flat">
              Not Subscribed
            </Chip>
          </div>
          <p className="text-xs text-default-600 mb-3">
            Your Patreon account is connected but you don&apos;t have an active
            subscription.
          </p>
          <Button
            size="sm"
            className="w-full bg-[#FF424D] hover:bg-[#E8384C] text-white"
            onPress={() =>
              window.open("https://www.patreon.com/velbots", "_blank")
            }
          >
            Subscribe on Patreon
          </Button>
        </div>
      </div>
    );
  }

  // If user has active subscription
  if (hasActiveSubscription) {
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[#FF424D]"
                viewBox="0 0 24 24"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003" />
              </svg>
              <span className="text-sm font-semibold text-default-700">
                Patreon Status
              </span>
            </div>
            <Chip size="sm" color="success" variant="flat">
              ✓ Active
            </Chip>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-default-600">Plan:</span>
              <span className="font-semibold text-default-700 capitalize">
                {subscription?.plan || "Premium"}
              </span>
            </div>
            {(profile?.user?.subscriptionEndsAt ||
              subscription?.subscriptionEndsAt) && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-default-600">Renews:</span>
                <span className="font-semibold text-default-700">
                  {new Date(
                    (profile?.user?.subscriptionEndsAt ||
                      subscription?.subscriptionEndsAt) as string
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
            className="w-full mt-3 text-green-600"
            onPress={() =>
              window.open(
                "https://www.patreon.com/settings/memberships",
                "_blank"
              )
            }
          >
            Manage Subscription
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  return (
    <div className="w-full p-4 rounded-lg bg-default-100 animate-pulse">
      <div className="h-12 bg-default-200 rounded" />
    </div>
  );
}
