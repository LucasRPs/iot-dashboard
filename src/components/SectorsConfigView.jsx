import React, { useState } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { MultiSelect } from 'primereact/multiselect';
import { Tag } from 'primereact/tag';

const SectorsConfigView = ({ sectors, onSave, detectedBeacons }) => {
    const [displayDialog, setDisplayDialog] = useState(false);
    const [currentSector, setCurrentSector] = useState({ id: null, name: '', macs: [] });

    const openNew = () => { setCurrentSector({ id: null, name: '', macs: [] }); setDisplayDialog(true); };
    const openEdit = (sector) => { setCurrentSector({ ...sector }); setDisplayDialog(true); };
    const deleteSector = (id) => { const updated = sectors.filter(s => s.id !== id); onSave(updated); };

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
        <div className="fadein animation-duration-500 h-full flex flex-column p-2">
            <div className="tech-card p-4 h-full flex flex-column animate-enter">
                <div className="flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="m-0 text-slate-800 text-lg font-bold">Setores</h2>
                        <p className="text-gray-500 text-xs mt-0">Gerencie a distribuição dos sensores.</p>
                    </div>
                    <Button label="Novo" icon="pi pi-plus" size="small" className="btn-primary text-xs px-3" onClick={openNew} />
                </div>

                <div className="border-1 border-gray-100 border-round-xl overflow-hidden shadow-sm flex-grow-1">
                    <DataTable value={sectors} stripedRows showGridlines={false} size="small" scrollable scrollHeight="flex" className="p-datatable-sm">
                        <Column field="name" header="Nome" body={(d) => <span className="font-bold text-slate-700 text-sm">{d.name}</span>} />
                        <Column field="macs" header="Vinculados" body={(d) => (
                            <div className="flex flex-wrap gap-1">
                                {d.macs.length === 0 && <span className="text-gray-400 text-xs italic">Vazio</span>}
                                {d.macs.map((mac, i) => (
                                    <Tag key={i} value={mac} className="font-mono text-[10px] bg-slate-100 text-slate-600 border-1 border-slate-200 px-1" />
                                ))}
                            </div>
                        )} />
                        <Column header="" style={{ width: '90px' }} body={(d) => (
                            <div className="flex gap-1 justify-content-end">
                                <Button icon="pi pi-pencil" rounded text size="small" className="text-slate-600 hover:bg-slate-100 w-2rem h-2rem" onClick={() => openEdit(d)} />
                                <Button icon="pi pi-trash" rounded text size="small" className="text-slate-500 hover:bg-rose-50 w-2rem h-2rem" onClick={() => deleteSector(d.id)} />
                            </div>
                        )} />
                    </DataTable>
                </div>
            </div>

            <Dialog visible={displayDialog} style={{ width: '400px' }} header="Setor" modal className="p-fluid" onHide={() => setDisplayDialog(false)}>
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
