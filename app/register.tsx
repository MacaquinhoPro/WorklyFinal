import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from './utils/firebaseconfig';          // ajusta si cambiaste ruta
import { getFirestore, doc, setDoc } from 'firebase/firestore';

type Role = 'searching' | 'hiring';

const getFriendlyError = (error: any): string => {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Este correo electrónico ya está registrado.';
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/weak-password':
      return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
    default:
      return 'Error en el registro. Por favor, inténtalo de nuevo.';
  }
};

export default function RegisterScreen() {
  const router = useRouter();

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setError('');
    const trimmedName  = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !selectedRole) {
      setError('Por favor completa todos los campos.');
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      await updateProfile(cred.user, { displayName: trimmedName });

      const db = getFirestore(auth.app);
      await setDoc(doc(db, 'users', cred.user.uid), {
        role: selectedRole,
        name: trimmedName,
        email: trimmedEmail,
        createdAt: Date.now(),
      });

      // Vuelve al login; RootLayout redirige por rol
      router.replace('/login');
    } catch (err: any) {
      console.error(err);
      setError(getFriendlyError(err));
    }
  };

  /* ---------- UI ---------- */
  if (!selectedRole) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>¿Cómo quieres usar Workly?</Text>

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setSelectedRole('searching')}
        >
          <Text style={styles.selectorButtonText}>Busco trabajo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setSelectedRole('hiring')}
        >
          <Text style={styles.selectorButtonText}>Contratar talento</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Crear cuenta ({selectedRole})</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Nombre"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
      />

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

      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.buttonText}>Registrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/login')}>
        <Text style={styles.loginText}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          setSelectedRole(null);
          setError('');
        }}
      >
        <Text style={styles.backButtonText}>Cambiar rol</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 24,
    marginBottom: 24,
    color: '#000',
    textAlign: 'center',
  },
  input: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: '#000',
  },
  selectorButton: {
    width: '80%',
    backgroundColor: 'rgb(247, 194, 88)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  selectorButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  registerButton: {
    width: '80%',
    backgroundColor: 'rgb(247, 194, 88)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  loginText: {
    fontSize: 16,
    color: '#000',
    marginTop: 12,
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#007bff',
    textDecorationLine: 'underline',
  },
});
