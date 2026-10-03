import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { getSupabase } from "./lib/supabase";
import "./index.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const trpcClient = trpc.createClient({
  links: [httpBatchLink({
    url: "/api/trpc", transformer: superjson,
    async headers() {
      const { data, error } = await (await getSupabase()).auth.getSession();
      if (error) throw error;
      return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
    },
  })],
});
createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider><App /></AuthProvider>
    </QueryClientProvider>
  </trpc.Provider>
);