import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';

const SettingsModal = ({ visible, onHide, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings, visible]);

    const handleSave = () => {
        onSave(localSettings);
        onHide();
    };

    return (
        <Dialog header="Configurações Globais" visible={visible} style={{ width: '400px' }} onHide={onHide} modal className="p-fluid settings-dialog">
            <div className="flex flex-column gap-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Limites de Temperatura</h3>
                    <div className="field grid align-items-center mb-2">
                        <label className="col-6 text-sm text-slate-600">Alerta ({'>'} °C)</label>
                        <div className="col-6">
                            <InputNumber value={localSettings.tempAlert} onValueChange={(e) => setLocalSettings({ ...localSettings, tempAlert: e.value })}
                                showButtons buttonLayout="horizontal" step={1} min={-20} max={100}
                                inputClassName="text-center text-sm py-2" className="w-full" />
                        </div>
                    </div>
                    <div className="field grid align-items-center">
                        <label className="col-6 text-sm text-slate-600">Crítico ({'>'} °C)</label>
                        <div className="col-6">
                            <InputNumber value={localSettings.tempCritical} onValueChange={(e) => setLocalSettings({ ...localSettings, tempCritical: e.value })}
                                showButtons buttonLayout="horizontal" step={1} min={-20} max={100} 
                                inputClassName="text-center text-sm py-2" className="w-full" />
                        </div>
                    </div>
                </div>

                <div className="border-top-1 border-gray-100 pt-3">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Bateria</h3>
                    <div className="field grid align-items-center">
                        <label className="col-6 text-sm text-slate-600">Nível Baixo ({'<'} %)</label>
                        <div className="col-6">
                            <InputNumber value={localSettings.lowBattery} onValueChange={(e) => setLocalSettings({ ...localSettings, lowBattery: e.value })}
                                showButtons buttonLayout="horizontal" step={5} min={0} max={100} suffix="%"
                                inputClassName="text-center text-sm py-2" className="w-full" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-content-end gap-2 mt-5">
                <Button label="Cancelar" text onClick={onHide} className="text-slate-500 text-sm" />
                <Button label="Salvar Alterações" onClick={handleSave} className="btn-primary text-sm px-4" />
            </div>
        </Dialog>
    );
};

export default SettingsModal;
