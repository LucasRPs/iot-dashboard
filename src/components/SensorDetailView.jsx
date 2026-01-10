import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import { SelectButton } from 'primereact/selectbutton';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';

// --- CONSTANTS ---
const N8N_HISTORY_URL = 'https://n8n.alcateia-ia.com/webhook/history';
const N8N_EDIT_SENSOR_URL = 'https://n8n.alcateia-ia.com/webhook/edit/sensor';
const N8N_CONFIG_URL = 'https://n8n.alcateia-ia.com/webhook/sensor/configuration';
const periodOptions = [
    { label: '1H', value: '1h' },
    { label: '24H', value: '24h' },
    { label: '7D', value: '7d' }
];

// --- CUSTOM HOOKS (could be moved to a separate hooks file) ---

/**
 * Fetches sensor history data from the API.
 * @param {string} mac - The MAC address of the sensor.
 * @param {string} period - The time range for the history ('1h', '24h', '7d').
 */
const useSensorHistory = (mac, period) => {
    const [historyData, setHistoryData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!mac) return;

        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const url = new URL(N8N_HISTORY_URL);
                url.searchParams.append('mac', mac);
                url.searchParams.append('range', period);

                const response = await fetch(url.toString());
                if (!response.ok) throw new Error('Falha ao buscar histórico');

                const data = await response.json();
                const readings = Array.isArray(data) ? data : (data.data || []);
                setHistoryData(readings);
            } catch (err) {
                console.error("Erro ao carregar histórico:", err);
                setError(err);
                setHistoryData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
        const interval = setInterval(fetchHistory, 60000);

        return () => clearInterval(interval);
    }, [mac, period]);

    return { historyData, loading, error };
};

/**
 * Fetches and syncs sensor configuration (e.g., display name).
 * @param {object} beacon - The current beacon object.
 * @param {function} onUpdate - Callback to update the beacon's data.
 */
const useSensorConfig = (beacon, onUpdate) => {
    useEffect(() => {
        if (!beacon?.mac || !onUpdate) return;

        const fetchConfig = async () => {
            try {
                const url = new URL(N8N_CONFIG_URL);
                url.searchParams.append('mac', beacon.mac);
                const response = await fetch(url.toString());
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0 && data[0].display_name && data[0].display_name !== beacon.device_name) {
                        onUpdate({ ...beacon, device_name: data[0].display_name });
                    }
                }
            } catch (error) {
                console.error("Erro ao buscar configuração do sensor:", error);
            }
        };

        fetchConfig();
    }, [beacon?.mac, beacon?.device_name, onUpdate]);
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

    const sorted = [...historyData].sort((a, b) => new Date(a.created_at || a.ts) - new Date(b.created_at || b.ts));

    const labels = [];
    const tempData = [];
    const humData = [];

    sorted.forEach(log => {
        const dateStr = log.created_at || log.ts;
        if (!dateStr) return;

        const dateObj = new Date(dateStr);
        const label = period === '7d'
            ? dateObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            : dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        labels.push(label);
        tempData.push(Number(log.temperature ?? log.temp ?? 0));
        humData.push(Number(log.humidity ?? log.hum ?? 0));
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
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(beacon?.device_name || '');
    const [period, setPeriod] = useState('24h');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useRef(null);

    // Sincroniza o nome ao mudar de beacon
    useEffect(() => {
        setNewName(beacon?.device_name || '');
    }, [beacon?.device_name]);

    // --- DATA FETCHING ---
    useSensorConfig(beacon, onUpdate);
    const { historyData, loading, error: historyError } = useSensorHistory(beacon?.mac, period);

    // --- ERROR HANDLING ---
    useEffect(() => {
        if (historyError) {
            toast.current?.show({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o histórico.', life: 3000 });
        }
    }, [historyError]);

    if (!beacon) return null;

    const handleSaveName = async () => {
        const trimmed = (newName || '').trim();
        if (!trimmed) {
            toast.current?.show({ severity: 'warn', summary: 'Aviso', detail: 'Nome não pode ficar vazio', life: 2500 });
            return;
        }

        setIsSaving(true);
        try {
            const url = new URL(N8N_EDIT_SENSOR_URL);
            url.searchParams.append('mac', beacon.mac);
            url.searchParams.append('name', trimmed);

            const response = await fetch(url.toString(), {
                method: 'PUT',
            });

            if (!response.ok) {
                throw new Error('Falha ao atualizar o nome do sensor na API.');
            }

            onUpdate({ ...beacon, device_name: trimmed });
            toast.current?.show({ severity: 'success', summary: 'Salvo', detail: 'Nome do sensor atualizado', life: 1800 });
            setIsEditing(false);
        } catch (error) {
            console.error("Erro ao salvar nome do sensor:", error);
            toast.current?.show({ severity: 'error', summary: 'Erro', detail: 'Não foi possível salvar o novo nome.', life: 3000 });
        } finally {
            setIsSaving(false);
        }
    };

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
                            <h1 className="text-2xl font-bold text-slate-800 m-0">{beacon.device_name || 'Sensor'}</h1>
                            <Button icon="pi pi-pencil" rounded text size="small" tooltip="Editar nome" tooltipOptions={{ position: 'top' }} style={{ color: 'var(--text-secondary)', width: '2rem', height: '2rem' }} onClick={() => { setNewName(beacon.device_name || ''); setIsEditing(true); }} />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{beacon.mac}</span>
                    </div>
                </div>
                <div className="flex gap-2">
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
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                            <span className="font-bold">Faixa Segura:</span> -20°C a {settings.tempAlert}°C
                        </div>
                    </div>
                </div>
                <div className="col-12 md:col-4">
                    <div className="widget-card h-full">
                        <span className="text-label block mb-2">Umidade</span>
                        <div className="flex align-items-baseline gap-2">
                            <span className="text-4xl font-bold text-slate-800 text-value">{beacon.hum}</span>
                            <span className="text-lg text-slate-400">%</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-500">
                            Ambiente controlado
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

            <Dialog header="Editar Sensor" visible={isEditing} style={{ width: '300px' }} onHide={() => setIsEditing(false)}>
                <div className="field">
                    <label htmlFor="devName" className="block text-sm font-bold text-slate-700 mb-2">Nome do Dispositivo</label>
                    <InputText id="devName" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus className="w-full" />
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancelar" text onClick={() => setIsEditing(false)} style={{ color: 'var(--text-secondary)' }} disabled={isSaving} />
                    <Button label="Salvar" onClick={handleSaveName} className="btn-primary" loading={isSaving} />
                </div>
            </Dialog>
        </div>
    );
};

export default SensorDetailView;