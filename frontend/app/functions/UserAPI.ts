import axios from "axios";
import { RegisterData, LoginData } from "../types/User";
import useSWR from "swr";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.velbots.shop";

export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscriptionEndsAt?: string | null;
  monthsRemaining?: number;
  plan?: string;
}

export interface ProfileUser {
  id?: string; // MongoDB ID returned by the API (check API response)
  _id?: string; // Alternative MongoDB ID field (check API response)
  username: string;
  email?: string;
  TwitchUsername?: string;
  subscription?: string;
  isSubscribed?: boolean;
  subscriptionEndsAt?: string;
  isBanned?: boolean;
  hwid?: string;
  patreonId?: string; // Set when Patreon account is linked
  // Note: patreonAccessToken and patreonRefreshToken are NEVER exposed to frontend for security
  [key: string]: unknown;
}

export interface ProfileResponse {
  user: ProfileUser;
}

const fetcher = async <T>(url: string): Promise<T> => {
  try {
    const response = await axios.get<T>(url, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Auth APIs
export async function register(userData: RegisterData) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/register`,
      userData,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function login(loginData: LoginData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, loginData, {
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
      },
      xsrfCookieName: "csrf_access_token",
      xsrfHeaderName: "X-CSRF-TOKEN",
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/logout`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

// User APIs
export function useGetProfile() {
  return useSWR<ProfileResponse, Error>(
    `${API_BASE_URL}/users/profile`,
    (url: string) => fetcher<ProfileResponse>(url),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      dedupingInterval: 5000,
    }
  );
}

export function useGetSubscription() {
  return useSWR<SubscriptionStatus>(
    `${API_BASE_URL}/users/subscription`,
    (url) => fetcher<SubscriptionStatus>(url),
    {
      revalidateOnFocus: true, // Revalidate on focus to catch subscription updates
      shouldRetryOnError: true,
      errorRetryCount: 5, // More aggressive retries for subscription
      dedupingInterval: 2000,
    }
  );
}

export async function registerHWID(hwid: string) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/users/hwid`,
      { hwid },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function banUser(userId: string) {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/users/ban`,
      { userId },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function refreshPatreonStatus() {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/users/refresh-patreon`,
      {},
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

// Payment APIs
export async function createCheckoutSession(duration: number) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/payments/create-checkout`,
      { duration },
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
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
