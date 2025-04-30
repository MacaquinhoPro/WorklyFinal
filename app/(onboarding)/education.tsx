import { View, TextInput, Button, StyleSheet } from 'react-native';
import { useOB } from './OnboardingContext';
import { router } from 'expo-router';
import React from 'react';

export default function Education() {
  const { set, data } = useOB();
  const [value, onChange] = React.useState(data.education ?? '');

  return (
    <View style={s.c}>
      <TextInput style={s.inp} placeholder="Nivel educativo"
        value={value} onChangeText={onChange}/>
      <Button title="Continuar" onPress={()=>{
        set({ education:value });
        router.push('/(onboarding)/role');
      }}/>
    </View>
  );
}
const s=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24},
inp:{borderWidth:1,borderColor:'#ccc',borderRadius:8,padding:12,marginBottom:10}});
