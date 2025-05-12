import { useRouter } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { db } from '../../firebaseConfig';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface UserData {
  docId: string;
  points: number;
  email: string;
}

interface PurchaseHistory {
  id: string;
  items: CartItem[];
  date: string;
  total: number;
}

export default function MenuScreen() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<PurchaseHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const router = useRouter();
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      fetchUserData();
      fetchProducts();
      fetchPurchaseHistory();
    } else {
      setLoading(false);
      router.replace('/');
    }
  }, [user]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', user?.email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        throw new Error('Usuario no encontrado');
      }
      const docSnap = snapshot.docs[0];
      setUserData({ docId: docSnap.id, points: docSnap.data().points, email: docSnap.data().email });
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      Alert.alert('Error', 'No se pudieron obtener los datos del usuario');
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'products'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(data);
    } catch (error) {
      console.error('Error al obtener productos:', error);
      Alert.alert('Error', 'No se pudieron obtener los productos');
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const q = query(
        collection(db, 'purchaseHistory'),
        where('userId', '==', user?.uid),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PurchaseHistory[];
      setPurchaseHistory(data);
    } catch (error) {
      console.error('Error al obtener historial de compras:', error);
      Alert.alert('Error', 'No se pudo obtener el historial de compras');
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    Alert.alert('Éxito', `${product.name} agregado al carrito`);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRedeemCart = async () => {
    if (!userData) {
      Alert.alert('Error', 'Datos del usuario no encontrados. Intenta iniciar sesión nuevamente.');
      return;
    }

    const totalCost = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    if (userData.points < totalCost) {
      Alert.alert('Puntos insuficientes', 'No tienes suficientes puntos para canjear estos productos.');
      return;
    }

    try {
      const purchaseData = {
        userId: user?.uid,
        items: cart,
        date: new Date().toISOString(),
        total: totalCost,
      };
      await addDoc(collection(db, 'purchaseHistory'), purchaseData);

      const updatedPoints = userData.points - totalCost;
      await updateDoc(doc(db, 'users', userData.docId), { points: updatedPoints });

      setCart([]);
      Alert.alert('Compra exitosa', `Tu compra de ${cart.length} productos ha sido procesada.`);

      fetchUserData();
      fetchPurchaseHistory();
    } catch (error) {
      console.error('Error al procesar el canje:', error);
      Alert.alert('Error', 'No se pudo procesar el canje');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión.');
    }
  };

  const handleProfile = () => {
    router.push('/profile');
  };

  const handleChat = () => {
    router.push('/chat');
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productContainer}>
      {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.productImage} />}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>{item.price} puntos</Text>
        <Text style={styles.productCategory}>Categoría: {item.category}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(item)}>
        <Text style={styles.addButtonText}>Agregar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <Text style={styles.cartItemName}>{item.name}</Text>
      <View style={styles.quantityControls}>
        <TouchableOpacity onPress={() => handleRemoveFromCart(item.id)}>
          <Icon name="remove-circle" size={24} color="#D32F2F" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => handleAddToCart(item)}>
          <Icon name="add-circle" size={24} color="#00A859" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cartItemPrice}>{item.price * item.quantity} pts</Text>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: PurchaseHistory }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
      <View style={styles.historyItems}>
        {item.items.map((product, index) => (
          <Text key={index} style={styles.historyProduct}>
            {product.quantity}x {product.name} ({product.price * product.quantity} pts)
          </Text>
        ))}
      </View>
      <Text style={styles.historyTotal}>Total: {item.total} puntos</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00A859" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <Text style={styles.title}>¡Hola, {userData?.email || 'Cliente'}!</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={handleChat} style={styles.iconButton}>
            <Icon name="chat" size={28} color="#2196F3" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleProfile} style={styles.iconButton}>
            <Icon name="person" size={28} color="#00A859" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Icon name="logout" size={28} color="#D32F2F" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.points}>Tienes {userData?.points ?? 0} puntos</Text>

      {/* Botón para mostrar/ocultar historial */}
      <TouchableOpacity onPress={toggleHistory} style={styles.historyToggle}>
        <Text style={styles.historyToggleText}>
          {showHistory ? 'Ocultar historial' : 'Mostrar historial de canjes'}
        </Text>
        <Icon name={showHistory ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#00A859" />
      </TouchableOpacity>

      {/* Historial de canjes */}
      {showHistory && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            <Icon name="history" size={20} color="#333333" /> Historial de Canjes
          </Text>
          {purchaseHistory.length === 0 ? (
            <Text style={styles.emptyText}>No hay registros de canjes</Text>
          ) : (
            <FlatList
              data={purchaseHistory}
              keyExtractor={(item) => item.id}
              renderItem={renderHistoryItem}
              scrollEnabled={false}
              contentContainerStyle={styles.historyList}
            />
          )}
        </View>
      )}

      {/* Catálogo */}
      <View style={styles.catalogSection}>
        <Text style={styles.sectionTitle}>
          <Icon name="store" size={20} color="#333333" /> Catálogo
        </Text>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.catalogList}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay productos disponibles</Text>}
        />
      </View>

      {/* Carrito */}
      <View style={styles.cartSection}>
        <Text style={styles.sectionTitle}>
          <Icon name="shopping-cart" size={20} color="#333333" /> Carrito
        </Text>
        {cart.length === 0 ? (
          <Text style={styles.emptyText}>Tu carrito está vacío</Text>
        ) : (
          <>
            <FlatList
              data={cart}
              keyExtractor={(item) => item.id}
              renderItem={renderCartItem}
              contentContainerStyle={styles.cartList}
            />
            <Text style={styles.cartTotal}>
              Total: {cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} puntos
            </Text>
            <TouchableOpacity style={styles.redeemButton} onPress={handleRedeemCart}>
              <Text style={styles.redeemButtonText}>Canjear</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#00A859',
    fontFamily: 'Roboto',
  },
  points: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333333',
    fontFamily: 'Roboto',
    fontWeight: '500',
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 15,
    elevation: 1,
  },
  historyToggleText: {
    fontSize: 16,
    color: '#00A859',
    fontWeight: '600',
    marginRight: 5,
  },
  historySection: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
  },
  historyList: {
    paddingBottom: 10,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 5,
  },
  historyItems: {
    marginLeft: 10,
    marginBottom: 5,
  },
  historyProduct: {
    fontSize: 14,
    color: '#666666',
    marginVertical: 2,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00A859',
    textAlign: 'right',
    marginTop: 5,
  },
  catalogSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 10,
    fontFamily: 'Roboto',
  },
  catalogList: {
    paddingVertical: 10,
  },
  productContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: 70,
    height: 70,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    fontFamily: 'Roboto',
  },
  productPrice: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Roboto',
  },
  productCategory: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Roboto',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    elevation: 2,
  },
  addButtonText: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  cartSection: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 20,
    elevation: 2,
  },
  cartList: {
    paddingBottom: 10,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cartItemName: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    fontFamily: 'Roboto',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityText: {
    fontSize: 16,
    color: '#333333',
    fontFamily: 'Roboto',
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'Roboto',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'right',
    marginTop: 10,
    fontFamily: 'Roboto',
  },
  redeemButton: {
    backgroundColor: '#00A859',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  redeemButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 10,
    fontFamily: 'Roboto',
  },
});