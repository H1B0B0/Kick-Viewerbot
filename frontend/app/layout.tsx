"use client";
import "@/styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import ThemeProvider from "../components/ThemeProvider";
import ThemeSwitcher from "../components/ThemeSwitcher";
import ApiHealthProvider from "../components/ApiHealthProvider";
import UpdateProvider from "../components/UpdateProvider";
// import { Button } from "@heroui/button"; // Removed performance button as Spline is gone

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary overflow-x-hidden" suppressHydrationWarning>
        <div className="fixed inset-0 bg-grid z-0 pointer-events-none opacity-50"></div>
        <div className="bg-mesh"></div>

        <ThemeProvider>
          <main className="w-full relative min-h-screen z-10">
            <ApiHealthProvider>
              <div className="page-enter-active p-4 md:p-6 lg:p-8">{children}</div>
            </ApiHealthProvider>
          </main>

          <div className="fixed bottom-4 left-4 z-50 flex gap-2">
            <ThemeSwitcher />
          </div>

          <UpdateProvider />
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            theme="colored"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
