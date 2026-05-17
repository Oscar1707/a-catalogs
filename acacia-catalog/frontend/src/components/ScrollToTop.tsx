import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router 6 mantiene la posición de scroll al cambiar de ruta.
 * Este componente lo resetea al tope en cada navegación.
 *
 * Excepción: si la URL trae un hash (#seccion), no resetea para no
 * romper los anchor links.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // dejar que el navegador maneje el anchor
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}
