import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useOB } from './OnboardingContext';
import { router } from 'expo-router';
import React from 'react';

export default function Qualifications() {
  const { set, data } = useOB();
  const [value, setVal] = React.useState((data.qualifications ?? []).join(', '));

  return (
    <View style={s.c}>
      <TextInput style={s.inp} placeholder="Habilidades separadas por coma"
        value={value} onChangeText={setVal}/>
      <Button title="Continuar" onPress={()=>{
        const arr = value.split(',').map(t=>t.trim()).filter(Boolean);
        set({ qualifications: arr });
        router.push('/(onboarding)/galleryPicker1');
      }}/>
    </View>
  );
}
const s=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24},
inp:{borderWidth:1,borderColor:'#ccc',borderRadius:8,padding:12,marginBottom:10}});
