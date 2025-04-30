import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { auth } from "./utils/firebaseconfig";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          const db = getFirestore(auth.app);
          const userDoc = await getDoc(doc(db, "users", uid));

          if (userDoc.exists()) {
            const { role } = userDoc.data();
            console.log("User Role:", role); 

            if (role === "searching") {
              router.replace("/searching/feed"); 
            } else if (role === "hiring") {
              router.replace("/hiring/myJobs");
            } else {
              console.warn("Rol de usuario desconocido:", role);
              router.replace("/login");
            }
            return; 
          } else {
            console.warn("Documento de usuario no encontrado para:", uid);
          }
        }
        router.replace("/login"); 
      } catch (error) {
        console.error("Error al obtener el rol del usuario:", error);
        router.replace("/login"); 
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: "center", alignItems: "center", padding: 16, backgroundColor: "#fff",
  },
  welcomeText: { fontSize: 24, color: "#000", marginBottom: 24 },
});