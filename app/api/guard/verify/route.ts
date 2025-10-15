import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { broadcastUpdate } from '@/lib/realtime';

export async function POST(request: NextRequest) {
  try {
    const { studentId, accessType, qrData, studentData } = await request.json();

    if (!studentId || !accessType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify QR code format (only if it's a QR code, not a student ID lookup)
    if (qrData.startsWith('GATEPASS:')) {
      // This is a QR code, validate the format
      const jsonData = qrData.substring(9);
      try {
        const qrStudentData = JSON.parse(jsonData);
        if (!qrStudentData.studentId || !qrStudentData.name || !qrStudentData.department) {
          return NextResponse.json({ error: 'Invalid QR code data format' }, { status: 400 });
        }
      } catch (parseError) {
        return NextResponse.json({ error: 'Invalid QR code data format' }, { status: 400 });
      }
    }

    // Validate student data
    if (!studentData || !studentData.studentId || !studentData.name || !studentData.department) {
      return NextResponse.json({ error: 'Invalid student data' }, { status: 400 });
    }

    // Find student
    const studentResult = await query('SELECT * FROM students WHERE student_id = $1', [studentId]);
    const student = studentResult.rows[0];

    if (!student) {
      // Log denied access
      const deniedLogResult = await query(
        `INSERT INTO gate_logs (student_id, access_type, access_status, notes)
         VALUES ($1, $2, $3, $4) RETURNING id, timestamp`,
        [studentId, accessType, 'denied', 'Student not found']
      );
      
      const deniedLog = deniedLogResult.rows[0];

      // Broadcast real-time update for denied access
      broadcastUpdate('gate_log_created', {
        id: deniedLog.id,
        student_id: studentId,
        name: 'Unknown',
        department: 'Unknown',
        access_type: accessType,
        access_status: 'denied',
        timestamp: deniedLog.timestamp,
        notes: 'Student not found'
      });

      return NextResponse.json({
        success: false,
        error: 'Student not found',
        status: 'denied'
      });
    }

    // Verify QR code data matches database record
    if (student.name !== studentData.name || student.department !== studentData.department) {
      // Log denied access due to data mismatch
      const mismatchLogResult = await query(
        `INSERT INTO gate_logs (student_id, access_type, access_status, notes)
         VALUES ($1, $2, $3, $4) RETURNING id, timestamp`,
        [studentId, accessType, 'denied', 'QR code data mismatch with database record']
      );
      
      const mismatchLog = mismatchLogResult.rows[0];

      // Broadcast real-time update for denied access
      broadcastUpdate('gate_log_created', {
        id: mismatchLog.id,
        student_id: studentId,
        name: studentData.name,
        department: studentData.department,
        access_type: accessType,
        access_status: 'denied',
        timestamp: mismatchLog.timestamp,
        notes: 'QR code data mismatch with database record'
      });

      return NextResponse.json({
        success: false,
        error: 'QR code data does not match student record',
        status: 'denied',
        student: {
          student_id: student.student_id,
          name: student.name,
          department: student.department,
          profile_picture: student.profile_picture
        }
      });
    }

    // Check if student is active
    if (!student.is_active) {
      // Log denied access
      const deactivatedLogResult = await query(
        `INSERT INTO gate_logs (student_id, access_type, access_status, notes)
         VALUES ($1, $2, $3, $4) RETURNING id, timestamp`,
        [studentId, accessType, 'denied', 'Student account deactivated']
      );
      
      const deactivatedLog = deactivatedLogResult.rows[0];

      // Broadcast real-time update for denied access
      broadcastUpdate('gate_log_created', {
        id: deactivatedLog.id,
        student_id: studentId,
        name: studentData.name,
        department: studentData.department,
        access_type: accessType,
        access_status: 'denied',
        timestamp: deactivatedLog.timestamp,
        notes: 'Student account deactivated'
      });

      return NextResponse.json({
        success: false,
        error: 'Student account is deactivated',
        status: 'denied',
        student: {
          student_id: student.student_id,
          name: student.name,
          department: student.department,
          profile_picture: student.profile_picture
        }
      });
    }

    // Check recent access logs to prevent duplicate entries
    const recentLogResult = await query(
      `SELECT * FROM gate_logs 
       WHERE student_id = $1 
       ORDER BY timestamp DESC 
       LIMIT 1`,
      [studentId]
    );
    const recentLog = recentLogResult.rows[0];

    let finalAccessType = accessType;

    // Only use auto-detection logic if accessType is 'auto'
    // If guard manually selected 'entry' or 'exit', respect that choice
    if (accessType === 'auto') {
      // If there's a recent log, determine if this should be entry or exit
      if (recentLog) {
        const lastAccessTime = new Date(recentLog.timestamp);
        const now = new Date();
        const timeDiff = now.getTime() - lastAccessTime.getTime();
        
        // If last access was more than 30 minutes ago, assume it's a new entry
        if (timeDiff > 30 * 60 * 1000) {
          finalAccessType = 'entry';
        } else {
          // Alternate between entry and exit
          finalAccessType = recentLog.access_type === 'entry' ? 'exit' : 'entry';
        }
      }
    }
    // If accessType is explicitly 'entry' or 'exit', use that regardless of recent logs

    // Log successful access
    const logResult = await query(
      `INSERT INTO gate_logs (student_id, access_type, access_status, notes)
       VALUES ($1, $2, $3, $4) RETURNING id, timestamp`,
      [studentId, finalAccessType, 'granted', 'Access granted']
    );
    
    const newLog = logResult.rows[0];

    // Broadcast real-time update
    broadcastUpdate('gate_log_created', {
      id: newLog.id,
      student_id: studentId,
      name: studentData.name,
      department: studentData.department,
      access_type: finalAccessType,
      access_status: 'granted',
      timestamp: newLog.timestamp,
      notes: 'Access granted'
    });

    // Broadcast stats update to admin dashboard
    broadcastUpdate('stats_updated', {
      type: finalAccessType,
      action: 'increment'
    }, 'admin');

    return NextResponse.json({
      success: true,
      status: 'granted',
      accessType: finalAccessType,
      message: `Access granted for ${finalAccessType}`,
      student: {
        student_id: studentData.studentId,
        name: studentData.name,
        department: studentData.department,
        profile_picture: student.profile_picture
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
