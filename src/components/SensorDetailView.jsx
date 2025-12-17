import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';

// URL do Webhook de Histórico (Configure no n8n para aceitar query params ?mac=...&range=...)
const N8N_HISTORY_URL = 'https://n8n.alcateia-ia.com/webhook/history';
const N8N_EDIT_SENSOR_URL = 'https://n8n.alcateia-ia.com/webhook/edit/sensor';

const SensorDetailView = ({ beacon, chartOptions, settings, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(beacon?.device_name || '');
    const [period, setPeriod] = useState('24h');
    const [historyData, setHistoryData] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useRef(null);

    // Sincroniza o nome ao mudar de beacon
    useEffect(() => {
        setNewName(beacon?.device_name || '');
    }, [beacon?.mac]);

    // --- FETCH HISTORY DO N8N (Disparado quando MAC ou Period mudam, e a cada 1 minuto) ---
    useEffect(() => {
        if (!beacon?.mac) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Monta a URL com Query Params
                const url = new URL(N8N_HISTORY_URL);
                url.searchParams.append('mac', beacon.mac);
                url.searchParams.append('range', period); // '1h', '24h', '7d'

                const response = await fetch(url.toString());
                
                if (!response.ok) throw new Error('Falha ao buscar histórico');

                const data = await response.json();
                
                // O n8n deve retornar um array de leituras. 
                // Se retornar { data: [...] }, ajuste para data.data
                const readings = Array.isArray(data) ? data : (data.data || []);
                setHistoryData(readings);

            } catch (error) {
                console.error("Erro ao carregar histórico:", error);
                toast.current?.show({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o histórico.', life: 3000 });
                setHistoryData([]); // Limpa em caso de erro
            } finally {
                setLoading(false);
            }
        };

        // Carrega imediatamente ao montar ou quando MAC/period mudam
        fetchHistory();
        
        // Configura intervalo de 1 minuto (60000 ms) para atualizar automaticamente
        const interval = setInterval(fetchHistory, 60000);
        
        // Limpa o intervalo quando o componente desmonta ou dependências mudam
        return () => clearInterval(interval);
    }, [beacon?.mac, period]); 

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

    // Processa os dados recebidos da API para o formato do Chart.js
    const chartData = useMemo(() => {
        if (!historyData || historyData.length === 0) return { labels: [], datasets: [] };

        // Ordena por data (garantia)
        const sorted = [...historyData].sort((a, b) => new Date(a.created_at || a.ts) - new Date(b.created_at || b.ts));

        const labels = [];
        const tempData = [];
        const humData = [];

        sorted.forEach(log => {
            // Suporta campos 'created_at' (banco) ou 'ts' (mqtt raw)
            const dateStr = log.created_at || log.ts; 
            if (!dateStr) return;

            const dateObj = new Date(dateStr);
            // Formatação do label eixo X
            const label = period === '7d' 
                ? dateObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' }) 
                : dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });

            labels.push(label);
            // Suporta 'temperature' (banco) ou 'temp' (raw)
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
    }, [historyData, period]);

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
                            <Button icon="pi pi-pencil" rounded text size="small" style={{ color: 'var(--text-secondary)', width: '2rem', height: '2rem' }} onClick={() => { setNewName(beacon.device_name || ''); setIsEditing(true); }} />
                        </div>
                        <span className="text-xs font-mono text-slate-500">{beacon.mac}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button label="Exportar CSV" icon="pi pi-download" size="small" style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', padding: '0.4rem 0.6rem' }} />
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
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPeriod('1h')} className={`text-xs font-bold ${period === '1h' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'} cursor-pointer px-3 py-1 rounded transition-colors border-none`}>1H</button>
                        <button type="button" onClick={() => setPeriod('24h')} className={`text-xs font-bold ${period === '24h' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'} cursor-pointer px-3 py-1 rounded transition-colors border-none`}>24H</button>
                        <button type="button" onClick={() => setPeriod('7d')} className={`text-xs font-bold ${period === '7d' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'} cursor-pointer px-3 py-1 rounded transition-colors border-none`}>7D</button>
                    </div>
                </div>
                <div className="flex-grow-1 relative">
                    {loading ? (
                        <div className="flex align-items-center justify-content-center h-full w-full">
                            <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="4" animationDuration=".5s"/>
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