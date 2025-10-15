'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Shield } from 'lucide-react';

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const [formData, setFormData] = useState({
    studentId: '',
    username: '',
    name: '',
    department: '',
    contact: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: formData.studentId,
            username: formData.username,
            password: formData.password,
            role
          })
        });

        const data = await response.json();

        if (data.success) {
          if (role === 'student') {
            router.push('/student/dashboard');
          } else {
            router.push('/admin/dashboard');
          }
        } else {
          setError(data.error || 'Login failed');
        }
      } else {
        // Registration
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: formData.studentId,
            name: formData.name,
            department: formData.department,
            contact: formData.contact,
            password: formData.password
          })
        });

        const data = await response.json();

        if (data.success) {
          setError('');
          setIsLogin(true);
          setFormData({
            studentId: '',
            username: '',
            name: '',
            department: '',
            contact: '',
            password: '',
            confirmPassword: ''
          });
          alert('Registration successful! Please login.');
        } else {
          setError(data.error || 'Registration failed');
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen dark-gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Section - Welcome Content */}
        <div className="text-white space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight">LOGIN</h1>
            <div className="space-y-2">
              <p className="text-xl text-gray-300">Hey welcome back!</p>
              <p className="text-xl text-gray-300">We hope you had a great day</p>
            </div>
          </div>

          {/* Google Login Button */}
          <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <button className="glass-button-secondary w-full flex items-center justify-center space-x-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Login with Google</span>
            </button>
          </div>

          {/* Sign Up Link */}
          <div className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
            <p className="text-gray-300">
              Not yet a member?{' '}
              <button
                onClick={() => setIsLogin(false)}
                className="text-white font-semibold hover:text-purple-300 transition-colors duration-300"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md">
            <div className="glass-panel p-8 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              {/* Role Selection */}
              <div className="flex bg-white/10 rounded-xl p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                    role === 'student'
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                    role === 'admin'
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Admin
                </button>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl mb-6 animate-bounce-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div className="space-y-4 animate-fade-in-up">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Student ID
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                        <input
                          type="text"
                          required
                          className="glass-input w-full pl-10"
                          value={formData.studentId}
                          onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                          placeholder="Enter your student ID"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                        <input
                          type="text"
                          required
                          className="glass-input w-full pl-10"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Department
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                        <input
                          type="text"
                          required
                          className="glass-input w-full pl-10"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          placeholder="Enter your department"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-2">
                        Contact
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                        <input
                          type="text"
                          required
                          className="glass-input w-full pl-10"
                          value={formData.contact}
                          onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                          placeholder="Enter your contact number"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      {role === 'student' ? 'Student ID' : 'Username'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                      <input
                        type="text"
                        required
                        className="glass-input w-full pl-10"
                        value={role === 'student' ? formData.studentId : formData.username}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          [role === 'student' ? 'studentId' : 'username']: e.target.value 
                        })}
                        placeholder={role === 'student' ? 'Enter your student ID' : 'Enter username'}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="glass-input w-full pl-10 pr-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="glass-input w-full pl-10"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="Confirm your password"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full glass-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    isLogin ? 'LOGIN' : 'REGISTER'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-white/60">
                  Default admin credentials: admin / admin123
                </p>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <button
                    onClick={() => router.push('/guard/dashboard')}
                    className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-300"
                  >
                    Access Guard Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
