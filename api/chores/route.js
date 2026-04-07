import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const body = await request.json();
  const { title, amount } = body;

  const { data, error } = await supabase
    .from('chores')
    .insert([
      { title, amount, status: 'completed', completed_at: new Date().toISOString() }
    ])
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data[0]);
}
