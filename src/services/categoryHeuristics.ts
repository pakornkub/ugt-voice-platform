import type { GrievanceCategory, UrgencyLevel } from '@/types';

export interface CategorySuggestion {
  suggestedCategory: GrievanceCategory;
  confidence: number;
  reasoning: string;
  secondaryCategory: GrievanceCategory;
  suggestedUrgency: UrgencyLevel;
  keywords: string[];
}

interface HeuristicRule {
  terms: string[];
  result: CategorySuggestion;
}

// Evaluated top-to-bottom, first match wins. Two lists because upstream keeps two:
//  - server.ts (POST /api/ai/suggest-category fallback) = SERVER_ONLY_RULES + SHARED_RULES
//  - src/services/api.ts catch-path (client fallback)    = SHARED_RULES only
// i.e. 'พูดจาดูถูก' and 'ฮั้ว' are only recognised server-side; on the client they fall through
// (the latter to the HR default), exactly like upstream.
const SERVER_ONLY_RULES: HeuristicRule[] = [
  {
    terms: ['ลวนลาม', 'คุกคาม', 'ข่มขู่', 'harass', 'ล่วงละเมิด', 'กลั่นแกล้ง', 'พูดจาดูถูก'],
    result: {
      suggestedCategory: 'Harassment',
      confidence: 95,
      reasoning: 'ตรวจพบคำที่เกี่ยวข้องกับพฤติกรรมคุกคาม ข่มขู่ หรือการเลือกปฏิบัติในสถานที่ทำงาน',
      secondaryCategory: 'Ethics',
      suggestedUrgency: 'High',
      keywords: ['การคุกคาม', 'ล่วงละเมิด', 'ความปลอดภัย'],
    },
  },
  {
    terms: ['โกง', 'ทุจริต', 'สินบน', 'ยักยอก', 'fraud', 'เงินทอน', 'ปลอมเอกสาร', 'ฮั้ว'],
    result: {
      suggestedCategory: 'Fraud',
      confidence: 96,
      reasoning:
        'ตรวจพบข้อความบ่งชี้พฤติกรรมต้องสงสัยเกี่ยวกับการเงิน การปลอมแปลงเอกสาร หรือทุจริต',
      secondaryCategory: 'Compliance',
      suggestedUrgency: 'Critical',
      keywords: ['ทุจริต', 'การเงิน', 'การตรวจสอบ'],
    },
  },
];

