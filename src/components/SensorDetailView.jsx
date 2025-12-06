import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'primereact/chart';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';

const SensorDetailView = ({ beacon, history, chartOptions, messageLog, settings, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(beacon?.device_name || '');
    const toast = useRef(null);

    // Keep newName in sync when a different beacon is selected
    useEffect(() => {
        setNewName(beacon?.device_name || '');
    }, [beacon?.mac]);

    if (!beacon) return null;

    const handleSaveName = () => {
        const trimmed = (newName || '').trim();
        if (!trimmed) {
            toast.current?.show({ severity: 'warn', summary: 'Aviso', detail: 'Nome não pode ficar vazio', life: 2500 });
            return;
        }
        onUpdate({ ...beacon, device_name: trimmed });
        toast.current?.show({ severity: 'success', summary: 'Salvo', detail: 'Nome do sensor atualizado', life: 1800 });
        setIsEditing(false);
    };

    // Build chart data from messageLog (all historical data) filtered by sensor MAC
    // Use `ts` if present and sort by it to provide stable ordering
    const { labels, tempData, humData } = (() => {
        const logs = (messageLog || []).filter(log => log.mac === beacon.mac).slice();
        logs.sort((a, b) => {
            const ta = a.ts ? new Date(a.ts).getTime() : a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.ts ? new Date(b.ts).getTime() : b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return ta - tb;
        });

        const labels = [];
        const tempData = [];
        const humData = [];

        logs.forEach(log => {
            const tsVal = log.ts || log.timestamp || '';
            labels.push(tsVal ? new Date(tsVal).toLocaleTimeString('pt-BR') : '');
            tempData.push(log.temp || 0);
            humData.push(log.hum || 0);
        });

        return { labels, tempData, humData };
    })();

    const chartData = {
        labels,
        datasets: [
            { label: 'Temp', data: tempData, borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', yAxisID: 'y', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 },
            { label: 'Umid', data: humData, borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.05)', yAxisID: 'y1', fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2 }
        ]
    };

    return (
        <div className="fade-in h-full flex flex-column gap-4">
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

            {/* Metrics Grid */}
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

            {/* Chart Section */}
            <div className="widget-card flex-grow-1 flex flex-column min-h-0">
                <div className="flex justify-content-between align-items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-700">Histórico de Temperatura</h3>
                    <div className="flex gap-2">
                        <span className="text-xs font-bold text-slate-400 cursor-pointer hover:text-indigo-600">1H</span>
                        <span className="text-xs font-bold text-indigo-600 cursor-pointer">24H</span>
                        <span className="text-xs font-bold text-slate-400 cursor-pointer hover:text-indigo-600">7D</span>
                    </div>
                </div>
                <div className="flex-grow-1 relative">
                    <Chart type="line" data={chartData} options={chartOptions} className="h-full w-full absolute" />
                </div>
            </div>

            <Dialog header="Editar Sensor" visible={isEditing} style={{ width: '300px' }} onHide={() => setIsEditing(false)}>
                <div className="field">
                    <label htmlFor="devName" className="block text-sm font-bold text-slate-700 mb-2">Nome do Dispositivo</label>
                    <InputText id="devName" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus className="w-full" />
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancelar" text onClick={() => setIsEditing(false)} style={{ color: 'var(--text-secondary)' }} />
                    <Button label="Salvar" onClick={handleSaveName} className="btn-primary" />
                </div>
            </Dialog>
        </div>
    );
};

export default SensorDetailView;
