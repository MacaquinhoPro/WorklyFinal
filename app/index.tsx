// app/index.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../app/utils/firebaseconfig"; // Adjust the import path as necessary  

export default function Index() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);

      if (user) {
        router.replace("/");
      } else {
        router.replace("/login");
      }
    });

    return () => unsubscribe(); 
  }, [isMounted, router]);

  if (loading) {
    return null; 
  }

  return null; 
}
