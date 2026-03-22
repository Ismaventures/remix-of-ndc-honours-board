import { supabase } from '../src/lib/supabaseClient';
import { initialCommandants } from '../src/data/mockData';

async function seedPastCommandants() {
  // Seed all commandants (past and current)
  for (const cmd of initialCommandants) {
    const { error } = await supabase.from('commandants').upsert({
      id: cmd.id,
      name: cmd.name,
      title: cmd.title,
      tenure_start: cmd.tenureStart,
      tenure_end: cmd.tenureEnd,
      image_url: cmd.imageUrl || null,
      description: cmd.description,
      is_current: cmd.isCurrent,
    });
    if (error) {
      console.error(`Error inserting commandant ${cmd.name}:`, error.message);
    } else {
      console.log(`Seeded: ${cmd.name}`);
    }
  }
  console.log('Seeding complete.');
}

seedPastCommandants();
