import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useGetMe, useLogin, useLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = useCallback(
    async (username: string, password: string) => {
      await loginMutation.mutateAsync({ data: { username, password } });
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    },
    [loginMutation, queryClient]
  );

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  }, [logoutMutation, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
