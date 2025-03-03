"use client";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import ThemeProvider from "../components/ThemeProvider";
import ThemeSwitcher from "../components/ThemeSwitcher";
import Spline from "@splinetool/react-spline";
import ApiHealthProvider from "../components/ApiHealthProvider";
import UpdateProvider from "../components/UpdateProvider";
import { useEffect, useState } from "react";
import { Button } from "@heroui/react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [performanceMode, setPerformanceMode] = useState(true);

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
      <body>
        <ThemeProvider>
          <div className="fixed inset-0 w-full h-full overflow-hidden">
            {!performanceMode && (
              <div className="absolute inset-0">
                <Spline
                  scene="https://prod.spline.design/3YlldlyYl8rb0Wew/scene.splinecode"
                  className="blur-xl absolute"
                />
              </div>
            )}
          </div>
          <main className="w-full relative z-10">
            <ApiHealthProvider>{children}</ApiHealthProvider>
          </main>
          <div className="fixed bottom-4 left-4 z-50 flex gap-2">
            <ThemeSwitcher />
            <Button
              variant="bordered"
              onPress={togglePerformanceMode}
              className="bg-background/80 backdrop-blur-sm"
            >
              {performanceMode ? "🚀 Performance" : "✨ Visual"}
            </Button>
          </div>
          <UpdateProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
