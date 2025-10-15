"use client";
import { Button } from "@heroui/button";
import {
  useGetProfile,
  useGetSubscription,
  refreshPatreonStatus,
} from "../app/functions/UserAPI";
import { useState } from "react";

export function PatreonLinkButton() {
  console.log("🔵 [PatreonLinkButton] Component rendering...");

  const { data: profile, mutate, isLoading: profileLoading, error: profileError } = useGetProfile();
  const { data: subscription, error: subscriptionError } = useGetSubscription();
  const [isRefreshing, setIsRefreshing] = useState(false);

  console.log("🔵 [PatreonLinkButton] SWR Data:", {
    profileLoading,
    profileError,
    hasProfileData: !!profile,
    subscriptionError,
    hasSubscriptionData: !!subscription
  });

  // Check if user is logged in
  const isLoggedIn = !!profile?.user;
  console.log("🔵 [PatreonLinkButton] isLoggedIn:", isLoggedIn);

  // Show loading state while fetching profile
  if (profileLoading) {
    console.log("⏳ [PatreonLinkButton] Still loading profile...");
    return (
      <Button variant="bordered" disabled>
        Loading...
      </Button>
    );
  }

  if (profileError) {
    console.error("❌ [PatreonLinkButton] Profile fetch error:", profileError);
  }

  // Check if user has Patreon linked
  const hasPatreonLinked = !!profile?.user?.patreonId;
  console.log("🔵 [PatreonLinkButton] hasPatreonLinked:", hasPatreonLinked, "patreonId:", profile?.user?.patreonId);

  // Check if user has active subscription
  const hasActiveSubscription =
    profile?.user?.isSubscribed ||
    subscription?.isSubscribed ||
    ["active", "premium", "lifetime"].includes(
      subscription?.plan?.toLowerCase() || ""
    );

  console.log("🔵 [PatreonLinkButton] Subscription status:", {
    userIsSubscribed: profile?.user?.isSubscribed,
    subscriptionIsSubscribed: subscription?.isSubscribed,
    subscriptionPlan: subscription?.plan,
    hasActiveSubscription
  });

  // Manual refresh function
  const handleRefreshPatreon = async () => {
    console.log("🔄 [PatreonLinkButton] Starting manual Patreon refresh...");
    setIsRefreshing(true);
    try {
      const result = await refreshPatreonStatus();
      console.log("✅ [PatreonLinkButton] Refresh result:", result);
      // Revalidate the profile to get updated subscription status
      await mutate();
      console.log("✅ [PatreonLinkButton] Profile revalidated");
      alert("Statut Patreon mis à jour !");
    } catch (error) {
      console.error("❌ [PatreonLinkButton] Refresh error:", error);
      alert("Erreur lors de la synchronisation. Veuillez réessayer.");
    } finally {
      setIsRefreshing(false);
      console.log("🔄 [PatreonLinkButton] Refresh completed");
    }
  };

  // Not logged in - show "Connect with Patreon" button (no parameters)
  if (!isLoggedIn) {
    console.log("👤 [PatreonLinkButton] User NOT logged in - showing Connect button");
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
    console.log("🔗 [PatreonLinkButton] User logged in but Patreon NOT linked - showing Link button");

    const user = profile?.user;

    // Try both 'id' and '_id' fields (API can return either)
    const userId = user?.id || user?._id;

    // MEGA DETAILED DEBUG LOGS
    console.log("🚨🚨🚨 [PatreonLinkButton] ==================== MEGA DEBUG START ====================");
    console.log("🚨 [PatreonLinkButton] FULL PROFILE RAW:", profile);
    console.log("🚨 [PatreonLinkButton] FULL PROFILE JSON:", JSON.stringify(profile, null, 2));
    console.log("🚨 [PatreonLinkButton] USER RAW:", user);
    console.log("🚨 [PatreonLinkButton] USER JSON:", JSON.stringify(user, null, 2));
    console.log("🚨 [PatreonLinkButton] USER KEYS:", user ? Object.keys(user) : 'NO USER OBJECT');
    console.log("🚨 [PatreonLinkButton] USER ENTRIES:", user ? Object.entries(user) : 'NO USER OBJECT');
    console.log("🚨 [PatreonLinkButton] user?.id:", user?.id);
    console.log("🚨 [PatreonLinkButton] user?._id:", user?._id);
    console.log("🚨 [PatreonLinkButton] user['id']:", user ? user['id'] : 'N/A');
    console.log("🚨 [PatreonLinkButton] user['_id']:", user ? user['_id'] : 'N/A');
    console.log("🚨 [PatreonLinkButton] FINAL userId:", userId);
    console.log("🚨 [PatreonLinkButton] userId TYPE:", typeof userId);
    console.log("🚨 [PatreonLinkButton] userId IS NULL:", userId === null);
    console.log("🚨 [PatreonLinkButton] userId IS UNDEFINED:", userId === undefined);
    console.log("🚨 [PatreonLinkButton] userId IS FALSY:", !userId);
    console.log("🚨🚨🚨 [PatreonLinkButton] ==================== MEGA DEBUG END ====================");

    if (!userId) {
      console.error("❌❌❌ [PatreonLinkButton] CRITICAL ERROR: No userId found! Cannot link Patreon without user ID.");
      console.error("❌ [PatreonLinkButton] This means the API is NOT returning 'id' or '_id' field!");
      return (
        <Button
          variant="bordered"
          className="bg-gray-500 text-white border-none cursor-not-allowed"
          disabled
        >
          Erreur: ID utilisateur manquant
        </Button>
      );
    }

    const linkUrl = `https://api.velbots.shop/payments/patreon/redirect?link=true&userId=${userId}`;
    console.log("🔗 [PatreonLinkButton] ✅ Generated link URL:", linkUrl);
    console.log("🔗 [PatreonLinkButton] URL contains userId:", linkUrl.includes(userId));

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
    console.log("⚠️ [PatreonLinkButton] Patreon linked but NOT subscribed - showing Subscribe button");
    return (
      <div className="flex gap-2">
        <Button
          as="a"
          href="https://www.patreon.com/join/10327292"
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
          Subscribe on Patreon
        </Button>
        <Button
          onClick={handleRefreshPatreon}
          isLoading={isRefreshing}
          variant="bordered"
          className="border-[#FF424D] text-[#FF424D] hover:bg-[#FF424D]/10"
          startContent={!isRefreshing ? <span>🔄</span> : null}
        >
          {isRefreshing ? "Vérification..." : "Vérifier"}
        </Button>
      </div>
    );
  }

  // Active subscription - show success state
  console.log("✅ [PatreonLinkButton] User has ACTIVE subscription - showing Subscribed button");
  console.log("✅ [PatreonLinkButton] Subscription plan:", subscription?.plan);

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
