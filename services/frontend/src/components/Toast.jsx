import { useEffect, useState } from 'react';
import * as toastLib from '../toast';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = toastLib.subscribe(setToasts);
    return () => unsubscribe();
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <div className="toast-icon">
            {t.type === 'success' && <CheckCircle size={20} />}
            {t.type === 'error' && <AlertCircle size={20} />}
            {t.type === 'info' && <Info size={20} />}
          </div>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