const SHARED_RULES: HeuristicRule[] = [
  {
    terms: [
      'ลวนลาม',
      'คุกคาม',
      'ข่มขู่',
      'harass',
      'ล่วงละเมิด',
      'กลั่นแกล้ง',
      'สิทธิมนุษยชน',
      'human right',
      'bullying',
    ],
    result: {
      suggestedCategory: 'Harassment',
      confidence: 96,
      reasoning:
        'ตรวจพบประเด็นเกี่ยวกับสิทธิมนุษยชน การล่วงละเมิด พฤติกรรมคุกคาม หรือการกลั่นแกล้งในสถานที่ทำงาน',
      secondaryCategory: 'Ethics',
      suggestedUrgency: 'High',
      keywords: ['สิทธิมนุษยชน', 'การล่วงละเมิด', 'การคุกคาม'],
    },
  },
  {
    terms: [
      'โกง',
      'ทุจริต',
      'ฉ้อโกง',
      'สินบน',
      'คอร์รัปชัน',
      'ยักยอก',
      'fraud',
      'เงินทอน',
      'ผลประโยชน์ทับซ้อน',
      'ของขวัญ',
      'เลี้ยงรับรอง',
      'ปลอมเอกสาร',
    ],
    result: {
      suggestedCategory: 'Fraud',
      confidence: 96,
      reasoning:
        'ตรวจพบพฤติกรรมทุจริต การฉ้อโกงทางการเงิน การติดสินบน การรับผลประโยชน์ทับซ้อน หรือการปลอมแปลงเอกสาร',
      secondaryCategory: 'Ethics',
      suggestedUrgency: 'Critical',
      keywords: ['การทุจริต', 'การฉ้อโกง', 'สินบน'],
    },
  },
  {
    terms: [
      'ฟอกเงิน',
      'ข้อมูลภายใน',
      'insider trading',
      'อิทธิพล',
      'การเมือง',
      'ความลับ',
      'ทรัพย์สินทางปัญญา',
      'ลิขสิทธิ์',
      'สิทธิบัตร',
      'รายงานทางการเงิน',
      'ube',
      'โพสต์',
      'อินเทอร์เน็ต',
      'จริยธรรม',
      'ethics',
    ],
    result: {
      suggestedCategory: 'Ethics',
      confidence: 94,
      reasoning:
        'ตรวจพบประเด็นจริยธรรม การรักษาความลับองค์กร การเปิดเผยข้อมูล การฟอกเงิน ทรัพย์สินทางปัญญา หรือข้อมูลกลุ่มบริษัท UBE',
      secondaryCategory: 'Compliance',
      suggestedUrgency: 'High',
      keywords: ['จริยธรรม', 'ข้อมูลความลับ', 'ความโปร่งใส'],
    },
  },
  {
    terms: [
      'แข่งขันทางการค้า',
      'competition law',
      'ควบคุมการส่งออก',
      'export control',
      'ความมั่นคง',
      'national security',
      'pdpa',
      'สัญญา',
      'กฎระเบียบ',
      'ผิดกฎ',
      'compliance',
      'นโยบาย',
      'ข้อบังคับ',
    ],
    result: {
      suggestedCategory: 'Compliance',
      confidence: 93,
      reasoning:
        'ตรวจพบประเด็นการไม่ปฏิบัติตามกฎหมายและกฎเกณฑ์ เช่น กฎหมายแข่งขันทางการค้า ควบคุมการส่งออก หรือระเบียบข้อบังคับ',
      secondaryCategory: 'Ethics',
      suggestedUrgency: 'Medium',
      keywords: ['กฎหมายและกฎเกณฑ์', 'Compliance', 'ข้อบังคับ'],
    },
  },
  {
    terms: [
      'คุณภาพ',
      'quality',
      'ตรวจคุณภาพ',
      'ปลอมผล',
      'บิดเบือนผล',
      'qa',
      'qc',
      'ชำรุด',
      'ไม่ได้มาตรฐาน',
      'ใบรับรองคุณภาพ',
      'หลุด qc',
    ],
    result: {
      suggestedCategory: 'Quality',
      confidence: 93,
      reasoning:
        'ตรวจพบประเด็นการตรวจสอบคุณภาพอย่างไม่เหมาะสม การบิดเบือนผลทดสอบ หรือมาตรฐานสินค้า/งานบริการตกหล่น',
      secondaryCategory: 'Compliance',
      suggestedUrgency: 'Medium',
      keywords: ['คุณภาพไม่เหมาะสม', 'QA/QC', 'มาตรฐาน'],
    },
  },
];

const DEFAULT_SUGGESTION: CategorySuggestion = {
  suggestedCategory: 'HR',
  confidence: 89,
  reasoning:
    'เนื้อหาเกี่ยวข้องกับทรัพยากรบุคคลและสวัสดิการ ค่าตอบแทน เวลาทำงาน หรือการโยกย้ายตำแหน่ง',
  secondaryCategory: 'Compliance',
  suggestedUrgency: 'Medium',
  keywords: ['ทรัพยากรบุคคล', 'สวัสดิการ', 'สิทธิประโยชน์'],
};

function classify(rules: HeuristicRule[], title?: string, description?: string) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  return (
    rules.find((r) => r.terms.some((term) => text.includes(term)))?.result ?? DEFAULT_SUGGESTION
  );
}

const SERVER_RULES = [...SERVER_ONLY_RULES, ...SHARED_RULES];

/** Server fallback of POST /api/ai/suggest-category (upstream server.ts rules). */
export function analyzeWithHeuristics(title?: string, description?: string): CategorySuggestion {
  return classify(SERVER_RULES, title, description);
}

/** Client fallback of suggestCategoryWithAI() (upstream api.ts catch-path rules). */
export function analyzeWithClientHeuristics(
  title?: string,
  description?: string
): CategorySuggestion {
  return classify(SHARED_RULES, title, description);
}
