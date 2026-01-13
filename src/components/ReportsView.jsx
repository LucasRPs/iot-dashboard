import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';

const REPORTS_API_URL = `${import.meta.env.VITE_API_BASE_URL}/sensores`;

const ReportsView = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                const response = await fetch(REPORTS_API_URL, {
                    headers: {
                        'x-api-key': import.meta.env.VITE_API_KEY
                    }
                });

                if (response.status === 401) {
                    localStorage.removeItem('alcateia_auth');
                    navigate('/login');
                    return;
                }

                const data = await response.json();
                setLogs(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Erro ao buscar relatórios:", error);
                setLogs([]);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    const header = (
        <div className="flex flex-wrap justify-content-between align-items-center py-2 px-3 surface-card border-bottom-1 surface-border">
            <div className="flex align-items-center gap-2">
                <i className="pi pi-table text-indigo-600"></i>
                <span className="text-900 font-bold text-sm">Histórico</span>
            </div>
            <span className="p-input-icon-left">
                <i className="pi pi-search text-gray-400" style={{ fontSize: '0.8rem' }} />
                <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Buscar..." className="custom-search-input w-15rem h-2rem text-xs pl-5" />
            </span>
        </div>
    );

    return (
        <div className="h-full flex flex-column p-2">
            <div className="tech-card overflow-hidden h-full flex flex-column border-none shadow-1">
                <DataTable value={logs} paginator rows={30} header={header} globalFilter={globalFilter} loading={loading} className="h-full flex flex-column" stripedRows sortField="ts" sortOrder={-1} size="small" emptyMessage="Nenhum registro." tableStyle={{ minWidth: '50rem' }} scrollable scrollHeight="flex">
                    <Column field="ts" header="Horário" sortable style={{ width: '14%' }} body={d => <span className="text-700 font-medium font-mono text-xs surface-100 px-1 border-round">{d.ts ? new Date(d.ts).toLocaleString('pt-BR') : d.timestamp}</span>} />
                    <Column field="gw" header="Gateway" sortable style={{ width: '12%' }} body={d => <span className="font-bold text-800 text-xs">{d.gw || '-'}</span>} />
                    <Column field="mac" header="MAC" sortable style={{ width: '16%' }} body={d => <span className="font-mono text-[10px] text-500">{d.mac}</span>} />
                    <Column field="temp" header="Temp" sortable body={d => <span className={`font-bold text-xs ${d.temp > 10 ? 'text-orange-600' : 'text-800'}`}>{d.temp}°C</span>} />
                    <Column field="hum" header="Umid" sortable body={d => <span className="text-sky-600 font-bold text-xs">{d.hum}%</span>} />
                    <Column field="batt" header="Bat" sortable style={{ width: '8%' }} body={d => (
                        <div className="flex align-items-center gap-1">
                            <div className="w-1.5rem surface-200 border-round-xl h-0.5rem overflow-hidden relative">
                                <div className={`h-full ${d.batt < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${d.batt}%` }}></div>
                            </div>
                            <span className="text-[10px] text-500">{d.batt}%</span>
                        </div>
                    )} />
                    <Column field="rssi" header="Sinal" sortable style={{ width: '8%' }} body={d => <span className="text-[10px] text-500 font-medium">{d.rssi} dBm</span>} />
                </DataTable>
            </div>
        </div>
    );
};

export default ReportsView;
