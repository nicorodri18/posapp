import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // Import useRouter for navigation
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
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
import Icon from 'react-native-vector-icons/MaterialIcons'; // Import Icon for navigation bar icons
import { db } from '../firebaseConfig';

export default function QRPoints() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('points'); // Track active section, default to 'points'
  const router = useRouter(); // Initialize router for navigation

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

  const handleQRScan = async () => {
    if (!user || !userData || !userData.id) return;

    try {
      const userRef = doc(db, 'users', userData.id);
      const newPoints = (userData.points || 0) + 125;
      const newHistory = [
        ...(userData.history || []),
        {
          date: new Date().toISOString(),
          points: 125,
          description: 'You got 125 points',
        },
      ];

      await updateDoc(userRef, {
        points: newPoints,
        history: newHistory,
      });

      setUserData({ ...userData, points: newPoints, history: newHistory });
    } catch (error) {
      console.error('Error updating points:', error);
      setError('Error al actualizar los puntos. Por favor, intenta de nuevo.');
    }
  };

  // Navigation handlers
  const handlePoints = () => {
    setActiveSection('points');
    router.push('/QRPoints'); // Already on QRPoints, but included for consistency
  };

  const handleHome = () => {
    setActiveSection('home');
    router.push('/client/MenuScreen');
  };

  const handleChat = () => {
    setActiveSection('chat');
    router.push('/chat');
  };

  const handleProfile = () => {
    setActiveSection('profile');
    router.push('/EditProfile');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6600" />
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
        <MaterialIcons name="menu" size={24} color="#000" style={styles.menuIcon} />
        <Text style={styles.headerTitle}>POINTS</Text>
      </View>

      {/* Points Card */}
      <View style={styles.pointsCard}>
        <View style={styles.avatarPlaceholder}>
          <MaterialIcons name="person" size={40} color="#888" />
        </View>
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsLabel}>Available</Text>
          <Text style={styles.points}>
            <MaterialIcons name="monetization-on" size={24} color="#FFD700" /> {userData.points}
          </Text>
          <Text style={styles.expiry}>Expire on {userData.expiry || '25/MAY/2026'}</Text>
        </View>
      </View>

      {/* History Section */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>HYSTORY</Text>
        <Text style={styles.historyMore}>more</Text>
      </View>
      {(userData.history || []).length > 0 ? (
        userData.history.slice(0, 1).map((entry: any, index: number) => (
          <View key={index} style={styles.historyItem}>
            <Text style={styles.historyDescription}>{entry.description}</Text>
            <Text style={styles.historyDate}>
              {new Date(entry.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </View>
        ))
      ) : (
        <View style={styles.historyItem}>
          <Text style={styles.historyDescription}>No history available</Text>
        </View>
      )}

      {/* QR Button */}
      <TouchableOpacity style={styles.qrButton} onPress={() => setShowQR(!showQR)}>
        <Text style={styles.qrButtonText}>Get Points</Text>
        <MaterialIcons name="qr-code" size={24} color="#fff" style={styles.qrIcon} />
      </TouchableOpacity>

      {/* QR Code Modal */}
      {showQR && (
        <View style={styles.qrModal}>
          <QRCode
            value={`add-points:${userData.id}`}
            size={250}
            color="#000"
            backgroundColor="#fff"
          />
          <TouchableOpacity style={styles.scanButton} onPress={handleQRScan}>
            <Text style={styles.scanButtonText}>Simulate QR Scan (+125 Points)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={() => setShowQR(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeSection === 'points' && styles.navButtonActive,
          ]}
          onPress={handlePoints}
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
          onPress={handleHome}
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
          onPress={handleChat}
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
          onPress={handleProfile}
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
    backgroundColor: '#fff',
    padding: 20,
    paddingBottom: 80, // Added padding to prevent overlap with bottom nav
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuIcon: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  pointsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
  },
  points: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  expiry: {
    fontSize: 14,
    color: '#666',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyMore: {
    fontSize: 14,
    color: '#FF6600',
  },
  historyItem: {
    backgroundColor: '#f2f2f2',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyDescription: {
    fontSize: 16,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
  },
  qrButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6600',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  qrIcon: {
    marginLeft: 10,
  },
  qrModal: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  scanButton: {
    backgroundColor: '#FF6600',
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
  },
  closeButtonText: {
    color: '#FF6600',
    fontSize: 16,
  },
  // Added styles for bottom navigation bar
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    backgroundColor: '#FF9800', // Orange background for active section
  },
});