'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Activity, 
  UserPlus, 
  Settings, 
  LogOut, 
  Search,
  Filter,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  User,
  QrCode,
  RefreshCw,
  Download,
  FileText,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Extend Window interface for EventSource
declare global {
  interface Window {
    eventSource?: EventSource;
  }
}

interface DashboardStats {
  totalStudents: number;
  totalEntries: number;
  totalExits: number;
  todayEntries: number;
  todayExits: number;
  activeStudents: number;
}

interface Student {
  id: number;
  student_id: string;
  name: string;
  department: string;
  contact: string;
  is_active: boolean;
  profile_picture?: string;
  created_at: string;
}

interface GateLog {
  id: number;
  student_id: string;
  name: string;
  department?: string;
  access_type: 'entry' | 'exit';
  access_status: 'granted' | 'denied';
  timestamp: string;
  notes: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'logs'>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<GateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [regeneratingQR, setRegeneratingQR] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Logs filtering and export state
  const [logsFilters, setLogsFilters] = useState({
    dateFrom: '',
    dateTo: '',
    accessType: 'all',
    accessStatus: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [allLogs, setAllLogs] = useState<GateLog[]>([]);
  
  const router = useRouter();

  const [newStudent, setNewStudent] = useState({
    student_id: '',
    name: '',
    department: '',
    contact: '',
    password: ''
  });

  const [editStudent, setEditStudent] = useState({
    name: '',
    department: '',
    contact: '',
    password: '',
    is_active: true
  });

  useEffect(() => {
    fetchDashboardData();
    setupRealTimeUpdates();
    
    // Cleanup on unmount
    return () => {
      if (window.eventSource) {
        window.eventSource.close();
      }
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, studentsRes, logsRes, allLogsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/students'),
        fetch('/api/admin/logs?limit=6'),
        fetch('/api/admin/logs')
      ]);

      const [statsData, studentsData, logsData, allLogsData] = await Promise.all([
        statsRes.json(),
        studentsRes.json(),
        logsRes.json(),
        allLogsRes.json()
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (studentsData.success) setStudents(studentsData.students);
      if (logsData.success) setLogs(logsData.logs);
      if (allLogsData.success) setAllLogs(allLogsData.logs);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      router.push('/');
    } finally {
      setLoading(false);
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
          handleRealTimeUpdate(data);
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

  const handleRealTimeUpdate = (data: any) => {
    switch (data.type) {
      case 'gate_log_created':
        // Add new log to the beginning of the logs array
        const newLog: GateLog = {
          id: data.data.id,
          student_id: data.data.student_id,
          name: data.data.name,
          access_type: data.data.access_type,
          access_status: data.data.access_status,
          timestamp: data.data.timestamp,
          notes: data.data.notes
        };
        setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 5)]); // Keep only latest 6
        break;
        
      case 'stats_updated':
        // Update stats in real-time
        if (stats) {
          setStats(prevStats => {
            if (!prevStats) return prevStats;
            
            const updated = { ...prevStats };
            if (data.data.type === 'entry') {
              updated.todayEntries += 1;
              updated.totalEntries += 1;
            } else if (data.data.type === 'exit') {
              updated.todayExits += 1;
              updated.totalExits += 1;
            }
            return updated;
          });
        }
        break;
        
      default:
        console.log('Unknown real-time update type:', data.type);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent)
      });

      const data = await response.json();

      if (data.success) {
        setShowAddStudent(false);
        setNewStudent({ student_id: '', name: '', department: '', contact: '', password: '' });
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to add student');
      }
    } catch (error) {
      alert('Error adding student');
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStudent) return;

    try {
      const response = await fetch(`/api/admin/students/${editingStudent.student_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editStudent)
      });

      const data = await response.json();

      if (data.success) {
        setEditingStudent(null);
        setEditStudent({ name: '', department: '', contact: '', password: '', is_active: true });
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to update student');
      }
    } catch (error) {
      alert('Error updating student');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 5000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditStudent({
      name: student.name,
      department: student.department,
      contact: student.contact,
      password: '',
      is_active: student.is_active
    });
  };

  const toggleStudentStatus = async (studentId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this student?`)) {
      return;
    }

