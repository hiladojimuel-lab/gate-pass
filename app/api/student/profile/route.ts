import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(
      'SELECT id, student_id, name, department, contact, qr_code, profile_picture FROM students WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const student = result.rows[0];

    // Get today's first entry and last exit for this student
    const today = new Date().toISOString().split('T')[0];
    const logsResult = await query(
      `
      SELECT
        MIN(CASE WHEN access_type = 'entry' AND access_status = 'granted' THEN timestamp END) AS today_first_entry,
        MAX(CASE WHEN access_type = 'exit' AND access_status = 'granted' THEN timestamp END) AS today_last_exit
      FROM gate_logs
      WHERE student_id = $1 AND DATE(timestamp) = $2
    `,
      [student.student_id, today]
    );

    const logs = logsResult.rows[0] || {
      today_first_entry: null,
      today_last_exit: null,
    };

    const firstEntry = logs.today_first_entry
      ? new Date(logs.today_first_entry)
      : null;
    const lastExit = logs.today_last_exit
      ? new Date(logs.today_last_exit)
      : null;

    // Only show a "today_last_exit" if it occurs after the first entry
    const safeLastExit =
      firstEntry && lastExit && lastExit > firstEntry
        ? logs.today_last_exit
        : null;

    return NextResponse.json({
      success: true,
      student: {
        ...student,
        today_first_entry: logs.today_first_entry,
        today_last_exit: safeLastExit,
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
