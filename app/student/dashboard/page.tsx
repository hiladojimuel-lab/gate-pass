'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Download, LogOut, User, Building, Phone, Camera, X, Activity, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import QRCode from 'qrcode';

// Extend Window interface for EventSource
declare global {
  interface Window {
    eventSource?: EventSource;
  }
}

interface AccessLog {
  id: number;
  access_type: 'entry' | 'exit';
  access_status: 'granted' | 'denied';
  timestamp: string;
  notes: string;
}

interface StudentData {
  id: number;
  student_id: string;
  name: string;
  department: string;
  contact: string;
  qr_code: string;
  profile_picture?: string;
}

export default function StudentDashboard() {
  const [student, setStudent] = useState<StudentData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [recentAccess, setRecentAccess] = useState<AccessLog[]>([]);
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchStudentData();
    setupRealTimeUpdates();
    
    // Cleanup on unmount
    return () => {
      if (window.eventSource) {
        window.eventSource.close();
      }
    };
  }, []);

  const fetchStudentData = async () => {
    try {
      const response = await fetch('/api/student/profile');
      const data = await response.json();
      
      if (data.success) {
        setStudent(data.student);
        generateQRCode(data.student.qr_code);
        
        // Fetch recent access logs for this student
        fetchRecentAccess(data.student.student_id);
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentAccess = async (studentId: string) => {
    try {
      // This would need a new API endpoint for student access logs
      // For now, we'll use the real-time updates to populate this
      // In a real implementation, you'd fetch initial data here
    } catch (error) {
      console.error('Error fetching recent access:', error);
    }
  };

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
          if (data.type === 'gate_log_created' && student && data.data.student_id === student.student_id) {
            const newAccess: AccessLog = {
              id: data.data.id,
              access_type: data.data.access_type,
              access_status: data.data.access_status,
              timestamp: data.data.timestamp,
              notes: data.data.notes
            };
            setRecentAccess(prev => [newAccess, ...prev.slice(0, 5)]); // Keep only latest 6
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

  const generateQRCode = async (qrData: string) => {
    try {
      const url = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
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

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `gate-pass-${student?.student_id}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch('/api/student/profile-picture', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStudent(prev => prev ? { ...prev, profile_picture: data.profile_picture } : null);
      } else {
        setUploadError(data.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    setUploading(true);
    setUploadError('');

    try {
      const response = await fetch('/api/student/profile-picture', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setStudent(prev => prev ? { ...prev, profile_picture: undefined } : null);
      } else {
        setUploadError(data.error || 'Failed to remove profile picture');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setUploadError('Failed to remove profile picture');
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen dark-gradient-bg flex items-center justify-center animate-fade-in relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto animate-bounce-in"></div>
          <p className="mt-4 text-white/80 animate-fade-in-up">Loading...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-white">Student Dashboard</h1>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Student Info */}
          <div className="glass-panel p-6 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <h2 className="text-xl font-semibold text-white mb-6">Student Information</h2>
            
            {student && (
              <div className="space-y-4">
                {/* Profile Picture Section */}
                <div className="flex items-center space-x-4 animate-slide-in-left" style={{animationDelay: '0.3s'}}>
                  <div className="relative">
                    {student.profile_picture ? (
                      <div className="relative group">
                        <img
                          src={student.profile_picture}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-2 border-white/20 hover:border-white/40 transition-all duration-300"
                        />
                        <button
                          onClick={handleRemoveProfilePicture}
                          disabled={uploading}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-300 disabled:opacity-50"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                        <User className="w-8 h-8 text-white/60" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/70 mb-2">Profile Picture</p>
                    <div className="flex space-x-2">
                      <button
                        onClick={triggerFileInput}
                        disabled={uploading}
                        className="glass-button-secondary text-xs px-3 py-1 flex items-center space-x-1 disabled:opacity-50"
                      >
                        <Camera className="w-3 h-3" />
                        <span>{student.profile_picture ? 'Change' : 'Upload'}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureUpload}
                        className="hidden"
                      />
                    </div>
                    {uploadError && (
                      <p className="text-red-400 text-xs mt-1">{uploadError}</p>
                    )}
                    {uploading && (
                      <p className="text-white/60 text-xs mt-1">Uploading...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3 animate-slide-in-left" style={{animationDelay: '0.4s'}}>
                  <User className="w-5 h-5 text-white/60 float-icon" />
                  <div>
                    <p className="text-sm text-white/70">Name</p>
                    <p className="font-medium text-white">{student.name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 animate-slide-in-left" style={{animationDelay: '0.5s'}}>
                  <QrCode className="w-5 h-5 text-white/60 float-icon" />
                  <div>
                    <p className="text-sm text-white/70">Student ID</p>
                    <p className="font-medium text-white">{student.student_id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 animate-slide-in-left" style={{animationDelay: '0.6s'}}>
                  <Building className="w-5 h-5 text-white/60 float-icon" />
                  <div>
                    <p className="text-sm text-white/70">Department</p>
                    <p className="font-medium text-white">{student.department}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 animate-slide-in-left" style={{animationDelay: '0.7s'}}>
                  <Phone className="w-5 h-5 text-white/60 float-icon" />
                  <div>
                    <p className="text-sm text-white/70">Contact</p>
                    <p className="font-medium text-white">{student.contact}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* QR Code */}
          <div className="glass-panel p-6 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Gate Pass QR Code</h2>
              <button
                onClick={downloadQRCode}
                disabled={!qrCodeUrl}
                className="glass-button-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>

            <div className="text-center">
              {qrCodeUrl ? (
                <div className="inline-block p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 animate-bounce-in">
                  <img
                    src={qrCodeUrl}
                    alt="Gate Pass QR Code"
                    className="w-64 h-64 mx-auto hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="w-64 h-64 mx-auto bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 flex items-center justify-center animate-pulse">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-white/70 animate-fade-in-up">Generating QR Code...</p>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-white/70 mt-4 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                Show this QR code to the guard for campus access
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel p-6 mt-8 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <div className="flex items-center space-x-2 mb-6">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Recent Access Activity</h2>
            <div className={`w-2 h-2 rounded-full ${realTimeConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'} ml-auto`}></div>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentAccess.length > 0 ? (
              recentAccess.map((access, index) => (
                <div key={access.id} className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 animate-fade-in-up" style={{animationDelay: `${0.5 + index * 0.1}s`}}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        access.access_status === 'granted' 
                          ? 'bg-green-500/20 border border-green-500/30' 
                          : 'bg-red-500/20 border border-red-500/30'
                      }`}>
                        {access.access_type === 'entry' ? (
                          <ArrowRight className={`w-5 h-5 ${access.access_status === 'granted' ? 'text-green-400' : 'text-red-400'}`} />
                        ) : (
                          <ArrowLeft className={`w-5 h-5 ${access.access_status === 'granted' ? 'text-green-400' : 'text-red-400'}`} />
                        )}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${
                          access.access_status === 'granted' ? 'text-white' : 'text-red-300'
                        }`}>
                          {access.access_type === 'entry' ? 'Check In' : 'Check Out'}
                          {access.access_status === 'denied' && ' (Denied)'}
                        </div>
                        <p className="text-xs text-white/60">{access.notes}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        access.access_status === 'granted' 
                          ? 'bg-green-500/20 text-green-300' 
                          : 'bg-red-500/20 text-red-300'
                      }`}>
                        {access.access_status === 'granted' ? 'Success' : 'Failed'}
                      </div>
                      <div className="flex items-center space-x-1 mt-1 text-xs text-white/50">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(access.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-white/30 mx-auto mb-3" />
                <p className="text-white/60">No recent access activity</p>
                <p className="text-xs text-white/40 mt-1">Your access attempts will appear here in real-time</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
