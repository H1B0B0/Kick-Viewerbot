import useSWR from "swr";

import { RegisterData, LoginData } from "../types/User";

import { customAxios } from "./customFetch";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.velbots.shop";

export interface SubscriptionStatus {
  isSubscribed: boolean;
  subscriptionEndsAt?: string | null;
  monthsRemaining?: number;
  plan?: string;
}

export interface ProfileUser {
  id?: string;
  _id?: string;
  username: string;
  email?: string;
  TwitchUsername?: string;
  subscription?: string;
  isSubscribed?: boolean;
  subscriptionEndsAt?: string;
  isBanned?: boolean;
  hwid?: string;
  patreonId?: string;
  [key: string]: unknown;
}

export interface ProfileResponse {
  user: ProfileUser;
}

const fetcher = async <T>(url: string): Promise<T> => {
  try {
    const response = await customAxios<T>({ method: "GET", url });

    return response.data;
  } catch (error) {
    throw error;
  }
};

// Auth APIs
export async function register(userData: RegisterData) {
  try {
    const response = await customAxios({
      method: "POST",
      url: `${API_BASE_URL}/auth/register`,
      data: userData,
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function login(loginData: LoginData) {
  try {
    const response = await customAxios({
      method: "POST",
      url: `${API_BASE_URL}/auth/login`,
      data: loginData,
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  try {
    const response = await customAxios({
      method: "POST",
      url: `${API_BASE_URL}/auth/logout`,
      data: {},
    });

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
    },
  );
}

export function useGetSubscription() {
  return useSWR<SubscriptionStatus>(
    `${API_BASE_URL}/users/subscription`,
    (url) => fetcher<SubscriptionStatus>(url),
    {
      revalidateOnFocus: false,
    },
  );
}

export async function registerHWID(hwid: string) {
  try {
    const response = await customAxios({
      method: "POST",
      url: `${API_BASE_URL}/users/hwid`,
      data: { hwid },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function banUser(userId: string) {
  try {
    const response = await customAxios({
      method: "PUT",
      url: `${API_BASE_URL}/users/ban`,
      data: { userId },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function refreshPatreonStatus() {
  try {
    const response = await customAxios({
      method: "POST",
      url: `${API_BASE_URL}/users/refresh-patreon`,
      data: {},
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}

// Payment APIs
export async function createCheckoutSession(duration: number) {
  try {
    const response = await customAxios({
      method: "POST",
      url: `${API_BASE_URL}/payments/create-checkout`,
      data: { duration },
    });

    return response.data;
  } catch (error) {
    throw error;
  }
}
