import { create } from "zustand";

interface AuthState {
  token: string | null;
  user: any;
  setAuth: (t: string, u: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setAuth: (token, user) => {
    localStorage.setItem("token", token);

    set({
      token,
      user,
    });
  },

  logout: () => {
    localStorage.removeItem("token");

    set({
      token: null,
      user: null,
    });
  },
}));