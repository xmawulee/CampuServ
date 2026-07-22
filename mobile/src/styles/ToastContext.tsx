/**
 * ToastContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Global toast provider. Wrap your root navigator with <ToastProvider> and
 * call `useToast()` from any screen to fire a toast without local state.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ status: 'success', title: 'Done!', subtitle: 'Profile saved.' });
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import StatusToast from '../components/StatusToast';
import { DialogStatus } from '../styles/dialogStatusStyles';

interface ToastItem {
  id: string;
  status: DialogStatus;
  title: string;
  subtitle?: string;
  duration?: number;
}

interface ToastOptions {
  status: DialogStatus;
  title: string;
  subtitle?: string;
  /** ms before auto-dismiss. 0 = persistent until manually closed. Default 4000. */
  duration?: number;
}

interface ToastContextType {
  showToast: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((opts: ToastOptions) => {
    const id = `toast-${++_counter}`;

    // Safely cast title and subtitle to strings to prevent React child render crashes
    const safeTitle = typeof opts.title === 'string' ? opts.title : JSON.stringify(opts.title);
    const safeSubtitle = typeof opts.subtitle === 'string' 
      ? opts.subtitle 
      : (opts.subtitle ? JSON.stringify(opts.subtitle) : undefined);

    setToasts((prev) => [
      // cap at 4 visible toasts at once — remove oldest if needed
      ...(prev.length >= 4 ? prev.slice(1) : prev),
      { ...opts, id, title: safeTitle, subtitle: safeSubtitle },
    ]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast stack rendered at root level, above all screens */}
      <View style={styles.stack} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <StatusToast
            key={toast.id}
            id={toast.id}
            status={toast.status}
            title={toast.title}
            subtitle={toast.subtitle}
            duration={toast.duration}
            stackIndex={index}
            onDismiss={dismiss}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  stack: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});
