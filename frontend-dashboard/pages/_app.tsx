import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const publicPages = ['/login', '/register'];
    
    // Redirect if trying to access dashboard without token
    if (!token && !publicPages.includes(router.pathname)) {
      router.push('/login');
    }
    
    // Redirect if logged in and trying to access login page
    if (token && publicPages.includes(router.pathname)) {
      router.push('/');
    }
  }, [router.pathname]);

  return <Component {...pageProps} />;
}