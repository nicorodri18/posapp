import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { db } from '../firebaseConfig';

export default function QRPoints() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('points');
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth();
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Tiempo de carga agotado. Intenta de nuevo.');
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        clearTimeout(timeout);
        return;
      }

      setUser(firebaseUser);
      try {
        const q = query(
          collection(db, 'users'),
          where('email', '==', firebaseUser.email)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          setUserData({ ...doc.data(), id: doc.id });
        } else {
          setError('Usuario no encontrado en Firestore.');
          setUserData({
            name: 'Usuario',
            points: 0,
            history: [],
            expiry: '25/MAY/2026',
          });
        }
      } catch (error) {
        console.error('Error al obtener usuario:', error);
        setError('Error al obtener datos del usuario.');
        setUserData({
          name: 'Usuario',
          points: 0,
          history: [],
          expiry: '25/MAY/2026',
        });
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00A859" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!user || !userData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Por favor, inicia sesión para continuar</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PUNTOS</Text>
      </View>

      {/* Points Card */}
      <View style={styles.pointsCard}>
        <View style={styles.avatarPlaceholder}>
          <MaterialIcons name="person" size={40} color="#666" />
        </View>
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsLabel}>Puntos Disponibles</Text>
          <Text style={styles.points}>
            {userData.points} <MaterialIcons name="monetization-on" size={24} color="#00A859" />
          </Text>
          <Text style={styles.expiry}>Expiran el {userData.expiry || '25/MAY/2026'}</Text>
        </View>
      </View>

      {/* History Section */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Historial</Text>
        {(userData.history || []).length > 0 ? (
          userData.history.slice(0, 1).map((entry: any, index: number) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyDescription}>{entry.description}</Text>
              <Text style={styles.historyDate}>
                {new Date(entry.date).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.historyItem}>
            <Text style={styles.historyDescription}>No hay historial disponible</Text>
          </View>
        )}
      </View>

      {/* QR Button */}
      <TouchableOpacity style={styles.qrButton} onPress={() => setShowQR(!showQR)}>
        <Text style={styles.qrButtonText}>Obtener Puntos</Text>
        <MaterialIcons name="qr-code" size={24} color="#fff" style={styles.qrIcon} />
      </TouchableOpacity>

      {/* QR Code Modal */}
      {showQR && (
        <View style={styles.qrModal}>
          <View style={styles.qrModalContent}>
            <QRCode
              value={`add-points:${userData.id}`}
              size={200}
              color="#000"
              backgroundColor="#fff"
            />
            <Text style={styles.qrHelpText}>
              Muestra este código al administrador para recibir puntos
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowQR(false)}>
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeSection === 'points' && styles.navButtonActive,
          ]}
          onPress={() => {
            setActiveSection('points');
            router.push('/QRPoints');
          }}
        >
          <Icon
            name="attach-money"
            size={28}
            color={activeSection === 'points' ? '#fff' : '#666'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeSection === 'home' && styles.navButtonActive,
          ]}
          onPress={() => {
            setActiveSection('home');
            router.push('/client/MenuScreen');
          }}
        >
          <Icon
            name="home"
            size={28}
            color={activeSection === 'home' ? '#fff' : '#666'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeSection === 'chat' && styles.navButtonActive,
          ]}
          onPress={() => {
            setActiveSection('chat');
            router.push('/chat');
          }}
        >
          <Icon
            name="build"
            size={28}
            color={activeSection === 'chat' ? '#fff' : '#666'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeSection === 'profile' && styles.navButtonActive,
          ]}
          onPress={() => {
            setActiveSection('profile');
            router.push('/EditProfile');
          }}
        >
          <Icon
            name="person"
            size={28}
            color={activeSection === 'profile' ? '#fff' : '#666'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Matches the image's background
    paddingBottom: 80, // Space for bottom navigation bar
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F', // Retained red for errors
    textAlign: 'center',
    marginHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF', // Matches card background
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800', // Matches the orange "CATALOG" title from the image
  },
  pointsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // Matches card background
    borderRadius: 10,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E0E0E0', // Light gray for placeholder
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 16,
    color: '#757575', // Matches secondary text
  },
  points: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F5C400', // Matches yellow-gold for points
    marginVertical: 10,
  },
  expiry: {
    fontSize: 14,
    color: '#757575', // Matches secondary text
  },
  historySection: {
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121', // Matches primary text
    marginBottom: 10,
  },
  historyItem: {
    backgroundColor: '#FFFFFF', // Matches card background
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDescription: {
    fontSize: 16,
    color: '#212121', // Matches primary text
  },
  historyDate: {
    fontSize: 14,
    color: '#757575', // Matches secondary text
  },
  qrButton: {
    flexDirection: 'row',
    backgroundColor: '#FF9800', // Matches orange for buttons
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 20,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  qrButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  qrIcon: {
    marginLeft: 10,
  },
  qrModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: '#FFFFFF', // Matches card background
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  qrHelpText: {
    fontSize: 16,
    color: '#212121', // Matches primary text
    marginVertical: 20,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#D32F2F', // Retained red for close button
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
    width: '50%',
  },
  closeButtonText: {
    color: '#FFFFFF', // White text
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Matches card background
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 25,
  },
  navButtonActive: {
    backgroundColor: '#FF9800', // Matches orange for active state
  },
});