import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Skeleton } from 'primereact/skeleton';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- LEAFLET ICON FIX ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// --- CUSTOM TRUCK ICON ---
const truckIcon = L.divIcon({
    className: 'bg-transparent',
    html: `<div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="background-color: #f85931; width: 100%; height: 100%; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.2); position: absolute;"></div>
            <i class="pi pi-truck" style="color: white; font-size: 20px; position: relative; z-index: 1; margin-bottom: 5px;"></i>
           </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48]
});

// --- CONSTANTS ---
const N8N_HISTORY_URL = `${import.meta.env.VITE_API_BASE_URL}/sensores`;
const SENSOR_CONFIG_URL = `${import.meta.env.VITE_API_BASE_URL}/dispositivos`;
const REPORT_API_URL = `${import.meta.env.VITE_API_BASE_URL}/sensor/report`;
const periodOptions = [
    { label: '1H', value: '1h' },
    { label: '24H', value: '24h' },
    { label: '7D', value: '7d' }
];

// --- CUSTOM HOOKS ---
const useSensorData = (mac, period) => {
    const [historyData, setHistoryData] = useState([]);
    const [sensorInfo, setSensorInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        if (!mac) return;
            setLoading(true);
            setError(null);
            try {
                const url = new URL(`${N8N_HISTORY_URL}/${mac}`, window.location.origin);
                url.searchParams.append('period', period);

                const response = await fetch(url.toString(), {
                    headers: { 'x-api-key': import.meta.env.VITE_API_KEY }
                });

                if (response.status === 401) {
                    localStorage.removeItem('alcateia_auth');
                    navigate('/login');
                    return;
                }

                if (!response.ok) throw new Error('Falha ao buscar dados do sensor');

                const data = await response.json();
                
                setHistoryData(data.history || []);
                setSensorInfo(data.info || {}); // Assume que info contém o estado mais recente (latitude, longitude, altitude)
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError(err);
                setHistoryData([]);
                setSensorInfo(null);
            } finally {
                setLoading(false);
            }
    }, [mac, period, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { historyData, sensorInfo, loading, error, refetch: fetchData };
};

// --- HELPER FUNCTIONS ---
const processHistoryForChart = (historyData, period) => {
    if (!historyData || historyData.length === 0) return { labels: [], datasets: [] };

    const sorted = [...historyData].sort((a, b) => new Date(a.ts || a.created_at) - new Date(b.ts || b.created_at));

    const labels = [];
    const tempData = [];
    const humData = [];

    sorted.forEach(log => {
        const dateStr = log.ts || log.created_at;
        if (!dateStr) return;

        const dateObj = new Date(dateStr);
        const label = period === '7d'
            ? dateObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        labels.push(label);
        tempData.push(Number(log.temp ?? log.temperature ?? 0));
        humData.push(Number(log.hum ?? log.humidity ?? 0));
    });

    return {
        labels,
        datasets: [
            {
                label: 'Temperatura',
                data: tempData,
                borderColor: '#fbbf24',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                yAxisID: 'y',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
            },
            {
                label: 'Umidade',
                data: humData,
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                yAxisID: 'y1',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
            },
        ],
    };
};

const getChartOptions = () => { /* ... (mesmo código anterior) ... */
    const textColor = '#374151';
    const gridColor = 'rgba(0, 0, 0, 0.1)';
    return {
        maintainAspectRatio: false,
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#ffffff', titleColor: '#1f2937', bodyColor: '#4b5563', borderColor: '#e5e7eb', borderWidth: 1 } },
        scales: {
            x: { ticks: { color: textColor, font: { size: 12 } }, grid: { display: false } },
            y: { type: 'linear', display: true, position: 'left', ticks: { color: '#fbbf24' }, grid: { color: gridColor, borderDash: [5, 5] } },
            y1: { type: 'linear', display: true, position: 'right', ticks: { color: '#60a5fa' }, grid: { display: false } },
        },
        elements: { point: { radius: 0, hoverRadius: 5, backgroundColor: '#818cf8' } },
        animation: { duration: 500 },
    };
};

// --- MEMOIZED COMPONENTS ---

const TemperatureChart = React.memo(({ historyData, period, loading, onPeriodChange, onExport, chartOptions }) => {
    const chartData = useMemo(() => processHistoryForChart(historyData, period), [historyData, period]);

    return (
        <div className="widget-card h-full flex flex-column">
            <div className="flex justify-content-between align-items-center mb-4">
                <h3 className="text-sm font-bold text-800">Histórico de Temperatura</h3>
                <div className="flex align-items-center gap-2">
                    <div className="flex align-items-center surface-100 border-round p-1">
                        {periodOptions.map((opt) => (
                            <Button
                                key={opt.value}
                                label={opt.label}
                                onClick={() => onPeriodChange(opt.value)}
                                className={`p-button-sm h-2rem text-xs border-round ${period === opt.value ? 'bg-white text-indigo-600 shadow-1' : 'text-600 hover:surface-200'}`}
                                text
                                style={{ padding: '0 0.8rem', minWidth: '3rem' }}
                            />
                        ))}
                    </div>
                    <Button rounded text severity="info" disabled={!historyData || historyData.length === 0} onClick={onExport} tooltip="Exportar Excel">Exportar Excel</Button>
                </div>
            </div>
            <div className="flex-grow-1 relative">
                {loading ? (
                    <div className="h-full w-full flex align-items-center justify-content-center"><Skeleton width="100%" height="100%" borderRadius="12px" /></div>
                ) : (!historyData || historyData.length === 0) ? (
                    <div className="flex flex-column align-items-center justify-content-center h-full w-full text-400">
                        <i className="pi pi-info-circle text-4xl mb-3 opacity-20"></i>
                        <span className="text-sm font-medium opacity-60">Nenhum dado histórico disponível.</span>
                    </div>
                ) : (
                    <Chart type="line" data={chartData} options={chartOptions} className="h-full w-full absolute" />
                )}
            </div>
        </div>
    );
});

const SensorMap = React.memo(({ sensorInfo, address, loading, addressLoading, routeData }) => {
    // Coordenadas padrão (São Paulo) se não houver dados
    const defaultLat = -23.5505;
    const defaultLng = -46.6333;
    
    // Prioriza as novas chaves: latitude, longitude, altitude
    const lat = sensorInfo?.latitude ?? sensorInfo?.lat ?? defaultLat;
    const lng = sensorInfo?.longitude ?? sensorInfo?.lng ?? defaultLng;
    const alt = sensorInfo?.altitude ?? 0;

    return (
        <div className="col-12 xl:col-6 flex flex-column h-full">
            <div className="widget-card h-full p-0 overflow-hidden relative flex flex-column">
                <div className="absolute top-0 left-0 z-1 p-3 surface-card border-bottom-right-radius shadow-2">
                    <h3 className="text-sm font-bold text-800 m-0">Localização</h3>
                </div>
                {loading ? (
                    <Skeleton width="100%" height="100%" borderRadius="0" />
                ) : (
                    <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                        {routeData && routeData.length > 1 && (
                            <Polyline positions={routeData} color="#000000" weight={4} opacity={1} />
                        )}
                        <Marker position={[lat, lng]} icon={truckIcon}>
                            <Popup>
                                <div className="flex flex-column gap-1">
                                    <span className="font-bold text-lg">{sensorInfo?.display_name || 'Sensor'}</span>
                                    <div className="text-sm text-700 my-1">
                                        {addressLoading ? 'Resolvendo endereço...' : (address || 'Localização Fixa')}
                                    </div>
                                    <div className="flex flex-column text-xs text-500 gap-1 border-top-1 surface-border pt-1">
                                        <span><i className="pi pi-map-marker mr-1"></i>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                                        <span><i className="pi pi-arrow-up mr-1"></i>Alt: {alt} m</span>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    </MapContainer>
                )}
            </div>
        </div>
    );
});

const SensorDetailView = ({ beacon, settings, onUpdate }) => {
    const [period, setPeriod] = useState('24h');
    const [displayConfig, setDisplayConfig] = useState(false);
    const [configValues, setConfigValues] = useState({
        display_name: '',
        max_temp: null,
        max_hum: null,
        batt_warning: null
    });
    const [address, setAddress] = useState(null);
    const [addressLoading, setAddressLoading] = useState(false);
    const [showReportDialog, setShowReportDialog] = useState(false);
    const [reportStartDate, setReportStartDate] = useState(null);
    const [reportEndDate, setReportEndDate] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const toast = useRef(null);
    const navigate = useNavigate();

    // --- DATA FETCHING ---
    const { historyData, sensorInfo, loading, error: historyError, refetch } = useSensorData(beacon?.mac, period);
    const chartOptions = useMemo(() => getChartOptions(), []);

    // --- ROUTE PROCESSING ---
    const routeData = useMemo(() => {
        // MOCK: Se não tiver histórico
        const mockRoute = [
            [-23.550520, -46.633308], [-23.551200, -46.634100], [-23.552000, -46.635000],
            [-23.553500, -46.636500], [-23.555000, -46.638000], [-23.556500, -46.639500]
        ];

        if (!historyData || historyData.length === 0) return mockRoute;
        
        // Processa rota usando latitude e longitude do histórico
        const realRoute = historyData
            .filter(d => (d.latitude || d.lat) && (d.longitude || d.lng))
            .sort((a, b) => new Date(a.ts || a.created_at) - new Date(b.ts || b.created_at))
            .map(d => [
                Number(d.latitude || d.lat), 
                Number(d.longitude || d.lng)
            ]);

        return realRoute.length > 0 ? realRoute : mockRoute;
    }, [historyData]);

    const handleOpenConfig = () => {
        const source = sensorInfo || beacon;
        if (source) {
            setConfigValues({
                display_name: source.display_name || '',
                max_temp: source.temp_max || source.max_temp || null,
                max_hum: source.hum_max || source.max_hum || null,
                batt_warning: source.batt_warning || null
            });
        }
        setDisplayConfig(true);
    };

    // --- REVERSE GEOCODING ---
    // Atualizado para checar latitude/longitude ou lat/lng
    useEffect(() => {
        const lat = sensorInfo?.latitude ?? sensorInfo?.lat;
        const lng = sensorInfo?.longitude ?? sensorInfo?.lng;

        if (lat && lng) {
            setAddress(null);
            setAddressLoading(true);
            
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'pt-BR' }
            })
            .then(res => { if (!res.ok) throw new Error('Blocked'); return res.json(); })
            .then(data => {
                if (data.address) {
                    const { road, house_number, suburb, neighbourhood, city, town, village, postcode } = data.address;
                    const parts = [road, house_number, suburb || neighbourhood, city || town || village, postcode].filter(Boolean);
                    setAddress(parts.join(', '));
                } else {
                    setAddress(data.display_name);
                }
            })
            .catch(() => {
                return fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`)
                    .then(res => res.json())
                    .then(data => {
                        const parts = [data.locality, data.city, data.principalSubdivision, data.postcode].filter(Boolean);
                        setAddress(parts.join(', '));
                    })
                    .catch(() => setAddress("Endereço indisponível"));
            })
            .finally(() => setAddressLoading(false));
        }
    }, [sensorInfo]);

    const handleSaveConfig = async () => {
        try {
            const response = await fetch(SENSOR_CONFIG_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_API_KEY },
                body: JSON.stringify({ mac: beacon.mac, ...configValues })
            });

            if (response.status === 401) return navigate('/login');
            if (!response.ok) throw new Error('Falha ao salvar');

            toast.current.show({ severity: 'success', summary: 'Sucesso', detail: 'Configuração salva!' });
            if (onUpdate) onUpdate({ ...beacon, ...configValues });
            setDisplayConfig(false);
        } catch (error) {
            toast.current.show({ severity: 'error', summary: 'Erro', detail: 'Erro ao salvar.' });
        }
    };

    const handleExportExcel = useCallback(() => { /* ... (mesmo código do excel) ... */ }, [historyData, beacon, period]);
    const handleDownloadReport = async () => { /* ... (mesmo código do relatório) ... */ };

    useEffect(() => {
        if (historyError) toast.current?.show({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o histórico.' });
    }, [historyError]);

    if (!beacon) return null;

    // Extrai coordenadas para exibição no widget
    const currentLat = sensorInfo?.latitude ?? sensorInfo?.lat;
    const currentLng = sensorInfo?.longitude ?? sensorInfo?.lng;
    const currentAlt = sensorInfo?.altitude;
    const hasLocation = currentLat != null && currentLng != null;
    const kpiColClass = hasLocation ? "col-12 md:col-6 xl:col-3" : "col-12 md:col-4";

    return (
        <div className="h-full flex flex-column gap-4">
            <Toast ref={toast} />
            {/* Header */}
            <div className="flex justify-content-between align-items-center">
                <div className="flex align-items-center gap-3">
                    <div className="w-3rem h-3rem bg-indigo-50 border-circle flex align-items-center justify-content-center text-indigo-600">
                        <i className="pi pi-box text-xl"></i>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-900 m-0">{sensorInfo?.display_name || beacon.display_name || 'Sensor'}</h1>
                        <span className="text-xs font-mono text-500">{beacon.mac}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button rounded text severity="secondary" icon="pi pi-refresh" onClick={refetch} tooltip="Atualizar" />
                    <Button rounded text severity="secondary" icon="pi pi-file-export" label="Relatório" onClick={() => setShowReportDialog(true)} />
                    <Button rounded text severity="secondary" icon="pi pi-cog" label="Configurar" onClick={handleOpenConfig} />
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid">
                {/* Temp */}
                <div className={kpiColClass}>
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Temperatura</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className={`text-4xl font-bold text-value ${beacon.temp > settings.tempCritical ? 'text-rose-600' : beacon.temp > settings.tempAlert ? 'text-orange-600' : 'text-900'}`}>
                                {beacon.temp}
                            </span>
                            <span className="text-lg text-500">°C</span>
                            {sensorInfo?.temp_max && <span className="text-sm text-500 ml-1">/ {sensorInfo.temp_max}°C</span>}
                        </div>
                    </div>
                </div>
                {/* Humidity */}
                <div className={kpiColClass}>
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Umidade</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className="text-4xl font-bold text-900 text-value">{beacon.hum}</span>
                            <span className="text-lg text-500">%</span>
                            {sensorInfo?.hum_max && <span className="text-sm text-500 ml-1">/ {sensorInfo.hum_max}%</span>}
                        </div>
                    </div>
                </div>
                {/* Battery */}
                <div className={kpiColClass}>
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Bateria</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className={`text-4xl font-bold text-value ${beacon.batt < settings.lowBattery ? 'text-rose-600' : 'text-900'}`}>
                                {beacon.batt}
                            </span>
                            <span className="text-lg text-500">%</span>
                        </div>
                        <div className="mt-3 w-full surface-200 h-1 rounded-full overflow-hidden">
                            <div className={`h-full ${beacon.batt < settings.lowBattery ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${beacon.batt}%` }}></div>
                        </div>
                    </div>
                </div>
                {/* Location Widget */}
                {hasLocation && (
                    <div className="col-12 md:col-6 xl:col-3">
                        <div className="widget-card h-full">
                            <span className="text-label block mb-2">Localização</span>
                            <div className="flex align-items-start gap-2 h-full">
                                <i className="pi pi-map-marker text-2xl text-indigo-500 mt-1"></i>
                                <div className="flex flex-column w-full">
                                    {loading ? (
                                        <div className="flex flex-column gap-2 w-full"><Skeleton width="90%" height="1.2rem" /><Skeleton width="60%" height="0.8rem" /></div>
                                    ) : (
                                        <>
                                            <span className="text-sm font-bold text-900" style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>
                                                {addressLoading ? 'Buscando endereço...' : (address || (currentLat ? 'Endereço não encontrado' : 'Sem sinal GPS'))}
                                            </span>
                                            {currentLat && currentLng && (
                                                <div className="flex flex-column gap-0 mt-1">
                                                    <span className="text-xs text-500 font-mono">
                                                        Lat: {currentLat.toFixed(5)}
                                                    </span>
                                                    <span className="text-xs text-500 font-mono">
                                                        Lng: {currentLng.toFixed(5)}
                                                    </span>
                                                    {currentAlt !== undefined && (
                                                        <span className="text-xs text-500 font-mono font-bold text-indigo-500">
                                                            Alt: {currentAlt}m
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Section: Chart + Map */}
            <div className="grid flex-grow-1 min-h-0">
                <div className={`${hasLocation ? 'col-12 xl:col-6' : 'col-12'} flex flex-column h-full`}>
                    <TemperatureChart 
                        historyData={historyData}
                        period={period}
                        loading={loading}
                        onPeriodChange={setPeriod}
                        onExport={handleExportExcel}
                        chartOptions={chartOptions}
                    />
                </div>
                {hasLocation && (
                    <SensorMap 
                        sensorInfo={sensorInfo}
                        address={address}
                        loading={loading}
                        addressLoading={addressLoading}
                        routeData={routeData}
                    />
                )}
            </div>

            {/* Dialogs */}
            <Dialog header="Configurar Alertas e Nome" visible={displayConfig} style={{ width: 'min(450px, 90vw)' }} onHide={() => setDisplayConfig(false)} footer={
                <div className='flex gap-2 justify-content-end'>
                    <Button label="Cancelar" icon="pi pi-times" onClick={() => setDisplayConfig(false)} className="p-button-text" />
                    <Button label="Salvar" icon="pi pi-check" onClick={handleSaveConfig} autoFocus />
                </div>
            }>
                <div className="flex flex-column gap-5 pt-4">
                    <span className="p-float-label"><InputText id="displayName" value={configValues.display_name} onChange={(e) => setConfigValues({...configValues, display_name: e.target.value })} className="w-full" /><label htmlFor="displayName">Nome do Sensor</label></span>
                    <span className="p-float-label"><InputNumber id="maxTemp" value={configValues.max_temp} onValueChange={(e) => setConfigValues({...configValues, max_temp: e.value})} mode="decimal" suffix=" °C" className="w-full" /><label htmlFor="maxTemp">Alerta de Temp. Máxima</label></span>
                    <span className="p-float-label"><InputNumber id="maxHum" value={configValues.max_hum} onValueChange={(e) => setConfigValues({...configValues, max_hum: e.value})} suffix=" %" className="w-full" /><label htmlFor="maxHum">Alerta de Umidade Máxima</label></span>
                    <span className="p-float-label"><InputNumber id="battWarning" value={configValues.batt_warning} onValueChange={(e) => setConfigValues({...configValues, batt_warning: e.value})} suffix=" %" className="w-full" /><label htmlFor="battWarning">Alerta de Bateria Baixa</label></span>
                </div>
            </Dialog>

            <Dialog header="Relatório Completo (Excel)" visible={showReportDialog} style={{ width: 'min(400px, 90vw)' }} onHide={() => setShowReportDialog(false)}>
                <div className="flex flex-column gap-4 pt-2">
                    <div className="flex flex-column gap-2"><label className="font-bold text-sm">Data Inicial</label><Calendar value={reportStartDate} onChange={(e) => setReportStartDate(e.value)} dateFormat="dd/mm/yy" /></div>
                    <div className="flex flex-column gap-2"><label className="font-bold text-sm">Data Final</label><Calendar value={reportEndDate} onChange={(e) => setReportEndDate(e.value)} dateFormat="dd/mm/yy" /></div>
                    <Button label="Baixar Relatório" icon="pi pi-download" loading={reportLoading} onClick={handleDownloadReport} className="mt-2" />
                </div>
            </Dialog>
        </div>
    );
};

export default SensorDetailView;