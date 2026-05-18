import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthProvider } from '@/lib/auth';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';
import { RequireAdmin } from '@/components/RequireAdmin';
import { Home } from '@/pages/Home';
import { Catalog } from '@/pages/Catalog';
import { ProductDetail } from '@/pages/ProductDetail';
import { Quotes } from '@/pages/Quotes';
import { Contact } from '@/pages/Contact';
import { AdminLogin } from '@/pages/admin/AdminLogin';
import { AdminLayout } from '@/pages/admin/AdminLayout';
import { AdminHome } from '@/pages/admin/AdminHome';

// Cliente único — cache extendida para que el catálogo no se vuelva a pedir
// constantemente. Productos cambian con poca frecuencia (semanas).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:                1,
      refetchOnWindowFocus: false,
      staleTime:            1000 * 60 * 30, // 30 min sin refetch automático
      gcTime:               1000 * 60 * 60, // 1 h en memoria tras unmount
    },
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ScrollToTop />
          <AppShell />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/**
 * Shell de la aplicación. Oculta Header/Footer públicos en las rutas /admin/*
 * para que el admin tenga su propio sub-header (AdminLayout) sin ruido.
 */
function AppShell() {
  const { pathname } = useLocation();
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <div className="flex min-h-full flex-col bg-ink">
      {!isAdmin && <Header />}
      <div className="flex-1">
        <Routes>
          {/* Públicas */}
          <Route path="/"               element={<Home          />} />
          <Route path="/catalogo"       element={<Catalog       />} />
          <Route path="/catalogo/:slug" element={<ProductDetail />} />
          <Route path="/cotizaciones"   element={<Quotes        />} />
          <Route path="/contacto"       element={<Contact       />} />

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminHome />} />
              {/* Sprints A2-A8 agregarán: cotizaciones, productos, slides, etc. */}
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
      {!isAdmin && <Footer />}
    </div>
  );
}
