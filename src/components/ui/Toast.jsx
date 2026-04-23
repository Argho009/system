import React from 'react';
import { Toaster, toast as rhtToast } from 'react-hot-toast';

export const ToastProvider = () => {
  return (
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#334155',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          borderRadius: '0.375rem',
        },
        success: {
          iconTheme: {
            primary: '#16a34a',
            secondary: '#c8eed6',
          },
        },
        error: {
          iconTheme: {
            primary: '#dc2626',
            secondary: '#fed7d7',
          },
        },
      }}
    />
  );
};

export const toast = {
  success: (msg) => rhtToast.success(msg),
  error: (msg) => rhtToast.error(msg),
  info: (msg) => rhtToast(msg),
};
