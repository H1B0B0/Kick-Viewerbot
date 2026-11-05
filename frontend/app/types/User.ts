export interface User {
  id: string;
  TwitchUsername: string;
  username: string;
  email: string;
  password: string;
  role: string;
  subscription: string;
  isSubscribed: boolean;
  subscriptionEndsAt?: string;
  patreonId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterData {
  username: string;
  TwitchUsername: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}
