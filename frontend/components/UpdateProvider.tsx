"use client";
import { useState, useEffect } from "react";
import { useUpdateChecker } from "../hooks/useUpdateChecker";
import UpdateNotification from "./UpdateNotification";

export default function UpdateProvider() {
  const { updateAvailable, latestVersion } = useUpdateChecker();
  const [isOpen, setIsOpen] = useState(false);

  // Réagir aux changements de updateAvailable
  useEffect(() => {
    if (updateAvailable) {
      setIsOpen(true);
    }
  }, [updateAvailable]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleDownload = () => {
    if (latestVersion?.html_url) {
      window.open(latestVersion.html_url, "_blank");
    }
    setIsOpen(false);
  };

  // Afficher la notification seulement si nous avons toutes les données nécessaires
  if (latestVersion && isOpen) {
    return (
      <UpdateNotification
        isOpen={isOpen}
        onClose={handleClose}
        onDownload={handleDownload}
        version={latestVersion.tag_name}
        releaseNotes={latestVersion.body}
      />
    );
  }

  return null;
}
