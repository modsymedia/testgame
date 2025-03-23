import React, { useState, createContext, useContext } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Create a function that we can use outside of React components
let addToastFunc: ((toast: Omit<Toast, 'id'>) => void) | undefined;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    
    // Auto-dismiss toast after specified duration
    if (newToast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration || 5000);
    }
  };
  
  const removeToast = (id: string) => {
    setToasts(toasts => toasts.filter(toast => toast.id !== id));
  };
  
  // Store the addToast function for external use
  addToastFunc = addToast;
  
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}

// Helper for simple toast usage
export const toast = (props: Omit<Toast, 'id'>) => {
  if (addToastFunc) {
    addToastFunc(props);
  } else {
    console.warn('Toast was called before ToastProvider was initialized');
  }
};

// Add variant methods for convenience
toast.default = (props: Omit<Toast, 'id' | 'variant'>) => 
  toast({ ...props, variant: 'default' });

toast.success = (props: Omit<Toast, 'id' | 'variant'>) => 
  toast({ ...props, variant: 'success' });

toast.destructive = (props: Omit<Toast, 'id' | 'variant'>) => 
  toast({ ...props, variant: 'destructive' });

export function Toaster() {
  const { toasts, removeToast } = useToast();
  
  return (
    <div className="fixed bottom-0 right-0 p-4 max-w-md w-full flex flex-col space-y-2 pointer-events-none z-50">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`
            rounded-lg shadow-lg p-4 pointer-events-auto transform transition-all duration-300 ease-in-out
            ${toast.variant === 'destructive' 
              ? 'bg-red-100 dark:bg-red-900' 
              : toast.variant === 'success'
                ? 'bg-green-100 dark:bg-green-900'
                : 'bg-white dark:bg-gray-800'
            }
          `}
          style={{ 
            opacity: 1, 
            transform: 'translateY(0)',
            animation: 'slideUp 0.3s, fadeIn 0.3s' 
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`text-sm font-medium ${
                toast.variant === 'destructive' 
                  ? 'text-red-800 dark:text-red-200' 
                  : toast.variant === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-gray-900 dark:text-gray-100'
              }`}>
                {toast.title}
              </h3>
              
              {toast.description && (
                <p className={`mt-1 text-sm ${
                  toast.variant === 'destructive' 
                    ? 'text-red-700 dark:text-red-300' 
                    : toast.variant === 'success'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {toast.description}
                </p>
              )}
            </div>
            
            <button
              type="button"
              className="ml-4 inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={() => removeToast(toast.id)}
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 