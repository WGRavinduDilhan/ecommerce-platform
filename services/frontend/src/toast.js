let toastStack = [];
let toastId = 0;

const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((fn) => fn([...toastStack]));
}

export function success(message, duration = 4000) {
  const id = toastId++;
  const toast = { id, type: 'success', message, duration };
  toastStack.push(toast);
  notify();

  if (duration > 0) {
    setTimeout(() => remove(id), duration);
  }

  return id;
}

export function error(message, duration = 5000) {
  const id = toastId++;
  const toast = { id, type: 'error', message, duration };
  toastStack.push(toast);
  notify();

  if (duration > 0) {
    setTimeout(() => remove(id), duration);
  }

  return id;
}

export function info(message, duration = 4000) {
  const id = toastId++;
  const toast = { id, type: 'info', message, duration };
  toastStack.push(toast);
  notify();

  if (duration > 0) {
    setTimeout(() => remove(id), duration);
  }

  return id;
}

export function remove(id) {
  toastStack = toastStack.filter((t) => t.id !== id);
  notify();
}

export function clear() {
  toastStack = [];
  notify();
}
