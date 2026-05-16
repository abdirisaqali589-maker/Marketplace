import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgb(var(--color-gray-800))',
              color: 'rgb(var(--color-gray-100))',
              transition: 'background-color 0.3s ease, color 0.3s ease',
            },
            success: {
              iconTheme: {
                primary: 'rgb(var(--color-accent-600))',
                secondary: 'rgb(var(--color-gray-900))',
              },
            },
            error: {
              iconTheme: {
                primary: 'rgb(var(--color-danger))',
                secondary: 'rgb(var(--color-gray-900))',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
