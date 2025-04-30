import { View, Button, StyleSheet } from 'react-native';
import { useOB } from './OnboardingContext';
import { router } from 'expo-router';
import React from 'react';

export default function Role() {
  const { set, data } = useOB();
  return (
    <View style={s.c}>
      <Button title="Busco trabajo"
        color={data.role==='searching'?'#4e73df':undefined}
        onPress={()=>set({ role:'searching' })}/>
      <View style={{ height:10 }}/>
      <Button title="Contratar talento"
        color={data.role==='hiring'?'#4e73df':undefined}
        onPress={()=>set({ role:'hiring' })}/>
      <View style={{ height:30 }}/>
      <Button title="Continuar" onPress={()=>router.push('/(onboarding)/qualifications')}/>
    </View>
  );
}
const s=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24}});
