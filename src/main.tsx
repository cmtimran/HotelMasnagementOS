import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { NavigationProvider } from './context/NavigationContext.tsx'
import { ToastProvider } from './context/ToastContext.tsx'
import { PropertyProvider } from './context/PropertyContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider>
      <ToastProvider>
        <PropertyProvider>
          <App />
        </PropertyProvider>
      </ToastProvider>
    </NavigationProvider>
  </StrictMode>,
)

