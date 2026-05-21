const productBaseUrl = import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:8000';
const orderBaseUrl = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:3000';

async function requestJson(url, options = {}) {
  const { signal, ...rest } = options;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(rest.headers || {}),
    },
    signal,
    ...rest,
  });

  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = body?.error || body?.detail || body || 'Request failed';
    throw new Error(message);
  }

  return body;
}

export function getProducts(signal, filters = {}) {
  const query = new URLSearchParams();
  if (filters.sellerEmail) query.set('seller_email', filters.sellerEmail);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return requestJson(`${productBaseUrl}/products${suffix}`, { signal });
}

export function getSellerProducts(sellerEmail, signal) {
  return getProducts(signal, { sellerEmail });
}

export function createProduct(payload) {
  return requestJson(`${productBaseUrl}/products`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProduct(productId, payload) {
  return requestJson(`${productBaseUrl}/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(productId) {
  return requestJson(`${productBaseUrl}/products/${productId}`, {
    method: 'DELETE',
  });
}

export function getOrders(userEmail = null) {
  const url = userEmail ? `${orderBaseUrl}/orders?user_email=${encodeURIComponent(userEmail)}` : `${orderBaseUrl}/orders`;
  return requestJson(url);
}

export function createOrder(payload) {
  return requestJson(`${orderBaseUrl}/orders`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
