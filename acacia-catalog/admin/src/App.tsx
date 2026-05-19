import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { RequireAuth } from '@/components/RequireAuth';
import { Login } from '@/pages/Login';
import { Layout } from '@/pages/Layout';
import { Home } from '@/pages/Home';

// Cliente para futuras queries (cotizaciones, productos, slides...).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:                1,
      refetchOnWindowFocus: false,
      staleTime:            1000 * 30, // 30s — datos admin cambian más seguido
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          {/* Pública: login */}
          <Route path="/login" element={<Login />} />

          {/* Privadas: todo lo demás vive bajo Layout */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              {/* Sprints A2-A8:
                  <Route path="cotizaciones" element={<Cotizaciones />} />
                  <Route path="productos"    element={<Productos    />} />
                  <Route path="slides"       element={<Slides       />} />
              */}
            </Route>
          </Route>

          {/* Catch-all → home (RequireAuth se encarga si no hay sesión) */}
          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
