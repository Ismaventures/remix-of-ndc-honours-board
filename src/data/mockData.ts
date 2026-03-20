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
  seniorityOrder: number;
}

export interface Commandant {
  id: string;
  name: string;
  title: string;
  tenureStart: number;
  tenureEnd: number | null;
  imageUrl?: string;
  description: string;
  isCurrent: boolean;
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

const RANKS_BY_SENIORITY = [
  'General', 'Admiral', 'Air Chief Marshal',
  'Lieutenant General', 'Vice Admiral', 'Air Marshal',
  'Major General', 'Rear Admiral', 'Air Vice Marshal',
  'Brigadier General', 'Commodore', 'Air Commodore',
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
    const rankIndex = Math.min(i % RANKS_BY_SENIORITY.length, RANKS_BY_SENIORITY.length - 1);
    records.push({
      id: `p-${i + 1}`,
      name,
      rank: RANKS_BY_SENIORITY[rankIndex],
      category: cat,
      service,
      periodStart: startYear,
      periodEnd: startYear + 2,
      citation: CITATIONS[i % CITATIONS.length],
      seniorityOrder: rankIndex + 1,
    });
  });

  return records;
}

function generateCommandants(): Commandant[] {
  return [
    {
      id: 'c-1',
      name: 'Rear Admiral A.A. Ahmad',
      title: 'Commandant, National Defence College Nigeria',
      tenureStart: 2023,
      tenureEnd: null,
      isCurrent: true,
      description: 'Providing strategic leadership and direction for the premier institution of higher defence and strategic studies in Nigeria, fostering excellence in national security education and inter-service cooperation.',
    },
    {
      id: 'c-2',
      name: 'AVM E.O. Abubakar',
      title: 'Commandant',
      tenureStart: 2020,
      tenureEnd: 2023,
      isCurrent: false,
      description: 'Oversaw modernization of curriculum and strengthened international partnerships with allied defence institutions.',
    },
    {
      id: 'c-3',
      name: 'Rear Admiral M.A. Osondu',
      title: 'Commandant',
      tenureStart: 2017,
      tenureEnd: 2020,
      isCurrent: false,
      description: 'Led the digital transformation of academic programmes and expanded research capabilities of the college.',
    },
    {
      id: 'c-4',
      name: 'Maj Gen. T.A. Lagbaja',
      title: 'Commandant',
      tenureStart: 2014,
      tenureEnd: 2017,
      isCurrent: false,
      description: 'Championed inter-agency cooperation and deepened the college\'s engagement with regional security frameworks.',
    },
    {
      id: 'c-5',
      name: 'AVM C.O. Egbuchunam',
      title: 'Commandant',
      tenureStart: 2011,
      tenureEnd: 2014,
      isCurrent: false,
      description: 'Strengthened the college\'s academic foundation and established new strategic studies programmes.',
    },
    {
      id: 'c-6',
      name: 'Rear Admiral S.I. Akhigbe',
      title: 'Commandant',
      tenureStart: 2008,
      tenureEnd: 2011,
      isCurrent: false,
      description: 'Initiated infrastructure development and broadened the scope of defence education at the college.',
    },
  ];
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
export const initialCommandants = generateCommandants();
export const initialVisits = generateVisits();
