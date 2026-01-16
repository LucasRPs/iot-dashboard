import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Tooltip } from 'primereact/tooltip';
import { Dialog } from 'primereact/dialog';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';

const SectorsConfigView = ({ sectors, onSave, detectedBeacons }) => {
    const [displayDialog, setDisplayDialog] = useState(false);
    const [currentSector, setCurrentSector] = useState({ id: null, name: '', macs: [] });
    const [macInputs, setMacInputs] = useState({}); // quick add inputs per sector

    const openNew = () => { setCurrentSector({ id: null, name: '', macs: [] }); setDisplayDialog(true); };
    const openEdit = (sector) => { setCurrentSector({ ...sector }); setDisplayDialog(true); };
    const deleteSector = (id) => { const updated = sectors.filter(s => s.id !== id); onSave(updated); };

    const isMacUsedElsewhere = (mac, sectorId) => {
        const lower = mac.toLowerCase();
        return sectors.some(s => s.id !== sectorId && s.macs.some(m => m.toLowerCase() === lower));
    };

    const addSensorToSector = (sectorId, mac) => {
        if (!mac) return;
        const toAdd = Array.isArray(mac) ? mac.map(m => (m || '').trim()).filter(Boolean) : [(mac || '').trim()];
        if (toAdd.length === 0) return;

        // detect conflicts with other sectors
        const conflicts = toAdd.filter(m => isMacUsedElsewhere(m, sectorId));

        const updated = sectors.map(s => {
            if (s.id === sectorId) {
                const existingLower = s.macs.map(m => m.toLowerCase());
                const newOnes = toAdd.filter(m => !existingLower.includes(m.toLowerCase()) && !conflicts.includes(m));
                if (newOnes.length === 0) return s;
                return { ...s, macs: [...s.macs, ...newOnes] };
            }
            return s;
        });

        onSave(updated);

        if (conflicts.length) {
            alert(`Conflito: os MACs ${conflicts.join(', ')} já pertencem a outros setores. Os demais foram adicionados.`);
        }

        // clear selection for this sector (support array or string clearing)
        setMacInputs(prev => ({ ...prev, [sectorId]: Array.isArray(mac) ? [] : '' }));
    };

    const removeSensorFromSector = (sectorId, mac) => {
        const updated = sectors.map(s => s.id === sectorId ? { ...s, macs: s.macs.filter(m => m !== mac) } : s);
        onSave(updated);
    };

    const saveSector = () => {
        if (!currentSector.name.trim()) {
            alert('Nome do setor é obrigatório');
            return;
        }

        for (const mac of currentSector.macs) {
            const conflictingSector = sectors.find(s => s.id !== currentSector.id && s.macs.some(existingMac => existingMac.toLowerCase().trim() === mac.toLowerCase().trim()));
            if (conflictingSector) {
                alert(`Conflito: O MAC ${mac} já pertence ao setor "${conflictingSector.name}".`);
                return;
            }
        }

        let updatedSectors = [...sectors];
        if (currentSector.id) { updatedSectors[updatedSectors.findIndex(s => s.id === currentSector.id)] = currentSector; }
        else { updatedSectors.push({ ...currentSector, id: Date.now() }); }
        onSave(updatedSectors); setDisplayDialog(false);
    };

    const getAvailableOptions = () => {
        const usedMacs = sectors.filter(s => s.id !== currentSector.id).flatMap(s => s.macs.map(m => m.toLowerCase()));
        const uniqueOptions = new Map();
        currentSector.macs.forEach(mac => { uniqueOptions.set(mac, { label: `Vinculado: ${mac}`, value: mac, status: 'linked' }); });
        detectedBeacons.forEach(b => {
            if (!usedMacs.includes(b.mac.toLowerCase())) {
                uniqueOptions.set(b.mac, { label: `${b.device_name || 'Sensor'} (${b.mac.slice(-5)})`, value: b.mac, status: 'online' });
            }
        });
        return Array.from(uniqueOptions.values());
    };

    const itemTemplate = (option) => {
        return (
            <div className="flex align-items-center justify-content-between w-full">
                <div className="flex align-items-center gap-2">
                    <i className={`pi pi-circle-fill text-[8px] ${option.status === 'online' ? 'text-green-500' : 'text-gray-400'}`}></i>
                    <span className="font-medium text-slate-700">{option.label}</span>
                </div>
                {option.status === 'linked' && <span className="text-xs bg-gray-100 px-2 border-round text-gray-500">Atual</span>}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-column p-2">
            <div className="tech-card p-4 h-full flex flex-column">
                <div className="flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="m-0 text-slate-800 text-lg font-bold">Setores</h2>
                        <p className="text-gray-500 text-xs mt-0">Gerencie a distribuição dos sensores.</p>
                    </div>
                    <Button label="Novo" icon="pi pi-plus" size="small" className="btn-primary text-xs px-3" onClick={openNew} />
                </div>

                <div className="flex flex-column gap-3">
                    <div className="grid">
                        {sectors.map((s) => {
                            const total = s.macs.length;
                            const online = (detectedBeacons || []).filter(b => s.macs.some(m => m.toLowerCase() === b.mac.toLowerCase())).length;
                            const lastSeenTs = (detectedBeacons || []).filter(b => s.macs.some(m => m.toLowerCase() === b.mac.toLowerCase())).map(b => b.ts).filter(Boolean);
                            const lastSeen = lastSeenTs.length ? new Date(Math.max(...lastSeenTs.map(t => new Date(t).getTime()))).toLocaleString('pt-BR') : '-';
                            return (
                                <div key={s.id} className="col-12 sm:col-6 lg:col-4">
                                    <div className="widget-card h-full">
                                        <div className="flex justify-content-between align-items-start">
                                            <div>
                                                <div className="text-sm font-bold text-slate-800">{s.name}</div>
                                                <div className="text-xs text-slate-400 mt-1">Último: {lastSeen}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button icon="pi pi-pencil" rounded text size="small" className="text-slate-600 hover:bg-slate-100 w-2rem h-2rem" onClick={() => openEdit(s)} />
                                                <Button icon="pi pi-trash" rounded text size="small" className="text-slate-500 hover:bg-rose-50 w-2rem h-2rem" onClick={() => deleteSector(s.id)} />
                                            </div>
                                        </div>
                                        <div className="grid mt-3">
                                            <div className="col-6">
                                                <div className="text-xs text-gray-400">Sensores</div>
                                                <div className="text-lg font-bold text-slate-800">{total}</div>
                                            </div>
                                            <div className="col-6">
                                                <div className="text-xs text-gray-400">Online</div>
                                                <div className="text-lg font-bold text-slate-800">{online}</div>
                                            </div>
                                            <div className="col-12 mt-3">
                                                <div className="flex flex-wrap gap-2">
                                                    {s.macs.length === 0 && <span className="text-gray-400 text-xs italic">Vazio</span>}
                                                    {s.macs.map((mac, i) => {
                                                        return (
                                                            <div key={i} className="flex align-items-center gap-2">
                                                                <Tag value={mac} className="font-mono text-[10px] bg-slate-100 text-slate-600 border-1 border-slate-200 px-1" />
                                                                <button className="p-button p-button-text p-button-sm" onClick={() => removeSensorFromSector(s.id, mac)} title="Remover">
                                                                    <i className="pi pi-times text-red-500"></i>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div className="col-12 mt-3">
                                                <div className="flex gap-2 align-items-start">
                                                        <MultiSelect
                                                            value={macInputs[s.id] || []}
                                                            options={(detectedBeacons || []).filter(b => {
                                                                // exclude those already in other sectors or already in this sector
                                                                const inThis = s.macs.some(m => m.toLowerCase() === b.mac.toLowerCase());
                                                                const usedElsewhere = sectors.some(sec => sec.id !== s.id && sec.macs.some(m => m.toLowerCase() === b.mac.toLowerCase()));
                                                                return !inThis && !usedElsewhere;
                                                            }).map(b => ({ label: `${b.device_name || 'Sensor'} (${b.mac.slice(-5)})`, value: b.mac }))}
                                                            onChange={(e) => setMacInputs(prev => ({ ...prev, [s.id]: e.value }))}
                                                            optionLabel="label"
                                                            optionValue="value"
                                                            placeholder="Selecionar sensores online"
                                                            className="flex-1 text-sm min-w-0"
                                                            display="chip"
                                                        />
                                                        <Button icon="pi pi-plus" onClick={() => addSensorToSector(s.id, macInputs[s.id] || [])} className="btn-primary w-3rem flex-shrink-0" disabled={!macInputs[s.id] || macInputs[s.id].length === 0} />
                                                    </div>
                                                <div className="text-xs text-gray-400 mt-1">Também é possível editar o setor para selecionar múltiplos sensores.</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Dialog visible={displayDialog} style={{ width: 'min(400px, 90vw)'}} header="Setor" modal className="p-fluid " onHide={() => setDisplayDialog(false)}>
                <div className="field mb-3">
                    <label htmlFor="name" className="text-slate-700 font-bold mb-1 block text-xs">Nome</label>
                    <InputText id="name" value={currentSector.name} onChange={(e) => setCurrentSector({ ...currentSector, name: e.target.value })} autoFocus className="border-gray-300 p-2 border-round w-full text-sm" placeholder="Ex: Câmara Fria 01" />
                </div>
                <div className="field mb-2">
                    <label htmlFor="macs" className="text-slate-700 font-bold mb-1 block text-xs">Selecionar Sensores</label>
                    <MultiSelect
                        value={currentSector.macs}
                        options={getAvailableOptions()}
                        onChange={(e) => setCurrentSector({ ...currentSector, macs: e.value })}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Selecione os sensores..."
                        display="chip"
                        className="w-full text-sm border-gray-300"
                        itemTemplate={itemTemplate}
                        filter
                        maxSelectedLabels={3}
                    />
                    <small className="text-gray-400 block mt-1">Mostrando apenas sensores não vinculados a outros setores.</small>
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancelar" size="small" text onClick={() => setDisplayDialog(false)} className="text-slate-500 text-xs" />
                    <Button label="Salvar" size="small" onClick={saveSector} className="btn-primary px-3 text-xs" />
                </div>
            </Dialog>
        </div>
    );
};

export default SectorsConfigView;
