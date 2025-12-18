import React, { useState, useEffect, useMemo } from 'react';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { InputMask } from 'primereact/inputmask';
import { Button } from 'primereact/button';

const SENSORS_API_URL = 'https://n8n.alcateia-ia.com/webhook/gateway/beacon/list';
const GATEWAY_RESET_URL = 'https://n8n.alcateia-ia.com/webhook/gateway/reset';
const GATEWAY_ADD_MAC_URL = 'https://n8n.alcateia-ia.com/webhook/gateway/new-mac';

const GatewaysView = ({ onSelectBeacon }) => {
    const [beacons, setBeacons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [macInputs, setMacInputs] = useState({});

    useEffect(() => {
        const fetchGatewayData = async () => {
            setLoading(true);
            try {
                const response = await fetch(SENSORS_API_URL);
                if (!response.ok) throw new Error('Falha ao buscar dados dos sensores.');
                
                const data = await response.json();
                const sensorList = Array.isArray(data) ? data : (data.data || []);
                setBeacons(sensorList);
            } catch (error) {
                console.error("Erro ao carregar dados para GatewaysView:", error);
                setBeacons([]);
            } finally {
                setLoading(false);
            }
        };

        fetchGatewayData();
    }, []);

    // Agrupa os beacons por gateway
    const gatewayData = useMemo(() => {
        if (!beacons || beacons.length === 0) return [];

        const gatewayMap = new Map();

        beacons.forEach(beacon => {
            // Normaliza os dados do beacon para consistência
            const normalizedBeacon = {
                ...beacon,
                lastSeen: new Date(beacon.ts || beacon.last_seen || 0),
                display_name: beacon.display_name || beacon.name,
                device_name: beacon.device_name || `Sensor ${beacon.mac}`
            };
            const gwIdentifier = normalizedBeacon.gw || normalizedBeacon.gateway || 'Desconhecido';
            if (!gatewayMap.has(gwIdentifier)) {
                gatewayMap.set(gwIdentifier, {
                    gateway: gwIdentifier,
                    beacons: [],
                    lastSeen: new Date(0) // Inicia com data mínima
                });
            }
            const entry = gatewayMap.get(gwIdentifier);
            entry.beacons.push(normalizedBeacon);

            // Atualiza o lastSeen do gateway para o mais recente entre seus beacons
            if (normalizedBeacon.lastSeen > entry.lastSeen) {
                entry.lastSeen = normalizedBeacon.lastSeen;
            }
        });

        // Converte o mapa para um array, formata e ordena
        return Array.from(gatewayMap.values())
            .map(entry => ({
                ...entry,
                deviceCount: entry.beacons.length,
                lastSeen: entry.lastSeen > new Date(0) ? entry.lastSeen.toLocaleString('pt-BR') : '',
                beacons: entry.beacons.sort((a, b) => (a.display_name || a.device_name).localeCompare(b.display_name || b.device_name))
            }))
            .sort((a, b) => a.gateway.localeCompare(b.gateway));
    }, [beacons]);

    const handleCreateHotspot = async (gatewayMac) => {
        try {
            const url = new URL(GATEWAY_RESET_URL);
            url.searchParams.append('gw', gatewayMac);
            await fetch(url.toString());
        } catch (error) {
            console.error("Erro ao solicitar hotspot:", error);
        }
    };

    const handleAddMac = async (gatewayMac) => {
        const newMac = macInputs[gatewayMac];
        if (!newMac) return;

        try {
            const url = new URL(GATEWAY_ADD_MAC_URL);
            url.searchParams.append('gw', gatewayMac);
            url.searchParams.append('newMac', newMac);
            await fetch(url.toString(), {
                method: 'POST'
            });
            setMacInputs(prev => ({ ...prev, [gatewayMac]: '' }));
        } catch (error) {
            console.error("Erro ao adicionar MAC:", error);
        }
    };

    return (
        <div className="h-full flex flex-column p-2">
            <div className="tech-card p-4 h-full flex flex-column">
                <div className="flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="m-0 text-slate-800 text-lg font-bold">Gateways</h2>
                        <p className="text-gray-500 text-xs mt-0">Visualize os gateways e seus dispositivos vinculados.</p>
                    </div>
                </div>

                {/* Grid of Gateway Cards */}
                <div className="grid flex-grow-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="col-12 flex align-items-center justify-content-center h-20rem">
                            <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="4" />
                        </div>
                    ) : gatewayData.length === 0 ? (
                        <div className="col-12 flex align-items-center justify-content-center h-20rem text-slate-400">
                            <div className="text-center">
                                <i className="pi pi-server text-4xl mb-2"></i>
                                <p className="text-sm font-medium">Nenhum gateway detectado</p>
                            </div>
                        </div>
                    ) : (
                        gatewayData.map((gw) => (
                            <div key={gw.gateway} className="col-12 md:col-6 lg:col-3">
                                <div className="widget-card p-3 flex flex-column gap-2">
                                    {/* Gateway Header */}
                                    <div className="flex justify-content-between align-items-start gap-2">
                                        <div className="flex-grow-1">
                                            <h4 className="m-0 text-slate-800 font-bold text-xs">{gw.gateway}</h4>
                                        </div>
                                        <Tag value={gw.deviceCount} className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5" />
                                    </div>

                                    {/* Devices List */}
                                    <div className="flex flex-column gap-2 mt-2">
                                        {gw.beacons.map((beacon) => (
                                            <div
                                                key={beacon.mac}
                                                className="text-slate-700 font-medium text-sm cursor-pointer hover:text-indigo-600 transition-all p-2 bg-slate-50/80 border-round-md"
                                                onClick={() => onSelectBeacon(beacon)}
                                            >
                                                <i className="pi pi-box text-xs mr-2 text-slate-400"></i>
                                                {beacon.display_name || beacon.device_name || beacon.mac.slice(-5)}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Device Input */}
                                    <div className="flex gap-2 mt-3 pt-2 border-top-1 border-gray-100 align-items-center">
                                        <InputMask 
                                            mask="**:**:**:**:**:**" 
                                            value={macInputs[gw.gateway] || ''} 
                                            onChange={(e) => setMacInputs(prev => ({ ...prev, [gw.gateway]: e.value }))}
                                            placeholder="Adicionar MAC do sensor"
                                            className="p-inputtext-sm w-full text-xs h-2rem"
                                        />
                                        <Button 
                                            icon="pi pi-plus" 
                                            className="p-button-rounded p-button-text w-2rem h-2rem" 
                                            onClick={() => handleAddMac(gw.gateway)}
                                        />
                                    </div>

                                    <Button 
                                        label="Criar hotspot do gateway" 
                                        className="p-button-outlined p-button-secondary w-full mt-2 text-xs py-1" 
                                        onClick={() => handleCreateHotspot(gw.gateway)}
                                    />

                                    {/* Footer - Last Seen */}
                                    <span className="text-[9px] text-slate-400 font-mono mt-1">{gw.lastSeen}</span>
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
