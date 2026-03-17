import { useState } from "react";
import { authService } from "../services/authService";
import { useAuthStore } from "../store/authStore";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const data = await authService.login(email, password);

    setAuth(data.token, data.user);

    router.push("/dashboard");
  };

  return (
    <div className="h-screen flex items-center justify-center">

      <div className="bg-white p-6 rounded shadow w-80">

        <h1 className="text-xl mb-4">Login</h1>

        <input
          className="border p-2 w-full mb-2"
          placeholder="email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="border p-2 w-full mb-2"
          placeholder="password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="bg-black text-white p-2 w-full"
          onClick={login}
        >
          Login
        </button>

      </div>
    </div>
  );
}