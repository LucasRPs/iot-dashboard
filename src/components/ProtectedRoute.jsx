import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Componente ProtectedRoute - Protege rotas que requerem autenticação
 * Redireciona para /login se o usuário não estiver autenticado
 */
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('alcateia_auth') === 'true';
    
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    
    return children;
};

export default ProtectedRoute;

