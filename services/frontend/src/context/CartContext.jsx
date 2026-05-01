import { createContext, useContext, useState, useMemo } from 'react';
import * as cartLib from '../cart';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => cartLib.load());

  const add = (product) => {
    const updated = cartLib.add(cart, {
      productId: product.id,
      quantity: 1,
      price: product.price,
      name: product.name,
      image: product.image,
    });
    setCart(updated);
    cartLib.save(updated);
  };

  const remove = (productId) => {
    const updated = cartLib.remove(cart, productId);
    setCart(updated);
    cartLib.save(updated);
  };

  const clear = () => {
    const cleared = cartLib.clear();
    setCart(cleared);
  };

  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

  return (
    <CartContext.Provider value={{ cart, add, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
