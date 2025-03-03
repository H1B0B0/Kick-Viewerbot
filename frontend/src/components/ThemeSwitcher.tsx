"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@heroui/button";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Button
      isIconOnly
      className="fixed bottom-4 right-4 z-50"
      onPress={() => {
        setTheme(theme === "dark" ? "light" : "dark");
      }}
    >
      {theme === "dark" ? (
        <MoonIcon className="h-5 w-5 " />
      ) : (
        <SunIcon className="h-5 w-5 " />
      )}
    </Button>
  );
}
