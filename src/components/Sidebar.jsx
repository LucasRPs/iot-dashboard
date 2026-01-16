import React, { useMemo } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Avatar } from 'primereact/avatar';

const OFFLINE_THRESHOLD_MS = 60 * 1000; // 1 Minuto para considerar Offline

const Sidebar = ({ beacons, settings, className, style, onNavigate }) => {
    const location = useLocation();

    const getStatus = (lastSeenDate) => {
        if (!lastSeenDate) return 'offline';
        const diff = Date.now() - new Date(lastSeenDate).getTime();
        return diff < OFFLINE_THRESHOLD_MS ? 'online' : 'offline';
    };

    const sortedBeacons = useMemo(() => {
        return [...beacons].sort((a, b) => (a.display_name || a.mac).localeCompare(b.display_name || b.mac));
    }, [beacons]);

    return (
        <div className={`sidebar-panel ${className || ''}`} style={style}>
            <div className="p-4 flex align-items-center gap-3  border-bottom-1 border-slate-700">
                <Avatar label="A" shape="circle" className="bg-indigo-500 text-white font-bold w-2.5rem h-1rem shadow-md" />
                <div>
                    <span className="text-base font-bold text-slate-100 tracking-tight block">Alcate-IA <b>Cold Chain</b></span>
                </div>
            </div>

            <div className="flex-grow-1 overflow-y-auto py-3 custom-scrollbar">
                <div className="text-label px-4 mb-2 mt-2">MONITORAMENTO</div>
                <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                    <i className="pi pi-th-large"></i>
                    <span>Visão Geral</span>
                </NavLink>
                <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                    <i className="pi pi-chart-line"></i>
                    <span>Relatórios</span>
                </NavLink>
                <NavLink to="/gateways" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                    <i className="pi pi-server"></i>
                    <span>Gateways</span>
                </NavLink>

                <div className="text-label px-4 mb-2 mt-5">GERENCIAMENTO</div>
                <NavLink to="/config" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={onNavigate}>
                    <i className="pi pi-cog"></i>
                    <span>Setores</span>
                </NavLink>

                <div className="text-label px-4 mb-2 mt-5">DISPOSITIVOS ({sortedBeacons.length})</div>
                {sortedBeacons.map(b => {
                    const isOnline = getStatus(b.lastSeen) === 'online';
                    const isActive = location.pathname === `/sensor/${b.mac}`;
                    return (
                        <Link
                            key={b.mac}
                            to={`/sensor/${b.mac}`}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            title={b.display_name || b.mac}
                            onClick={onNavigate}
                        >
                            <i className="pi pi-box text-xs"></i>
                            <span className="text-xs font-medium flex-1 white-space-nowrap overflow-hidden text-overflow-ellipsis">
                                {b.display_name || `Sensor ${b.mac.slice(-5)}`}
                            </span>
                            <div className={`status-dot ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}></div>
                            {b.temp > settings.tempCritical && <i className="pi pi-exclamation-triangle text-orange-400 text-xs ml-1 animate-pulse"></i>}
                        </Link>
                    );
                })}
            </div>

            <div className="p-3 mt-auto border-top-1 border-slate-700">
                <span className="text-[11px] text-slate-500 font-mono">v2.4.0</span>
            </div>
        </div>
    );
};

export default Sidebar;