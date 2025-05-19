// EditProfile.tsx

import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

export default function EditProfile() {
  const auth = getAuth();
  const router = useRouter();
  const user = auth.currentUser;
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [docId, setDocId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    fetchUserData(user.email);
  }, []);

  const fetchUserData = async (email: string | null) => {
    if (!email) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) throw new Error('Usuario no encontrado');

      const docSnap = snapshot.docs[0];
      const data = docSnap.data();

      setDocId(docSnap.id);
      setName(data.name);
      setEmail(data.email);
      setPhotoURL(data.photoURL || '');
      setPoints(data.points || 0);
    } catch (error) {
      Alert.alert('Error al obtener datos', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!docId) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'users', docId), {
        name,
        email,
        photoURL,
      });
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      router.back(); // Volver al perfil anterior
    } catch (error) {
      Alert.alert('Error al actualizar', (error as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.avatarContainer}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatar} />
        ) : (
          <MaterialIcons name="person" size={80} color="#999" />
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

      <Text style={styles.label}>Foto (URL)</Text>
      <TextInput style={styles.input} value={photoURL} onChangeText={setPhotoURL} />

      <Text style={styles.points}>Puntos: {points}</Text>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={updating}>
        <Text style={styles.buttonText}>{updating ? 'Guardando...' : 'Guardar Cambios'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
  },
  points: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    marginTop: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});