    setLoadingStates(prev => ({ ...prev, [studentId]: true }));
    
    try {
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      const data = await response.json();

      if (data.success) {
        fetchDashboardData();
        showNotification(`Student ${action}d successfully`, 'success');
      } else {
        showNotification(data.error || 'Failed to update student status', 'error');
      }
    } catch (error) {
      showNotification('Error updating student status', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleRegenerateAllQRCodes = async () => {
    if (!confirm('This will regenerate QR codes for all active students. Continue?')) {
      return;
    }

    setRegeneratingQR(true);
    try {
      const response = await fetch('/api/admin/students/regenerate-qr', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        alert(`QR codes regenerated successfully for ${data.updatedCount} students`);
        fetchDashboardData();
      } else {
        alert(data.error || 'Failed to regenerate QR codes');
      }
    } catch (error) {
      alert('Error regenerating QR codes');
    } finally {
      setRegeneratingQR(false);
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

  // Export functions
  const exportToPDF = async () => {
    setExportingPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
      // Create a temporary div with the logs data
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="text-align: center; margin-bottom: 30px; color: #333;">Activity Logs Report</h1>
          <div style="margin-bottom: 20px;">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Records:</strong> ${filteredLogsForExport.length}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Student ID</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Name</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Department</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Access Type</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Status</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Timestamp</th>
                <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLogsForExport.map(log => `
                <tr>
                  <td style="border: 1px solid #ddd; padding: 8px;">${log.student_id}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${log.name}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${log.department || 'N/A'}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-transform: capitalize;">${log.access_type}</td>
                  <td style="border: 1px solid #ddd; padding: 8px; text-transform: capitalize;">${log.access_status}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${new Date(log.timestamp).toLocaleString()}</td>
                  <td style="border: 1px solid #ddd; padding: 8px;">${log.notes}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      document.body.appendChild(tempDiv);
      
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      document.body.removeChild(tempDiv);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`activity-logs-${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification('PDF exported successfully', 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      showNotification('Failed to export PDF', 'error');
    } finally {
      setExportingPDF(false);
    }
  };

  const exportToExcel = async () => {
    setExportingExcel(true);
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');
      
      // Prepare data for Excel
      const excelData = filteredLogsForExport.map(log => ({
        'Student ID': log.student_id,
        'Name': log.name,
        'Department': log.department || 'N/A',
        'Access Type': log.access_type.charAt(0).toUpperCase() + log.access_type.slice(1),
        'Status': log.access_status.charAt(0).toUpperCase() + log.access_status.slice(1),
        'Timestamp': new Date(log.timestamp).toLocaleString(),
        'Notes': log.notes
      }));
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const colWidths = [
        { wch: 12 }, // Student ID
        { wch: 20 }, // Name
        { wch: 15 }, // Department
        { wch: 12 }, // Access Type
        { wch: 10 }, // Status
        { wch: 20 }, // Timestamp
        { wch: 30 }  // Notes
      ];
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Activity Logs');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, `activity-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Excel file exported successfully', 'success');
    } catch (error) {
      console.error('Excel export error:', error);
      showNotification('Failed to export Excel file', 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const fetchFilteredLogs = async () => {
    try {
      const params = new URLSearchParams();
      
      if (logsFilters.dateFrom) params.append('dateFrom', logsFilters.dateFrom);
      if (logsFilters.dateTo) params.append('dateTo', logsFilters.dateTo);
      if (logsFilters.accessType !== 'all') params.append('accessType', logsFilters.accessType);
      if (logsFilters.accessStatus !== 'all') params.append('accessStatus', logsFilters.accessStatus);
      
      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setAllLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching filtered logs:', error);
      showNotification('Failed to fetch logs', 'error');
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogs = logs.filter(log =>
    log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter logs for export based on current filters and search term
  const filteredLogsForExport = allLogs.filter(log => {
    const matchesSearch = log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDateFrom = !logsFilters.dateFrom || new Date(log.timestamp) >= new Date(logsFilters.dateFrom);
    const matchesDateTo = !logsFilters.dateTo || new Date(log.timestamp) <= new Date(logsFilters.dateTo + 'T23:59:59');
    const matchesAccessType = logsFilters.accessType === 'all' || log.access_type === logsFilters.accessType;
    const matchesAccessStatus = logsFilters.accessStatus === 'all' || log.access_status === logsFilters.accessStatus;
    
    return matchesSearch && matchesDateFrom && matchesDateTo && matchesAccessType && matchesAccessStatus;
  });

  // Chart data
  const accessChartData = [
    { name: 'Entries', value: stats?.todayEntries || 0 },
    { name: 'Exits', value: stats?.todayExits || 0 }
  ];

  const departmentData = students.reduce((acc: any[], student) => {
    const existing = acc.find(item => item.name === student.department);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: student.department, value: 1 });
    }
    return acc;
  }, []);

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
          <p className="mt-4 text-white/80 animate-fade-in-up">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark-gradient-bg animate-fade-in relative overflow-hidden">
      {/* Notification Messages */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg backdrop-blur-sm animate-fade-in-down">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span>{error}</span>
          </div>
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg backdrop-blur-sm animate-fade-in-down">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{success}</span>
          </div>
        </div>
      )}
      
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
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
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
        {/* Navigation Tabs */}
        <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1 mb-8 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform ${
              activeTab === 'dashboard'
                ? 'bg-white/20 text-white shadow-sm scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform ${
              activeTab === 'students'
                ? 'bg-white/20 text-white shadow-sm scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
            }`}
          >
            Student Management
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform ${
              activeTab === 'logs'
                ? 'bg-white/20 text-white shadow-sm scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10 hover:scale-105'
            }`}
          >
            Activity Logs
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            {/* Main Dashboard Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
              {/* Feature Cards - Left Side */}
              <div className="xl:col-span-1 space-y-4 lg:space-y-6">
                {/* Quick Access Card */}
                <div className="glass-panel p-4 lg:p-6 animate-fade-in-up hover:bg-white/15 transition-all duration-300" style={{animationDelay: '0.4s'}}>
                  <div className="flex items-start space-x-3 lg:space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500/20 border border-green-400/50 rounded-xl flex items-center justify-center">
                        <div className="w-5 h-5 lg:w-6 lg:h-6 bg-green-400 rounded-sm flex items-center justify-center">
                          <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-white rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base lg:text-lg font-bold text-white mb-1 lg:mb-2">Quick Access</h3>
                      <p className="text-xs lg:text-sm text-white/70 leading-relaxed">
                        Fast and efficient QR code scanning for instant verification
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secure Verification Card */}
                <div className="glass-panel p-4 lg:p-6 animate-fade-in-up hover:bg-white/15 transition-all duration-300" style={{animationDelay: '0.5s'}}>
                  <div className="flex items-start space-x-3 lg:space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500/20 border border-blue-400/50 rounded-xl flex items-center justify-center">
                        <div className="w-5 h-5 lg:w-6 lg:h-6 bg-blue-400 rounded-sm flex items-center justify-center">
                          <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-white rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base lg:text-lg font-bold text-white mb-1 lg:mb-2">Secure Verification</h3>
                      <p className="text-xs lg:text-sm text-white/70 leading-relaxed">
                        Real-time validation of student credentials and status
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activity Logging Card */}
                <div className="glass-panel p-4 lg:p-6 animate-fade-in-up hover:bg-white/15 transition-all duration-300" style={{animationDelay: '0.6s'}}>
                  <div className="flex items-start space-x-3 lg:space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-500/20 border border-purple-400/50 rounded-xl flex items-center justify-center">
                        <div className="w-5 h-5 lg:w-6 lg:h-6 bg-purple-400 rounded-sm flex items-center justify-center">
                          <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-white rounded-sm"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base lg:text-lg font-bold text-white mb-1 lg:mb-2">Activity Logging</h3>
                      <p className="text-xs lg:text-sm text-white/70 leading-relaxed">
                        Automatic logging of all access attempts and results
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity Panel - Right Side */}
              <div className="xl:col-span-2">
                <div className="glass-panel p-4 lg:p-6 animate-fade-in-up" style={{animationDelay: '0.7s'}}>
                  <div className="flex items-center justify-between mb-4 lg:mb-6">
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-500/20 border border-blue-400/50 rounded-lg flex items-center justify-center">
                        <Activity className="w-3 h-3 lg:w-5 lg:h-5 text-blue-400" />
                      </div>
                      <h3 className="text-base lg:text-lg font-bold text-white">Recent Activity</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-white/60">Live</span>
                    </div>
                  </div>
                  
                  {/* Activity Content */}
                  <div className="flex flex-col items-center justify-center py-8 lg:py-12">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-white/10 rounded-xl flex items-center justify-center mb-3 lg:mb-4">
                      <Activity className="w-6 h-6 lg:w-8 lg:h-8 text-white/40" />
                    </div>
                    <p className="text-white/60 text-base lg:text-lg mb-1 lg:mb-2">No recent activity</p>
                    <p className="text-white/40 text-xs lg:text-sm text-center">Activity will appear here in real-time</p>
                  </div>

                  {/* Show recent logs if available */}
                  {logs.length > 0 && (
                    <div className="space-y-2 lg:space-y-3 mt-4 lg:mt-6">
                      <h4 className="text-xs lg:text-sm font-medium text-white/80 mb-2 lg:mb-3">Latest Activities</h4>
                      {logs.slice(0, 3).map((log, index) => (
                        <div key={log.id} className="flex items-center justify-between p-2 lg:p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-1">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.access_status === 'granted' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs lg:text-sm text-white font-medium truncate">{log.name}</p>
                              <p className="text-xs text-white/60 truncate">{log.access_type} • {new Date(log.timestamp).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            log.access_status === 'granted' 
                              ? 'bg-green-500/20 text-green-300' 
                              : 'bg-red-500/20 text-red-300'
                          }`}>
                            {log.access_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Overview - Below main layout */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 animate-fade-in-up" style={{animationDelay: '0.8s'}}>
              <div className="glass-panel p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 lg:h-8 lg:w-8 text-purple-400 float-icon" />
                  </div>
                  <div className="ml-3 lg:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs lg:text-sm font-medium text-white/70 truncate">Total Students</dt>
                      <dd className="text-base lg:text-lg font-medium text-white">{stats?.totalStudents || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-6 w-6 lg:h-8 lg:w-8 text-green-400 float-icon" />
                  </div>
                  <div className="ml-3 lg:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs lg:text-sm font-medium text-white/70 truncate">Today's Entries</dt>
                      <dd className="text-base lg:text-lg font-medium text-white">{stats?.todayEntries || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="h-6 w-6 lg:h-8 lg:w-8 text-blue-400 float-icon" />
                  </div>
                  <div className="ml-3 lg:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs lg:text-sm font-medium text-white/70 truncate">Today's Exits</dt>
                      <dd className="text-base lg:text-lg font-medium text-white">{stats?.todayExits || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-4 lg:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-400 float-icon" />
                  </div>
                  <div className="ml-3 lg:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs lg:text-sm font-medium text-white/70 truncate">Active Students</dt>
                      <dd className="text-base lg:text-lg font-medium text-white">{stats?.activeStudents || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            <div className="flex justify-between items-center">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="glass-input w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleRegenerateAllQRCodes}
                  disabled={regeneratingQR}
                  className="glass-button-secondary flex items-center space-x-2 disabled:opacity-50"
                >
                  {regeneratingQR ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4" />
                  )}
                  <span>{regeneratingQR ? 'Regenerating...' : 'Regenerate QR Codes'}</span>
                </button>
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="glass-button flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            {/* Add Student Modal */}
            {showAddStudent && (
              <div className="glass-panel p-6 animate-bounce-in">
                <h3 className="text-lg font-medium text-white mb-4">Add New Student</h3>
                <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Student ID</label>
                    <input
                      type="text"
                      required
                      className="glass-input"
                      value={newStudent.student_id}
                      onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      className="glass-input"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Department</label>
                    <input
                      type="text"
                      required
                      className="glass-input"
                      value={newStudent.department}
                      onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Contact</label>
                    <input
                      type="text"
                      required
                      className="glass-input"
                      value={newStudent.contact}
                      onChange={(e) => setNewStudent({ ...newStudent, contact: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      className="glass-input"
                      value={newStudent.password}
                      onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2 flex space-x-2">
                    <button type="submit" className="glass-button">Add Student</button>
                    <button
                      type="button"
                      onClick={() => setShowAddStudent(false)}
                      className="glass-button-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Edit Student Modal */}
            {editingStudent && (
              <div className="glass-panel p-6 animate-bounce-in">
                <h3 className="text-lg font-medium text-white mb-4">Edit Student - {editingStudent.student_id}</h3>
                <form onSubmit={handleEditStudent} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Student ID</label>
                    <input
                      type="text"
                      disabled
                      className="glass-input bg-white/5 text-white/50"
                      value={editingStudent.student_id}
                    />
                    <p className="text-xs text-white/60 mt-1">Student ID cannot be changed</p>
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      className="glass-input"
                      value={editStudent.name}
                      onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Department</label>
                    <input
                      type="text"
                      required
                      className="glass-input"
                      value={editStudent.department}
                      onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Contact</label>
                    <input
                      type="text"
                      required
                      className="glass-input"
                      value={editStudent.contact}
                      onChange={(e) => setEditStudent({ ...editStudent, contact: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Password</label>
                    <input
                      type="password"
                      className="glass-input"
                      placeholder="Leave blank to keep current password"
                      value={editStudent.password}
                      onChange={(e) => setEditStudent({ ...editStudent, password: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Status</label>
                    <select
                      className="glass-select"
                      value={editStudent.is_active ? 'active' : 'inactive'}
                      onChange={(e) => setEditStudent({ ...editStudent, is_active: e.target.value === 'active' })}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 flex space-x-2">
                    <button type="submit" className="glass-button">Update Student</button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(null);
                        setEditStudent({ name: '', department: '', contact: '', password: '', is_active: true });
                      }}
                      className="glass-button-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Students Table */}
            <div className="glass-panel p-6 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/5 divide-y divide-white/20">
                    {filteredStudents.map((student, index) => (
                      <tr key={student.id} className="animate-fade-in-up hover:bg-white/10 transition-colors duration-200" style={{animationDelay: `${0.5 + index * 0.1}s`}}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {student.profile_picture ? (
                                <img
                                  src={student.profile_picture}
                                  alt={student.name}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center">
                                  <User className="w-5 h-5 text-white/60" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{student.name}</div>
                              <div className="text-sm text-white/70">{student.student_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {student.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {student.contact}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
                            student.is_active
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openEditModal(student)}
                              className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-all duration-300 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Edit ${student.name}`}
                            >
                              <Edit className="w-4 h-4" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => toggleStudentStatus(student.student_id, student.is_active)}
                              disabled={loadingStates[student.student_id]}
                              className={`flex items-center space-x-1 transition-all duration-300 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed ${
                                student.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'
                              }`}
                              aria-label={`${student.is_active ? 'Deactivate' : 'Activate'} ${student.name}`}
                            >
                              {loadingStates[student.student_id] ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Loading...</span>
                                </>
                              ) : student.is_active ? (
                                <>
                                  <ToggleLeft className="w-4 h-4" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-4 h-4" />
                                  <span>Activate</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
            {/* Header with search and actions */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-5 h-5 transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    className="glass-input w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="glass-button-secondary flex items-center space-x-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                
                <button
                  onClick={exportToPDF}
                  disabled={exportingPDF || filteredLogsForExport.length === 0}
                  className="glass-button-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingPDF ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>{exportingPDF ? 'Exporting...' : 'Export PDF'}</span>
                </button>
                
                <button
                  onClick={exportToExcel}
                  disabled={exportingExcel || filteredLogsForExport.length === 0}
                  className="glass-button flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingExcel ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{exportingExcel ? 'Exporting...' : 'Export Excel'}</span>
                </button>
              </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="glass-panel p-6 animate-fade-in-down">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
                  <Filter className="w-5 h-5" />
                  <span>Filter Logs</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1 flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>From Date</span>
                    </label>
                    <input
                      type="date"
                      className="glass-input"
                      value={logsFilters.dateFrom}
                      onChange={(e) => setLogsFilters({ ...logsFilters, dateFrom: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1 flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>To Date</span>
                    </label>
                    <input
                      type="date"
                      className="glass-input"
                      value={logsFilters.dateTo}
                      onChange={(e) => setLogsFilters({ ...logsFilters, dateTo: e.target.value })}
                    />
                  </div>
                  
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Access Type</label>
                    <select
                      className="glass-select"
                      value={logsFilters.accessType}
                      onChange={(e) => setLogsFilters({ ...logsFilters, accessType: e.target.value })}
                    >
                      <option value="all">All Types</option>
                      <option value="entry">Entry</option>
                      <option value="exit">Exit</option>
                    </select>
                  </div>
                  
                  <div className="form-field">
                    <label className="block text-sm font-medium text-white/90 mb-1">Status</label>
                    <select
                      className="glass-select"
                      value={logsFilters.accessStatus}
                      onChange={(e) => setLogsFilters({ ...logsFilters, accessStatus: e.target.value })}
                    >
                      <option value="all">All Status</option>
                      <option value="granted">Granted</option>
                      <option value="denied">Denied</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={fetchFilteredLogs}
                    className="glass-button flex items-center space-x-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>Apply Filters</span>
                  </button>
                  <button
                    onClick={() => {
                      setLogsFilters({ dateFrom: '', dateTo: '', accessType: 'all', accessStatus: 'all' });
                      fetchDashboardData();
                    }}
                    className="glass-button-secondary"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {/* Logs summary */}
            <div className="glass-panel p-4">
              <div className="flex flex-wrap gap-4 text-sm text-white/80">
                <span className="flex items-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span>Total Records: <strong className="text-white">{filteredLogsForExport.length}</strong></span>
                </span>
                <span className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Granted: <strong className="text-white">{filteredLogsForExport.filter(log => log.access_status === 'granted').length}</strong></span>
                </span>
                <span className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span>Denied: <strong className="text-white">{filteredLogsForExport.filter(log => log.access_status === 'denied').length}</strong></span>
                </span>
              </div>
            </div>

            <div className="glass-panel p-6 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Access Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white/5 divide-y divide-white/20">
                    {filteredLogsForExport.slice(0, 100).map((log, index) => (
                      <tr key={log.id} className="animate-fade-in-up hover:bg-white/10 transition-colors duration-200" style={{animationDelay: `${0.5 + index * 0.1}s`}}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-white">{log.name}</div>
                            <div className="text-sm text-white/70">{log.student_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {log.department || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 capitalize transition-all duration-300">
                            {log.access_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-all duration-300 ${
                            log.access_status === 'granted'
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {log.access_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-white">
                          {log.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Pagination info */}
                {filteredLogsForExport.length > 100 && (
                  <div className="mt-4 text-center text-sm text-white/60">
                    Showing first 100 records. Export to PDF/Excel to see all {filteredLogsForExport.length} records.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
