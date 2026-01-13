import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import { Skeleton } from 'primereact/skeleton';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

// --- CUSTOM HOOKS (could be moved to a separate hooks file) ---

/**
 * Fetches sensor data (history + info) from the API.
 * @param {string} mac - The MAC address of the sensor.
 * @param {string} period - The time range for the history ('1h', '24h', '7d').
 */
const useSensorData = (mac, period) => {
    const [historyData, setHistoryData] = useState([]);
    const [sensorInfo, setSensorInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!mac) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const url = new URL(`${N8N_HISTORY_URL}/${mac}`, window.location.origin);
                url.searchParams.append('period', period);

                const response = await fetch(url.toString(), {
                    headers: {
                        'x-api-key': import.meta.env.VITE_API_KEY
                    }
                });

                if (response.status === 401) {
                    localStorage.removeItem('alcateia_auth');
                    navigate('/login');
                    return;
                }

                if (!response.ok) throw new Error('Falha ao buscar dados do sensor');

                const data = await response.json();
                
                setHistoryData(data.history || []);

                // MOCK: Coordenadas aleatórias para teste (São Paulo)
                const info = data.info || {};
                if (info.lat == null) info.lat = -23.5505 + (Math.random() - 0.5) * 0.02;
                if (info.lng == null) info.lng = -46.6333 + (Math.random() - 0.5) * 0.02;
                setSensorInfo(info);
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError(err);
                setHistoryData([]);
                setSensorInfo(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [mac, period]);

    return { historyData, sensorInfo, loading, error };
};

// --- HELPER FUNCTIONS (could be moved to a utils file) ---

/**
 * Processes history data for Chart.js.
 * @param {Array} historyData - The raw history data from the API.
 * @param {string} period - The selected time period.
 * @returns {object} - The data formatted for the Chart component.
 */
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

const getChartOptions = () => {
    const textColor = '#374151';
    const gridColor = 'rgba(0, 0, 0, 0.1)';

    return {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#ffffff',
                titleColor: '#1f2937',
                bodyColor: '#4b5563',
                borderColor: '#e5e7eb',
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                ticks: { color: textColor, font: { size: 12 } },
                grid: { display: false },
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                ticks: { color: '#fbbf24' },
                grid: { color: gridColor, borderDash: [5, 5] },
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                ticks: { color: '#60a5fa' },
                grid: { display: false },
            },
        },
        elements: {
            point: {
                radius: 0,
                hoverRadius: 5,
                backgroundColor: '#818cf8',
            },
        },
        animation: {
            duration: 500,
        },
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
                    <SelectButton 
                        value={period} 
                        options={periodOptions} 
                        onChange={(e) => e.value && onPeriodChange(e.value)} 
                        unselectable={false}
                    />
                    <Button 
                        rounded 
                        text 
                        severity="info"
                        disabled={!historyData || historyData.length === 0} 
                        onClick={onExport}
                        tooltip="Exportar Excel"
                    >Exportar Excel</Button>
                </div>
            </div>
            <div className="flex-grow-1 relative">
                {loading ? (
                    <div className="h-full w-full flex align-items-center justify-content-center">
                        <Skeleton width="100%" height="100%" borderRadius="12px" />
                    </div>
                ) : (!historyData || historyData.length === 0) ? (
                    <div className="flex flex-column align-items-center justify-content-center h-full w-full text-400">
                        <i className="pi pi-info-circle text-4xl mb-3 opacity-20"></i>
                        <span className="text-sm font-medium opacity-60">Nenhum dado histórico disponível para este período.</span>
                    </div>
                ) : (
                    <Chart type="line" data={chartData} options={chartOptions} className="h-full w-full absolute" />
                )}
            </div>
        </div>
    );
});

