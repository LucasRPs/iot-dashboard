import React, { useMemo } from 'react';
import { Tag } from 'primereact/tag';

const GatewaysView = ({ messageLog, beacons, onSelectBeacon }) => {
    // Extract unique gateways and their associated sensors/MACs from messageLog
    const gatewayData = useMemo(() => {
        if (!messageLog || messageLog.length === 0) return [];

        const gatewayMap = new Map();

        messageLog.forEach(log => {
            const gw = log.gw || 'Desconhecido';
            if (!gatewayMap.has(gw)) {
                gatewayMap.set(gw, {
                    gateway: gw,
                    macs: new Set(),
                    // store raw ts (ISO) if available, fallback to existing timestamp field
                    lastSeen: log.ts || log.timestamp,
                    deviceCount: 0
                });
            }
            const entry = gatewayMap.get(gw);
            entry.macs.add(log.mac);
            entry.lastSeen = log.ts || log.timestamp; // Most recent (logs are newest-first)
            entry.deviceCount = entry.macs.size;
        });

        // Convert to array and sort by gateway name
        return Array.from(gatewayMap.values())
            .map(entry => ({
                ...entry,
                macs: Array.from(entry.macs).sort(), // Sort MACs for consistent ordering
                // Format lastSeen for display (if present)
                lastSeen: entry.lastSeen ? new Date(entry.lastSeen).toLocaleString('pt-BR') : ''
            }))
            .sort((a, b) => a.gateway.localeCompare(b.gateway));
    }, [messageLog]);

    // Helper to get device name from MAC
    const getDeviceName = (mac) => {
        const beacon = beacons?.find(b => b.mac === mac);
        return beacon?.device_name || mac.slice(-5);
    };

    return (
        <div className="fadein animation-duration-500 h-full flex flex-column p-2">
            <div className="tech-card p-4 h-full flex flex-column animate-enter">
                <div className="flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="m-0 text-slate-800 text-lg font-bold">Gateways</h2>
                        <p className="text-gray-500 text-xs mt-0">Visualize os gateways e seus dispositivos vinculados.</p>
                    </div>
                </div>

                {/* Grid of Gateway Cards */}
                <div className="grid flex-grow-1 overflow-y-auto custom-scrollbar">
                    {gatewayData.length === 0 ? (
                        <div className="col-12 flex align-items-center justify-content-center h-20rem text-slate-400">
                            <div className="text-center">
                                <i className="pi pi-server text-4xl mb-2"></i>
                                <p className="text-sm font-medium">Nenhum gateway detectado</p>
                            </div>
                        </div>
                    ) : (
                        gatewayData.map((gw, i) => (
                            <div key={i} className="col-12 md:col-6 lg:col-3">
                                <div className="widget-card p-3 flex flex-column gap-2">
                                    {/* Gateway Header */}
                                    <div className="flex justify-content-between align-items-start gap-2">
                                        <div className="flex-grow-1">
                                            <h4 className="m-0 text-slate-800 font-bold text-xs">{gw.gateway}</h4>
                                        </div>
                                        <Tag value={gw.deviceCount} className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5" />
                                    </div>

                                    {/* Devices List */}
                                    <div className="flex flex-column gap-2.5">
                                        {gw.macs.map((mac, j) => (
                                            <div
                                                key={mac}
                                                className="text-slate-700 font-medium text-base cursor-pointer hover:text-indigo-600 hover:font-bold transition-all p-2 bg-slate-50 border-round-lg"
                                                onClick={() => {
                                                    const beacon = beacons?.find(b => b.mac === mac);
                                                    if (beacon && onSelectBeacon) {
                                                        onSelectBeacon(beacon);
                                                    }
                                                }}
                                            >
                                                • {getDeviceName(mac)}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Footer - Last Seen */}
                                    <span className="text-[9px] text-slate-400 font-mono mt-1 border-top-1 border-gray-200 pt-1">{gw.lastSeen}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default GatewaysView;
