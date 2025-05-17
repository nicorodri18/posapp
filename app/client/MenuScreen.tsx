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
  const [activeSection, setActiveSection] = useState('catalog'); // Track the active section
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
    setActiveSection('profile');
    router.push('/profile');
  };

  const handleChat = () => {
    setActiveSection('chat'); // Updated to use 'chat' for the wrench icon
    router.push('/chat');
  };

  const handleHome = () => {
    setActiveSection('home');
    router.push('/client/MenuScreen');
  };

  const handleCatalog = () => {
    setActiveSection('catalog');
    // Already on MenuScreen, no navigation needed
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productContainer}>
      <View style={styles.productHeader}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPoints}>{item.price} pts</Text>
      </View>
      {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.productImage} />}
      <TouchableOpacity 
        style={[
          styles.addButton,
          (!userData || userData.points < item.price) && styles.disabledButton
        ]} 
        onPress={() => handleAddToCart(item)}
        disabled={!userData || userData.points < item.price}
      >
        <Text style={styles.addButtonText}>Canjear</Text>
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
      <Text style={styles.historyTotal}>Total: {item.total} pts</Text>
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>CATALOG</Text>
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

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsLabel}>Points</Text>
          <Text style={styles.pointsValue}>{userData?.points ?? 0}</Text>
          <Text style={styles.pointsLabel}>Available</Text>
          <Text style={styles.expiryText}>Expire on</Text>
          <Text style={styles.expiryDate}>25/May/2026</Text>
        </View>

        {/* Products */}
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productsRow}
          contentContainerStyle={styles.productsList}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Productos Disponibles</Text>}
        />

        {/* History Toggle */}
        <TouchableOpacity onPress={toggleHistory} style={styles.historyToggle}>
          <Text style={styles.historyToggleText}>
            {showHistory ? 'Ocultar historial' : 'Mostrar historial de canjes'}
          </Text>
          <Icon name={showHistory ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color="#00A859" />
        </TouchableOpacity>

        {/* Purchase History */}
        {showHistory && (
          <View style={styles.historySection}>
            {purchaseHistory.length === 0 ? (
              <Text style={styles.emptyText}>No hay registros de canjes</Text>
            ) : (
              <FlatList
                data={purchaseHistory}
                keyExtractor={(item) => item.id}
                renderItem={renderHistoryItem}
                scrollEnabled={false}
              />
            )}
          </View>
        )}

        {/* Shopping Cart */}
        <View style={styles.cartSection}>
          <Text style={styles.sectionTitle}>Carrito</Text>
          {cart.length === 0 ? (
            <Text style={styles.emptyText}>Tu carrito está vacío</Text>
          ) : (
            <>
              <FlatList
                data={cart}
                keyExtractor={(item) => item.id}
                renderItem={renderCartItem}
                scrollEnabled={false}
              />
              <Text style={styles.cartTotal}>
                Total: {cart.reduce((sum, item) => sum + item.price * item.quantity, 0)} pts
              </Text>
              <TouchableOpacity style={styles.redeemButton} onPress={handleRedeemCart}>
                <Text style={styles.redeemButtonText}>Canjear</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[
            styles.navButton,
            activeSection === 'catalog' && styles.navButtonActive,
          ]}
          onPress={handleCatalog}
        >
          <Icon
            name="attach-money"
            size={28}
            color={activeSection === 'catalog' ? '#fff' : '#666'}
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
            activeSection === 'chat' && styles.navButtonActive, // Updated to 'chat'
          ]}
          onPress={handleChat} // Reused handleChat
        >
          <Icon
            name="build"
            size={28}
            color={activeSection === 'chat' ? '#fff' : '#666'} // Updated to 'chat'
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
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 80, // Space for the bottom navigation bar
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
  },
  pointsCard: {
    backgroundColor: '#fff',
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
  pointsLabel: {
    fontSize: 16,
    color: '#666',
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00A859',
    marginVertical: 10,
  },
  expiryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  expiryDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 15,
    marginTop: 20,
    marginBottom: 10,
  },
  productsList: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  productsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  productContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '48%',
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  productPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00A859',
    marginLeft: 10,
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 5,
    marginBottom: 15,
    resizeMode: 'cover',
  },
  addButton: {
    backgroundColor: '#00A859',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  historyToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  historyToggleText: {
    fontSize: 16,
    color: '#00A859',
    marginRight: 5,
  },
  historySection: {
    backgroundColor: '#fff',
    padding: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 20,
  },
  historyItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  historyDate: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  historyItems: {
    marginBottom: 5,
  },
  historyProduct: {
    color: '#666',
  },
  historyTotal: {
    fontWeight: 'bold',
    color: '#00A859',
    textAlign: 'right',
  },
  cartSection: {
    backgroundColor: '#fff',
    padding: 15,
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartItemName: {
    flex: 2,
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  quantityText: {
    marginHorizontal: 10,
    color: '#333',
  },
  cartItemPrice: {
    flex: 1,
    textAlign: 'right',
    color: '#333',
  },
  cartTotal: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    marginTop: 10,
  },
  redeemButton: {
    backgroundColor: '#00A859',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  redeemButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
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