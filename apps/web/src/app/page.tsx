"use client";
import { useQuery } from "@tanstack/react-query";
import { makeApiClient } from "@glucosapp/api-client";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
export default function Home() {
  const { client } = makeApiClient(`${apiBaseUrl}/v1`);
  const { data, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await client.GET("/health", {} as Record<string, never>);
      return res?.data ?? { ok: true };
    },
  });
  return (
    <main style={{ padding: 24 }}>
      <h1>Glucosapp Web</h1>
      <pre>{isLoading ? "Cargando..." : JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
