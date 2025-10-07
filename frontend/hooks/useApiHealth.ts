"use client";
import { useState, useEffect } from "react";

/**
 * Hook pour vérifier la santé de l'API distante velbots.shop
 * Désactivé temporairement à cause de CORS - configurez votre API pour permettre CORS si nécessaire
 */
export function useApiHealth() {
  const [isApiUp, setIsApiUp] = useState(true);

  useEffect(() => {
    // Health check désactivé - votre API distante doit configurer CORS si vous voulez l'activer
    // const checkHealth = async () => {
    //   try {
    //     const response = await fetch('https://api.velbots.shop/health', {
    //       mode: 'cors',
    //       credentials: 'include'
    //     });
    //     setIsApiUp(response.ok);
    //   } catch (error) {
    //     setIsApiUp(false);
    //   }
    // };
    //
    // checkHealth();
    // const interval = setInterval(checkHealth, 30000);
    // return () => clearInterval(interval);

    // Pour l'instant, on assume que l'API est toujours up
    setIsApiUp(true);
  }, []);

  return isApiUp;
}
