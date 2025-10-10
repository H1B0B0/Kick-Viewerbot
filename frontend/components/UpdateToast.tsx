"use client";
import { Button } from "@heroui/button";
import { useTheme } from "next-themes";

interface UpdateToastContentProps {
  version: string;
  onViewDetails: () => void;
}

export default function UpdateToastContent({
  version,
  onViewDetails,
}: UpdateToastContentProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-start gap-4 p-1">
      <span className="text-3xl">🚀</span>
      <div className="flex-1">
        <h3 className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
          Nouvelle version disponible !
        </h3>
        <p className={`text-sm mb-4 ${isDark ? "text-white/80" : "text-gray-700"}`}>
          Version {version} est maintenant disponible
        </p>
        <Button
          size="sm"
          onPress={onViewDetails}
          className={`${
            isDark
              ? "bg-green-500 hover:bg-green-600"
              : "bg-purple-500 hover:bg-purple-600"
          } text-white font-semibold rounded-lg transition-colors`}
        >
          Voir les détails
        </Button>
      </div>
    </div>
  );
}
