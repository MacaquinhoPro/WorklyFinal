import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { useOB } from './OnboardingContext';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import React from 'react';

const schema = z.object({ firstName: z.string().min(1) });
type F = z.infer<typeof schema>;

export default function FirstName() {
  const { set, data } = useOB();
  const { control, handleSubmit, formState:{ errors } } = useForm<F>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: data.firstName ?? '' },
  });

  const onSubmit = (f:F) => { set({ firstName:f.firstName }); router.push('/(onboarding)/education'); };

  return (
    <View style={st.c}>
      <Controller control={control} name="firstName"
        render={({ field })=>(
          <TextInput style={st.inp} placeholder="Tu nombre" {...field}/>
        )}/>
      {errors.firstName && <Text style={st.err}>{errors.firstName.message}</Text>}
      <Button title="Continuar" onPress={handleSubmit(onSubmit)} />
    </View>
  );
}
const st=StyleSheet.create({c:{flex:1,justifyContent:'center',padding:24},
inp:{borderWidth:1,borderColor:'#ccc',borderRadius:8,padding:12,marginBottom:10},
err:{color:'red'}});
