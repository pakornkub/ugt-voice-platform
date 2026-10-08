import type { GrievanceCategory, UrgencyLevel } from '@/types';

export interface CategorySuggestion {
  suggestedCategory: GrievanceCategory;
  confidence: number;
  reasoning: string;
  secondaryCategory: GrievanceCategory;
  suggestedUrgency: UrgencyLevel;
  keywords: string[];
}

interface HeuristicRule extends CategorySuggestion {
  terms: string[];
}

// Evaluated top-to-bottom, first match wins — the order (and the repeated
// harassment/fraud rows, the second being a superset of the first) mirrors
// upstream's server.ts so results stay identical.
const RULES: HeuristicRule[] = [
  {
    terms: ['ลวนลาม', 'คุกคาม', 'ข่มขู่', 'harass', 'ล่วงละเมิด', 'กลั่นแกล้ง', 'พูดจาดูถูก'],
    suggestedCategory: 'Harassment',
    confidence: 95,
    reasoning: 'ตรวจพบคำที่เกี่ยวข้องกับพฤติกรรมคุกคาม ข่มขู่ หรือการเลือกปฏิบัติในสถานที่ทำงาน',
    secondaryCategory: 'Ethics',
    suggestedUrgency: 'High',
    keywords: ['การคุกคาม', 'ล่วงละเมิด', 'ความปลอดภัย'],
  },
  {
    terms: ['โกง', 'ทุจริต', 'สินบน', 'ยักยอก', 'fraud', 'เงินทอน', 'ปลอมเอกสาร', 'ฮั้ว'],
    suggestedCategory: 'Fraud',
    confidence: 96,
    reasoning: 'ตรวจพบข้อความบ่งชี้พฤติกรรมต้องสงสัยเกี่ยวกับการเงิน การปลอมแปลงเอกสาร หรือทุจริต',
    secondaryCategory: 'Compliance',
    suggestedUrgency: 'Critical',
    keywords: ['ทุจริต', 'การเงิน', 'การตรวจสอบ'],
  },
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
    suggestedCategory: 'Harassment',
    confidence: 96,
    reasoning:
      'ตรวจพบประเด็นเกี่ยวกับสิทธิมนุษยชน การล่วงละเมิด พฤติกรรมคุกคาม หรือการกลั่นแกล้งในสถานที่ทำงาน',
    secondaryCategory: 'Ethics',
    suggestedUrgency: 'High',
    keywords: ['สิทธิมนุษยชน', 'การล่วงละเมิด', 'การคุกคาม'],
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
    suggestedCategory: 'Fraud',
    confidence: 96,
    reasoning:
      'ตรวจพบพฤติกรรมทุจริต การฉ้อโกงทางการเงิน การติดสินบน การรับผลประโยชน์ทับซ้อน หรือการปลอมแปลงเอกสาร',
    secondaryCategory: 'Ethics',
    suggestedUrgency: 'Critical',
    keywords: ['การทุจริต', 'การฉ้อโกง', 'สินบน'],
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
    suggestedCategory: 'Ethics',
    confidence: 94,
    reasoning:
      'ตรวจพบประเด็นจริยธรรม การรักษาความลับองค์กร การเปิดเผยข้อมูล การฟอกเงิน ทรัพย์สินทางปัญญา หรือข้อมูลกลุ่มบริษัท UBE',
    secondaryCategory: 'Compliance',
    suggestedUrgency: 'High',
    keywords: ['จริยธรรม', 'ข้อมูลความลับ', 'ความโปร่งใส'],
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
    suggestedCategory: 'Compliance',
    confidence: 93,
    reasoning:
      'ตรวจพบประเด็นการไม่ปฏิบัติตามกฎหมายและกฎเกณฑ์ เช่น กฎหมายแข่งขันทางการค้า ควบคุมการส่งออก หรือระเบียบข้อบังคับ',
    secondaryCategory: 'Ethics',
    suggestedUrgency: 'Medium',
    keywords: ['กฎหมายและกฎเกณฑ์', 'Compliance', 'ข้อบังคับ'],
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
    suggestedCategory: 'Quality',
    confidence: 93,
    reasoning:
      'ตรวจพบประเด็นการตรวจสอบคุณภาพอย่างไม่เหมาะสม การบิดเบือนผลทดสอบ หรือมาตรฐานสินค้า/งานบริการตกหล่น',
    secondaryCategory: 'Compliance',
    suggestedUrgency: 'Medium',
    keywords: ['คุณภาพไม่เหมาะสม', 'QA/QC', 'มาตรฐาน'],
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

/** Keyword-based classification used when Gemini is unavailable. */
export function analyzeWithHeuristics(title?: string, description?: string): CategorySuggestion {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const rule = RULES.find((r) => r.terms.some((term) => text.includes(term)));
  if (!rule) return DEFAULT_SUGGESTION;
  const { terms, ...suggestion } = rule;
  void terms;
  return suggestion;
}
