// app/help.tsx
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function HelpScreen() {
  const router = useRouter();

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <LinearGradient
      colors={["#5A40EA", "#EE805F"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Ayuda para inicio de sesión</Text>

        <Text style={styles.text}>
          Si tienes problemas para iniciar sesión, prueba los siguientes pasos:
        </Text>
        <Text style={styles.step}>1. Verifica tu correo y contraseña.</Text>
        <Text style={styles.step}>
          2. Asegúrate de tener conexión a internet.
        </Text>
        <Text style={styles.step}>
          3. Restablece tu contraseña si la olvidaste:
          {" "}
          <Text
            style={styles.link}
            onPress={() => openLink("https://tudominio.com/reset")}
          >
            Restablecer contraseña
          </Text>
        </Text>
        <Text style={styles.step}>
          4. Si el problema persiste, contáctanos:
          {" "}
          <Text
            style={styles.link}
            onPress={() => openLink("mailto:soporte@workly.com")}
          >
            soporte@workly.com
          </Text>
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  text: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
    textAlign: "left",
  },
  step: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 12,
  },
  link: {
    textDecorationLine: "underline",
    fontWeight: "600",
    color: "#fff",
  },
  backButton: {
    margin: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
