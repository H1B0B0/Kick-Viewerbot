"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { animate } from "animejs";
import { useGetSubscription } from "../functions/UserAPI";

// Force dynamic rendering for this page since it uses searchParams
export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full flex justify-center items-center min-h-[40vh]">
          Loading...
        </div>
      }
    >
      <SuccessPageContent />
    </Suspense>
  );
}

function SuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const checkIconRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [countdown, setCountdown] = useState(5);

  // Get subscription status
  const { data: subscription, isLoading: isSubscriptionLoading } =
    useGetSubscription();

  // Check if user has an active subscription
  const hasActiveSubscription =
    subscription?.isSubscribed ||
    ["active", "premium", "lifetime"].includes(
      subscription?.plan?.toLowerCase() || ""
    );

  // Get success message from URL params
  const message = searchParams.get("message") || "Account linked successfully!";
  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animate check icon
  useEffect(() => {
    if (!mounted || !checkIconRef.current) return;

    const circle = checkIconRef.current.querySelector("circle");
    const path = checkIconRef.current.querySelector("path");

    if (!circle || !path) return;

    try {
      // Set initial state
      (circle as SVGCircleElement).style.strokeDasharray = "166";
      (circle as SVGCircleElement).style.strokeDashoffset = "166";
      (path as SVGPathElement).style.strokeDasharray = "48";
      (path as SVGPathElement).style.strokeDashoffset = "48";

      // Animate circle
      animate(circle, {
        strokeDashoffset: [166, 0],
        duration: 600,
        ease: "easeInOutQuad",
      });

      // Animate checkmark
      setTimeout(() => {
        animate(path, {
          strokeDashoffset: [48, 0],
          duration: 300,
          ease: "easeInOutQuad",
        });
      }, 400);
    } catch (e) {
      console.warn("Animation failed:", e);
    }
  }, [mounted]);

  // Animate card entrance
  useEffect(() => {
    if (!mounted || !cardRef.current) return;

    try {
      animate(cardRef.current, {
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.95, 1],
        duration: 600,
        ease: "easeOutQuad",
      });
    } catch (e) {
      console.warn("Card animation failed:", e);
    }
  }, [mounted]);

  // Countdown and auto-redirect
  useEffect(() => {
    if (!mounted) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(redirectTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [mounted, router, redirectTo]);

  const handleGoHome = () => {
    router.push(redirectTo);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-lime-500/10 animate-gradient-xy" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-green-500/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <Card
        ref={cardRef}
        className="relative z-10 max-w-lg w-full border-none glass-card shadow-2xl"
      >
        <CardBody className="space-y-8 p-8 md:p-12">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-green-500/30 rounded-full blur-2xl animate-pulse" />

              {/* Check icon */}
              <svg
                ref={checkIconRef}
                className="relative w-24 h-24 md:w-32 md:h-32"
                viewBox="0 0 52 52"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="stroke-green-500"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                  strokeWidth="2"
                />
                <path
                  className="stroke-green-500"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  d="M14 27l7 7 16-16"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-green-500 via-emerald-400 to-lime-400 bg-clip-text text-transparent animate-gradient-x">
              {hasActiveSubscription ? "Success!" : "Account Linked!"}
            </h1>
            <p className="text-lg md:text-xl text-default-600 font-medium">
              {message}
            </p>
            <p className="text-sm text-default-500">
              Your Patreon account has been successfully linked to your
              KickViewerBOT account.
            </p>
            {!hasActiveSubscription && !isSubscriptionLoading && (
              <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ To unlock premium features, please subscribe on Patreon
                </p>
                <Button
                  size="sm"
                  color="warning"
                  className="mt-3"
                  onPress={() =>
                    window.open(
                      "https://www.patreon.com/10327292/join",
                      "_blank"
                    )
                  }
                >
                  Subscribe on Patreon
                </Button>
              </div>
            )}
          </div>

          {/* Benefits List - Only show if subscribed */}
          {hasActiveSubscription && (
            <div className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/20">
              <h3 className="text-sm font-semibold text-default-700 uppercase tracking-wider mb-4">
                ✨ What you unlocked:
              </h3>
              <div className="space-y-3">
                {[
                  "🚀 Stability Mode Access",
                  "⚡ Priority Support",
                  "🎯 Advanced Features",
                  "🔄 Automatic Updates",
                ].map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-default-600 font-medium"
                    style={{
                      animation: `slideInLeft 0.5s ease-out ${index * 0.1}s both`,
                    }}
                  >
                    <span className="text-lg">{benefit.split(" ")[0]}</span>
                    <span>{benefit.split(" ").slice(1).join(" ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box - Show if not subscribed */}
          {!hasActiveSubscription && !isSubscriptionLoading && (
            <div className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/20">
              <h3 className="text-sm font-semibold text-default-700 uppercase tracking-wider mb-4">
                💡 Next Steps:
              </h3>
              <div className="space-y-3">
                {[
                  "1️⃣ Subscribe on Patreon",
                  "2️⃣ Unlock Premium Features",
                  "3️⃣ Access Stability Mode",
                  "4️⃣ Get Priority Support",
                ].map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 text-default-600 font-medium"
                    style={{
                      animation: `slideInLeft 0.5s ease-out ${index * 0.1}s both`,
                    }}
                  >
                    <span className="text-lg">{step.split(" ")[0]}</span>
                    <span>{step.split(" ").slice(1).join(" ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              color="success"
              className="w-full font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              onPress={handleGoHome}
            >
              {hasActiveSubscription ? "Get Started Now" : "Go to Dashboard"}
            </Button>
            <p className="text-center text-sm text-default-500">
              Redirecting in{" "}
              <span className="font-bold text-green-500">{countdown}</span>{" "}
              seconds...
            </p>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 border-t border-default-200">
            <p className="text-xs text-default-500">
              {hasActiveSubscription
                ? "Thank you for supporting KickViewerBOT! 🙏"
                : "Your account is linked. Subscribe to unlock all features! 🚀"}
            </p>
          </div>
        </CardBody>
      </Card>

      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }

        .animate-float {
          animation: float linear infinite;
        }

        @keyframes gradient-xy {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient-xy {
          background-size: 400% 400%;
          animation: gradient-xy 15s ease infinite;
        }

        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-xy 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
