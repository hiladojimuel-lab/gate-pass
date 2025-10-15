'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, LogOut, Activity, Clock, User } from 'lucide-react';

// Extend Window interface for EventSource
declare global {
  interface Window {
    eventSource?: EventSource;
  }
}

interface RecentActivity {
  id: number;
  student_id: string;
  name: string;
  access_type: 'entry' | 'exit';
  access_status: 'granted' | 'denied';
  timestamp: string;
}

export default function GuardDashboard() {
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setupRealTimeUpdates();
    
    // Cleanup on unmount
    return () => {
      if (window.eventSource) {
        window.eventSource.close();
      }
    };
  }, []);

  const setupRealTimeUpdates = () => {
    try {
      const eventSource = new EventSource('/api/realtime/events');
      window.eventSource = eventSource;

      eventSource.onopen = () => {
        setRealTimeConnected(true);
        console.log('Real-time updates connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'gate_log_created') {
            const newActivity: RecentActivity = {
              id: data.data.id,
              student_id: data.data.student_id,
              name: data.data.name,
              access_type: data.data.access_type,
              access_status: data.data.access_status,
              timestamp: data.data.timestamp
            };
            setRecentActivity(prev => [newActivity, ...prev.slice(0, 5)]); // Keep only latest 6
          }
        } catch (error) {
          console.error('Error parsing real-time update:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Real-time connection error:', error);
        setRealTimeConnected(false);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
            setupRealTimeUpdates();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Failed to setup real-time updates:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen dark-gradient-bg animate-fade-in relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <header className="glass-panel mx-4 mt-4 animate-fade-in-down relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">Guard Dashboard</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${realTimeConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span className="text-xs text-white/60">
                  {realTimeConnected ? 'Live' : 'Offline'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-white/80 hover:text-white transition-all duration-300 hover:scale-105 transform"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full mb-8 animate-bounce-in float-icon border border-white/20">
            <Camera className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-4 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            QR Code Scanner
          </h2>
          
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            Use the QR code scanner to verify student gate passes. Click the button below to start scanning student QR codes for campus access verification.
          </p>

          <button
            onClick={() => router.push('/guard/scanner')}
            className="glass-button text-lg px-8 py-3 flex items-center space-x-3 mx-auto animate-fade-in-up glow-effect"
            style={{animationDelay: '0.4s'}}
          >
            <Camera className="w-6 h-6" />
            <span>Start Scanner</span>
          </button>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 text-center animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-lg mb-4 mx-auto float-icon border border-green-500/30">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Quick Access</h3>
                <p className="text-white/70">Fast and efficient QR code scanning for instant verification</p>
              </div>

              <div className="glass-panel p-6 text-center animate-fade-in-up" style={{animationDelay: '0.6s'}}>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-lg mb-4 mx-auto float-icon border border-blue-500/30">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Secure Verification</h3>
                <p className="text-white/70">Real-time validation of student credentials and status</p>
              </div>

              <div className="glass-panel p-6 text-center animate-fade-in-up" style={{animationDelay: '0.7s'}}>
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-lg mb-4 mx-auto float-icon border border-purple-500/30">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Activity Logging</h3>
                <p className="text-white/70">Automatic logging of all access attempts and results</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-panel p-6 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <div className={`w-2 h-2 rounded-full ${realTimeConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'} ml-auto`}></div>
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={activity.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 animate-fade-in-up" style={{animationDelay: `${0.9 + index * 0.1}s`}}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            activity.access_status === 'granted' 
                              ? 'bg-green-500/20 border border-green-500/30' 
                              : 'bg-red-500/20 border border-red-500/30'
                          }`}>
                            <User className={`w-4 h-4 ${
                              activity.access_status === 'granted' ? 'text-green-400' : 'text-red-400'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{activity.name}</p>
                            <p className="text-xs text-white/60">{activity.student_id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            activity.access_type === 'entry' 
                              ? 'bg-blue-500/20 text-blue-300' 
                              : 'bg-orange-500/20 text-orange-300'
                          }`}>
                            {activity.access_type === 'entry' ? 'Check In' : 'Check Out'}
                          </div>
                          <div className={`text-xs mt-1 px-2 py-1 rounded-full ${
                            activity.access_status === 'granted' 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {activity.access_status === 'granted' ? 'Granted' : 'Denied'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 mt-2 text-xs text-white/50">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">No recent activity</p>
                    <p className="text-xs text-white/40 mt-1">Activity will appear here in real-time</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
