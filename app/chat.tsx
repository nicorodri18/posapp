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
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebaseConfig'; // Adjust the path as needed

const GEMINI_API_KEY = 'AIzaSyDgRJaK0CdL1bnu2PbBV_xV1Ml_6W7skt0';

export default function ChatScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<{ text: string; sender: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatList, setChatList] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) router.replace('/');
  }, [user]);

  // Load list of chats and select the most recent one automatically
  useEffect(() => {
    if (!user) return;
    const userChatsRef = collection(db, 'chats', user.uid, 'myChats');
    const q = query(userChatsRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedChats = snapshot.docs.map((doc) => ({
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate().toLocaleString() || 'No date',
      }));
      setChatList(loadedChats);

      if (!currentChatId && loadedChats.length > 0) {
        setCurrentChatId(loadedChats[0].id);
      }
    });
    return () => unsubscribe();
  }, [user, currentChatId]);

  // Load messages for the current chat
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
      // Scroll to the latest message
      if (flatListRef.current && loadedMsgs.length > 0) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    });
    return () => unsubscribe();
  }, [user, currentChatId]);

  // Start a new chat
  const startNewChat = async () => {
    if (!user) return;
    const newChatRef = doc(collection(db, 'chats', user.uid, 'myChats'));
    await setDoc(newChatRef, { createdAt: new Date() });
    setCurrentChatId(newChatRef.id);
    setMessages([]);
  };

  // Open selected chat
  const openChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || !currentChatId || !user) return;

    const userMessage = {
      text: input,
      sender: user.email || 'User',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      await addDoc(collection(db, 'chats', user.uid, 'myChats', currentChatId, 'messages'), userMessage);

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

      const botResponse =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Error processing response.';

      const botMessage = {
        text: botResponse,
        sender: 'Gemini',
        timestamp: new Date(),
      };

      await addDoc(collection(db, 'chats', user.uid, 'myChats', currentChatId, 'messages'), botMessage);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Go back to MenuScreen
  const goBack = () => {
    router.replace('/client/MenuScreen'); // Updated path to reflect client folder
  };

  // Render each message
  const renderMessage = ({ item }: { item: { text: string; sender: string } }) => {
    const isUser = item.sender !== 'Gemini';
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text style={styles.messageSender}>{isUser ? 'You' : 'Gemini'}</Text>
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat with Gemini</Text>
        <TouchableOpacity onPress={startNewChat} style={styles.newChatButton}>
          <FontAwesome name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.chatListContainer}>
        <FlatList
          horizontal
          data={chatList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openChat(item.id)}
              style={[
                styles.chatItem,
                currentChatId === item.id && styles.chatItemSelected,
              ]}
            >
              <Text style={styles.chatItemText}>{item.createdAt}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
      />

      {loading && (
        <ActivityIndicator size="large" color="#2e86de" style={styles.loading} />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          style={styles.input}
          placeholder="Type your message..."
          multiline
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <FontAwesome name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fa' },
  header: {
    backgroundColor: '#2e86de',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#1b4f72',
    padding: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  newChatButton: {
    backgroundColor: '#1b4f72',
    padding: 8,
    borderRadius: 20,
  },
  chatListContainer: {
    backgroundColor: '#d6eaf8',
    paddingVertical: 8,
  },
  chatItem: {
    backgroundColor: '#aed6f1',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 15,
    marginHorizontal: 6,
  },
  chatItemSelected: {
    backgroundColor: '#2e86de',
  },
  chatItemText: {
    color: '#1b4f72',
    fontWeight: '600',
  },
  messagesList: {
    flexGrow: 1,
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: '75%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userMessage: {
    backgroundColor: '#2e86de',
    alignSelf: 'flex-end',
    borderColor: '#1b4f72',
  },
  botMessage: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderColor: '#d6eaf8',
  },
  messageSender: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  messageText: {
    color: '#333',
    fontSize: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f3f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#2e86de',
    marginLeft: 10,
    borderRadius: 25,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -15 }, { translateY: -15 }],
  },
});