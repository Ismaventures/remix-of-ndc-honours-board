import { supabase } from '../src/lib/supabaseClient';
import { initialVisits } from '../src/data/mockData';

async function seedVisits() {
  for (const visit of initialVisits) {
    const { error } = await supabase.from('visits').upsert({
      id: visit.id,
      name: visit.name,
      title: visit.title,
      country: visit.country,
      date: visit.date,
      image_url: visit.imageUrl || null,
      description: visit.description,
    });

    if (error) {
      console.error(`Error inserting visit ${visit.name}:`, error.message);
    } else {
      console.log(`Seeded visit: ${visit.name}`);
    }
  }

  console.log('Visits seeding complete.');
}

seedVisits();
