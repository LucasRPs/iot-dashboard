import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Avatar } from 'primereact/avatar';
import { Button } from 'primereact/button';

// --- CSS Imports ---
import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import "./styles/global.css";

// --- Components ---
import DashboardOverview from './components/DashboardOverview';
import SectorsConfigView from './components/SectorsConfigView';
import ReportsView from './components/ReportsView';
import SensorDetailView from './components/SensorDetailView';
import GatewaysView from './components/GatewaysView';
import SettingsModal from './components/SettingsModal';
import LoginView from './components/LoginView';
import { saveLogs } from './utils/storage';

// --- CONFIGURAÇÕES ---
const N8N_API_URL = 'https://n8n.alcateia-ia.com/webhook/sensors'; 
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 Minutos para considerar Offline

// --- APP PRINCIPAL ---
function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [beacons, setBeacons] = useState([]);
    const [selectedBeacon, setSelectedBeacon] = useState(null);
    const logsInitializedRef = useRef(false);
    const [connectionStatus, setConnectionStatus] = useState('Conectando...');
    const [messageLog, setMessageLog] = useState([]);
    const [currentView, setCurrentView] = useState('dashboard');
    const [sectors, setSectors] = useState([]);
    const [tick, setTick] = useState(0); // Força re-render para atualizar status online/offline
    const historyRef = useRef({});

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        tempAlert: 35,
        tempCritical: 25,
        lowBattery: 20
    });

    // Check for existing session
    useEffect(() => {
        const session = localStorage.getItem('alcateia_auth');
        if (session === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = (username, password) => {
        if (username && password) {
            setIsAuthenticated(true);
            localStorage.setItem('alcateia_auth', 'true');
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        localStorage.removeItem('alcateia_auth');
        setCurrentView('dashboard');
        setSelectedBeacon(null);
    };

    // Load Settings & Sectors from localStorage
    useEffect(() => {
        if (!isAuthenticated) return;

        const savedSectors = localStorage.getItem('alcateia_sectors');
        if (savedSectors) { setSectors(JSON.parse(savedSectors)); }
        else { setSectors([{ id: 1, name: 'Câmara Fria A', macs: [] }, { id: 2, name: 'Transporte 01', macs: [] }]); }

        const savedSettings = localStorage.getItem('alcateia_settings');
        if (savedSettings) { setSettings(JSON.parse(savedSettings)); }

        logsInitializedRef.current = true;
    }, [isAuthenticated]);

    // Persist message logs
    useEffect(() => {
        if (!logsInitializedRef.current) return;
        saveLogs(messageLog);
    }, [messageLog]);

    const handleSaveSectors = (newSectors) => {
        setSectors(newSectors);
        localStorage.setItem('alcateia_sectors', JSON.stringify(newSectors));
    };

    const handleSaveSettings = (newSettings) => {
        setSettings(newSettings);
        localStorage.setItem('alcateia_settings', JSON.stringify(newSettings));
    };

    const handleUpdateSensor = (updatedBeacon) => {
        setBeacons(prev => prev.map(b => b.mac === updatedBeacon.mac ? updatedBeacon : b));
        if (selectedBeacon?.mac === updatedBeacon.mac) {
            setSelectedBeacon(updatedBeacon);
        }
    };

    // --- FUNÇÃO AUXILIAR DE STATUS ---
    const getStatus = useCallback((lastSeenDate) => {
        if (!lastSeenDate) return 'offline';
        const now = new Date();
        const diff = now.getTime() - new Date(lastSeenDate).getTime();
        return diff < OFFLINE_THRESHOLD_MS ? 'online' : 'offline';
    }, []);

    // --- FETCH DATA (API N8N) ---
    const fetchData = useCallback(async () => {
        if (!isAuthenticated) return;

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
                            hist.labels.shift(); hist.tempData.shift(); hist.humData.shift(); hist.battData.shift(); 
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
                        lastSeen: lastSeenDate, // Objeto Date real para cálculo
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

                if (selectedBeacon) {
                    const updatedSelected = formattedBeacons.find(b => b.mac === selectedBeacon.mac);
                    if (updatedSelected) {
                        setSelectedBeacon(prev => ({ ...prev, ...updatedSelected }));
                    }
                }
            } else {
                setConnectionStatus('Sem Sensores');
            }

        } catch (error) {
            console.error("Erro no fetch:", error);
            setConnectionStatus('Offline / Erro API');
        }
    }, [isAuthenticated, selectedBeacon, getStatus]);

    // --- POLLING ---
    useEffect(() => {
        if (!isAuthenticated) return;
        fetchData();
        const interval = setInterval(fetchData, 5000); 
        return () => clearInterval(interval);
    }, [isAuthenticated, fetchData]);

    // Timer visual (Atualiza a cada 2s para recalcular 'online/offline' visualmente sem fetch)
    useEffect(() => {
        if (!isAuthenticated) return;
        const interval = setInterval(() => setTick(t => t + 1), 2000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const chartOptions = {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { type: 'linear', display: true, position: 'left', ticks: { color: '#f97316' }, grid: { color: '#f1f5f9', borderDash: [5, 5] } },
            y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#0ea5e9' }, grid: { display: false } },
        },
        elements: { point: { radius: 0, hoverRadius: 4 } },
        animation: false
    };

    const NavItem = ({ icon, label, viewId, active, onClick }) => (
        <div className={`nav-item ${active ? 'active' : ''}`} onClick={() => {
            if (onClick) { onClick(); return; }
            setCurrentView(viewId);
            if (viewId !== 'details') setSelectedBeacon(null);
        }}>
            <i className={`pi ${icon}`}></i>
            <span>{label}</span>
        </div>
    );

    if (!isAuthenticated) {
        return <LoginView onLogin={handleLogin} />;
    }

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
                    <NavItem icon="pi-th-large" label="Visão Geral" viewId="dashboard" active={currentView === 'dashboard'} />
                    <NavItem icon="pi-chart-line" label="Relatórios" viewId="reports" active={currentView === 'reports'} />
                    <NavItem icon="pi-server" label="Gateways" viewId="gateways" active={currentView === 'gateways'} />

                    <div className="text-label px-4 mb-2 mt-5">Gerenciamento</div>
                    <NavItem icon="pi-cog" label="Setores" viewId="config" active={currentView === 'config'} />
                    <NavItem icon="pi-cog" label="Configurações" onClick={() => setShowSettings(true)} />
                    
                    <div className="text-label px-4 mb-2 mt-5">Dispositivos ({beacons.length})</div>
                    {beacons.map(b => {
                        const isOnline = getStatus(b.lastSeen) === 'online';
                        return (
                            <div key={b.mac} className={`nav-item ${selectedBeacon?.mac === b.mac && currentView === 'details' ? 'active' : ''}`}
                                onClick={() => { setSelectedBeacon(b); setCurrentView('details'); }}>
                                <i className="pi pi-box text-xs"></i>
                                <span className="text-xs font-medium flex-1 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                                    {b.device_name || b.mac.slice(-5)}
                                </span>
                                {/* Bolinha de Status Online/Offline */}
                                <div className={`w-2 h-2 border-circle ml-2 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                                {/* Alerta Crítico */}
                                {b.temp > settings.tempCritical && <i className="pi pi-exclamation-triangle text-rose-500 text-xs ml-1 animate-pulse"></i>}
                            </div>
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
                            <span className="text-slate-600">
                                {currentView === 'dashboard' && 'Dashboard'}
                                {currentView === 'reports' && 'Relatórios'}
                                {currentView === 'config' && 'Configuração'}
                                {currentView === 'details' && 'Detalhes do Sensor'}
                            </span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {currentView === 'dashboard' && 'Visão Geral da Operação'}
                            {currentView === 'reports' && 'Análise de Dados'}
                            {currentView === 'gateways' && 'Gateways'}
                            {currentView === 'config' && 'Gerenciamento de Setores'}
                            {currentView === 'details' && (selectedBeacon?.device_name || 'Detalhes do Dispositivo')}
                        </h2>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 border-round">{new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="flex-grow-1 p-4 overflow-y-auto bg-slate-50/50">
                    {currentView === 'dashboard' && <DashboardOverview beacons={beacons} sectors={sectors} settings={settings} onSelect={(b) => { setSelectedBeacon(b); setCurrentView('details'); }} />}
                    {currentView === 'reports' && <ReportsView logs={messageLog} />}
                    {currentView === 'gateways' && <GatewaysView messageLog={messageLog} beacons={beacons} onSelectBeacon={(b) => { setSelectedBeacon(b); setCurrentView('details'); }} />}
                    {currentView === 'config' && <SectorsConfigView sectors={sectors} onSave={handleSaveSectors} detectedBeacons={beacons} />}
                    {currentView === 'details' && selectedBeacon && <SensorDetailView beacon={selectedBeacon} history={historyRef.current[selectedBeacon.mac]} chartOptions={chartOptions} messageLog={messageLog} settings={settings} onUpdate={handleUpdateSensor} />}
                    {currentView === 'details' && !selectedBeacon && (
                        <div className="flex flex-column align-items-center justify-content-center h-full text-slate-400 fade-in">
                            <div className="w-6rem h-6rem bg-slate-100 border-circle flex align-items-center justify-content-center mb-4">
                                <i className="pi pi-search text-3xl text-slate-300"></i>
                            </div>
                            <p className="text-sm font-medium">Selecione um sensor para visualizar os detalhes</p>
                        </div>
                    )}
                </div>
            </div>

            <SettingsModal visible={showSettings} onHide={() => setShowSettings(false)} settings={settings} onSave={handleSaveSettings} />
        </div>
    );
}

export default App;