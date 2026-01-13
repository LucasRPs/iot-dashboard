import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Header = ({ onLogout }) => {
    const location = useLocation();

    const pageInfo = useMemo(() => {
        const path = location.pathname;
        const pathMap = {
            '/dashboard': { title: 'Visão Geral', breadcrumb: 'Dashboard' },
            '/reports': { title: 'Relatórios e Análises', breadcrumb: 'Relatórios' },
            '/gateways': { title: 'Gateways Conectados', breadcrumb: 'Gateways' },
            '/config': { title: 'Configuração de Setores', breadcrumb: 'Configuração' },
        };
        if (path.startsWith('/sensor/')) {
            return { title: 'Detalhes do Dispositivo', breadcrumb: 'Detalhes do Sensor' };
        }
        return pathMap[path] || { title: 'Dashboard', breadcrumb: 'Dashboard' };
    }, [location.pathname]);

    return (
        <div className="header-panel">
            <div>
                <div className="breadcrumb">
                    <span>Alcate-IA</span>
                    <i className="pi pi-angle-right text-xs"></i>
                    <span className="font-semibold">{pageInfo.breadcrumb}</span>
                </div>
                <h1 className="page-title">{pageInfo.title}</h1>
            </div>
            <div className="flex align-items-center gap-3">
                <button onClick={onLogout} title="Sair" className="logout-button" aria-label="Sair">
                    <i className="pi pi-sign-out"></i>
                </button>
            </div>
        </div>
    );
};

export default Header;