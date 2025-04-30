import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useOB } from './OnboardingContext';
import { auth, db } from '../utils/firebaseconfig';
import { doc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import React from 'react';



export default function Welcome() {
  const { data } = useOB();

  const finish = async () => {
    if (!auth.currentUser) { Alert.alert('Error','Sin usuario'); return; }
    await setDoc(doc(db,'users',auth.currentUser.uid),{
      ...data,
      createdAt: Date.now(),
    },{ merge:true });
    router.replace('/' as any); // AuthGate redirigirá por rol
  };

  return (
    <View style={s.c}>
      <Text style={s.h}>¡Todo listo, {data.firstName}!</Text>
      <Text style={{ textAlign:'center', marginBottom:20 }}>
        Pulsa continuar para entrar a Workly
      </Text>
      <Button title="Entrar" onPress={finish}/>
    </View>
  );
}
const s=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24},
h:{fontSize:24,textAlign:'center',marginBottom:20}});
