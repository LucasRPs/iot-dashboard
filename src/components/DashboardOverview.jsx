import React, { useState, useEffect } from 'react';
import { Skeleton } from 'primereact/skeleton';
import SensorCard from './SensorCard';

const DashboardOverview = ({ beacons, sectors, onSelect, loading }) => {

    if (loading) {
        return (
            <div className="dashboard-overview">
                <div className="sector-group">
                    <h2 className="sector-title"><Skeleton width="12rem" height="1.5rem" className="mb-2" /></h2>
                    <div className="grid">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="col-12 sm:col-6 md:col-4 xl:col-3"><div className="sensor-card p-3 flex flex-column justify-content-between h-full">
                                <div className="flex justify-content-between align-items-start">
                                    <Skeleton width="50%" height="1.2rem" />
                                    <Skeleton width="20%" height="1rem" borderRadius="12px" />
                                </div>
                                <div className="flex align-items-baseline gap-2 my-2">
                                    <Skeleton width="20%" height="1rem" />
                                    <Skeleton width="40%" height="2rem" />
                                </div>
                                <div className="flex justify-content-between mt-auto">
                                    <Skeleton width="30%" height="0.8rem" />
                                    <Skeleton width="30%" height="0.8rem" />
                                </div>
                            </div></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const unassignedBeacons = beacons.filter(b => !sectors.some(s => s.macs.some(m => m.toLowerCase() === b.mac.toLowerCase())));

    return (
        <div className="dashboard-overview">
            {unassignedBeacons.length > 0 && (
                <div className="sector-group">
                    <h2 className="sector-title">Sensores não atribuídos</h2>
                    <div className="grid">
                        {unassignedBeacons.map(beacon => (
                            <div key={beacon.mac} className="col-12 sm:col-6 md:col-4 xl:col-3">
                                <SensorCard beacon={beacon} onClick={onSelect} />
                            </div>
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
                        <div className="grid">
                            {sectorBeacons.map(beacon => (
                                <div key={beacon.mac} className="col-12 sm:col-6 md:col-4 xl:col-3">
                                    <SensorCard beacon={beacon} onClick={onSelect} />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DashboardOverview;
