import { Navigate } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { keycloak } = useKeycloak();

  const isAdmin = keycloak.tokenParsed?.realm_access?.roles?.includes('admin') || false;

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
