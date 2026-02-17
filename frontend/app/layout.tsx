"use client";
import "@/styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import ThemeProvider from "../components/ThemeProvider";
import ThemeSwitcher from "../components/ThemeSwitcher";
import ModernLoader from "../components/ModernLoader";
import ApiHealthProvider from "../components/ApiHealthProvider";
import UpdateProvider from "../components/UpdateProvider";
import { useEffect, useState } from "react";
// import { Button } from "@heroui/button"; // Removed performance button as Spline is gone

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isAppLoading, setIsAppLoading] = useState(false);

  useEffect(() => {
    // Check if the app has already been loaded in this session
    const hasLoadedBefore = sessionStorage.getItem("appHasLoaded");

    if (!hasLoadedBefore) {
      // First time loading in this session - show loader
      setIsAppLoading(true);
    }
  }, []);

  const handleLoadComplete = () => {
    setIsAppLoading(false);
    // Mark app as loaded for this session
    sessionStorage.setItem("appHasLoaded", "true");
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
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-green-500/30 selection:text-green-500" suppressHydrationWarning>
        {/* Global app loader - only shows once per session */}
        {isAppLoading && <ModernLoader onLoadComplete={handleLoadComplete} />}

        <ThemeProvider>
          {/* Background Elements - Replaced Spline with CSS Grid/Mesh */}
          <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
            {/* Base Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Radial Gradient Glows */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-green-500/5 blur-[120px]"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px]"></div>
          </div>

          <main className="w-full relative z-10 overflow-x-hidden">
            <ApiHealthProvider>
              <div className="page-enter-active">{children}</div>
            </ApiHealthProvider>
          </main>

          <div className="fixed bottom-4 left-4 z-50 flex gap-2">
            <ThemeSwitcher />
            {/* Performance Mode toggle removed as 3D is gone */}
          </div>

          <div className="fixed bottom-0 w-full h-24 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>
          <UpdateProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
