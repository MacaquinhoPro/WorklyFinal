// utils/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Registra el dispositivo para notificaciones push y devuelve el Expo push token,
 * o null si algo falla o el usuario no concede permisos.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | undefined;

  // 1. Canal para Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('myNotificationChannel', {
      name: 'Notificaciones',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // 2. Pedir permisos y obtener token
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permiso denegado para notificaciones push');
      return null;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      if (!projectId) {
        console.error(
          'No se encontró el projectId. Configúralo en app.json o app.config.js'
        );
        return null;
      }

      const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
      token = data;
      console.log('Expo push token:', token);
      return token;
    } catch (err) {
      console.error('Error al obtener el token:', err);
      return null;
    }
  } else {
    console.warn('Debes usar un dispositivo físico para notificaciones push');
    return null;
  }
}
