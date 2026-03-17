import apiClient from "./apiClient";

export const authService = {
  login: async (email: string, password: string) => {
    // This will hit: POST http://localhost:4000/api/v1/auth/login
    const res = await apiClient.post("/auth/login", {
      email,
      password,
    });

    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
    }
    
    return res.data;
  },
};