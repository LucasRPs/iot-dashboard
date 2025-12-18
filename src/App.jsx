import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';

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
import LoginView from './components/LoginView';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// --- CONFIGURAÇÕES ---
const N8N_API_URL = 'https://n8n.alcateia-ia.com/webhook/sensors';
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 Minutos para considerar Offline

// --- APP PRINCIPAL ---
function App() {
    const [beacons, setBeacons] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [settings, setSettings] = useState({
        tempAlert: 35,
        tempCritical: 25,
        lowBattery: 20
    });
    const [connectionStatus, setConnectionStatus] = useState('Conectando...');
    const historyRef = useRef({});

    // Opções do gráfico (compartilhadas)
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

    const handleUpdateSensor = (updatedBeacon) => {
        setBeacons(prev => prev.map(b => b.mac === updatedBeacon.mac ? updatedBeacon : b));
    };

    // Função auxiliar para calcular status online/offline
    const getStatus = useCallback((lastSeenDate) => {
        if (!lastSeenDate) return 'offline';
        const diff = Date.now() - new Date(lastSeenDate).getTime();
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
                    const temp = parseFloat(s.current_temp ?? s.temp ?? 0);
                    const hum = parseFloat(s.current_hum ?? s.hum ?? 0);
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
                        display_name: s.display_name,
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

            } else {
                setConnectionStatus('Sem Sensores');
            }

        } catch (error) {
            console.error("Erro no fetch:", error);
            setConnectionStatus('Offline / Erro API');
        }
    }, [getStatus, historyRef]);

    // Polling de dados
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); 
        return () => clearInterval(interval);
    }, [fetchData]);

    // Componente wrapper para DashboardOverview
    const DashboardPage = () => {
        const navigate = useNavigate();
        return (
            <DashboardOverview 
                beacons={beacons} 
                sectors={sectors} 
                settings={settings} 
                onSelect={(b) => navigate(`/sensor/${b.mac}`)} 
            />
        );
    };

    // Componente wrapper para SensorDetailView (usa parâmetro da URL)
    const SensorDetailPage = () => {
        const { mac } = useParams();
        const beacon = beacons.find(b => b.mac === mac);
        
        if (!beacon) {
            return (
                <div className="flex flex-column align-items-center justify-content-center h-full text-slate-400">
                    <div className="w-6rem h-6rem bg-slate-100 border-circle flex align-items-center justify-content-center mb-4">
                        <i className="pi pi-search text-3xl text-slate-300"></i>
                    </div>
                    <p className="text-sm font-medium">Sensor não encontrado</p>
                </div>
            );
        }

        return (
            <SensorDetailView 
                beacon={beacon} 
                history={historyRef.current[beacon.mac]} 
                chartOptions={chartOptions} 
                settings={settings} 
                onUpdate={handleUpdateSensor} 
            />
        );
    };

    // Componente wrapper para GatewaysView
    const GatewaysPage = () => {
        const navigate = useNavigate();
        return (
            <GatewaysView 
                onSelectBeacon={(b) => navigate(`/sensor/${b.mac}`)} 
            />
        );
    };

    // Componente wrapper para SectorsConfigView
    const SectorsConfigPage = () => {
        const handleSaveSectors = (newSectors) => {
            setSectors(newSectors);
            localStorage.setItem('alcateia_sectors', JSON.stringify(newSectors));
        };
        return (
            <SectorsConfigView 
                sectors={sectors} 
                onSave={handleSaveSectors} 
                detectedBeacons={beacons} 
            />
        );
    };

    // Componente wrapper para LoginView
    const LoginPage = () => {
        const navigate = useNavigate();
        
        // Redireciona se já estiver autenticado
        useEffect(() => {
            const isAuthenticated = localStorage.getItem('alcateia_auth') === 'true';
            if (isAuthenticated) {
                navigate('/dashboard', { replace: true });
            }
        }, [navigate]);
        
        const handleLogin = (username, password) => {
            if (username && password) {
                localStorage.setItem('alcateia_auth', 'true');
                navigate('/dashboard', { replace: true });
            }
        };
        return <LoginView onLogin={handleLogin} />;
    };

    return (
        <Routes>
            {/* Rota de Login (pública) */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Rotas protegidas */}
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <Layout
                            beacons={beacons}
                            sectors={sectors}
                            setSectors={setSectors}
                            settings={settings}
                            setSettings={setSettings}
                            connectionStatus={connectionStatus}
                            historyRef={historyRef}
                            chartOptions={chartOptions}
                            onUpdateSensor={handleUpdateSensor}
                        />
                    </ProtectedRoute>
                }
            >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="" element={<Navigate to="/dashboard" replace />} />
                <Route path="reports" element={<ReportsView />} />
                <Route path="gateways" element={<GatewaysPage />} />
                <Route path="config" element={<SectorsConfigPage />} />
                <Route path="sensor/:mac" element={<SensorDetailPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
        </Routes>
    );
}

export default App;