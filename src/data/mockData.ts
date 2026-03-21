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
      id: 'c-21',
      name: 'Rear Admiral JO Okosun GSS psc(+) fdc(+) ndc (EG) nwc(+) BEng MPM MNSE MNIM',
      title: 'Commandant',
      tenureStart: 2025,
      tenureEnd: 2025,
      isCurrent: false,
      description: 'Provided strategic oversight for senior defence studies with emphasis on joint-service excellence. Tenure: 7 July 2025 – 4 November 2025.',
    },
    {
      id: 'c-20',
      name: 'Rear Admiral OM Olotu GSS psc(+) fdc(+) rcds AFRIN MA',
      title: 'Commandant',
      tenureStart: 2023,
      tenureEnd: 2025,
      isCurrent: false,
      description: 'Strengthened institutional planning and leadership development frameworks for contemporary security challenges. Tenure: 6 July 2023 – 7 July 2025.',
    },
    {
      id: 'c-19',
      name: 'Rear Admiral MM Bashir GSS psc(+) fdc(+) MSc Mphil MNIM',
      title: 'Commandant',
      tenureStart: 2022,
      tenureEnd: 2023,
      isCurrent: false,
      description: 'Advanced strategic research collaboration and professional military education delivery. Tenure: 13 Jan 2022 – 6 July 2023.',
    },
    {
      id: 'c-18',
      name: 'Rear Admiral OB Daji GSS psc(+) fdc(+) MSc Mphil MNIM',
      title: 'Commandant',
      tenureStart: 2021,
      tenureEnd: 2022,
      isCurrent: false,
      description: 'Guided inter-service academic programmes and policy-oriented defence discourse. Tenure: 16 Mar 2021 – 13 Jan 2022.',
    },
    {
      id: 'c-17',
      name: 'Rear Admiral MM Kadiri GSS psc(+) fdc(+) Bsc FNIM',
      title: 'Commandant',
      tenureStart: 2019,
      tenureEnd: 2021,
      isCurrent: false,
      description: 'Led institutional modernization efforts and improved executive-level strategic studies outcomes. Tenure: 4 Mar 2019 – 16 Mar 2021.',
    },
    {
      id: 'c-16',
      name: 'R. Adm AA Osinowo GSS psc(+) fdc(+) BSc MIAD MNSE Ph.D',
      title: 'Commandant',
      tenureStart: 2017,
      tenureEnd: 2019,
      isCurrent: false,
      description: 'Enhanced defence leadership curriculum and broadened multidisciplinary strategic engagement. Tenure: 11 Aug 2017 – 4 Mar 2019.',
    },
    {
      id: 'c-15',
      name: 'R Adm SI Alade GSS psc(+) fdc(+) BSc MILD MPhil MNIM FCIS',
      title: 'Commandant',
      tenureStart: 2015,
      tenureEnd: 2017,
      isCurrent: false,
      description: 'Promoted integrated studies across land, maritime, and air strategic environments. Tenure: 08 Oct 2015 – 11 Aug 2017.',
    },
    {
      id: 'c-14',
      name: 'R Adm NP Agholor GSS psc(+) fdc(+) MSc ACIS FNIM FinstLM (UK)',
      title: 'Commandant',
      tenureStart: 2013,
      tenureEnd: 2015,
      isCurrent: false,
      description: 'Sustained high standards in command-level education and institutional governance. Tenure: 13 Nov 2013 – 8 Oct 2015.',
    },
    {
      id: 'c-13',
      name: 'R Adm TJ Lokoson DSS psc fwc fdc(+) MSc MNSE',
      title: 'Commandant',
      tenureStart: 2010,
      tenureEnd: 2013,
      isCurrent: false,
      description: 'Consolidated strategic studies programmes and strengthened professional mentorship structures. Tenure: 25 Jun 2010 – 12 Nov 2013.',
    },
    {
      id: 'c-12',
      name: 'R Adm GJ Jonah OON DSS psc(+) fwc (+) ndc MNSE',
      title: 'Commandant',
      tenureStart: 2008,
      tenureEnd: 2010,
      isCurrent: false,
      description: 'Expanded higher defence learning pathways and policy-relevant academic contributions. Tenure: 11 Feb 2008 – 25 Jun 2010.',
    },
    {
      id: 'c-11',
      name: 'R Adm AAM Isa DSS psc usndu fwc MSc(+) FIMarEST',
      title: 'Commandant',
      tenureStart: 2005,
      tenureEnd: 2008,
      isCurrent: false,
      description: 'Improved strategic leadership training continuity and institutional coordination. Tenure: 08 Aug 2005 – 11 Feb 2008.',
    },
    {
      id: 'c-10',
      name: 'R Adm AG Adedeji CON DSS psc(+) fwc MSc',
      title: 'Commandant',
      tenureStart: 2003,
      tenureEnd: 2005,
      isCurrent: false,
      description: 'Strengthened defence policy dialogue and executive course quality assurance. Tenure: 31 Mar 2003 – 08 Aug 2005.',
    },
    {
      id: 'c-9',
      name: 'R Adm HL Okpanachi OON DSS psc(+) mni MNSE',
      title: 'Commandant',
      tenureStart: 2001,
      tenureEnd: 2003,
      isCurrent: false,
      description: 'Advanced institutional discipline and strategic programme management standards. Tenure: 31 Jul 2001 – 31 Mar 2003.',
    },
    {
      id: 'c-8',
      name: 'R Adm GA Shiyanbade DSS psc(+) mni',
      title: 'Commandant',
      tenureStart: 1999,
      tenureEnd: 2001,
      isCurrent: false,
      description: 'Supported modernization of defence studies administration and faculty collaboration. Tenure: 03 Aug 1999 – 31 Jul 2001.',
    },
    {
      id: 'c-7',
      name: 'Maj Gen GO Abbe DSS psc(+) mni',
      title: 'Commandant',
      tenureStart: 1998,
      tenureEnd: 1999,
      isCurrent: false,
      description: 'Provided leadership during a key transition period in strategic military education. Tenure: 03 Sep 1998 – 18 Jun 1999.',
    },
    {
      id: 'c-6',
      name: 'Maj Gen C A Garuba DSS mss psc(+) mni',
      title: 'Commandant',
      tenureStart: 1996,
      tenureEnd: 1998,
      isCurrent: false,
      description: 'Strengthened command-level learning culture and institutional continuity. Tenure: 04 Jul 1996 – 02 Sep 1998.',
    },
    {
      id: 'c-5',
      name: 'R Adm JO Ayinla DSS psc(+) fwc',
      title: 'Commandant',
      tenureStart: 1994,
      tenureEnd: 1996,
      isCurrent: false,
      description: 'Guided strategic instruction with focus on professional military leadership development. Tenure: 10 Oct 1994 – 03 Jul 1996.',
    },
    {
      id: 'c-4',
      name: 'R Adm SBO Aloko DSS mss psc(+)',
      title: 'Commandant',
      tenureStart: 1993,
      tenureEnd: 1994,
      isCurrent: false,
      description: 'Reinforced doctrinal learning and institutional command standards. Tenure: 13 Dec 1993 – 21 Sep 1994.',
    },
    {
      id: 'c-3',
      name: 'Maj Gen AA Abubakar DSS mss mni',
      title: 'Commandant',
      tenureStart: 1993,
      tenureEnd: 1993,
      isCurrent: false,
      description: 'Served during a short but pivotal command transition cycle. Tenure: 20 Sep 1993 – 23 Nov 1993.',
    },
    {
      id: 'c-2',
      name: 'Lt Gen DO Diya DSS mss mni',
      title: 'Commandant',
      tenureStart: 1992,
      tenureEnd: 1993,
      isCurrent: false,
      description: 'Directed foundational strategic studies with enduring institutional impact. Tenure: 09 Sep 1992 – 17 Sep 1993.',
    },
    {
      id: 'c-1',
      name: 'Lt Gen JT Useni fss psc mni',
      title: 'Commandant',
      tenureStart: 1990,
      tenureEnd: 1992,
      isCurrent: false,
      description: 'Provided early institutional leadership for advanced national defence studies. Tenure: 01 Sep 1990 – 08 Sep 1992.',
    }
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
