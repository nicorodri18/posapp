import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { db } from '../../firebaseConfig';

export default function OrderStatusScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: any[] = [];
      snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
      setOrders(results);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧾 Estado del Pedido</Text>

      {loading ? (
        <Text>Cargando pedidos...</Text>
      ) : orders.length === 0 ? (
        <Text style={styles.noOrders}>No tienes pedidos activos.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.status}>Estado: {item.status}</Text>
              <Text>Mesa: {item.tableNumber || 'N/A'}</Text>
              <Text>Productos:</Text>
              {item.items.map((prod: any, index: number) => (
                <Text key={index}>• {prod.name} x{prod.quantity}</Text>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  noOrders: { fontSize: 16, color: '#888' },
  card: {
    backgroundColor: '#f4f4f4', padding: 15, borderRadius: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#ddd',
  },
  status: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
});