import React, { useState, useEffect, useRef } from 'react';
import mqtt from 'mqtt';
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
import SettingsModal from './components/SettingsModal';

// --- CONFIGURAÇÕES ---
const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const MQTT_TOPIC = '/alcateia/processed_ble_data';

// --- APP PRINCIPAL ---
function App() {
    const [beacons, setBeacons] = useState([]);
    const [selectedBeacon, setSelectedBeacon] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Desconectado');
    const [messageLog, setMessageLog] = useState([]);
    const [currentView, setCurrentView] = useState('dashboard');
    const [sectors, setSectors] = useState([]);
    const [tick, setTick] = useState(0);
    const historyRef = useRef({});

    // Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        tempAlert: 10,
        tempCritical: 15,
        lowBattery: 20
    });

    // Load Settings & Sectors
    useEffect(() => {
        const savedSectors = localStorage.getItem('alcateia_sectors');
        if (savedSectors) { setSectors(JSON.parse(savedSectors)); }
        else { setSectors([{ id: 1, name: 'Câmara Fria A', macs: [] }, { id: 2, name: 'Transporte 01', macs: [] }]); }

        const savedSettings = localStorage.getItem('alcateia_settings');
        if (savedSettings) { setSettings(JSON.parse(savedSettings)); }
    }, []);

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

    useEffect(() => {
        setConnectionStatus('Conectando...');
        const client = mqtt.connect(MQTT_BROKER, { clean: true, connectTimeout: 4000, clientId: 'ui_' + Math.random().toString(16).substring(2, 8), protocolVersion: 4, path: '/mqtt' });
        client.on('connect', () => { setConnectionStatus('Online'); client.subscribe(MQTT_TOPIC); });
        client.on('message', (topic, message) => { try { const parsed = JSON.parse(message.toString()); if (Array.isArray(parsed)) parsed.forEach(item => processData(item)); else processData(parsed); } catch (e) { console.error(e); } });
        client.on('error', () => setConnectionStatus('Erro'));
        client.on('offline', () => setConnectionStatus('Offline'));
        return () => { if (client) client.end(); };
    }, []);

    useEffect(() => { const interval = setInterval(() => setTick(t => t + 1), 2000); return () => clearInterval(interval); }, []);

    const processData = (data) => {
        if (!data.mac) return;
        const now = new Date();
        const timeLabel = now.toLocaleTimeString('pt-BR');
        setMessageLog(prev => [{ ...data, timestamp: timeLabel, id: Date.now() + Math.random() }, ...prev].slice(0, 200));
        setBeacons(prev => {
            const index = prev.findIndex(b => b.mac === data.mac);
            if (index !== -1) {
                // Preserve custom name if exists
                const existing = prev[index];
                const updated = { ...existing, ...data, lastSeen: now, device_name: existing.device_name || data.device_name };
                const newBeacons = [...prev];
                newBeacons[index] = updated;
                return newBeacons;
            }
            return [...prev, { ...data, lastSeen: now }];
        });
        if (!historyRef.current[data.mac]) { historyRef.current[data.mac] = { labels: [], tempData: [], humData: [], battData: [] }; }
        const hist = historyRef.current[data.mac];
        if (hist.labels.length > 30) { hist.labels.shift(); hist.tempData.shift(); hist.humData.shift(); hist.battData.shift(); }
        hist.labels.push(timeLabel); hist.tempData.push(data.temperature_c); hist.humData.push(data.humidity_pct); hist.battData.push(data.battery_pct);

        // Update selected beacon if it matches, but preserve local edits if any (handled by separate update function usually, but here we just sync live data)
        setSelectedBeacon(curr => (curr && curr.mac === data.mac) ? { ...curr, ...data, lastSeen: now, device_name: curr.device_name || data.device_name } : curr);
    };

    const chartOptions = {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(255, 255, 255, 0.95)', titleColor: '#1e293b', bodyColor: '#475569', borderColor: '#e2e8f0', borderWidth: 1, padding: 8, displayColors: true, bodyFont: { size: 11 } } },
        scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { type: 'linear', display: true, position: 'left', ticks: { color: '#f97316' }, grid: { color: '#f1f5f9', borderDash: [5, 5] } },
            y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#0ea5e9' }, grid: { display: false } },
        },
        elements: { point: { radius: 0, hoverRadius: 4, hoverBorderWidth: 2 } },
        animation: false
    };

    const NavItem = ({ icon, label, viewId, active }) => (
        <div className={`nav-item ${active ? 'active' : ''}`} onClick={() => { setCurrentView(viewId); if (viewId !== 'details') setSelectedBeacon(null); }}>
            <i className={`pi ${icon}`}></i>
            <span>{label}</span>
        </div>
    );

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

                    <div className="text-label px-4 mb-2 mt-5">Gerenciamento</div>
                    <NavItem icon="pi-cog" label="Setores" viewId="config" active={currentView === 'config'} />

                    <div className="text-label px-4 mb-2 mt-5">Dispositivos ({beacons.length})</div>
                    {beacons.map(b => (
                        <div key={b.mac} className={`nav-item ${selectedBeacon?.mac === b.mac && currentView === 'details' ? 'active' : ''}`}
                            onClick={() => { setSelectedBeacon(b); setCurrentView('details'); }}>
                            <i className="pi pi-box text-xs"></i>
                            <span className="text-xs font-medium">{b.device_name || b.mac.slice(-5)}</span>
                            {b.temperature_c > settings.tempCritical && <div className="w-2 h-2 rounded-full bg-rose-500 ml-auto"></div>}
                        </div>
                    ))}
                </div>

                <div className="p-3 mt-auto border-top-1 border-gray-100 bg-gray-50">
                    <div className="flex align-items-center justify-content-between">
                        <div className="flex align-items-center gap-2">
                            <div className={`w-2 h-2 border-circle ${connectionStatus === 'Online' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                            <span className="text-xs font-bold text-slate-600">{connectionStatus}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">v2.0.0</span>
                    </div>
                </div>
            </div>

            {/* --- CONTENT PANEL --- */}
            <div className="content-panel">
                {/* Header */}
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
                            {currentView === 'config' && 'Gerenciamento de Setores'}
                            {currentView === 'details' && (selectedBeacon?.device_name || 'Detalhes do Dispositivo')}
                        </h2>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 border-round">{new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-grow-1 p-4 overflow-y-auto bg-slate-50/50">
                    {currentView === 'dashboard' && <DashboardOverview beacons={beacons} sectors={sectors} settings={settings} onSelect={(b) => { setSelectedBeacon(b); setCurrentView('details'); }} />}
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
                    {currentView === 'reports' && <ReportsView logs={messageLog} />}
                </div>
            </div>

            <SettingsModal visible={showSettings} onHide={() => setShowSettings(false)} settings={settings} onSave={handleSaveSettings} />
        </div>
    );
}

export default App;