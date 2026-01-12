import React from 'react';

const OFFLINE_THRESHOLD_MS = 3600000; // 1 hora

const DashboardOverview = ({ beacons, sectors, onSelect, settings }) => {
    const unassignedBeacons = beacons.filter(b => !sectors.some(s => s.macs.some(m => m.toLowerCase() === b.mac.toLowerCase())));

    return (
        <div className="h-full">
            {/* SECTORS GRID */}
            <div className="grid">
                {/* Unassigned Beacons */}
                {unassignedBeacons.length > 0 && (
                    <div className="col-12">
                        <div className="flex align-items-center gap-2 mb-3 px-1">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Não Atribuídos</h3>
                            <div className="h-1px bg-gray-200 flex-grow-1"></div>
                        </div>
                        <div className="grid">
                            {unassignedBeacons.map(beacon => (
                                <div key={beacon.mac} className="col-12 md:col-6 xl:col-3">
                                    <div className="sensor-grid-card opacity-80 h-full" onClick={() => onSelect(beacon)}>
                                        <div className="flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <span className="text-sm font-bold text-slate-700">{beacon.display_name || beacon.device_name || 'Sensor'}</span>
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

                {sectors.map(sector => {
                    const sectorBeacons = beacons.filter(b => sector.macs.some(m => m.toLowerCase() === b.mac.toLowerCase()));
                    if (sectorBeacons.length === 0) return null;

                    return (
                        <div key={sector.id} className="col-12">
                            <div className="flex align-items-center gap-2 mb-3 px-1">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">{sector.name}</h3>
                                <div className="h-1px bg-gray-200 flex-grow-1"></div>
                            </div>
                            <div className="grid">
                                {sectorBeacons.map(beacon => {
                                    const isOffline = (Date.now() - new Date(beacon.lastSeen).getTime()) > OFFLINE_THRESHOLD_MS;

                                    return (
                                        <div key={beacon.mac} className="col-12 md:col-6 xl:col-3">
                                            <div className={`sensor-grid-card h-full ${isOffline ? 'opacity-60 grayscale' : ''}`} onClick={() => onSelect(beacon)}>
                                                <div className="flex justify-content-between align-items-start mb-3">
                                                    <div>
                                                        <span className="text-sm font-bold text-slate-800 block mb-1">{beacon.display_name || beacon.device_name || 'Sensor'}</span>
                                                        <span className="text-[10px] font-mono text-slate-400">{beacon.mac.slice(-5)}</span>
                                                    </div>
                                                    {isOffline ? <span className="status-badge neutral">Offline</span> : <span className="status-badge success">Online</span>}
                                                </div>

                                                <div className="flex align-items-end justify-content-between">
                                                    <div>
                                                        <span className="text-label block mb-1">Temperatura</span>
                                                        <span className="text-2xl font-bold text-value text-slate-700">
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
            </div>
        </div>
    );
};

export default DashboardOverview;
