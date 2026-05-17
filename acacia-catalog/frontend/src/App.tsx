import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';
import { Home } from '@/pages/Home';
import { Catalog } from '@/pages/Catalog';
import { ProductDetail } from '@/pages/ProductDetail';
import { Quotes } from '@/pages/Quotes';
import { Contact } from '@/pages/Contact';

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
    <QueryClientProvider client={queryClient}>
      <ScrollToTop />
      <div className="flex min-h-full flex-col bg-ink">
        <Header />
        <div className="flex-1">
          <Routes>
            <Route path="/"               element={<Home          />} />
            <Route path="/catalogo"       element={<Catalog       />} />
            <Route path="/catalogo/:slug" element={<ProductDetail />} />
            <Route path="/cotizaciones"   element={<Quotes        />} />
            <Route path="/contacto"       element={<Contact       />} />
            <Route path="*"               element={<Home          />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </QueryClientProvider>
  );
}
