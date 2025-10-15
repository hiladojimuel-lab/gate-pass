import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Find student by ID
    const studentResult = await query('SELECT * FROM students WHERE student_id = $1', [studentId]);
    const student = studentResult.rows[0];

    if (!student) {
      return NextResponse.json({ 
        success: false,
        error: 'Student not found' 
      }, { status: 404 });
    }

    // Return student data in the format expected by the scanner
    return NextResponse.json({
      success: true,
      student: {
        studentId: student.student_id,
        name: student.name,
        department: student.department,
        contact: student.contact,
        profile_picture: student.profile_picture
      }
    });

  } catch (error) {
    console.error('Student lookup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
