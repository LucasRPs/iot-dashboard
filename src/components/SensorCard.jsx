import React, { useState, useEffect, memo } from 'react';
import { Tag } from 'primereact/tag';

const OFFLINE_THRESHOLD_MS = 60000; // 1 minuto

const SensorCard = memo(({ beacon, onClick }) => {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const isOffline = (now - new Date(beacon.lastSeen).getTime()) > OFFLINE_THRESHOLD_MS;
    const isLocked = String(beacon.locked) === 'true' || beacon.locked === true || beacon.locked === 1;
    const hasLockInfo = beacon.locked !== undefined && beacon.locked !== null;

    const getStatusBadge = () => {
        if (isOffline) return <div className="status-badge offline">Offline</div>;
        return <div className="status-badge online">Online</div>;
    };

    return (
        <div
            className={`sensor-card ${isOffline ? 'offline' : ''}`}
            onClick={() => onClick(beacon)}
        >
            <div className="card-header">
                <div className="flex align-items-center gap-2 overflow-hidden">
                    <span className="sensor-name white-space-nowrap overflow-hidden text-overflow-ellipsis">{beacon.display_name || beacon.device_name || 'Sensor'}</span>
                </div>
                {getStatusBadge()}
            </div>
            <div className="card-body">
                <div className="temperature">
                    <span style={{fontSize:"16px", paddingRight:"5px", color: 'var(--text-color-secondary)'}}>Temp</span>
                    {beacon.temp}°C
                </div>
            </div>
            <div className="card-footer">
                <div className="sensor-info">
                    <i className="pi pi-tint"></i>
                    <span>Umidade</span>
                    <span>{beacon.hum}%</span>
                </div>
                <div className="sensor-info">
                    <i className="pi pi-battery"></i>
                    <span>Bateria</span>
                    <span>{beacon.batt}%</span>
                </div>
                <div className="sensor-mac">{beacon.mac.slice(-5)}</div>
                {hasLockInfo && (
                    <Tag 
                        severity={isLocked ? 'danger' : 'success'} 
                        value={isLocked ? 'Porta Fechada' : 'Porta Aberta'} 
                        icon={isLocked ? 'pi pi-lock' : 'pi pi-lock-open'}
                    />
                )}
            </div>
        </div>
    );
});

export default SensorCard;
