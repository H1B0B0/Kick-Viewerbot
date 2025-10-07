import axios from "axios";
import { RegisterData, LoginData } from "../types/User";
import useSWR from "swr";

const URL = "https://api.velbots.shop";

const fetcher = async (url: string) => {
  const response = await axios.get(url, { withCredentials: true });
  return response.data;
};

// Auth APIs
export async function register(userData: RegisterData) {
  try {
    const response = await axios.post(`${URL}/auth/register`, userData, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
}

export async function login(loginData: LoginData) {
  try {
    const response = await axios.post(`${URL}/auth/login`, loginData, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
      // Ajoutez ces options
      xsrfCookieName: "csrf_access_token",
      xsrfHeaderName: "X-CSRF-TOKEN",
    });

    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function logout() {
  try {
    const response = await axios.post(
      `${URL}/auth/logout`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
}

// User APIs
export function useGetProfile() {
  return useSWR(`${URL}/users/profile`, fetcher);
}

export async function useGetSubscription() {
  try {
    const response = await axios.get(`${URL}/users/subscription`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    console.error("Get subscription error:", error);
    throw error;
  }
}

export async function registerHWID(hwid: string) {
  try {
    const response = await axios.post(
      `${URL}/users/hwid`,
      { hwid },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Register HWID error:", error);
    throw error;
  }
}

export async function banUser(userId: string) {
  try {
    const response = await axios.put(
      `${URL}/users/ban`,
      { userId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Ban user error:", error);
    throw error;
  }
}

// Payment APIs
export async function createCheckoutSession(duration: number) {
  try {
    const response = await axios.post(
      `${URL}/payments/create-checkout`,
      { duration },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    console.error("Create checkout error:", error);
    throw error;
  }
}

// Usage des hooks SWR
/*
function ProfileComponent() {
  const { data: profile, error } = useGetProfile();
  
  if (error) return <div>Error loading profile</div>;
  if (!profile) return <div>Loading...</div>;
  
  return <div>Welcome {profile.username}</div>;
}

// Usage des fonctions async
async function handleLogin() {
  try {
    const data = await login("username", "password");
    // Redirection ou mise à jour du state
  } catch (error) {
    // Gestion des erreurs
  }
}

async function handleHWIDRegistration(hwid: string) {
  try {
    await registerHWID(hwid);
    // Mise à jour du state ou notification
  } catch (error) {
    // Gestion des erreurs
  }
}
*/
