import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function KitchenScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setOrders(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const nextStatus = (current: string) => {
    switch (current) {
      case 'Solicitado': return 'En preparación';
      case 'En preparación': return 'Listo para entregar';
      case 'Listo para entregar': return 'Entregado';
      case 'Entregado': return 'Listo para pagar';
      default: return 'Listo para pagar';
    }
  };

  const updateOrderStatus = async (orderId: string, currentStatus: string) => {
    const newStatus = nextStatus(currentStatus);
    try {
      const ref = doc(db, 'orders', orderId);
      await updateDoc(ref, { status: newStatus });
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  const renderOrder = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>Mesa: {item.tableNumber || 'N/A'}</Text>
      <Text style={styles.status}>Estado: {item.status}</Text>
      <Text style={styles.subtitle}>Productos:</Text>
      {item.items.map((prod: any, i: number) => (
        <Text key={i}>• {prod.name} x{prod.quantity}</Text>
      ))}
      <TouchableOpacity
        style={styles.button}
        onPress={() => updateOrderStatus(item.id, item.status)}
      >
        <Text style={styles.buttonText}>Avanzar a: {nextStatus(item.status)}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Botón de Drawer */}
      <TouchableOpacity style={styles.drawerToggle} onPress={() => setDrawerOpen(true)}>
        <Text style={styles.drawerToggleText}>≡</Text>
      </TouchableOpacity>

      <Text style={styles.header}>👨‍🍳 Pedidos de Cocina</Text>

      {loading ? (
        <Text>Cargando pedidos...</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
        />
      )}

      {drawerOpen && (
        <View style={styles.drawerContainer}>
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Menú de Opciones</Text>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => {
                router.push('/posapp/posapp');
                setDrawerOpen(false);
              }}
            >
              <Text style={styles.drawerOptionText}>Ir a Mesas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => {
                router.push('/chef/KitchenScreen');
                setDrawerOpen(false);
              }}
            >
              <Text style={styles.drawerOptionText}>Ver Pedidos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={async () => {
                await auth.signOut();
                router.replace('/');
              }}
            >
              <Text style={styles.drawerOptionText}>Cerrar sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => setDrawerOpen(false)}
            >
              <Text style={styles.drawerOptionText}>Cerrar Drawer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fefefe' },
  drawerToggle: {
    position: 'absolute', top: 25, left: 25, zIndex: 999,
    backgroundColor: '#2ecc71', padding: 10, borderRadius: 5,
  },
  drawerToggleText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  card: {
    backgroundColor: '#f1f1f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#e67e22',
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontWeight: '600', marginTop: 8 },
  status: { fontStyle: 'italic', color: '#666', marginBottom: 5 },
  button: {
    marginTop: 10,
    backgroundColor: '#2ecc71',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: 'bold' },
  drawerContainer: {
    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    width: 200, height: '100%', backgroundColor: '#ecf0f1', padding: 20,
  },
  drawerTitle: {
    fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333',
  },
  drawerOption: {
    backgroundColor: '#bdc3c7', padding: 10, borderRadius: 5, marginBottom: 10,
  },
  drawerOptionText: {
    color: '#2c3e50', fontWeight: 'bold',
  },
});