const SensorMap = React.memo(({ sensorInfo, address, loading, addressLoading }) => {
    if (!loading && (!sensorInfo?.lat || !sensorInfo?.lng)) return null;

    return (
        <div className="col-12 xl:col-6 flex flex-column h-full">
            <div className="widget-card h-full p-0 overflow-hidden relative flex flex-column">
                <div className="absolute top-0 left-0 z-1 p-3 surface-card border-bottom-right-radius">
                    <h3 className="text-sm font-bold text-800 m-0">Localização</h3>
                </div>
                {loading ? (
                    <Skeleton width="100%" height="100%" borderRadius="0" />
                ) : (
                    <MapContainer center={[sensorInfo.lat, sensorInfo.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                        <Marker position={[sensorInfo.lat, sensorInfo.lng]} icon={truckIcon}>
                            <Popup>
                                <div className="flex flex-column gap-1">
                                    <span className="font-bold">{sensorInfo.display_name || 'Sensor'}</span>
                                    <span className="text-xs text-500" style={{ maxWidth: '200px', display: 'block' }}>
                                        {addressLoading ? 'Resolvendo endereço...' : (address || 'Endereço indisponível')}
                                    </span>
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
    const { historyData, sensorInfo, loading, error: historyError } = useSensorData(beacon?.mac, period);
    const chartOptions = useMemo(() => getChartOptions(), []);

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

    // --- REVERSE GEOCODING (Busca endereço via Nominatim/OSM) ---
    useEffect(() => {
        if (sensorInfo?.lat && sensorInfo?.lng) {
            setAddress(null);
            setAddressLoading(true);
            
            // 1. Tenta Nominatim (Mais detalhado: Rua, Número, etc.)
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${sensorInfo.lat}&lon=${sensorInfo.lng}&zoom=18&addressdetails=1`, {
                headers: { 'Accept-Language': 'pt-BR' }
            })
            .then(res => {
                if (!res.ok) throw new Error('Nominatim blocked');
                return res.json();
            })
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
                // 2. Fallback: BigDataCloud (Se Nominatim falhar/bloquear, usa este que é mais permissivo)
                return fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${sensorInfo.lat}&longitude=${sensorInfo.lng}&localityLanguage=pt`)
                    .then(res => res.json())
                    .then(data => {
                        const parts = [data.locality, data.city, data.principalSubdivision, data.postcode].filter(Boolean);
                        setAddress(parts.join(', '));
                    })
                    .catch(() => setAddress("Endereço indisponível"));
            })
            .finally(() => {
                setAddressLoading(false);
            });
        }
    }, [sensorInfo?.lat, sensorInfo?.lng]);

    const handleSaveConfig = async () => {
        try {
            const response = await fetch(SENSOR_CONFIG_URL, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': import.meta.env.VITE_API_KEY
                },
                body: JSON.stringify({
                    mac: beacon.mac,
                    display_name: configValues.display_name,
                    batt_warning: configValues.batt_warning,
                    temp_max: configValues.max_temp,
                    hum_max: configValues.max_hum
                })
            });

            if (response.status === 401) {
                localStorage.removeItem('alcateia_auth');
                navigate('/login');
                return;
            }

            if (!response.ok) throw new Error('Falha ao salvar configuração');

            toast.current.show({ severity: 'success', summary: 'Sucesso', detail: 'Configuração salva!' });
            
            if (onUpdate) {
                onUpdate({ ...beacon, ...configValues });
            }
            setDisplayConfig(false);
        } catch (error) {
            console.error(error);
            toast.current.show({ severity: 'error', summary: 'Erro', detail: 'Erro ao salvar.' });
        }
    };

    const handleExportExcel = useCallback(() => {
        if (!historyData || historyData.length === 0) return;

        const sortedData = [...historyData].sort((a, b) => new Date(a.ts || a.created_at) - new Date(b.ts || b.created_at));
        
        let tableContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8">
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>Histórico</x:Name>
                                <x:WorksheetOptions>
                                    <x:DisplayGridlines/>
                                </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
            </head>
            <body>
                <table>
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>Temperatura (°C)</th>
                            <th>Umidade (%)</th>
                            <th>Bateria (%)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        sortedData.forEach(item => {
            const date = new Date(item.ts || item.created_at).toLocaleString('pt-BR');
            const temp = (item.temp ?? item.temperature ?? '').toString().replace('.', ',');
            const hum = (item.hum ?? item.humidity ?? '').toString().replace('.', ',');
            const batt = (item.batt ?? item.battery ?? '').toString().replace('.', ',');
            
            tableContent += `<tr><td>${date}</td><td>${temp}</td><td>${hum}</td><td>${batt}</td></tr>`;
        });

        tableContent += '</tbody></table></body></html>';

        const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `sensor_${beacon.mac}_${period}.xls`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [historyData, beacon, period]);

    const handleDownloadReport = async () => {
        if (!reportStartDate || !reportEndDate) {
            toast.current.show({ severity: 'warn', summary: 'Atenção', detail: 'Selecione as datas inicial e final.' });
            return;
        }

        setReportLoading(true);
        try {
            const url = new URL(REPORT_API_URL);
            url.searchParams.append('mac', beacon.mac);
            url.searchParams.append('startDate', reportStartDate.toISOString());
            url.searchParams.append('endDate', reportEndDate.toISOString());

            const response = await fetch(url.toString(), {
                headers: {
                    'x-api-key': import.meta.env.VITE_API_KEY
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('alcateia_auth');
                navigate('/login');
                return;
            }

            if (!response.ok) throw new Error('Falha ao gerar relatório');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `relatorio_${beacon.mac.replace(/:/g, '')}_${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
            setShowReportDialog(false);
            toast.current.show({ severity: 'success', summary: 'Sucesso', detail: 'Relatório baixado com sucesso!' });
        } catch (error) {
            console.error(error);
            toast.current.show({ severity: 'error', summary: 'Erro', detail: 'Erro ao baixar relatório.' });
        } finally {
            setReportLoading(false);
        }
    };

    // --- ERROR HANDLING ---
    useEffect(() => {
        if (historyError) {
            toast.current?.show({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o histórico.', life: 3000 });
        }
    }, [historyError]);

    if (!beacon) return null;

    return (
        <div className="h-full flex flex-column gap-4">
            <Toast ref={toast} />
            {/* Header / Actions */}
            <div className="flex justify-content-between align-items-center">
                <div className="flex align-items-center gap-3">
                    <div className="w-3rem h-3rem bg-indigo-50 border-circle flex align-items-center justify-content-center text-indigo-600">
                        <i className="pi pi-box text-xl"></i>
                    </div>
                    <div>
                        <div className="flex align-items-center gap-2">
                            <h1 className="text-2xl font-bold text-900 m-0">{sensorInfo?.display_name || beacon.display_name || beacon.device_name || 'Sensor'}</h1>
                        </div>
                        <span className="text-xs font-mono text-500">{beacon.mac}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button rounded text severity="secondary" icon="pi pi-file-export" label="Relatório Completo" onClick={() => setShowReportDialog(true)} />
                    <Button rounded text severity="secondary" iconPos='left' aria-label="Configurações" onClick={handleOpenConfig}>Adicionar parâmetros de alerta</Button>
                </div>
            </div>

            {/* Metrics Grid (Dados em tempo real vindo da prop 'beacon' do App.jsx) */}
            <div className="grid">
                <div className="col-12 md:col-6 xl:col-3">
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Temperatura</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className={`text-4xl font-bold text-value ${beacon.temp > settings.tempCritical ? 'text-rose-600' : beacon.temp > settings.tempAlert ? 'text-orange-600' : 'text-900'}`}>
                                {beacon.temp}
                            </span>
                            <span className="text-lg text-500">°C</span>
                            {loading ? <Skeleton width="3rem" height="1rem" className="ml-2" /> : (sensorInfo?.temp_max && <span className="text-sm text-500 ml-1">/ {sensorInfo.temp_max}°C</span>)}
                        </div>
                        
                    </div>
                </div>
                <div className="col-12 md:col-6 xl:col-3">
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Umidade</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className="text-4xl font-bold text-900 text-value">{beacon.hum}</span>
                            <span className="text-lg text-500">%</span>
                            {loading ? <Skeleton width="3rem" height="1rem" className="ml-2" /> : (sensorInfo?.hum_max && <span className="text-sm text-500 ml-1">/ {sensorInfo.hum_max}%</span>)}
                        </div>
                       
                    </div>
                </div>
                <div className="col-12 md:col-6 xl:col-3">
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Bateria</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className={`text-4xl font-bold text-value ${beacon.batt < settings.lowBattery ? 'text-rose-600' : 'text-900'}`}>
                                {beacon.batt}
                            </span>
                            <span className="text-lg text-500">%</span>
                            {loading ? <Skeleton width="3rem" height="1rem" className="ml-2" /> : (sensorInfo?.batt_warning && <span className="text-sm text-500 ml-1">/ {sensorInfo.batt_warning}%</span>)}
                        </div>
                        <div className="mt-3 w-full surface-200 h-1 rounded-full overflow-hidden">
                            <div className={`h-full ${beacon.batt < settings.lowBattery ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${beacon.batt}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="col-12 md:col-6 xl:col-3">
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Localização</span>
                        <div className="flex align-items-start gap-2 h-full">
                            <i className="pi pi-map-marker text-2xl text-indigo-500 mt-1"></i>
                            <div className="flex flex-column w-full">
                                {loading ? (
                                    <div className="flex flex-column gap-2 w-full">
                                        <Skeleton width="90%" height="1.2rem" />
                                        <Skeleton width="60%" height="0.8rem" />
                                    </div>
                                ) : (
                                    <>
                                        {addressLoading ? (
                                            <div className="flex align-items-center gap-2" style={{ height: '1.3em' }}>
                                                <i className="pi pi-spin pi-spinner text-indigo-500 text-sm"></i>
                                                <span className="text-sm text-500">Buscando...</span>
                                            </div>
                                        ) : (
                                            <span className="text-sm font-bold text-900" style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>
                                                {address || (sensorInfo?.lat ? 'Endereço não encontrado' : 'Sem localização')}
                                            </span>
                                        )}
                                        {sensorInfo?.lat && sensorInfo?.lng && (
                                            <span className="text-xs text-500 mt-1 font-mono">
                                                {sensorInfo.lat.toFixed(5)}, {sensorInfo.lng.toFixed(5)}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Chart + Map */}
            <div className="grid flex-grow-1 min-h-0">
                {/* Chart Column */}
                <div className={`col-12 ${loading || (sensorInfo?.lat && sensorInfo?.lng) ? 'xl:col-6' : ''} flex flex-column h-full`}>
                    <TemperatureChart 
                        historyData={historyData}
                        period={period}
                        loading={loading}
                        onPeriodChange={setPeriod}
                        onExport={handleExportExcel}
                        chartOptions={chartOptions}
                    />
                </div>

                {/* Map Column (Only renders if lat/lng exists) */}
                {(loading || (sensorInfo?.lat && sensorInfo?.lng)) && (
                    <SensorMap 
                        sensorInfo={sensorInfo}
                        address={address}
                        loading={loading}
                        addressLoading={addressLoading}
                    />
                )}
            </div>

            {/* Modal de Configuração */}
            <Dialog
                header="Configurar Alertas e Nome"
                visible={displayConfig}
                style={{ width: 'min(450px, 90vw)' }}
                onHide={() => setDisplayConfig(false)}
                footer={
                    <div className='flex gap-2 justify-content-end'>
                        <Button label="Cancelar" icon="pi pi-times" onClick={() => setDisplayConfig(false)} className="p-button-text" />
                        <Button label="Salvar" icon="pi pi-check" onClick={handleSaveConfig} autoFocus />
                    </div>
                }
            >
                <div className="flex flex-column gap-5 pt-4">
                    <div className="p-float-label">
                        <InputText id="displayName" value={configValues.display_name} onChange={(e) => setConfigValues({...configValues, display_name: e.target.value })} className="w-full" />
                        <label htmlFor="displayName">Nome do Sensor</label>
                    </div>
                    
                    <div className="p-float-label">
                        <InputNumber id="maxTemp" value={configValues.max_temp} onValueChange={(e) => setConfigValues({...configValues, max_temp: e.value})} mode="decimal" suffix=" °C" minFractionDigits={1} maxFractionDigits={1} className="w-full" />
                        <label htmlFor="maxTemp">Alerta de Temp. Máxima</label>
                    </div>

                    <div className="p-float-label">
                        <InputNumber id="maxHum" value={configValues.max_hum} onValueChange={(e) => setConfigValues({...configValues, max_hum: e.value})} suffix=" %" className="w-full" />
                        <label htmlFor="maxHum">Alerta de Umidade Máxima</label>
                    </div>

                    <div className="p-float-label">
                        <InputNumber id="battWarning" value={configValues.batt_warning} onValueChange={(e) => setConfigValues({...configValues, batt_warning: e.value})} suffix=" %" className="w-full" />
                        <label htmlFor="battWarning">Alerta de Bateria Baixa</label>
                    </div>
                </div>
            </Dialog>

            {/* Modal de Relatório */}
            <Dialog
                header="Relatório Completo (Excel)"
                visible={showReportDialog}
                style={{ width: 'min(400px, 90vw)' }}
                onHide={() => setShowReportDialog(false)}
            >
                <div className="flex flex-column gap-4 pt-2">
                    <div className="flex flex-column gap-2">
                        <label htmlFor="startDate" className="font-bold text-sm">Data Inicial</label>
                        <Calendar id="startDate" value={reportStartDate} onChange={(e) => setReportStartDate(e.value)}   dateFormat="dd/mm/yy" />
                    </div>
                    <div className="flex flex-column gap-2">
                        <label htmlFor="endDate" className="font-bold text-sm">Data Final</label>
                        <Calendar id="endDate" value={reportEndDate} onChange={(e) => setReportEndDate(e.value)}   dateFormat="dd/mm/yy" />
                    </div>
                    <Button label="Baixar Relatório" icon="pi pi-download" loading={reportLoading} onClick={handleDownloadReport} className="mt-2" />
                </div>
            </Dialog>
        </div>
    );
};

export default SensorDetailView;
