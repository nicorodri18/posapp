import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../firebaseConfig'; // Asegúrate de que la ruta sea correcta

// Clave de API de Gemini
const GEMINI_API_KEY = 'AIzaSyDgRJaK0CdL1bnu2PbBV_xV1Ml_6W7skt0';

export default function ChatScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  // Estado
  const [messages, setMessages] = useState<{ text: string; sender: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatList, setChatList] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user]);

  // Cargar lista de chats
  useEffect(() => {
    if (!user) return;

    const userChatsRef = collection(db, 'chats', user.uid, 'myChats');
    const q = query(userChatsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate().toLocaleString() || 'Sin fecha',
      }));
      setChatList(loadedChats);
    });

    return () => unsubscribe();
  }, [user]);

  // Cargar mensajes del chat actual
  useEffect(() => {
    if (!user || !currentChatId) return;

    const messagesRef = collection(db, 'chats', user.uid, 'myChats', currentChatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMsgs = snapshot.docs.map((doc) => ({
        text: doc.data().text,
        sender: doc.data().sender,
      }));
      setMessages(loadedMsgs);
    });

    return () => unsubscribe();
  }, [user, currentChatId]);

  // Crear nuevo chat
  const startNewChat = async () => {
    if (!user) return;

    const newChatRef = doc(collection(db, 'chats', user.uid, 'myChats'));
    await setDoc(newChatRef, { createdAt: new Date() });

    setCurrentChatId(newChatRef.id);
    setMessages([]);
  };

  // Abrir un chat anterior
  const openChat = (chatId: string) => {
    setCurrentChatId(chatId);
    setShowHistory(false);
  };

  // Enviar mensaje
  const sendMessage = async () => {
    if (!input.trim() || !currentChatId || !user) return;

    const userMessage = {
      text: input,
      sender: user.email || 'Usuario',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Guardar mensaje en Firebase
      await addDoc(
        collection(db, 'chats', user.uid, 'myChats', currentChatId, 'messages'),
        userMessage
      );

      // Llamar a Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: input }] }],
          }),
        }
      );

      const data = await response.json();
      console.log('API Response:', data);

      const botResponse =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Error al procesar respuesta.';

      // Guardar respuesta en Firebase
      const botMessage = {
        text: botResponse,
        sender: 'Gemini',
        timestamp: new Date(),
      };
      await addDoc(
        collection(db, 'chats', user.uid, 'myChats', currentChatId, 'messages'),
        botMessage
      );
    } catch (error) {
      console.error('Error en la API:', error);
      setMessages((prev) => [
        ...prev,
        { text: 'Error en la conexión con Gemini.', sender: 'Gemini' },
      ]);
    }

    setLoading(false);
  };

  // Navegar de vuelta a MenuScreen
  const handleBack = () => {
    router.replace('/client/MenuScreen'); // Navega a MenuScreen en app/client/MenuScreen.tsx
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.iconButton}
        >
          <FontAwesome name="arrow-left" size={24} color="#00A859" />
        </TouchableOpacity>
        <Text style={styles.title}>Chat con Gemini</Text>
      </View>

      {/* Botón ver/ocultar historial */}
      <TouchableOpacity
        style={styles.historyButton}
        onPress={() => setShowHistory(!showHistory)}
      >
        <Text style={styles.historyButtonText}>
          {showHistory ? 'Ocultar Historial' : 'Ver Historial de Chats'}
        </Text>
      </TouchableOpacity>

      {/* Historial */}
      {showHistory && (
        <FlatList
          data={chatList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => openChat(item.id)}
            >
              <Text style={styles.chatText}>Chat Iniciado: {item.createdAt}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.chatList}
        />
      )}

      {/* Botón para nuevo chat */}
      <TouchableOpacity style={styles.newChatButton} onPress={startNewChat}>
        <Text style={styles.newChatButtonText}>Iniciar Nuevo Chat</Text>
      </TouchableOpacity>

      {/* Chat actual */}
      <ScrollView style={styles.chatContainer}>
        {messages.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              msg.sender === user?.email
                ? styles.userBubble
                : styles.botBubble,
            ]}
          >
            <Text style={styles.messageText}>
              {msg.sender}: {msg.text}
            </Text>
          </View>
        ))}
        {loading && <ActivityIndicator size="small" color="#00A859" />}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor="#666666"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={loading || !currentChatId}
        >
          <FontAwesome name="paper-plane" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  iconButton: {
    padding: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#00A859',
    fontFamily: 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  historyButton: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
  },
  historyButtonText: {
    fontSize: 16,
    color: '#00A859',
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  chatList: {
    paddingBottom: 10,
  },
  chatItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  chatText: {
    fontSize: 16,
    color: '#333333',
    fontFamily: 'Roboto',
  },
  newChatButton: {
    backgroundColor: '#00A859',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
  },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  chatContainer: {
    flex: 1,
    marginBottom: 10,
  },
  messageBubble: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    maxWidth: '80%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#00A859',
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 14,
    color: '#333333',
    fontFamily: 'Roboto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    paddingVertical: 10,
    fontFamily: 'Roboto',
  },
  sendButton: {
    backgroundColor: '#00A859',
    padding: 10,
    borderRadius: 8,
  },
});