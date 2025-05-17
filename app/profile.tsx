// Resto de imports igual...
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, limit, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      setUserData({
        docId: docSnap.id,
        name: data.name ?? 'Usuario',
        email: data.email,
        points: data.points ?? 0,
        photoURL: data.photoURL,
        pointsExpiry: data.pointsExpiry instanceof Timestamp ? data.pointsExpiry.toDate() : new Date(),
      });
    } catch (error) {
      console.error('Error al obtener el usuario:', error);
      Alert.alert('Error', 'No se pudo cargar la información del usuario.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPointHistory = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'pointHistory'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const historyData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date.toDate(),
          points: data.points,
          description: data.description,
          type: data.type,
        };
      });
      setHistory(historyData);
    } catch (error) {
      console.error('Error obteniendo historial:', error);
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* User Info */}
      <View style={styles.card}>
        <Image
          source={{ uri: userData?.photoURL || 'https://randomuser.me/api/portraits/men/1.jpg' }}
          style={styles.avatar}
        />
        <Text style={styles.userName}>{userData?.name}</Text>
        <Text style={styles.userEmail}>{userData?.email}</Text>
      </View>

      {/* Points */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Puntos disponibles</Text>
        <Text style={styles.pointsValue}>{userData?.points}</Text>
        <Text style={styles.expiry}>Expiran: {formatDate(userData?.pointsExpiry)}</Text>
      </View>

      {/* History */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Historial de puntos</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>No hay movimientos recientes.</Text>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <Text style={styles.historyDescription}>{item.description}</Text>
                <Text style={[styles.historyPoints, item.type === 'earned' ? styles.green : styles.red]}>
                  {item.type === 'earned' ? '+' : '-'}{item.points}
                </Text>
                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignSelf: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#222',
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  expiry: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  historyDescription: {
    fontSize: 15,
    color: '#333',
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: '600',
  },
  green: {
    color: '#2ECC71',
  },
  red: {
    color: '#E74C3C',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
