import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, Outlet, NavLink } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';

// --- CONFIGURAÇÕES ---
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 Minutos para considerar Offline

/**
 * Componente Layout - Contém a estrutura principal da aplicação (Sidebar + Header)
 * Gerencia o estado de setores, configurações e a estrutura visual.
 */
const Layout = ({ beacons, sectors, setSectors, settings, setSettings, connectionStatus }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [tick, setTick] = useState(0);

    // Inicializa logs e carrega dados do localStorage
    useEffect(() => {
        const savedSectors = localStorage.getItem('alcateia_sectors');
        if (savedSectors) { 
            setSectors(JSON.parse(savedSectors)); 
        } else { 
            setSectors([{ id: 1, name: 'Câmara Fria A', macs: [] }, { id: 2, name: 'Transporte 01', macs: [] }]); 
        }

        const savedSettings = localStorage.getItem('alcateia_settings');
        if (savedSettings) { 
            setSettings(JSON.parse(savedSettings)); 
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Função auxiliar para calcular status online/offline
    const getStatus = (lastSeenDate) => {
        if (!lastSeenDate) return 'offline';
        const diff = Date.now() - new Date(lastSeenDate).getTime();
        return diff < OFFLINE_THRESHOLD_MS ? 'online' : 'offline';
    };

    // Timer visual para atualizar status online/offline
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 2000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('alcateia_auth');
        navigate('/login');
    };

    // Determina o título e breadcrumb baseado na rota atual
    const pageInfo = useMemo(() => {
        const path = location.pathname;
        const pathMap = {
            '/dashboard': { title: 'Visão Geral da Operação', breadcrumb: 'Dashboard' },
            '/reports': { title: 'Análise de Dados', breadcrumb: 'Relatórios' },
            '/gateways': { title: 'Gateways', breadcrumb: 'Gateways' },
            '/config': { title: 'Gerenciamento de Setores', breadcrumb: 'Configuração' },
        };
        if (path.startsWith('/sensor/')) return { title: 'Detalhes do Dispositivo', breadcrumb: 'Detalhes do Sensor' };
        return pathMap[path] || { title: 'Dashboard', breadcrumb: 'Dashboard' };
    }, [location.pathname]);


    return (
        <div className="layout-shell">
            {/* --- SIDEBAR PANEL --- */}
            <div className="sidebar-panel" style={{ width: '260px', minWidth: '260px' }}>
                <div className="p-3 flex align-items-center gap-3 border-bottom-1 border-gray-100">
                    <Avatar label="A" shape="circle" className="bg-indigo-600 text-white font-bold w-2.5rem h-2.5rem shadow-sm" />
                    <div>
                        <span className="text-base font-extrabold text-slate-800 tracking-tight block">Alcate-IA <b>Cold Chain</b></span>
                    </div>
                </div>

                <div className="flex-grow-1 overflow-y-auto py-3 custom-scrollbar">
                    <div className="text-label px-4 mb-2 mt-2">Monitoramento</div>
                    <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <i className="pi pi-th-large"></i>
                        <span>Visão Geral</span>
                    </NavLink>
                    <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <i className="pi pi-chart-line"></i>
                        <span>Relatórios</span>
                    </NavLink>
                    <NavLink to="/gateways" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <i className="pi pi-server"></i>
                        <span>Gateways</span>
                    </NavLink>

                    <div className="text-label px-4 mb-2 mt-5">Gerenciamento</div>
                    <NavLink to="/config" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <i className="pi pi-cog"></i>
                        <span>Setores</span>
                    </NavLink>
                    
                    <div className="text-label px-4 mb-2 mt-5">Dispositivos ({beacons.length})</div>
                    {beacons.map(b => {
                        const isOnline = getStatus(b.lastSeen) === 'online';
                        return (
                            <Link 
                                key={b.mac} 
                                to={`/sensor/${b.mac}`}
                                className={`nav-item ${location.pathname === `/sensor/${b.mac}` ? 'active' : ''}`}
                            >
                                <i className="pi pi-box text-xs"></i>
                                <span className="text-xs font-medium flex-1 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                                    {b.display_name || (b.mac ? b.mac.slice(-5) : 'Unknown')}
                                </span>
                                <div className={`w-2 h-2 border-circle ml-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isOnline ? `Online - Visto por último: ${new Date(b.lastSeen).toLocaleString('pt-BR')}` : `Offline - Visto por último: ${b.lastSeen ? new Date(b.lastSeen).toLocaleString('pt-BR') : 'Nunca'}`}></div>
                                {b.temp > settings.tempCritical && <i className="pi pi-exclamation-triangle text-rose-500 text-xs ml-1 animate-pulse"></i>}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-3 mt-auto border-top-1 border-gray-100 bg-gray-50">
                    <div className="flex align-items-center justify-content-between">
                        <button onClick={handleLogout} title="Sair" className="p-0 border-none bg-transparent cursor-pointer" aria-label="Sair">
                            <i className="pi pi-sign-out text-slate-400 hover:text-slate-600"></i>
                        </button>
                        <span className="text-[10px] text-slate-400 font-mono">v2.3.0</span>
                    </div>
                </div>
            </div>

            {/* --- CONTENT PANEL --- */}
            <div className="content-panel">
                <div className="h-4rem flex align-items-center justify-content-between px-4 border-bottom-1 border-gray-100 bg-white">
                    <div>
                        <div className="flex align-items-center gap-2 text-slate-400 text-xs font-medium mb-1">
                            <span>Alcate-IA</span>
                            <i className="pi pi-angle-right text-[10px]"></i>
                            <span className="text-slate-600">{pageInfo.breadcrumb}</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">{pageInfo.title}</h2>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 border-round">{new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="flex-grow-1 p-4 overflow-y-auto bg-slate-50/50">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;
