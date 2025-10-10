"use client";
import { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "next-themes";
import { useUpdateChecker } from "../hooks/useUpdateChecker";
import UpdateNotification from "./UpdateNotification";
import UpdateToastContent from "./UpdateToast";

export default function UpdateProvider() {
  const { latestVersion, showToast, dismissUpdate } = useUpdateChecker();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toastIdRef = useRef<string | number | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    console.log("UpdateProvider effect triggered:", {
      showToast,
      hasLatestVersion: !!latestVersion,
      latestVersion: latestVersion?.tag_name,
    });

    if (showToast && latestVersion) {
      console.log(
        "Displaying update toast for version:",
        latestVersion.tag_name
      );

      const isDark = theme === "dark";

      // Afficher le toast persistant
      toastIdRef.current = toast(
        <UpdateToastContent
          version={latestVersion.tag_name}
          onViewDetails={() => {
            console.log("View details clicked");
            setIsModalOpen(true);
          }}
        />,
        {
          position: "bottom-right",
          autoClose: false,
          closeButton: true,
          closeOnClick: false,
          draggable: false,
          pauseOnHover: true,
          theme: isDark ? "dark" : "light",
          className: isDark
            ? "!bg-gray-900/95 !backdrop-blur-md !border !border-green-500/30 !rounded-2xl !shadow-2xl !shadow-green-500/20"
            : "!bg-white/95 !backdrop-blur-md !border !border-purple-300 !rounded-2xl !shadow-2xl !shadow-purple-500/20",
          progressClassName: isDark ? "!bg-green-500" : "!bg-purple-500",
          style: {
            background: isDark
              ? "rgba(17, 24, 39, 0.95)"
              : "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          },
          onClose: () => {
            console.log("Toast closed, dismissing update");
            dismissUpdate();
          },
        }
      );
    }

    // Cleanup lors du démontage
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, [showToast, latestVersion, dismissUpdate, theme]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDownload = () => {
    if (latestVersion?.html_url) {
      window.open(latestVersion.html_url, "_blank");
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <ToastContainer />

      {/* Modal de détails */}
      {latestVersion && isModalOpen && (
        <UpdateNotification
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onDownload={handleDownload}
          version={latestVersion.tag_name}
          releaseNotes={latestVersion.body}
        />
      )}
    </>
  );
}
