import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@workspace/api-zod";
import { setAuthTokenGetter } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedToken = localStorage.getItem("arvan_token");
    const storedUser = localStorage.getItem("arvan_user");
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("arvan_token");
        localStorage.removeItem("arvan_user");
      }
    }
    
    setIsLoading(false);
  }, []);

  // Configure customFetch to use the token
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("arvan_token"));
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("arvan_token", newToken);
    localStorage.setItem("arvan_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("arvan_token");
    localStorage.removeItem("arvan_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        login, 
        logout, 
        isAuthenticated: !!user,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}