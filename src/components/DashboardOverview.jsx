import React from 'react';
import SensorCard from './SensorCard';

const DashboardOverview = ({ beacons, sectors, onSelect }) => {
    const unassignedBeacons = beacons.filter(b => !sectors.some(s => s.macs.some(m => m.toLowerCase() === b.mac.toLowerCase())));

    return (
        <div className="dashboard-overview">
            {unassignedBeacons.length > 0 && (
                <div className="sector-group">
                    <h2 className="sector-title">Sensores não atribuídos</h2>
                    <div className="sensor-grid">
                        {unassignedBeacons.map(beacon => (
                            <SensorCard key={beacon.mac} beacon={beacon} onClick={onSelect} />
                        ))}
                    </div>
                </div>
            )}

            {sectors.map(sector => {
                const sectorBeacons = beacons.filter(b => sector.macs.some(m => m.toLowerCase() === b.mac.toLowerCase()));
                if (sectorBeacons.length === 0) return null;

                return (
                    <div key={sector.id} className="sector-group">
                        <h2 className="sector-title">{sector.name}</h2>
                        <div className="sensor-grid">
                            {sectorBeacons.map(beacon => (
                                <SensorCard key={beacon.mac} beacon={beacon} onClick={onSelect} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DashboardOverview;
