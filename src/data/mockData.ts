export type Category = 'FWC' | 'FDC' | 'Directing Staff' | 'Allied';
export type Service = 'Army' | 'Navy' | 'Air Force' | 'Civilian' | 'Foreign';

export interface Personnel {
  id: string;
  name: string;
  rank: string;
  category: Category;
  service: Service;
  periodStart: number;
  periodEnd: number;
  imageUrl?: string;
  citation: string;
}

export interface DistinguishedVisit {
  id: string;
  name: string;
  title: string;
  country: string;
  date: string;
  imageUrl?: string;
  description: string;
}

const RANKS = [
  'General', 'Lieutenant General', 'Major General', 'Brigadier General',
  'Admiral', 'Vice Admiral', 'Rear Admiral',
  'Air Marshal', 'Air Vice Marshal', 'Air Commodore',
  'Colonel', 'Captain (Navy)', 'Group Captain',
];

const CITATIONS = [
  'Recognized for outstanding contributions to strategic leadership and national defence development.',
  'Distinguished service in fostering inter-service cooperation and joint military operations excellence.',
  'Exemplary dedication to the advancement of defence policy and strategic studies.',
  'Commended for exceptional leadership in promoting regional security cooperation.',
  'Noted for significant contributions to military doctrine and defence strategy formulation.',
  'Honored for outstanding commitment to training future defence leaders of Nigeria.',
];

function generatePersonnel(): Personnel[] {
  const names = [
    'Adebayo O. Olukotun', 'Ibrahim M. Suleiman', 'Chukwuemeka A. Nwosu',
    'Yusuf B. Garba', 'Oluwaseun T. Adeyemi', 'Mohammed K. Abdullahi',
    'Emeka J. Okonkwo', 'Aliyu S. Danjuma', 'Tunde R. Akinwale',
    'Hassan A. Bello', 'Chijioke N. Eze', 'Abdulrahman I. Musa',
    'Kayode F. Ogunbiyi', 'Usman D. Shehu', 'Obiora C. Amadi',
    'Musa A. Yar\'Adua', 'Festus O. Adekunle', 'Sani M. Abacha',
    'Rotimi P. Williams', 'Babatunde L. Akintola', 'Olusegun K. Lawal',
    'Garba T. Idris', 'Abubakar H. Waziri', 'Sylvester E. Umoh',
    'Daniel O. Obi', 'Aminu B. Kano', 'Peter C. Okafor',
    'Shehu U. Dikko', 'Boniface I. Nnaji', 'Lateef A. Jakande',
    'Theophilus Y. Danjuma', 'Muhammadu R. Buhari', 'Ike S. Nwachukwu',
    'Alani A. Akinrinade', 'Gibson S. Jalo', 'Oladipo D. Diya',
    'Alexander A. Ogomudia', 'Martin L. Agwai', 'Azubuike I. Ihejirika',
    'Kenneth T. Minimah',
  ];

  const categories: Category[] = ['FWC', 'FDC', 'Directing Staff', 'Allied'];
  const services: Service[] = ['Army', 'Navy', 'Air Force'];
  const records: Personnel[] = [];

  names.forEach((name, i) => {
    const cat = categories[i % 4];
    const service = cat === 'Allied' ? 'Foreign' as Service : services[i % 3];
    const startYear = 1992 + Math.floor(i / 3);
    records.push({
      id: `p-${i + 1}`,
      name,
      rank: RANKS[i % RANKS.length],
      category: cat,
      service,
      periodStart: startYear,
      periodEnd: startYear + 2,
      citation: CITATIONS[i % CITATIONS.length],
    });
  });

  return records;
}

function generateVisits(): DistinguishedVisit[] {
  return [
    { id: 'v-1', name: 'Gen. Mark A. Milley', title: 'Chairman, Joint Chiefs of Staff', country: 'United States', date: '2022-03-15', description: 'Official visit to strengthen US-Nigeria defence cooperation and joint training initiatives.' },
    { id: 'v-2', name: 'Field Marshal Sir John Chapple', title: 'Chief of the General Staff', country: 'United Kingdom', date: '2021-07-22', description: 'Courtesy visit to discuss bilateral defence education programmes and officer exchange.' },
    { id: 'v-3', name: 'Gen. Robert Kibochi', title: 'Chief of Defence Forces', country: 'Kenya', date: '2023-01-10', description: 'Regional security dialogue and partnership strengthening in counter-terrorism operations.' },
    { id: 'v-4', name: 'Gen. Birame Diop', title: 'Military Adviser to the UN Secretary-General', country: 'Senegal', date: '2022-11-05', description: 'Distinguished lecture on UN peacekeeping operations and Africa\'s strategic role.' },
    { id: 'v-5', name: 'Lt Gen. Eirik Kristoffersen', title: 'Chief of Defence', country: 'Norway', date: '2023-06-18', description: 'Bilateral discussions on maritime security and naval cooperation frameworks.' },
  ];
}

export const initialPersonnel = generatePersonnel();
export const initialVisits = generateVisits();
