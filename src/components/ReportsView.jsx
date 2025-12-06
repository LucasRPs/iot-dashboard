import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';

const ReportsView = ({ logs }) => {
    const [globalFilter, setGlobalFilter] = useState('');

    const header = (
        <div className="flex flex-wrap justify-content-between align-items-center py-2 px-3 bg-white border-bottom-1 border-gray-100">
            <div className="flex align-items-center gap-2">
                <i className="pi pi-table text-indigo-600"></i>
                <span className="text-slate-800 font-bold text-sm">Histórico</span>
            </div>
            <span className="p-input-icon-right">
                <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Buscar..." className="custom-search-input w-15rem h-2rem text-xs" />

            </span>
        </div>
    );

    return (
        <div className="h-full flex flex-column fadein animation-duration-500 p-2">
            <div className="tech-card overflow-hidden h-full flex flex-column border-none shadow-1 animate-enter">
                <DataTable value={logs} paginator rows={30} header={header} globalFilter={globalFilter} className="h-full flex flex-column" stripedRows sortField="ts" sortOrder={-1} size="small" emptyMessage="Nenhum registro." tableStyle={{ minWidth: '50rem' }} scrollable scrollHeight="flex">
                    <Column field="ts" header="Horário" sortable style={{ width: '15%' }} body={d => <span className="text-slate-600 font-medium font-mono text-xs bg-slate-50 px-1 border-round">{d.ts ? new Date(d.ts).toLocaleString('pt-BR') : d.timestamp}</span>} />
                    <Column field="device_name" header="Gateway" sortable style={{ width: '20%' }} body={d => <span className="font-bold text-slate-700 text-xs">{d.gw}</span>} />
                    <Column field="mac" header="MAC" sortable className="font-mono text-[10px] text-gray-400" />
                    <Column field="temp" header="Temp" sortable body={d => <span className={`font-bold text-xs ${d.temp > 10 ? 'text-orange-600' : 'text-slate-700'}`}>{d.temp}°C</span>} />
                    <Column field="hum" header="Umid" sortable body={d => <span className="text-sky-600 font-bold text-xs">{d.hum}%</span>} />
                    <Column field="batt" header="Bat" sortable style={{ width: '10%' }} body={d => (
                        <div className="flex align-items-center gap-1">
                            <div className="w-1.5rem bg-gray-200 border-round-xl h-0.5rem overflow-hidden relative">
                                <div className={`h-full ${d.batt < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${d.batt}%` }}></div>
                            </div>
                            <span className="text-[10px] text-gray-500">{d.batt}%</span>
                        </div>
                    )} />
                    <Column field="rssi" header="Sinal" sortable style={{ width: '10%' }} body={d => <span className="text-[10px] text-gray-500 font-medium">{d.rssi} dBm</span>} />
                </DataTable>
            </div>
        </div>
    );
};

export default ReportsView;
