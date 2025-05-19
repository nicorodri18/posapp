import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebaseConfig';

interface UserData {
  docId: string;
  name: string;
  email: string;
  points: number;
  pointsExpiry?: Date;
  photoURL?: string;
}

interface PointHistory {
  id: string;
  date: Date;
  points: number;
  description: string;
  type: 'earned' | 'redeemed';
}

export default function ProfileScreen() {
  const router = useRouter();
  const auth = getAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }

    fetchUserData(user.email);
    fetchPointHistory(user.uid);
  }, []);

  const fetchUserData = async (email: string | null) => {
    if (!email) return;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) throw new Error('Usuario no encontrado');

      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      const userData: UserData = {
        docId: docSnap.id,
        name: data.name,
        email: data.email,
        points: data.points,
        pointsExpiry: data.pointsExpiry?.toDate(),
        photoURL: data.photoURL,
      };
      setUserData(userData);
      setEditedName(data.name);
    } catch (error) {
      console.error('Error al obtener los datos del usuario:', error);
      Alert.alert('Error', 'No se pudieron obtener los datos del usuario.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPointHistory = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'users', uid, 'pointHistory'),
        orderBy('date', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const historyData: PointHistory[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        date: doc.data().date.toDate(),
        points: doc.data().points,
        description: doc.data().description,
        type: doc.data().type,
      }));
      setHistory(historyData);
    } catch (error) {
      console.error('Error al obtener el historial de puntos:', error);
      Alert.alert('Error', 'No se pudo cargar el historial de puntos.');
    }
  };

  const handleSaveName = async () => {
    if (!userData || editedName.trim() === '') return;

    try {
      const userRef = doc(db, 'users', userData.docId);
      await updateDoc(userRef, { name: editedName.trim() });
      setUserData({ ...userData, name: editedName.trim() });
      setIsEditing(false);
      Alert.alert('Éxito', 'Nombre actualizado correctamente.');
    } catch (error) {
      console.error('Error al actualizar el nombre:', error);
      Alert.alert('Error', 'No se pudo actualizar el nombre.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!userData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        {userData.photoURL && (
          <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
        )}
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Nombre"
            />
            <TouchableOpacity onPress={handleSaveName} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.name}>{userData.name}</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <MaterialIcons name="edit" size={20} color="gray" />
            </TouchableOpacity>
          </>
        )}
        <Text style={styles.email}>{userData.email}</Text>
        <Text style={styles.points}>Puntos: {userData.points}</Text>
        {userData.pointsExpiry && (
          <Text style={styles.expiry}>
            Vencen: {userData.pointsExpiry.toLocaleDateString()}
          </Text>
        )}
      </View>

      <Text style={styles.historyTitle}>Historial de puntos</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text style={styles.historyDate}>
              {item.date.toLocaleDateString()}
            </Text>
            <Text style={styles.historyDescription}>{item.description}</Text>
            <Text style={[
              styles.historyPoints,
              item.type === 'earned' ? styles.earned : styles.redeemed
            ]}>
              {item.type === 'earned' ? '+' : '-'}{item.points}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
  name: { fontSize: 22, fontWeight: 'bold' },
  email: { color: 'gray', marginBottom: 8 },
  points: { fontSize: 18, marginTop: 8 },
  expiry: { color: 'gray', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    width: '80%',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  historyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyDate: { width: 100 },
  historyDescription: { flex: 1 },
  historyPoints: { fontWeight: 'bold' },
  earned: { color: 'green' },
  redeemed: { color: 'red' },
});