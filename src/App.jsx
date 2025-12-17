import React, { useState, useRef, useEffect } from 'react';
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

// --- APP PRINCIPAL ---
function App() {
    const [beacons, setBeacons] = useState([]);
    const [sectors, setSectors] = useState([]);
    const [messageLog, setMessageLog] = useState([]);
    const [settings, setSettings] = useState({
        tempAlert: 35,
        tempCritical: 25,
        lowBattery: 20
    });
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
                messageLog={messageLog} 
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
                messageLog={messageLog} 
                beacons={beacons} 
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
                            setBeacons={setBeacons}
                            sectors={sectors}
                            setSectors={setSectors}
                            settings={settings}
                            setSettings={setSettings}
                            messageLog={messageLog}
                            setMessageLog={setMessageLog}
                            historyRef={historyRef}
                            chartOptions={chartOptions}
                            onUpdateSensor={handleUpdateSensor}
                        />
                    </ProtectedRoute>
                }
            >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="" element={<Navigate to="/dashboard" replace />} />
                <Route path="reports" element={<ReportsView logs={messageLog} />} />
                <Route path="gateways" element={<GatewaysPage />} />
                <Route path="config" element={<SectorsConfigPage />} />
                <Route path="sensor/:mac" element={<SensorDetailPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
        </Routes>
    );
}

export default App;