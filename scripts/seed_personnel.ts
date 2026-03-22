import { supabase } from '../src/lib/supabaseClient';
import { initialPersonnel } from '../src/data/mockData';

async function seedPersonnel() {
  for (const person of initialPersonnel) {
    const { error } = await supabase.from('personnel').upsert({
      id: person.id,
      name: person.name,
      rank: person.rank,
      category: person.category,
      service: person.service,
      period_start: person.periodStart,
      period_end: person.periodEnd,
      image_url: person.imageUrl || null,
      citation: person.citation,
      seniority_order: person.seniorityOrder,
    });

    if (error) {
      console.error(`Error inserting personnel ${person.name}:`, error.message);
    } else {
      console.log(`Seeded personnel: ${person.name}`);
    }
  }

  console.log('Personnel seeding complete.');
}

seedPersonnel();
