export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const all = url.searchParams.get('all');

  let query = supabase
    .from('tournaments')
    .select('*, district:districts(*), organizer:users(id, name, email)')
    .order('date', { ascending: true });

  if (all === 'true') {
    // Admin view - show all
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (status) {
    query = query.eq('status', status);
  } else {
    query = query.in('status', ['approved', 'featured']);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Check if user is banned
  const { data: userData } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', user.id)
    .single();

  if (!userData?.is_active) {
    return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      name: body.name,
      description: body.description || null,
      date: body.date,
      end_date: body.end_date || null,
      start_time: body.start_time || null,
      venue: body.venue,
      venue_address: body.venue_address || null,
      maps_link: body.maps_link || null,
      time_control: body.time_control || 'rapid',
      time_control_detail: body.time_control_detail || null,
      rounds: body.rounds || 5,
      entry_fee: body.entry_fee || null,
      prizes: body.prizes || null,
      is_rated: body.is_rated || false,
      registration_procedure: body.registration_procedure || null,
      contact_name: body.contact_name || null,
      contact_phone: body.contact_phone || null,
      contact_email: body.contact_email || null,
      poster_url: body.poster_url || null,
      district_id: body.district_id,
      organizer_id: user.id,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
