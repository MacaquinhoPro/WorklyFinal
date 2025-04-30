// app/login.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./utils/firebaseconfig";
import * as Haptics from "expo-haptics";

const getFriendlyError = (error: any): string => {
  switch (error.code) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/user-not-found":
      return "No se encontró un usuario con este correo.";
    case "auth/wrong-password":
      return "La contraseña es incorrecta.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Por favor, inténtalo de nuevo más tarde.";
    default:
      return "Error al iniciar sesión. Por favor, inténtalo de nuevo.";
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (Platform.OS !== "macos" && Platform.OS !== "windows") {
   }

    setError("");
    if (!email.trim() || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/welcome");
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyError(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Iniciar Sesión</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#888"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#888"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/register")}>
        <Text style={styles.registerText}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
      backgroundColor: "#fff",
    },
    header: {
      fontSize: 24,
      marginBottom: 24,
      color: "#000",
    },
    input: {
      width: "80%",
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      color: "#000",
      borderColor: "#000",
    },
    loginButton: {
      width: "80%",
      backgroundColor: "rgb(247, 194, 88)", 
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 12,
    },
    buttonText: {
      color: "#fff", 
      fontSize: 16,
    },
    registerText: {
      fontSize: 16,
      color: "#000",
      marginTop: 12,
    },
    errorText: {
      color: "#ff4d4d",
      fontSize: 14,
      marginBottom: 16,
      textAlign: "center",
    },
  });
  
