"use client";
import { Button } from "@heroui/button";

interface UpdateToastContentProps {
  version: string;
  onViewDetails: () => void;
}

export default function UpdateToastContent({
  version,
  onViewDetails,
}: UpdateToastContentProps) {
  return (
    <div className="flex items-start gap-4 p-1">
      <span className="text-3xl">🚀</span>
      <div className="flex-1">
        <h3 className="font-bold text-lg mb-1 text-white">
          New version available!
        </h3>
        <p className="text-sm text-white/80 mb-4">
          Version {version} is now available
        </p>
        <Button
          size="sm"
          onPress={onViewDetails}
          className="bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors"
        >
          View details
        </Button>
      </div>
    </div>
  );
}
