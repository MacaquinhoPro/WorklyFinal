// app/searching/qrscanner.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from 'expo-camera';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './../utils/firebaseconfig';
import { useRouter } from 'expo-router';

export default function QRScannerSearch() {
  const [scanned, setScanned] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const router = useRouter();

  /* ───────── permisos cámara ───────── */
  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ textAlign: 'center', marginBottom: 10 }}>
          Necesitamos permisos para usar la cámara
        </Text>
        <Button onPress={requestPermission} title="Dar permiso" />
      </View>
    );
  }

  /* ───────── confirmar oferta ──────── */
  const confirmJob = async () => {
    setScanned(true);
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'jobs', qrData!));
      if (snap.exists()) {
        // Redirige al feed colocando la oferta escaneada primero
        router.push({ pathname: '/searching/feed', params: { focus: qrData } });
      } else {
        Alert.alert('Oferta no encontrada', `ID: ${qrData}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'No se pudo buscar la oferta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={(res: BarcodeScanningResult) => {
          if (!scanned) setQrData(res.data);
        }}
      />

      {/* Overlay de confirmación */}
      {qrData && !scanned && (
        <View
          style={{
            position: 'absolute',
            bottom: 100,
            left: 20,
            right: 20,
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: 15,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: '#fff', marginBottom: 10 }}>
            Oferta detectada: {qrData}
          </Text>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Button title="Ir a la oferta" onPress={confirmJob} />
          )}
        </View>
      )}
    </View>
  );
}
