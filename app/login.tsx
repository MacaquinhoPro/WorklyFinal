// app/login.tsx
import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  View,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./utils/firebaseconfig";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

const getFriendlyError = (error: any): string => {
  switch (error.code) {
    case "auth/invalid-email":
      return "El correo electrónico no es válido.";
    case "auth/user-not-found":
      return "No se encontró un usuario con este correo.";
    case "auth/wrong-password":
      return "La contraseña es incorrecta.";
    case "auth/too-many-requests":
      return "Demasiados intentos fallidos. Por favor inténtalo más tarde.";
    default:
      return "Error al iniciar sesión. Inténtalo de nuevo.";
  }
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    <LinearGradient
      colors={["#5A40EA", "#EE805F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.main}>
        <View style={styles.logoContainer}>
          <Feather name="briefcase" size={48} color="#fff" />
          <Text style={styles.logoText}>Workly</Text>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Campos de correo y contraseña */}
        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="rgba(255,255,255,0.7)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="rgba(255,255,255,0.7)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Botón “Entrar” */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>

        {/* Botón “Create account” */}
        <TouchableOpacity
          style={[styles.loginButton, styles.createButton]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/register");
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Create account</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        {/* Texto de términos */}
        <Text style={styles.disclaimer}>
          Al tocar “Entrar” aceptas nuestros{" "}
          <Text style={styles.linkText} onPress={() => Linking.openURL("#")}>
            Términos
          </Text>
          . Aprende cómo procesamos tus datos en nuestra{" "}
          <Text style={styles.linkText} onPress={() => Linking.openURL("#")}>
            Política de Privacidad
          </Text>{" "}
          y{" "}
          <Text style={styles.linkText} onPress={() => Linking.openURL("#")}>
            Cookies Policy
          </Text>
          .
        </Text>

        {/* Link “¿Problemas iniciando sesión?” */}
        <TouchableOpacity
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/help");
          }}
        >
          <Text style={styles.troubleText}>¿Problemas iniciando sesión?</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  main: {
    marginTop: 180,
  },
  footer: {
    alignItems: "center",
    marginBottom: 24,
  },
  header: {
    fontSize: 32,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 32,
    textAlign: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    color: "#fff",
    fontSize: 16,
  },
  loginButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "transparent",
    alignItems: "center",
    marginTop: 16,
  },
  createButton: {
    marginTop: 16, // separa del enlace de “¿Problemas…?”
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 16,
    marginHorizontal: 8,
    lineHeight: 18,
  },
  linkText: {
    textDecorationLine: "underline",
  },
  troubleText: {
    fontSize: 14,
    color: "#fff",
    textDecorationLine: "underline",
    textAlign: "center",
    marginTop: 8,
  },
  errorText: {
    color: "#ffdddd",
    backgroundColor: "rgba(255,0,0,0.3)",
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
    textAlign: "center",
  },
  logoContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  logoText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
    marginTop: 8,
  },
});