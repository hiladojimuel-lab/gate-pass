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

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get total students
    const totalStudentsResult = await query('SELECT COUNT(*) as count FROM students');
    const totalStudents = totalStudentsResult.rows[0];

    // Get active students
    const activeStudentsResult = await query('SELECT COUNT(*) as count FROM students WHERE is_active = true');
    const activeStudents = activeStudentsResult.rows[0];

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get today's entries
    const todayEntriesResult = await query(`
      SELECT COUNT(*) as count FROM gate_logs 
      WHERE DATE(timestamp) = $1 AND access_type = 'entry' AND access_status = 'granted'
    `, [today]);
    const todayEntries = todayEntriesResult.rows[0];

    // Get today's exits
    const todayExitsResult = await query(`
      SELECT COUNT(*) as count FROM gate_logs 
      WHERE DATE(timestamp) = $1 AND access_type = 'exit' AND access_status = 'granted'
    `, [today]);
    const todayExits = todayExitsResult.rows[0];

    // Get total entries and exits
    const totalEntriesResult = await query(`
      SELECT COUNT(*) as count FROM gate_logs 
      WHERE access_type = 'entry' AND access_status = 'granted'
    `);
    const totalEntries = totalEntriesResult.rows[0];

    const totalExitsResult = await query(`
      SELECT COUNT(*) as count FROM gate_logs 
      WHERE access_type = 'exit' AND access_status = 'granted'
    `);
    const totalExits = totalExitsResult.rows[0];

    const stats = {
      totalStudents: totalStudents.count,
      activeStudents: activeStudents.count,
      todayEntries: todayEntries.count,
      todayExits: todayExits.count,
      totalEntries: totalEntries.count,
      totalExits: totalExits.count
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
