import { useAuthContext } from "@/contexts/AuthContext";
export function useAuth(_options?: { redirectOnUnauthenticated?: boolean; redirectPath?: string }) {
  const state = useAuthContext();
  return { ...state, isAuthenticated: Boolean(state.user) };
}