import { supabase } from '@/lib/supabase';
import { startOfWeek } from 'date-fns';
import ClientChoreUI from './ClientChoreUI';

export default async function Page() {
  const now = new Date();
  const start = startOfWeek(now, { weekStartsOn: 1 }).toISOString();

  // Fetch only this week's active chores
  const { data: chores } = await supabase
    .from('chores')
    .select('*')
    .gte('completed_at', start)
    .neq('status', 'storage')
    .order('completed_at', { ascending: false });

  return <ClientChoreUI initialChores={chores || []} />;
}
