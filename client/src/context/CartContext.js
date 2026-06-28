import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = useCallback((product) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...product, type: product.type || "product", quantity: 1 }];
    });
  }, []);

  const addSubscriptionToCart = useCallback((subscription) => {
    setItems((current) => [...current, { ...subscription, type: "subscription", quantity: 1 }]);
  }, []);

  const addRefillToCart = useCallback((refill) => {
    setItems((current) => [...current, { ...refill, type: "refill" }]);
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    setItems((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (item.type === "refill" ? Number(item.price || 0) : Number(item.price || 0) * item.quantity),
        0
      ),
    [items]
  );

  const value = useMemo(
    () => ({ items, addToCart, addSubscriptionToCart, addRefillToCart, updateQuantity, clearCart, total }),
    [addRefillToCart, addSubscriptionToCart, addToCart, clearCart, items, total, updateQuantity]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
