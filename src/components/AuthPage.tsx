import React, { useState } from 'react';
import { Lock, User, Mail, Eye, EyeOff } from 'lucide-react';
import { signIn, signUp, AuthResponse } from '../lib/api';

interface AuthPageProps {
  onAuthenticated: (auth: AuthResponse) => void;
}

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login.trim() || !password.trim() || (isRegister && !email.trim())) {
      setError('Iltimos, barcha maydonlarni to\'ldiring.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const auth = isRegister
        ? await signUp(email.trim(), login.trim(), password)
        : await signIn(login.trim(), password);
      onAuthenticated(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nimadir xato ketdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (next: 'signin' | 'register') => {
    setMode(next);
    setError('');
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#1c1c1c] text-gray-200 font-sans">
      <div className="w-full max-w-[380px] px-6">
        {/* Logo / title */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#ef5b25] flex items-center justify-center text-white font-bold text-lg mb-3">
            P
          </div>
          <h1 className="text-lg font-semibold text-white">
            {isRegister ? 'Ro\'yxatdan o\'tish' : 'Tizimga kirish'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isRegister ? 'Yangi hisob yaratish uchun ma\'lumotlarni kiriting' : 'Hisobingizga kirish uchun login va parolni kiriting'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#2d2d2d] rounded-lg p-1 mb-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${
              !isRegister ? 'bg-[#ef5b25] text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Kirish
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-1.5 rounded-md transition-colors cursor-pointer ${
              isRegister ? 'bg-[#ef5b25] text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Ro'yxatdan o'tish
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <div className="flex items-center gap-2 bg-[#2d2d2d] border border-[#3e3e3e] rounded px-3 h-9 focus-within:ring-1 focus-within:ring-[#ef5b25]/60">
                <Mail size={14} className="text-gray-500 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Login</label>
            <div className="flex items-center gap-2 bg-[#2d2d2d] border border-[#3e3e3e] rounded px-3 h-9 focus-within:ring-1 focus-within:ring-[#ef5b25]/60">
              <User size={14} className="text-gray-500 shrink-0" />
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="login"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Parol</label>
            <div className="flex items-center gap-2 bg-[#2d2d2d] border border-[#3e3e3e] rounded px-3 h-9 focus-within:ring-1 focus-within:ring-[#ef5b25]/60">
              <Lock size={14} className="text-gray-500 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-gray-500 hover:text-gray-300 cursor-pointer"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-9 bg-[#ef5b25] hover:bg-[#f36e3c] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm rounded transition-colors cursor-pointer mt-2"
          >
            {isSubmitting ? 'Yuborilmoqda...' : isRegister ? 'Ro\'yxatdan o\'tish' : 'Kirish'}
          </button>
        </form>

        {/* Footer switch link */}
        <p className="text-center text-xs text-gray-500 mt-5">
          {isRegister ? 'Hisobingiz bormi? ' : 'Hisobingiz yo\'qmi? '}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? 'signin' : 'register')}
            className="text-[#ef5b25] hover:underline cursor-pointer font-medium"
          >
            {isRegister ? 'Kirish' : 'Ro\'yxatdan o\'tish'}
          </button>
        </p>
      </div>
    </div>
  );
}
