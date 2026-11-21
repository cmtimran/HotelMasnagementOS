import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'devnotation/style.css'
import App from './App.tsx'
import { NavigationProvider } from './context/NavigationContext.tsx'
import { ToastProvider } from './context/ToastContext.tsx'
import { PropertyProvider } from './context/PropertyContext.tsx'
import { PortalProvider } from './context/PortalContext.tsx'
import { ConfirmModalProvider } from './context/ConfirmModalContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavigationProvider>
      <ToastProvider>
        <PropertyProvider>
          <PortalProvider>
            <ConfirmModalProvider>
              <App />
            </ConfirmModalProvider>
          </PortalProvider>
        </PropertyProvider>
      </ToastProvider>
    </NavigationProvider>
  </StrictMode>,
)
