import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';

// --- CONSTANTS ---
const N8N_HISTORY_URL = `${import.meta.env.VITE_API_BASE_URL}/sensores`;
const SENSOR_CONFIG_URL = `${import.meta.env.VITE_API_BASE_URL}/dispositivos`;
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

    useEffect(() => {
        if (!mac) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const url = new URL(`${N8N_HISTORY_URL}/${mac}`);
                url.searchParams.append('period', period);

                const response = await fetch(url.toString(), {
                    headers: {
                        'x-api-key': import.meta.env.VITE_API_KEY
                    }
                });
                if (!response.ok) throw new Error('Falha ao buscar dados do sensor');

                const data = await response.json();
                
                setHistoryData(data.history || []);
                setSensorInfo(data.info || null);
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
        const interval = setInterval(fetchData, 60000);

        return () => clearInterval(interval);
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
                label: 'Temp',
                data: tempData,
                borderColor: '#f97316',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                yAxisID: 'y',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            },
            {
                label: 'Umid',
                data: humData,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.05)',
                yAxisID: 'y1',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2
            }
        ]
    };
};

const SensorDetailView = ({ beacon, chartOptions, settings, onUpdate }) => {
    const [period, setPeriod] = useState('24h');
    const [displayConfig, setDisplayConfig] = useState(false);
    const [configValues, setConfigValues] = useState({
        display_name: '',
        max_temp: null,
        max_hum: null,
        batt_warning: null
    });
    const toast = useRef(null);

    // --- DATA FETCHING ---
    const { historyData, sensorInfo, loading, error: historyError } = useSensorData(beacon?.mac, period);

    useEffect(() => {
        const source = sensorInfo || beacon;
        if (source) {
            setConfigValues({
                display_name: source.display_name || '',
                max_temp: source.temp_max || source.max_temp || null,
                max_hum: source.hum_max || source.max_hum || null,
                batt_warning: source.batt_warning || null
            });
        }
    }, [beacon, sensorInfo]);

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

    // --- ERROR HANDLING ---
    useEffect(() => {
        if (historyError) {
            toast.current?.show({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o histórico.', life: 3000 });
        }
    }, [historyError]);

    if (!beacon) return null;

    const chartData = useMemo(() => processHistoryForChart(historyData, period), [historyData, period]);

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
                            <h1 className="text-2xl font-bold text-slate-800 m-0">{sensorInfo?.display_name || beacon.display_name || beacon.device_name || 'Sensor'}</h1>
                        </div>
                        <span className="text-xs font-mono text-slate-500">{beacon.mac}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button icon="pi pi-cog" rounded text severity="secondary" aria-label="Configurações" onClick={() => setDisplayConfig(true)} />
                    {/* TODO: Implementar a funcionalidade de exportação de CSV */}
                    <Button label="Exportar CSV" icon="pi pi-download" size="small" disabled style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.6rem' }} />
                </div>
            </div>

            {/* Metrics Grid (Dados em tempo real vindo da prop 'beacon' do App.jsx) */}
            <div className="grid">
                <div className="col-12 md:col-4">
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Temperatura</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className={`text-4xl font-bold text-value ${beacon.temp > settings.tempCritical ? 'text-rose-600' : beacon.temp > settings.tempAlert ? 'text-orange-600' : 'text-slate-800'}`}>
                                {beacon.temp}
                            </span>
                            <span className="text-lg text-slate-400">°C</span>
                            {sensorInfo?.temp_max && <span className="text-sm text-slate-400 ml-1">/ {sensorInfo.temp_max}°C</span>}
                        </div>
                        
                    </div>
                </div>
                <div className="col-12 md:col-4">
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Umidade</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className="text-4xl font-bold text-slate-800 text-value">{beacon.hum}</span>
                            <span className="text-lg text-slate-400">%</span>
                            {sensorInfo?.hum_max && <span className="text-sm text-slate-400 ml-1">/ {sensorInfo.hum_max}%</span>}
                        </div>
                       
                    </div>
                </div>
                <div className="col-12 md:col-4">
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Bateria</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className={`text-4xl font-bold text-value ${beacon.batt < settings.lowBattery ? 'text-rose-600' : 'text-slate-800'}`}>
                                {beacon.batt}
                            </span>
                            <span className="text-lg text-slate-400">%</span>
                            {sensorInfo?.batt_warning && <span className="text-sm text-slate-400 ml-1">/ {sensorInfo.batt_warning}%</span>}
                        </div>
                        <div className="mt-3 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                            <div className={`h-full ${beacon.batt < settings.lowBattery ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${beacon.batt}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Section (Dados históricos vindo da API) */}
            <div className="widget-card flex-grow-1 flex flex-column min-h-0">
                <div className="flex justify-content-between align-items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Histórico de Temperatura</h3>
                    <SelectButton 
                        value={period} 
                        options={periodOptions} 
                        onChange={(e) => e.value && setPeriod(e.value)} 
                        unselectable={false}
                    />
                </div>
                <div className="flex-grow-1 relative">
                    {loading ? (
                        <div className="flex align-items-center justify-content-center h-full w-full">
                            <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="4" animationDuration=".5s"/>
                        </div>
                    ) : (!historyData || historyData.length === 0) ? (
                        <div className="flex flex-column align-items-center justify-content-center h-full w-full text-slate-400">
                            <i className="pi pi-info-circle text-4xl mb-3 opacity-20"></i>
                            <span className="text-sm font-medium opacity-60">Nenhum dado histórico disponível para este período.</span>
                        </div>
                    ) : (
                        <Chart type="line" data={chartData} options={chartOptions} className="h-full w-full absolute" />
                    )}
                </div>
            </div>

            <Dialog header="Configuração do Sensor" visible={displayConfig} style={{ width: '400px' }} onHide={() => setDisplayConfig(false)} modal className="p-fluid">
                <div className="flex flex-column gap-4 pt-2">
                    <div className="field">
                        <label htmlFor="display_name" className="text-sm font-bold text-slate-700 block mb-2">Nome de Exibição</label>
                        <InputText id="display_name" value={configValues.display_name} onChange={(e) => setConfigValues({...configValues, display_name: e.target.value})} placeholder="Ex: Geladeira 01" />
                    </div>
                    <div className="field">
                        <label htmlFor="max_temp" className="text-sm font-bold text-slate-700 block mb-2">Temperatura Máxima (°C)</label>
                        <InputNumber id="max_temp" value={configValues.max_temp} onValueChange={(e) => setConfigValues({...configValues, max_temp: e.value})} minFractionDigits={1} maxFractionDigits={2}   step={0.5} inputClassName="text-center" />
                    </div>
                    <div className="field">
                        <label htmlFor="max_hum" className="text-sm font-bold text-slate-700 block mb-2">Umidade Máxima (%)</label>
                        <InputNumber id="max_hum" value={configValues.max_hum} onValueChange={(e) => setConfigValues({...configValues, max_hum: e.value})} minFractionDigits={1} maxFractionDigits={2}   step={1} inputClassName="text-center" />
                    </div>
                    <div className="field">
                        <label htmlFor="batt_warning" className="text-sm font-bold text-slate-700 block mb-2">Alerta de Bateria (%)</label>
                        <InputNumber id="batt_warning" value={configValues.batt_warning} onValueChange={(e) => setConfigValues({...configValues, batt_warning: e.value})} min={0} max={100} step={5} inputClassName="text-center" />
                    </div>
                </div>
                <div className="flex justify-content-end gap-2 mt-5">
                    <Button label="Cancelar" text onClick={() => setDisplayConfig(false)} className="text-slate-500 text-sm" />
                    <Button label="Salvar" onClick={handleSaveConfig} className="btn-primary text-sm px-4" />
                </div>
            </Dialog>
        </div>
    );
};

export default SensorDetailView;