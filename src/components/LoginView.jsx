import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { Message } from 'primereact/message';
// 1. Importe o cliente que criamos acima
import { supabase } from '../supabaseClient'; // Ajuste o caminho conforme necessário

const LoginView = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 2. AQUI é onde colocamos o login e a senha
            // O Supabase espera um objeto com as chaves 'email' e 'password'
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,       // Variável do seu useState
                password: password  // Variável do seu useState
            });

            if (error) {
                // Se o Supabase retornar erro (ex: senha errada), mostramos a mensagem
                throw error;
            }

            // 3. Sucesso! O Supabase retorna o usuário e a sessão
            if (data.user && data.session) {
                onLogin(data.user, data.session);
            }

        } catch (err) {
            // Tratamento de mensagens de erro amigáveis
            let msg = 'Erro ao realizar login.';
            if (err.message.includes('Invalid login credentials')) {
                msg = 'Email ou senha incorretos.';
            } else {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex align-items-center justify-content-center min-h-screen" style={{ backgroundColor: 'var(--surface-200)' }}>
            <div className="surface-card p-4 md:p-6 shadow-4 border-round-xl w-full max-w-30rem m-3 fade-in-up">
                <div className="text-center mb-6">
                    <div className="inline-flex align-items-center justify-content-center bg-indigo-50 border-circle w-5rem h-5rem mb-4">
                        <Avatar label="AI" shape="circle" className="bg-black text-white font-bold text-2xl shadow-md w-full h-full" />
                    </div>
                    <div className="text-900 text-3xl font-extrabold mb-2">Alcate-IA <span className="text-indigo-600"><b>Cold Chain</b></span></div>
                    <span className="text-600 font-medium text-lg">Bem-vindo de volta</span>
                </div>

                {/* Exibição de Erro */}
                {error && <Message severity="error" text={error} className="w-full mb-4 block" />}

                <form onSubmit={handleSubmit} className="p-fluid">
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-900 font-semibold mb-2 ml-1">Email</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-envelope text-500" style={{ zIndex: 1, paddingLeft: '0.8rem' }} />
                            <InputText
                                id="email"
                                type="email"
                                placeholder="Digite seu email"
                                className="w-full p-inputtext-lg border-round-lg"
                                style={{ paddingLeft: '2.5rem' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </span>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="password" className="block text-900 font-semibold mb-2 ml-1">Senha</label>
                        <span className="p-input-icon-left w-full">
                            <i className="pi pi-lock text-500" style={{ zIndex: 1, paddingLeft: '0.8rem' }} />
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

                <div className="text-center mt-4 text-sm text-500">
                    &copy; {new Date().getFullYear()} Alcate-IA Solutions
                </div>
            </div>
        </div>
    );
};

export default LoginView;