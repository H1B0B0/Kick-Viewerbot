"use client";
import "@/styles/globals.css";
import "react-toastify/dist/ReactToastify.css";
import ApiHealthProvider from "../components/ApiHealthProvider";
import UpdateBanner from "../components/UpdateBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        </head>
      <body className="min-h-screen bg-[#09090b] text-zinc-300 font-sans antialiased flex flex-col" suppressHydrationWarning>
        <UpdateBanner />
        <main className="flex-1 w-full relative z-10 overflow-hidden">
          <ApiHealthProvider>
            {children}
          </ApiHealthProvider>
        </main>
      </body>
    </html>
  );
}
