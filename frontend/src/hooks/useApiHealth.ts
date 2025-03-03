"use client";
import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://api.velbots.shop";

export function useApiHealth() {
  const [isApiUp, setIsApiUp] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await axios.get(`${API_URL}/health`);
        setIsApiUp(true);
      } catch (error) {
        setIsApiUp(false);
        console.error("API is down:", error);
      }
    };

    checkHealth();

    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return isApiUp;
}
