"use client";
import "@/styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import ThemeProvider from "../components/ThemeProvider";
import ThemeSwitcher from "../components/ThemeSwitcher";
import SplineWithLoader from "../components/SplineWithLoader";
import AppLoader from "../components/AppLoader";
import ApiHealthProvider from "../components/ApiHealthProvider";
import UpdateProvider from "../components/UpdateProvider";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [performanceMode, setPerformanceMode] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Load performance mode preference from localStorage
    const savedMode = localStorage.getItem("performanceMode");
    setPerformanceMode(savedMode === "true");
  }, []);

  const togglePerformanceMode = () => {
    const newMode = !performanceMode;
    setPerformanceMode(newMode);
    localStorage.setItem("performanceMode", String(newMode));
  };

  return (
    <html suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-mesh" suppressHydrationWarning>
        {/* Global app loader */}
        {isAppLoading && <AppLoader onLoadComplete={() => setIsAppLoading(false)} />}

        <ThemeProvider>
          {/* Background Elements */}
          <div className="fixed inset-0 w-full h-full overflow-hidden">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg
                width="100%"
                height="100%"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern
                    id="smallGrid"
                    width="20"
                    height="20"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 20 0 L 0 0 0 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="0.5"
                      opacity="0.2"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#smallGrid)" />
              </svg>
            </div>

            {/* Cool background gradient blobs */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-float"></div>
            <div
              className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-float"
              style={{ animationDelay: "2s" }}
            ></div>

            {/* Spline 3D object (when not in performance mode) */}
            {!performanceMode && (
              <div className="absolute inset-0">
                <SplineWithLoader
                  scene="https://prod.spline.design/0zfiWcHYJLJfg6nt/scene.splinecode"
                  className="absolute"
                />
              </div>
            )}
          </div>

          <main className="w-full relative z-10 overflow-x-hidden">
            <ApiHealthProvider>
              <div className="page-enter-active">{children}</div>
            </ApiHealthProvider>
          </main>

          <div className="fixed bottom-4 left-4 z-50 flex gap-2">
            <ThemeSwitcher />
            <Button
              variant="bordered"
              onPress={togglePerformanceMode}
              className="bg-background/80 backdrop-blur-sm shadow-lg"
            >
              {performanceMode ? "🚀 Performance" : "✨ Visual"}
            </Button>
          </div>

          <div className="fixed bottom-0 w-full h-12 bg-gradient-to-t from-background/80 to-transparent z-10 pointer-events-none"></div>
          <UpdateProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
