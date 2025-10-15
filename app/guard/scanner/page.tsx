'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, XCircle, Camera, CameraOff, LogOut, User, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ScanResult {
  studentId: string;
  name: string;
  department: string;
  profile_picture?: string;
  accessType: 'entry' | 'exit';
  status: 'granted' | 'denied';
  timestamp: string;
  message: string;
}

export default function GuardScanner() {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedAccessType, setSelectedAccessType] = useState<'entry' | 'exit' | 'auto'>('auto');
  const scannerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Check camera permission on component mount
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => {
        setCameraPermission(true);
      })
      .catch(() => {
        setCameraPermission(false);
      });

    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, [scanner]);

  const startScanner = async () => {
    if (scannerRef.current) {
      // Clear any existing scanner first
      if (scanner) {
        scanner.clear();
      }

      try {
        const html5QrcodeScanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2,
            useBarCodeDetectorIfSupported: true
          },
          false
        );

        html5QrcodeScanner.render(
          (decodedText) => {
            handleScan(decodedText);
          },
          (error) => {
            // Silent error handling for continuous scanning
            // Only log actual errors, not common scanning errors
            if (error && !error.includes('NotFoundException') && !error.includes('No MultiFormat Readers')) {
              console.debug('QR Scanner:', error);
            }
          }
        );

        setScanner(html5QrcodeScanner);
        setIsScanning(true);
        setError('');
      } catch (error) {
        setError('Failed to start camera. Please check camera permissions.');
        console.error('Scanner start error:', error);
      }
    }
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear();
      setScanner(null);
      setIsScanning(false);
    }
  };

  const handleScan = async (qrData: string) => {
    setLoading(true);
    setError('');

    try {
      let studentData;
      let studentId;

      // Check if it's a QR code format or just a student ID
      if (qrData.startsWith('GATEPASS:')) {
        // Parse QR code data
        const jsonData = qrData.substring(9); // Remove 'GATEPASS:' prefix
        
        try {
          studentData = JSON.parse(jsonData);
        } catch (parseError) {
          throw new Error('Invalid QR code data format');
        }

        // Validate required fields
        if (!studentData.studentId || !studentData.name || !studentData.department) {
          throw new Error('Missing required student information in QR code');
        }

        studentId = studentData.studentId;
      } else {
        // Assume it's a student ID - look up student data from database
        studentId = qrData.trim();
        
        // Fetch student data from database
        const response = await fetch(`/api/guard/lookup-student?studentId=${encodeURIComponent(studentId)}`);
        const lookupData = await response.json();
        
        if (!lookupData.success) {
          throw new Error(lookupData.error || 'Student not found');
        }
        
        studentData = lookupData.student;
      }

      // Use selected access type or auto-detect
      const accessType = selectedAccessType === 'auto' ? 'entry' : selectedAccessType;

      const response = await fetch('/api/guard/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          accessType,
          qrData,
          studentData
        })
      });

      const data = await response.json();

      if (data.success) {
        setScanResult({
          studentId: studentData.studentId,
          name: studentData.name,
          department: studentData.department,
          profile_picture: data.student.profile_picture,
          accessType: data.accessType,
          status: data.status,
          timestamp: new Date().toLocaleString(),
          message: data.message
        });

        // Stop scanner after successful scan
        stopScanner();
      } else {
        setError(data.error || 'Verification failed');
        setScanResult({
          studentId: studentData.studentId,
          name: studentData.name,
          department: studentData.department,
          accessType: selectedAccessType === 'auto' ? 'entry' : selectedAccessType,
          status: 'denied',
          timestamp: new Date().toLocaleString(),
          message: data.error || 'Verification failed'
        });
        stopScanner();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid input');
      setScanResult({
        studentId: 'Unknown',
        name: 'Unknown',
        department: 'Unknown',
        accessType: selectedAccessType === 'auto' ? 'entry' : selectedAccessType,
        status: 'denied',
        timestamp: new Date().toLocaleString(),
        message: error instanceof Error ? error.message : 'Invalid input'
      });
      stopScanner();
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError('');
    setLoading(false);
    setManualInput('');
    setShowManualInput(false);
    setSelectedAccessType('auto');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      await handleScan(manualInput.trim());
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
    <div className="min-h-screen dark-gradient-bg relative overflow-hidden">
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
            <h1 className="text-2xl font-bold text-white">Guard Scanner</h1>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors duration-300 hover:scale-105 transform"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scanner Section */}
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">QR Code Scanner</h2>
              <div className="flex space-x-2">
                {!isScanning ? (
                  <button
                    onClick={startScanner}
                    className="glass-button flex items-center space-x-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Scanner</span>
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="glass-button-secondary flex items-center space-x-2"
                  >
                    <CameraOff className="w-4 h-4" />
                    <span>Stop Scanner</span>
                  </button>
                )}
              </div>
            </div>

            {/* Access Type Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-white/80 mb-3">Access Type:</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setSelectedAccessType('auto')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    selectedAccessType === 'auto'
                      ? 'bg-blue-500/30 border border-blue-500/50 text-blue-200'
                      : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Auto Detect</span>
                </button>
                <button
                  onClick={() => setSelectedAccessType('entry')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    selectedAccessType === 'entry'
                      ? 'bg-green-500/30 border border-green-500/50 text-green-200'
                      : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Check In</span>
                </button>
                <button
                  onClick={() => setSelectedAccessType('exit')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    selectedAccessType === 'exit'
                      ? 'bg-orange-500/30 border border-orange-500/50 text-orange-200'
                      : 'bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Check Out</span>
                </button>
              </div>
              <p className="text-xs text-white/60 mt-2">
                {selectedAccessType === 'auto' && 'System will automatically determine if this is a check-in or check-out based on recent activity'}
                {selectedAccessType === 'entry' && 'Force check-in regardless of previous activity'}
                {selectedAccessType === 'exit' && 'Force check-out regardless of previous activity'}
              </p>
            </div>

            <div className="text-center">
              {loading && (
                <div className="mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p className="text-white/80">Verifying...</p>
                </div>
              )}

              {cameraPermission === false && (
                <div className="mb-4 bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 px-4 py-3 rounded-lg">
                  <p className="font-medium">Camera Access Required</p>
                  <p className="text-sm">Please allow camera access to use the QR scanner.</p>
                </div>
              )}

              <div
                ref={scannerRef}
                id="qr-reader"
                className="w-full max-w-md mx-auto"
              />

              {error && (
                <div className="mt-4 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <p className="text-sm text-white/70 mt-4">
                Point your camera at a student's QR code to scan
              </p>

              {isScanning && (
                <div className="mt-2 text-xs text-green-400">
                  ✓ Scanner is active - scanning for QR codes...
                </div>
              )}

              {/* Manual Input Option */}
              <div className="mt-6 pt-4 border-t border-white/20">
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-300"
                >
                  {showManualInput ? 'Hide Manual Input' : 'Manual QR Code Input'}
                </button>

                {showManualInput && (
                  <form onSubmit={handleManualSubmit} className="mt-3">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Enter student ID or QR code data..."
                        className="glass-input flex-1 text-sm"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={!manualInput.trim() || loading}
                        className="glass-button text-sm px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Verify
                      </button>
                    </div>
                    <p className="text-xs text-white/60 mt-2">
                      Enter a student ID (like 'STU000000000000') or scan a QR code. Use this if camera scanning is not working.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="glass-panel p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Scan Results</h2>
            
            {scanResult ? (
              <div className="space-y-6">
                {/* Status Indicator */}
                <div className="text-center">
                  {scanResult.status === 'granted' ? (
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4 border border-green-500/30">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4 border border-red-500/30">
                      <XCircle className="w-8 h-8 text-red-400" />
                    </div>
                  )}
                  
                  <h3 className={`text-2xl font-bold ${
                    scanResult.status === 'granted' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {scanResult.status === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                  </h3>
                  {scanResult.status === 'granted' && (
                    <div className={`mt-2 px-4 py-2 rounded-lg inline-block ${
                      scanResult.accessType === 'entry' 
                        ? 'bg-green-500/20 border border-green-500/30 text-green-300'
                        : 'bg-orange-500/20 border border-orange-500/30 text-orange-300'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {scanResult.accessType === 'entry' ? (
                          <ArrowRight className="w-4 h-4" />
                        ) : (
                          <ArrowLeft className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {scanResult.accessType === 'entry' ? 'CHECKED IN' : 'CHECKED OUT'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Student Details */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-3 border border-white/20">
                  {/* Profile Picture and Basic Info */}
                  <div className="flex items-center space-x-4 pb-3 border-b border-white/20">
                    <div className="flex-shrink-0">
                      {scanResult.profile_picture ? (
                        <img
                          src={scanResult.profile_picture}
                          alt={scanResult.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                          <User className="w-8 h-8 text-white/60" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white/70">Student ID</p>
                      <p className="font-medium text-white">{scanResult.studentId}</p>
                      <p className="text-sm text-white/70 mt-1">Name</p>
                      <p className="font-medium text-white">{scanResult.name}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/70">Department</p>
                    <p className="font-medium text-white">{scanResult.department}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/70">Access Type</p>
                    <div className="flex items-center space-x-2">
                      {scanResult.accessType === 'entry' ? (
                        <ArrowRight className="w-4 h-4 text-green-400" />
                      ) : (
                        <ArrowLeft className="w-4 h-4 text-orange-400" />
                      )}
                      <p className="font-medium text-white capitalize">
                        {scanResult.accessType === 'entry' ? 'Check In' : 'Check Out'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-white/70">Time</p>
                    <p className="font-medium text-white">{scanResult.timestamp}</p>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-blue-500/20 border border-blue-500/30 text-blue-200 px-4 py-3 rounded-lg">
                  <p className="font-medium">Message:</p>
                  <p>{scanResult.message}</p>
                </div>

                {/* Reset Button */}
                <button
                  onClick={resetScanner}
                  className="w-full glass-button"
                >
                  Scan Next Student
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Camera className="w-8 h-8 text-white/60" />
                </div>
                <p className="text-white/70">No scan results yet</p>
                <p className="text-sm text-white/50 mt-2">
                  Start the scanner to begin scanning QR codes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
