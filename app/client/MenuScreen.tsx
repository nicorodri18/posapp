import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import {
    addDoc,
    collection,
    doc,
    getDocs, orderBy, query,
    updateDoc
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert, FlatList, StyleSheet, Text,
    TouchableOpacity, View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
  
  export default function ClientMenuScreen() {
    const router = useRouter();
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [tables, setTables] = useState<any[]>([]);
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
  
    useEffect(() => {
      loadMenu();
      loadTables();
    }, []);
  
    const loadMenu = async () => {
      try {
        const q = query(collection(db, 'menu'), orderBy('name', 'asc'));
        const querySnap = await getDocs(q);
        const items: any[] = [];
        querySnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.available) {
            items.push({ id: docSnap.id, ...data });
          }
        });
        setMenuItems(items);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar el menú:', error);
      }
    };
  
    const loadTables = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'tables'));
        const availableTables = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(table => table.status === 'Disponible');
        setTables(availableTables);
      } catch (error) {
        console.error('Error al cargar mesas:', error);
      }
    };
  
    const selectTable = async (table: any) => {
      try {
        const ref = doc(db, 'tables', table.id);
        await updateDoc(ref, { status: 'Ocupada' });
        setSelectedTable(table);
        Alert.alert('Mesa seleccionada', `Seleccionaste la mesa ${table.number}`);
      } catch (error) {
        console.error('Error al seleccionar mesa:', error);
      }
    };
  
    const addToCart = (item: any) => {
      const existing = cart.find(i => i.id === item.id);
      if (existing) {
        setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        setCart([...cart, { id: item.id, name: item.name, price: item.price, quantity: 1 }]);
      }
    };
  
    const removeFromCart = (id: string) => {
      setCart(cart.filter(i => i.id !== id));
    };
  
    const changeQuantity = (id: string, change: number) => {
      setCart(cart.map(i => {
        if (i.id === id) {
          const newQty = i.quantity + change;
          return { ...i, quantity: newQty > 0 ? newQty : 1 };
        }
        return i;
      }));
    };
  
    const confirmOrder = async () => {
      if (!selectedTable) {
        Alert.alert('Selecciona una mesa', 'Debes seleccionar una mesa antes de pedir.');
        return;
      }
      if (cart.length === 0) {
        Alert.alert('Carrito vacío', 'Agrega productos antes de ordenar.');
        return;
      }
  
      try {
        await addDoc(collection(db, 'orders'), {
          tableId: selectedTable.id,
          tableNumber: selectedTable.number,
          items: cart,
          status: 'Solicitado',
          createdAt: new Date(),
        });
        setCart([]);
        Alert.alert('Pedido enviado', `Tu pedido desde la mesa ${selectedTable.number} fue enviado.`);
      } catch (error) {
        console.error('Error al enviar pedido:', error);
        Alert.alert('Error', 'No se pudo enviar el pedido.');
      }
    };
  
    const handleLogout = async () => {
      try {
        await signOut(auth);
        router.replace('/');
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    };
  
    if (loading) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Cargando...</Text>
        </View>
      );
    }
  
    return (
      <View style={styles.container}>
        {/* Botón menú */}
        <TouchableOpacity style={styles.menuButton} onPress={() => setDrawerOpen(true)}>
          <Text style={styles.menuButtonText}>≡</Text>
        </TouchableOpacity>
  
        <Text style={styles.title}>Mesas Disponibles</Text>
  
        <View style={styles.tablesWrapper}>
          <FlatList
            data={tables}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 5 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.tableCard,
                  selectedTable?.id === item.id && styles.tableSelected
                ]}
                onPress={() => selectTable(item)}
              >
                <Text style={styles.tableText}>Mesa {item.number}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
  
        {selectedTable && (
          <Text style={styles.selectedTableText}>Mesa actual: {selectedTable.number}</Text>
        )}
  
        <Text style={styles.title}>Menú</Text>
        <FlatList
          data={menuItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemPrice}>${item.price}</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          )}
        />
  
        <Text style={styles.cartTitle}>🛒 Carrito</Text>
        {cart.map(item => (
          <View key={item.id} style={styles.cartItem}>
            <Text style={styles.cartItemText}>{item.name} x {item.quantity}</Text>
            <View style={styles.cartActions}>
              <TouchableOpacity onPress={() => changeQuantity(item.id, -1)}>
                <Text style={styles.cartButton}>➖</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeQuantity(item.id, 1)}>
                <Text style={styles.cartButton}>➕</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                <Text style={styles.cartButton}>❌</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
  
        {cart.length > 0 && (
          <TouchableOpacity style={styles.confirmButton} onPress={confirmOrder}>
            <Text style={styles.confirmButtonText}>Confirmar Pedido</Text>
          </TouchableOpacity>
        )}
  
        {/* Drawer */}
        {drawerOpen && (
          <View style={styles.drawerOverlay}>
            <View style={styles.drawer}>
              <Text style={styles.drawerTitle}>Menú Cliente</Text>
              <TouchableOpacity
                style={styles.drawerOption}
                onPress={() => {
                  router.push('/client/OrderStatusScreen');
                  setDrawerOpen(false);
                }}
              >
                <Text style={styles.drawerOptionText}>Ver estado del pedido</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerOption}
                onPress={handleLogout}
              >
                <Text style={styles.drawerOptionText}>Cerrar sesión</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerOption}
                onPress={() => setDrawerOpen(false)}
              >
                <Text style={styles.drawerOptionText}>Cerrar menú</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    menuButton: {
      position: 'absolute', top: 40, left: 20, zIndex: 2,
      backgroundColor: '#2ecc71', padding: 10, borderRadius: 5,
    },
    menuButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
    tablesWrapper: { height: 60, marginVertical: 15 },
    tableCard: {
      backgroundColor: '#2ecc71',
      paddingVertical: 10, paddingHorizontal: 20,
      borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    },
    tableSelected: { backgroundColor: '#e67e22' },
    tableText: { color: 'white', fontWeight: 'bold' },
    selectedTableText: {
      fontSize: 16, marginBottom: 15,
      color: '#e67e22', fontWeight: 'bold',
    },
    itemCard: {
      backgroundColor: '#fff', padding: 15, marginBottom: 10,
      borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5,
    },
    itemTitle: { fontSize: 18, fontWeight: 'bold' },
    itemPrice: { color: '#555' },
    addButton: {
      marginTop: 10, backgroundColor: '#2ecc71',
      padding: 10, borderRadius: 5, alignItems: 'center',
    },
    addButtonText: { color: 'white', fontWeight: 'bold' },
    cartTitle: { fontSize: 20, marginTop: 20, fontWeight: 'bold' },
    cartItem: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingVertical: 8,
    },
    cartItemText: { fontSize: 16 },
    cartActions: { flexDirection: 'row', gap: 10 },
    cartButton: { fontSize: 20, paddingHorizontal: 10 },
    confirmButton: {
      backgroundColor: '#e67e22', padding: 15, borderRadius: 8,
      alignItems: 'center', marginTop: 20,
    },
    confirmButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
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