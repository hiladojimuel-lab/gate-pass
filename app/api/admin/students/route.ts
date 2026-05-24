import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generateQRCode } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get base student list
    const studentsResult = await query(`
      SELECT id, student_id, name, department, contact, is_active, profile_picture, created_at
      FROM students 
      ORDER BY created_at DESC
    `);

    const students = studentsResult.rows;

    if (students.length === 0) {
      return NextResponse.json({ success: true, students: [] });
    }

    // For today's date, fetch first entry and last exit per student
    const today = new Date().toISOString().split('T')[0];
    const logsResult = await query(
      `
      SELECT
        student_id,
        MIN(CASE WHEN access_type = 'entry' AND access_status = 'granted' THEN timestamp END) AS first_entry,
        MAX(CASE WHEN access_type = 'exit' AND access_status = 'granted' THEN timestamp END) AS last_exit
      FROM gate_logs
      WHERE DATE(timestamp) = $1
      GROUP BY student_id
    `,
      [today]
    );

    const logsByStudent: Record<
      string,
      { first_entry: string | null; last_exit: string | null }
    > = {};

    for (const row of logsResult.rows) {
      logsByStudent[row.student_id] = {
        first_entry: row.first_entry,
        last_exit: row.last_exit,
      };
    }

    const studentsWithTimes = students.map((s) => {
      const logs = logsByStudent[s.student_id] || {
        first_entry: null,
        last_exit: null,
      };

      const firstEntry = logs.first_entry ? new Date(logs.first_entry) : null;
      const lastExit = logs.last_exit ? new Date(logs.last_exit) : null;

      // Only show a "today_last_exit" if it occurs after the first entry
      const safeLastExit =
        firstEntry && lastExit && lastExit > firstEntry ? logs.last_exit : null;

      return {
        ...s,
        today_first_entry: logs.first_entry,
        today_last_exit: safeLastExit,
      };
    });

    return NextResponse.json({ success: true, students: studentsWithTimes });
  } catch (error) {
    console.error('Students fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { student_id, name, department, contact, password } = await request.json();

    // Validate required fields
    if (!student_id || !name || !department || !contact || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Check if student ID already exists
    const existingStudent = await query('SELECT id FROM students WHERE student_id = $1', [student_id]);
    if (existingStudent.rows.length > 0) {
      return NextResponse.json({ error: 'Student ID already exists' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Generate QR code with student details
    const qrCode = generateQRCode(student_id, name, department, contact);

    // Insert new student
    const result = await query(
      `INSERT INTO students (student_id, name, department, contact, password, qr_code)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [student_id, name, department, contact, hashedPassword, qrCode]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Student added successfully',
      studentId: result.rows[0].id
    });
  } catch (error) {
    console.error('Student creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
