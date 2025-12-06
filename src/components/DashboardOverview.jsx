import React from 'react';

const OFFLINE_THRESHOLD_MS = 100000;

const DashboardOverview = ({ beacons, sectors, onSelect, settings }) => {
    const totalSensors = beacons.length;
    const activeSensors = beacons.filter(b => (Date.now() - new Date(b.lastSeen).getTime()) < OFFLINE_THRESHOLD_MS).length;
    const lowBatteryCount = beacons.filter(b => b.batt <= settings.lowBattery).length;
    const tempAlertCount = beacons.filter(b => b.temp > settings.tempAlert && b.temp <= settings.tempCritical).length;
    const tempCriticalCount = beacons.filter(b => b.temp > settings.tempCritical).length;

    return (
        <div className="fade-in h-full">
            {/* KPI WIDGETS */}
            <div className="grid mb-4">
                <div className="col-12 md:col-6 lg:col-3">
                    <div className="widget-card flex flex-column gap-2">
                        <div className="flex justify-content-between align-items-start">
                            <span className="text-label">Críticos</span>
                            <div className="w-2rem h-2rem bg-rose-50 rounded-circle flex align-items-center justify-content-center text-rose-500">
                                <i className="pi pi-exclamation-triangle"></i>
                            </div>
                        </div>
                        <span className="text-3xl font-bold text-slate-800 text-value">{tempCriticalCount}</span>
                        <div className="flex align-items-center gap-2 text-xs">
                            <span className="text-rose-600 font-bold">Alta Prioridade</span>
                            <span className="text-slate-400">Acima de {settings.tempCritical}°C</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 md:col-6 lg:col-3">
                    <div className="widget-card flex flex-column gap-2">
                        <div className="flex justify-content-between align-items-start">
                            <span className="text-label">Alertas</span>
                            <div className="w-2rem h-2rem bg-orange-50 rounded-circle flex align-items-center justify-content-center text-orange-500">
                                <i className="pi pi-info-circle"></i>
                            </div>
                        </div>
                        <span className="text-3xl font-bold text-slate-800 text-value">{tempAlertCount}</span>
                        <div className="flex align-items-center gap-2 text-xs">
                            <span className="text-orange-600 font-bold">Atenção</span>
                            <span className="text-slate-400">Acima de {settings.tempAlert}°C</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 md:col-6 lg:col-3">
                    <div className="widget-card flex flex-column gap-2">
                        <div className="flex justify-content-between align-items-start">
                            <span className="text-label">Online</span>
                            <div className="w-2rem h-2rem bg-emerald-50 rounded-circle flex align-items-center justify-content-center text-emerald-500">
                                <i className="pi pi-wifi"></i>
                            </div>
                        </div>
                        <span className="text-3xl font-bold text-slate-800 text-value">{activeSensors}/{totalSensors}</span>
                        <div className="flex align-items-center gap-2 text-xs">
                            <span className="text-emerald-600 font-bold">Monitorando</span>
                            <span className="text-slate-400">Dispositivos ativos</span>
                        </div>
                    </div>
                </div>
                <div className="col-12 md:col-6 lg:col-3">
                    <div className="widget-card flex flex-column gap-2">
                        <div className="flex justify-content-between align-items-start">
                            <span className="text-label">Bateria Baixa</span>
                            <div className="w-2rem h-2rem bg-purple-50 rounded-circle flex align-items-center justify-content-center text-purple-500">
                                <i className="pi pi-battery"></i>
                            </div>
                        </div>
                        <span className="text-3xl font-bold text-slate-800 text-value">{lowBatteryCount}</span>
                        <div className="flex align-items-center gap-2 text-xs">
                            <span className="text-purple-600 font-bold">Substituir</span>
                            <span className="text-slate-400">Abaixo de {settings.lowBattery}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTORS GRID */}
            <div className="flex flex-column gap-4">
                {sectors.map(sector => {
                    const sectorBeacons = beacons.filter(b => sector.macs.some(m => m.toLowerCase() === b.mac.toLowerCase()));
                    if (sectorBeacons.length === 0) return null;

                    return (
                        <div key={sector.id}>
                            <div className="flex align-items-center gap-2 mb-3 px-1">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{sector.name}</h3>
                                <div className="h-1px bg-gray-200 flex-grow-1"></div>
                            </div>
                            <div className="grid">
                                {sectorBeacons.map(beacon => {
                                    const isCritical = beacon.temp > settings.tempCritical;
                                    const isAlert = beacon.temp > settings.tempAlert && !isCritical;
                                    const isOffline = (Date.now() - new Date(beacon.lastSeen).getTime()) > OFFLINE_THRESHOLD_MS;

                                    return (
                                        <div key={beacon.mac} className="col-12 md:col-6 lg:col-4 xl:col-3">
                                            <div className={`sensor-grid-card ${isCritical ? 'border-rose-200 bg-rose-50/30' : ''} ${isOffline ? 'opacity-60 grayscale' : ''}`} onClick={() => onSelect(beacon)}>
                                                <div className="flex justify-content-between align-items-start mb-3">
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-800 block mb-1">{beacon.device_name || 'Sensor'}</span>
                                                        <span className="text-[10px] font-mono text-slate-400">{beacon.mac.slice(-5)}</span>
                                                    </div>
                                                    {isOffline ? <span className="status-badge neutral">Offline</span> : (
                                                        <>
                                                            {isCritical && <span className="status-badge danger">Crítico</span>}
                                                            {isAlert && <span className="status-badge warning">Alerta</span>}
                                                            {!isCritical && !isAlert && <span className="status-badge success">Normal</span>}
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex align-items-end justify-content-between">
                                                    <div>
                                                        <span className="text-label block mb-1">Temperatura</span>
                                                        <span className={`text-2xl font-bold text-value ${isCritical ? 'text-rose-600' : isAlert ? 'text-orange-600' : 'text-slate-700'}`}>
                                                            {beacon.temp}°C
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex align-items-center gap-1 justify-content-end text-slate-500 mb-1">
                                                            <i className="pi pi-tint text-[10px]"></i>
                                                            <span className="text-xs font-bold">Umidade {beacon.hum}%</span>
                                                        </div>
                                                        <div className="flex align-items-center gap-1 justify-content-end text-slate-500">
                                                            <i className="pi pi-battery text-[10px]"></i>
                                                            <span className="text-xs font-bold">Bateria {beacon.batt}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Unassigned Beacons */}
                {beacons.filter(b => !sectors.some(s => s.macs.some(m => m.toLowerCase() === b.mac.toLowerCase()))).length > 0 && (
                    <div>
                        <div className="flex align-items-center gap-2 mb-3 px-1">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Não Atribuídos</h3>
                            <div className="h-1px bg-gray-200 flex-grow-1"></div>
                        </div>
                        <div className="grid">
                            {beacons.filter(b => !sectors.some(s => s.macs.some(m => m.toLowerCase() === b.mac.toLowerCase()))).map(beacon => (
                                <div key={beacon.mac} className="col-12 md:col-6 lg:col-4 xl:col-3">
                                    <div className="sensor-grid-card opacity-80" onClick={() => onSelect(beacon)}>
                                        <div className="flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <span className="text-sm font-bold text-slate-700">{beacon.device_name || 'Sensor'}</span>
                                                {beacon.loc && <span className="text-xs text-slate-500 block mt-1">{beacon.loc}</span>}
                                            </div>
                                            <span className="status-badge neutral">Novo</span>
                                        </div>
                                        <div className="flex align-items-end justify-content-between">
                                            <span className="text-xl font-bold text-slate-600 text-value">{beacon.temp}°C</span>
                                            <span className="text-xs text-slate-400 font-mono">{beacon.mac}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardOverview;
