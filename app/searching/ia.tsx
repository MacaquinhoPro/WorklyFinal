import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';

/* ---------- tipos ---------- */
type Message = {
  text: string;
  sender_by: 'User' | 'Bot';
  date: Date;
  state: 'sent' | 'recived';
};

/* ---------- componente ---------- */
export default function IAChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);
  const insets = useSafeAreaInsets();

  /* ---------- envía mensaje ---------- */
  const handleSend = async () => {
    const originalPrompt = input.trim();
    if (!originalPrompt) return;

    const userMessage: Message = {
      text: originalPrompt,
      sender_by: 'User',
      date: new Date(),
      state: 'sent',
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      setIsLoading(true);

      const promptWorkly = `Respondeme como si fueras un coach laboral, que únicamente responde preguntas acerca de trabajo. Si preguntan algo que no tenga relación, responde: "Soy una IA diseñada para ayudarte con preguntas laborales, no puedo responder a tu pregunta".\n\n${originalPrompt}`;
      const endpoint =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyC3CGhhZXZ1TwFNK6aCb4xlg0ARfgBv96Q';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptWorkly }] }],
        }),
      });

      const data = await response.json();
      const botText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response';

      const botMessage: Message = {
        text: botText,
        sender_by: 'Bot',
        date: new Date(),
        state: 'recived',
      };
      setMessages(prev => [...prev, botMessage]);
    } catch {
      const errorMsg: Message = {
        text: 'Error de red. Intenta de nuevo.',
        sender_by: 'Bot',
        date: new Date(),
        state: 'recived',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- auto-scroll ---------- */
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  /* ---------- render ---------- */
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? insets.bottom + 20 : 0
        }
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={[styles.chatContainer, { paddingTop: 8 }]}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const bubbleContent = (
              <Markdown
                style={item.sender_by === 'User' ? mdStylesUser : mdStylesAI}
              >
                {item.text}
              </Markdown>
            );

            if (item.sender_by === 'User') {
              return (
                <LinearGradient
                  colors={['#5A40EA', '#EE805F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bubble, styles.userBubble]}
                >
                  {bubbleContent}
                </LinearGradient>
              );
            }

            return (
              <View style={[styles.bubble, styles.aiBubble]}>
                {bubbleContent}
              </View>
            );
          }}
        />

        {/* -------- cartel de bienvenida -------- */}
        {messages.length === 0 && (
          <View style={styles.welcomeOverlay} pointerEvents="none">
            <Markdown style={mdStylesAI}>
              Bienvenido, soy una IA para ayudarte a organizar tus ideas laborales
            </Markdown>
          </View>
        )}

        {/* -------- barra de entrada -------- */}
        <View
          style={[
            styles.inputRow,
            { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 },
          ]}
        >
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe un mensaje..."
            editable={!isLoading}
          />
          <TouchableOpacity onPress={handleSend} disabled={isLoading}>
            <LinearGradient
              colors={['#5A40EA', '#EE805F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.sendBtn, isLoading && styles.sendBtnDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <MaterialIcons name="send" size={24} color="#FFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- estilos ---------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  container: { flex: 1 },
  chatContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
  },
  userBubble: { alignSelf: 'flex-end' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#E0E0E0' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  welcomeOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 60,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/* ---------- estilos de Markdown ---------- */
const mdStylesUser = {
  body: { color: '#FFF' },
  strong: { fontWeight: 'bold', color: '#FFF' },
} as const;

const mdStylesAI = {
  body: { color: '#333' },
  strong: { fontWeight: 'bold', color: '#333' },
} as const;
