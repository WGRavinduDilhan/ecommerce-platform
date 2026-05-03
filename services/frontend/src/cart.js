const CART_KEY = 'cart_v1';

export function load() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '{"items":[]}');
  } catch {
    return { items: [] };
  }
}

export function save(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function add(cart, { productId, quantity = 1, price = 0, name = '', image = null }) {
  const items = [...cart.items];
  const idx = items.findIndex((i) => String(i.productId) === String(productId));
  if (idx >= 0) {
    items[idx].quantity = Number(items[idx].quantity) + Number(quantity);
  } else {
    items.push({ productId: String(productId), quantity: Number(quantity), price, name, image });
  }
  return { items };
}

export function remove(cart, productId) {
  const items = cart.items.filter((i) => String(i.productId) !== String(productId));
  return { items };
}

export function clear() {
  const cart = { items: [] };
  save(cart);
  return cart;
}
