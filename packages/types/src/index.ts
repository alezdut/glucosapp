export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type GlucoseEntry = {
  id: string;
  userId: string;
  valueMgDl: number;
  measuredAt: string;
};
