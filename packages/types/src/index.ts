export type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  createdAt: string;
};

export type GlucoseEntry = {
  id: string;
  userId: string;
  valueMgDl: number;
  measuredAt: string;
};

export enum AuthProvider {
  LOCAL = "local",
  GOOGLE = "google",
}

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};
