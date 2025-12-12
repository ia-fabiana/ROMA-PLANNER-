
import React, { useState } from 'react';
import { Lock, LogIn, AlertCircle, Sparkles, Mail } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onLogin(email, password);
    if (!success) {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500); // Reset shake animation
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Visual */}
        <div className="bg-indigo-600 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white opacity-10 blur-2xl"></div>
            
            <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <Lock className="text-white h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Roma Planner</h1>
            <p className="text-indigo-200 text-sm mt-1">Acesso do Aluno</p>
        </div>

        {/* Form */}
        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                        E-mail de Acesso
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                        <input 
                            type="text" 
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setError(false);
                            }}
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-200 bg-slate-50 focus:bg-white focus:outline-none transition-all text-slate-800"
                            placeholder="seu@email.com"
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                        Senha
                    </label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError(false);
                        }}
                        className={`w-full px-4 py-3 rounded-lg border focus:ring-2 focus:outline-none transition-all text-slate-800 ${
                            error 
                            ? 'border-red-300 focus:ring-red-200 bg-red-50' 
                            : 'border-slate-300 focus:ring-indigo-200 bg-slate-50 focus:bg-white'
                        } ${shake ? 'animate-pulse' : ''}`}
                        placeholder="••••••••"
                    />
                    {error && (
                        <div className="flex items-center mt-2 text-red-500 text-xs font-bold animate-fade-in">
                            <AlertCircle size={12} className="mr-1" /> E-mail ou senha inválidos.
                        </div>
                    )}
                </div>

                <button 
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center group mt-4"
                >
                    <span className="mr-2">Acessar Plataforma</span>
                    <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400 flex items-center justify-center">
                    <Sparkles size={12} className="mr-1 text-indigo-400"/> Powered by Roma Strategy
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
