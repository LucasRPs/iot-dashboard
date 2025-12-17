import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';
import SettingsModal from './SettingsModal';
import { saveLogs } from '../utils/storage';

// --- CONFIGURAÇÕES ---
const N8N_API_URL = 'https://n8n.alcateia-ia.com/webhook/sensors'; 
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 Minutos para considerar Offline

/**
 * Componente Layout - Contém a estrutura principal da aplicação (Sidebar + Header)
 * Gerencia o estado global dos beacons, setores, configurações e logs
 */
const Layout = ({ beacons, setBeacons, sectors, setSectors, settings, setSettings, messageLog, setMessageLog, historyRef, chartOptions, onUpdateSensor }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const logsInitializedRef = useRef(false);
    const [connectionStatus, setConnectionStatus] = useState('Conectando...');
    const [showSettings, setShowSettings] = useState(false);
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

        logsInitializedRef.current = true;
    }, [setSectors, setSettings]);

    // Persiste logs no localStorage
    useEffect(() => {
        if (!logsInitializedRef.current) return;
        saveLogs(messageLog);
    }, [messageLog]);

    // Função auxiliar para calcular status online/offline
    const getStatus = useCallback((lastSeenDate) => {
        if (!lastSeenDate) return 'offline';
        const now = new Date();
        const diff = now.getTime() - new Date(lastSeenDate).getTime();
        return diff < OFFLINE_THRESHOLD_MS ? 'online' : 'offline';
    }, []);

    // Fetch de dados da API N8N
    const fetchData = useCallback(async () => {
        try {
            const response = await fetch(N8N_API_URL);
            if (!response.ok) throw new Error('Erro na resposta da API');
            
            const data = await response.json();
            const sensorList = Array.isArray(data) ? data : (data.data || []);

            if (sensorList.length > 0) {
                const formattedBeacons = sensorList.map(s => {
                    const temp = Number(s.current_temp ?? s.temp ?? 0);
                    const hum = Number(s.current_hum ?? s.hum ?? 0);
                    const batt = Number(s.battery_level ?? s.batt ?? 0);
                    const rssi = Number(s.rssi ?? 0);
                    const ts = s.last_seen || s.ts || new Date().toISOString();
                    const lastSeenDate = new Date(ts);
                    const timeLabel = lastSeenDate.toLocaleTimeString('pt-BR');

                    // Histórico para Gráficos
                    if (!historyRef.current[s.mac]) { 
                        historyRef.current[s.mac] = { labels: [], tempData: [], humData: [], battData: [] }; 
                    }
                    const hist = historyRef.current[s.mac];
                    
                    const lastLabel = hist.labels[hist.labels.length - 1];
                    if (lastLabel !== timeLabel) {
                        if (hist.labels.length > 30) { 
                            hist.labels.shift(); 
                            hist.tempData.shift(); 
                            hist.humData.shift(); 
                            hist.battData.shift(); 
                        }
                        hist.labels.push(timeLabel);
                        hist.tempData.push(temp);
                        hist.humData.push(hum);
                        hist.battData.push(batt);
                    }

                    return {
                        mac: s.mac,
                        device_name: s.name || s.device_name || `Sensor ${s.mac}`,
                        temp: temp,
                        hum: hum,
                        batt: batt,
                        rssi: rssi,
                        ts: ts,
                        lastSeen: lastSeenDate,
                        gateway: s.gateway || s.gw,
                        sector: s.sector
                    };
                });

                setBeacons(formattedBeacons);
                
                // Calcula status geral
                const onlineCount = formattedBeacons.filter(b => getStatus(b.lastSeen) === 'online').length;
                setConnectionStatus(`Online (${onlineCount}/${formattedBeacons.length})`);

                // Log
                const newLogs = formattedBeacons.map(b => ({
                    ...b,
                    timestamp: b.lastSeen.toLocaleTimeString('pt-BR'),
                    id: `${b.mac}_${b.lastSeen.getTime()}`
                }));

                setMessageLog(prev => {
                    const uniqueNewLogs = newLogs.filter(n => !prev.some(p => p.id === n.id));
                    if (uniqueNewLogs.length === 0) return prev;
                    return [...uniqueNewLogs, ...prev].slice(0, 200);
                });
            } else {
                setConnectionStatus('Sem Sensores');
            }

        } catch (error) {
            console.error("Erro no fetch:", error);
            setConnectionStatus('Offline / Erro API');
        }
    }, [setBeacons, setMessageLog, getStatus, historyRef]);

    // Polling de dados
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); 
        return () => clearInterval(interval);
    }, [fetchData]);

    // Timer visual para atualizar status online/offline
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 2000);
        return () => clearInterval(interval);
    }, []);

    const handleSaveSectors = (newSectors) => {
        setSectors(newSectors);
        localStorage.setItem('alcateia_sectors', JSON.stringify(newSectors));
    };

    const handleSaveSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('alcateia_settings', JSON.stringify(newSettings));
    };

    const handleLogout = () => {
        localStorage.removeItem('alcateia_auth');
        navigate('/login');
    };

    // Determina o título e breadcrumb baseado na rota atual
    const getPageInfo = () => {
        const path = location.pathname;
        if (path === '/dashboard') return { title: 'Visão Geral da Operação', breadcrumb: 'Dashboard' };
        if (path === '/reports') return { title: 'Análise de Dados', breadcrumb: 'Relatórios' };
        if (path === '/gateways') return { title: 'Gateways', breadcrumb: 'Gateways' };
        if (path === '/config') return { title: 'Gerenciamento de Setores', breadcrumb: 'Configuração' };
        if (path.startsWith('/sensor/')) return { title: 'Detalhes do Dispositivo', breadcrumb: 'Detalhes do Sensor' };
        return { title: 'Dashboard', breadcrumb: 'Dashboard' };
    };

    const pageInfo = getPageInfo();
    const isActive = (path) => location.pathname === path || (path === '/dashboard' && location.pathname === '/');

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
                    <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                        <i className="pi pi-th-large"></i>
                        <span>Visão Geral</span>
                    </Link>
                    <Link to="/reports" className={`nav-item ${isActive('/reports') ? 'active' : ''}`}>
                        <i className="pi pi-chart-line"></i>
                        <span>Relatórios</span>
                    </Link>
                    <Link to="/gateways" className={`nav-item ${isActive('/gateways') ? 'active' : ''}`}>
                        <i className="pi pi-server"></i>
                        <span>Gateways</span>
                    </Link>

                    <div className="text-label px-4 mb-2 mt-5">Gerenciamento</div>
                    <Link to="/config" className={`nav-item ${isActive('/config') ? 'active' : ''}`}>
                        <i className="pi pi-cog"></i>
                        <span>Setores</span>
                    </Link>
                    <div className="nav-item" onClick={() => setShowSettings(true)}>
                        <i className="pi pi-cog"></i>
                        <span>Configurações</span>
                    </div>
                    
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
                                    {b.device_name || b.mac.slice(-5)}
                                </span>
                                <div className={`w-2 h-2 border-circle ml-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                                {b.temp > settings.tempCritical && <i className="pi pi-exclamation-triangle text-rose-500 text-xs ml-1 animate-pulse"></i>}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-3 mt-auto border-top-1 border-gray-100 bg-gray-50">
                    <div className="flex align-items-center justify-content-between">
                        <div className="flex align-items-center gap-2">
                            <div className={`w-2 h-2 border-circle ${connectionStatus.includes('Online') ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            <span className="text-xs font-bold text-slate-600">{connectionStatus}</span>
                        </div>
                        <div className="flex align-items-center gap-2">
                            <span className="text-[10px] text-slate-400 font-mono">v2.3.0</span>
                            <i className="pi pi-sign-out text-slate-400 cursor-pointer hover:text-slate-600" onClick={handleLogout} title="Sair"></i>
                        </div>
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

            <SettingsModal visible={showSettings} onHide={() => setShowSettings(false)} settings={settings} onSave={handleSaveSettings} />
        </div>
    );
};

export default Layout;

