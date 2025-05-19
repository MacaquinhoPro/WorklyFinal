# WorklyFinal

Aplicación móvil para conectar **empleadores** y **postulantes** en ofertas laborales temporales, construida con **React Native + Expo Router** y respaldada por **Firebase**.

---

## ✨ Características principales

| Módulo             | Descripción                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Autenticación      | Registro / inicio de sesión con Firebase Auth y validación de sesión.                                          |
| Ofertas de trabajo | Creación y listado en tiempo real (Firestore) con filtros y detalle.                                           |
| Postulaciones      | El usuario se postula, puede cancelar y ver el estado (pendiente, aceptada, entrevista, rechazada).            |
| Entrevistas        | El empleador agenda una fecha (`interviewAt`) y la app envía **notificación local** usando Expo Notifications. |
| Geolocalización    | Mapa con ubicación del empleo («react‑native‑maps»).                                                           |
| UI moderna         | Expo Router, Tailwind‑like estilos, tarjetas con imágenes y modales.                                           |

---

## 🛠️ Tecnologías

* **React Native (Expo SDK 52)**
* **TypeScript**
* **Expo Router** (navegación basada en archivos)
* **Firebase** (Auth | Firestore | Realtime DB)
* **Expo Notifications** (notificaciones locales)
* **React‑Native‑Maps** (mapas y marcadores)

---

## 🚀 Puesta en marcha

### 1. Clonar repositorio

```bash
$ git clone https://github.com/tu‑usuario/WorklyFinal.git
$ cd WorklyFinal
```

### 2. Instalar dependencias

```bash
# con yarn
yarn install
# o con npm
npm install
```

### 3. Configurar variables de entorno

Crea un archivo **`.env`** en la raíz:

```env
FIREBASE_API_KEY=XXXXXXXXXXXXXXX
FIREBASE_AUTH_DOMAIN=XXXXXXXXXXXXXXX
FIREBASE_PROJECT_ID=XXXXXXXXXXXXXXX
FIREBASE_STORAGE_BUCKET=XXXXXXXXXXXXXXX
FIREBASE_MESSAGING_SENDER_ID=XXXXXXXXXXXXXXX
FIREBASE_APP_ID=XXXXXXXXXXXXXXX
FIREBASE_RTDB_URL=XXXXXXXXXXXXXXX
```


### 4. Ejecución en modo desarrollo

```bash
npx expo start
```

Escanea el QR con Expo Go o abre iOS/Android emulator.

---

## 📂 Estructura de carpetas

```
app/
 ├─ (onboarding)/ …            # pantallas de bienvenida
 ├─ searching/                  # Matches, listado de trabajos
 ├─ hiring/                     # flujo para empleadores
 ├─ context/                    # AuthContext, ThemeContext, etc.
 ├─ utils/                      # FirebaseConfig, helpers
 └─ assets/                     # íconos, imágenes
```

---

## 🧪 Scripts útiles

| Comando              | Descripción                              |                                |
| -------------------- | ---------------------------------------- | ------------------------------ |
| `expo start`         | Inicia Metro bundler en modo dev.        |                                |
| `expo prebuild`      | Genera proyectos nativos para EAS Build. |                                |
| `expo build:android` | Build APK/ AAB (legacy).                 |                                |
| `expo build:ios`     | Build IPA (legacy).                      |                                |
| \`eas build -p ios   | android\`                                | Build con EAS Build.           |
| \`eas submit -p ios  | android\`                                | Sube a App Store / Play Store. |

---
