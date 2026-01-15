import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { supabase } from '../supabaseClient';
import { Sidebar as PrimeSidebar } from 'primereact/sidebar';

const Layout = ({ beacons, sectors, setSectors, settings, setSettings }) => {
    const navigate = useNavigate();
    const [mobileSidebarVisible, setMobileSidebarVisible] = useState(false);
    
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
            {/* Desktop Sidebar */}
            <Sidebar 
                beacons={beacons} 
                settings={settings} 
                className="hidden md:flex flex-column h-full" 
                style={{ width: '260px', minWidth: '260px' }} 
            />

            {/* Mobile Sidebar (Drawer) */}
            <PrimeSidebar visible={mobileSidebarVisible} onHide={() => setMobileSidebarVisible(false)} className="p-0 w-18rem bg-slate-900 border-none">
                <Sidebar beacons={beacons} settings={settings} className="flex flex-column h-full w-full" onNavigate={() => setMobileSidebarVisible(false)} />
            </PrimeSidebar>

            <div className="content-panel">
                <Header onLogout={handleLogout} onMenuToggle={() => setMobileSidebarVisible(true)} />
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
