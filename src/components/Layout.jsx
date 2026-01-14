import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { supabase } from '../supabaseClient';

const Layout = ({ beacons, sectors, setSectors, settings, setSettings }) => {
    const navigate = useNavigate();
    
    useEffect(() => {
        const savedSectors = localStorage.getItem('alcateia_sectors');
        if (savedSectors) {
            setSectors(JSON.parse(savedSectors));
        } else {
            setSectors([{ id: 1, name: 'Câmara Fria A', macs: [] }, { id: 2, name: 'Transporte 01', macs: [] }]);
        }

        const savedSettings = localStorage.getItem('alcateia_settings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, [setSectors, setSettings]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <div className="layout-shell">
            <Sidebar beacons={beacons} settings={settings} />
            <div className="content-panel">
                <Header onLogout={handleLogout} />
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
