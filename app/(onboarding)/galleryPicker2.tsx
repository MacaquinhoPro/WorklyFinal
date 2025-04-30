// galleryPicker1.tsx
import React, { useState } from 'react';
import { View, Image, Button, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useOB } from './OnboardingContext';
import { router } from 'expo-router';

export default function Gallery1() {
  const { set, data } = useOB();
  const [imgs, setImgs] = useState<string[]>(data.gallery ?? []);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing:true });
    if (!res.canceled && res.assets?.length) setImgs([...imgs, res.assets[0].uri]);
  };

  return (
    <View style={s.c}>
      {imgs.map((uri,i)=>(<Image key={i} source={{ uri }} style={s.img}/>))}
      <Button title="Añadir foto" onPress={pick}/>
      <Button title="Continuar" onPress={()=>{
        if(imgs.length===0) { Alert.alert('Añade al menos 1'); return; }
        set({ gallery: imgs });
        router.push('/(onboarding)/galleryPicker2');
      }}/>
    </View>
  );
}
const s=StyleSheet.create({c:{flex:1,padding:24},img:{width:80,height:80,margin:5}});
