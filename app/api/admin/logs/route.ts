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

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const accessType = searchParams.get('accessType');
    const accessStatus = searchParams.get('accessStatus');

    let queryString = `
      SELECT 
        gl.id,
        gl.student_id,
        s.name,
        s.department,
        gl.access_type,
        gl.access_status,
        gl.timestamp,
        gl.notes
      FROM gate_logs gl
      LEFT JOIN students s ON gl.student_id = s.student_id
    `;

    const conditions = [];
    const params = [];

    // Add date filtering
    if (dateFrom) {
      conditions.push(`gl.timestamp >= $${params.length + 1}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`gl.timestamp <= $${params.length + 1}`);
      params.push(dateTo);
    }

    // Add access type filtering
    if (accessType && accessType !== 'all') {
      conditions.push(`gl.access_type = $${params.length + 1}`);
      params.push(accessType);
    }

    // Add access status filtering
    if (accessStatus && accessStatus !== 'all') {
      conditions.push(`gl.access_status = $${params.length + 1}`);
      params.push(accessStatus);
    }

    if (conditions.length > 0) {
      queryString += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryString += ` ORDER BY gl.timestamp DESC`;

    // Add limit if specified (default to all logs for export functionality)
    if (limit && parseInt(limit) > 0) {
      queryString += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
    }

    const result = await query(queryString, params);

    return NextResponse.json({ success: true, logs: result.rows });
  } catch (error) {
    console.error('Logs fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
