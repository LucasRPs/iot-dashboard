import React from 'react';

const OFFLINE_THRESHOLD_MS = 3600000; // 1 hora

const SensorCard = ({ beacon, onClick }) => {
    const isOffline = (Date.now() - new Date(beacon.lastSeen).getTime()) > OFFLINE_THRESHOLD_MS;
    const isNew = !beacon.sector;

    const getStatusBadge = () => {
        if (isNew) return <div className="status-badge new">Novo</div>;
        if (isOffline) return <div className="status-badge offline">Offline</div>;
        return <div className="status-badge online">Online</div>;
    };

    return (
        <div
            className={`sensor-card ${isOffline ? 'offline' : ''}`}
            onClick={() => onClick(beacon)}
        >
            <div className="card-header">
                <span className="sensor-name">{beacon.display_name || beacon.device_name || 'Sensor'}</span>
                {getStatusBadge()}
            </div>
            <div className="card-body">
                <div className="temperature">
                    <span style={{fontSize:"24px", paddingRight:"5px"}}>Temp</span>
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
            </div>
        </div>
    );
};

export default SensorCard;
