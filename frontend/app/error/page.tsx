"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@heroui/card";
import { Button } from "@heroui/button";
import { animate } from "animejs";

// Force dynamic rendering for this page since it uses searchParams
export const dynamic = "force-dynamic";

export default function ErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const errorIconRef = useRef<SVGSVGElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get error message from URL params
  const errorMessage =
    searchParams.get("message") || "An error occurred during authentication";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animate error icon
  useEffect(() => {
    if (!mounted || !errorIconRef.current) return;

    const circle = errorIconRef.current.querySelector("circle");
    const line1 = errorIconRef.current.querySelector(".line1");
    const line2 = errorIconRef.current.querySelector(".line2");

    if (!circle || !line1 || !line2) return;

    try {
      // Set initial state
      (circle as SVGCircleElement).style.strokeDasharray = "166";
      (circle as SVGCircleElement).style.strokeDashoffset = "166";
      (line1 as SVGLineElement).style.strokeDasharray = "24";
      (line1 as SVGLineElement).style.strokeDashoffset = "24";
      (line2 as SVGLineElement).style.strokeDasharray = "24";
      (line2 as SVGLineElement).style.strokeDashoffset = "24";

      // Animate circle
      animate(circle, {
        strokeDashoffset: [166, 0],
        duration: 600,
        ease: "easeInOutQuad",
      });

      // Animate X lines
      setTimeout(() => {
        animate(line1, {
          strokeDashoffset: [24, 0],
          duration: 300,
          ease: "easeInOutQuad",
        });
        animate(line2, {
          strokeDashoffset: [24, 0],
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

  const handleGoBack = () => {
    router.push("/login");
  };

  const handleTryAgain = () => {
    window.location.href = "https://api.velbots.shop/payments/patreon/redirect";
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-yellow-500/10 animate-gradient-xy" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-red-500/20 rounded-full animate-float"
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
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-red-500/30 rounded-full blur-2xl animate-pulse" />

              {/* X icon */}
              <svg
                ref={errorIconRef}
                className="relative w-24 h-24 md:w-32 md:h-32"
                viewBox="0 0 52 52"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  className="stroke-red-500"
                  cx="26"
                  cy="26"
                  r="25"
                  fill="none"
                  strokeWidth="2"
                />
                <line
                  className="stroke-red-500 line1"
                  x1="18"
                  y1="18"
                  x2="34"
                  y2="34"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <line
                  className="stroke-red-500 line2"
                  x1="34"
                  y1="18"
                  x2="18"
                  y2="34"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Error Message */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-red-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent animate-gradient-x">
              Oops! Something went wrong
            </h1>
            <p className="text-lg md:text-xl text-default-600 font-medium">
              {errorMessage}
            </p>
          </div>

          {/* Common Causes */}
          <div className="space-y-3 p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20">
            <h3 className="text-sm font-semibold text-default-700 uppercase tracking-wider mb-4">
              💡 Common causes:
            </h3>
            <div className="space-y-3">
              {[
                "❌ No active Patreon subscription",
                "🔒 OAuth authorization denied",
                "⚠️ Account linking error",
                "🔌 Connection timeout",
              ].map((cause, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-default-600 font-medium text-sm"
                  style={{
                    animation: `slideInLeft 0.5s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <span className="text-lg">{cause.split(" ")[0]}</span>
                  <span>{cause.split(" ").slice(1).join(" ")}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full font-semibold bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white"
              onPress={handleTryAgain}
            >
              Try Again with Patreon
            </Button>
            <Button
              size="lg"
              variant="bordered"
              className="w-full font-semibold border-default-300"
              onPress={handleGoBack}
            >
              Back to Login
            </Button>
          </div>

          {/* Help Section */}
          <div className="text-center pt-4 border-t border-default-200">
            <p className="text-xs text-default-500 mb-2">
              Need help? Contact our support team
            </p>
            <Button
              size="sm"
              variant="light"
              className="text-xs text-blue-600 hover:text-blue-700"
              onPress={() =>
                window.open(
                  "https://github.com/H1B0B0/Kick-Viewerbot/issues",
                  "_blank"
                )
              }
            >
              Report an Issue
            </Button>
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
