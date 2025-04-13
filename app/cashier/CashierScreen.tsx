import { useRouter } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function CashierScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setOrders(data);
    });

    return () => unsubscribe();
  }, []);

  const getFilteredOrders = () => {
    if (filter === 'all') return orders;
    return orders.filter((order) => order.status === filter);
  };

  const calculateTotal = (items: any[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.19;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const confirmPayment = async () => {
    if (!selectedOrder) return;
  
    try {
      const { subtotal, tax, total } = calculateTotal(selectedOrder.items);
      const ref = doc(db, 'orders', selectedOrder.id);
  
      // Cambiar estado a "Pagado"
      await updateDoc(ref, { status: 'Pagado' });
  
      // Actualizar inventario por cada producto
      for (const item of selectedOrder.items) {
        if (item.productId) {
          const productRef = doc(db, 'products', item.productId);
          await updateDoc(productRef, {
            stock: Math.max(0, item.stock - item.quantity), // si tienes el stock en el item
          });
        }
      }
  
      // Generar recibo
      await addDoc(collection(db, 'receipts'), {
        orderId: selectedOrder.id,
        tableNumber: selectedOrder.tableNumber,
        paidAt: new Date(),
        subtotal,
        tax,
        total,
        items: selectedOrder.items,
      });
  
      Alert.alert('✅ Pago confirmado', `Pedido ${selectedOrder.id} fue marcado como pagado`);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error al marcar como pagado o actualizar inventario:', error);
      Alert.alert('Error', 'No se pudo completar el pago.');
    }
  }; 

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.drawerToggle} onPress={() => setDrawerOpen(true)}>
        <Text style={styles.drawerToggleText}>≡</Text>
      </TouchableOpacity>

      <Text style={styles.header}>💰 Caja - Pedidos</Text>

      <View style={styles.filterBar}>
        {['all', 'Listo para pagar', 'Pagado'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              filter === status && styles.activeButton,
            ]}
            onPress={() => setFilter(status)}
          >
            <Text style={[styles.filterText, filter === status && styles.activeText]}>
              {status === 'all' ? 'Todos' : status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={getFilteredOrders()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const { total } = calculateTotal(item.items);
          return (
            <TouchableOpacity
              style={styles.orderCard}
              onPress={() => setSelectedOrder(item)}
            >
              <Text style={styles.orderText}>Mesa: {item.tableNumber}</Text>
              <Text style={styles.orderText}>Estado: {item.status}</Text>
              <Text style={styles.orderText}>Total: ${total.toFixed(2)}</Text>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={!!selectedOrder} animationType="slide">
        <View style={styles.modalContent}>
          {selectedOrder && (
            <>
              <Text style={styles.modalTitle}>Detalle del Pedido</Text>
              {selectedOrder.items.map((item: any, i: number) => (
                <Text key={i}>• {item.name} x{item.quantity} (${item.price})</Text>
              ))}
              <View style={{ marginTop: 20 }}>
                {(() => {
                  const { subtotal, tax, total } = calculateTotal(selectedOrder.items);
                  return (
                    <>
                      <Text>Subtotal: ${subtotal.toFixed(2)}</Text>
                      <Text>IVA (19%): ${tax.toFixed(2)}</Text>
                      <Text style={{ fontWeight: 'bold' }}>Total: ${total.toFixed(2)}</Text>
                    </>
                  );
                })()}
              </View>

              <TouchableOpacity style={styles.payButton} onPress={confirmPayment}>
                <Text style={styles.payButtonText}>Confirmar Pago</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Text style={{ marginTop: 20, color: 'red' }}>Cerrar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      {drawerOpen && (
        <View style={styles.drawerOverlay}>
          <View style={styles.drawer}>
            <Text style={styles.drawerTitle}>Menú de Caja</Text>

            <TouchableOpacity
              style={styles.drawerOption}
              onPress={() => {
                router.push('/posapp/posapp');
                setDrawerOpen(false);
              }}
            >
              <Text style={styles.drawerOptionText}>Volver a Mesas</Text>
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
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  drawerToggle: {
    position: 'absolute', top: 25, left: 25, zIndex: 999,
    backgroundColor: '#2ecc71', padding: 10, borderRadius: 5,
  },
  drawerToggleText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  filterBar: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
  filterButton: {
    paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 6, backgroundColor: '#ecf0f1',
  },
  activeButton: { backgroundColor: '#2ecc71' },
  filterText: { fontSize: 14, color: '#2c3e50' },
  activeText: { color: '#fff', fontWeight: 'bold' },
  orderCard: {
    backgroundColor: '#f1f1f1', padding: 15, borderRadius: 10,
    marginBottom: 10, borderLeftWidth: 5, borderLeftColor: '#3498db',
  },
  orderText: { fontSize: 14, marginBottom: 2 },
  modalContent: {
    flex: 1, padding: 30, backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  payButton: {
    marginTop: 20, backgroundColor: '#27ae60',
    padding: 15, borderRadius: 10, alignItems: 'center',
  },
  payButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  drawerOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10,
  },
  drawer: {
    backgroundColor: '#fff', width: 250, height: '100%',
    padding: 20, elevation: 10,
  },
  drawerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  drawerOption: { marginBottom: 15 },
  drawerOptionText: { fontSize: 16, color: '#2c3e50' },
});