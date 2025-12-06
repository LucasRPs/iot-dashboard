import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';

const LoginView = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate network delay for better UX
        setTimeout(() => {
            onLogin(username, password);
            setLoading(false);
        }, 800);
    };

    return (
        <div className="flex align-items-center justify-content-center min-h-screen bg-slate-100">
            <div className="surface-card p-6 shadow-4 border-round-xl w-full md:w-30rem fade-in-up">
                <div className="text-center mb-6">
                    <div className="inline-flex align-items-center justify-content-center bg-indigo-50 border-circle w-5rem h-5rem mb-4">
                        <Avatar label="AI" shape="circle" className="bg-black text-white font-bold text-2xl shadow-md w-full h-full" />
                    </div>
                    <div className="text-900 text-3xl font-extrabold mb-2 text-slate-800">Alcate-IA <span className="text-indigo-600"><b>Cold Chain</b></span></div>
                    <span className="text-slate-500 font-medium text-lg">Bem-vindo de volta</span>
                </div>

                <form onSubmit={handleSubmit} className="p-fluid">
                    <div className="mb-4">
                        <label htmlFor="username" className="block text-slate-700 font-semibold mb-2 ml-1">Usuário</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-user text-slate-500" style={{ zIndex: 1, paddingLeft: '0.8rem' }} />
                            <InputText
                                id="username"
                                type="text"
                                placeholder="Digite seu usuário"
                                className="w-full p-inputtext-lg border-round-lg"
                                style={{ paddingLeft: '2.5rem' }}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </span>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="password" className="block text-slate-700 font-semibold mb-2 ml-1">Senha</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-lock text-slate-500" style={{ zIndex: 1, paddingLeft: '0.8rem' }} />
                            <Password
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Digite sua senha"
                                toggleMask
                                className="w-full"
                                inputClassName="w-full p-inputtext-lg border-round-lg"
                                inputStyle={{ paddingLeft: '2.5rem' }}
                                feedback={false}
                                required
                            />
                        </span>
                    </div>

                    <Button
                        label="ENTRAR"
                        className="w-full p-button-lg shadow-lg font-bold border-round-lg"
                        style={{ backgroundColor: '#000000', borderColor: '#000000', color: '#ffffff' }}
                        loading={loading}
                    />
                </form>

                <div className="text-center mt-4 text-sm text-slate-400">
                    &copy; {new Date().getFullYear()} Alcate-IA Solutions
                </div>
            </div>
        </div>
    );
};

export default LoginView;
