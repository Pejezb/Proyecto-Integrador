import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useRealtime } from '../../hooks/useRealtime';
import { useUiStore } from '../../store/uiStore';
import { useEffect } from 'react';

const pageTitles: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/mesas':        'Gestión de Mesas',
  '/pedidos':      'Pedidos',
  '/pedidos/nuevo':'Nuevo Pedido',
  '/cocina':       'Vista Cocina',
  '/menu':         'Gestión de Menú',
  '/inventario':   'Inventario',
  '/reportes':     'Reportes',
  '/caja':         'Registro de Pago',
  '/usuarios':     'Usuarios y Roles',
  '/configuracion':'Configuración',
  '/perfil':       'Mi Perfil',
  '/notificaciones':'Notificaciones',
};

export function AuthLayout() {
  const location  = useLocation();
  const title     = pageTitles[location.pathname] ?? 'RestaurantOS';
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  useRealtime();

  // En móvil, cerrar sidebar al cambiar de página
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  // En desktop, abrir sidebar por defecto al montar
  useEffect(() => {
    if (window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      {/* Spacer que empuja el contenido cuando el sidebar está abierto */}
      <div
        className={`flex-shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0'}`}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
