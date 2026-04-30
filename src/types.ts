export interface User {
  uid: string;
  studentId: string;
  nickname?: string;
  role: 'admin' | 'student';
  points?: number;
  questionsUploaded?: number;
  kpsUploaded?: number;
  questionsAnswered?: number;
  tokensUsed?: number;
  createdAt: string;
}

export type QuestionDifficulty = '难题' | '易错题';
export type QuestionType = '概念题' | '计算题' | '材料题';
export type QuestionField = '生物化学' | '细胞生物学' | '植物学' | '动物学' | '微生物学' | '动物生理学' | '植物生理学' | '其他';
export type QuestionSource = '猿辅导' | '汇智启航' | '北斗学友' | '联赛题' | '国赛题' | '愿程' | '其他';

export interface KnowledgePoint {
  id: string;
  questionId: string;
  field: QuestionField;
  title: string; // e.g., "氮肥的作用"
  content: string; // e.g., "促茎叶生长"
  level: 1 | 2 | 3 | 4; // 1, 2, 3, 4 (Mastered)
  mastered: boolean;
  createdAt: string;
}

export interface Question {
  id: string;
  firestoreId?: string;
  imageUrl?: string;
  field: QuestionField | QuestionField[]; // Support multiple fields
  source: QuestionSource;
  sourceDetail: string;
  difficulty: QuestionDifficulty[];
  type: QuestionType;
  content: string;
  answer?: string;
  explanation?: string;
  createdBy: string;
  creatorStudentId?: string;
  creatorNickname?: string;
  createdAt: string;
  publicTags?: string[];
  knowledgePoints?: { title: string; content: string }[]; // AI generated KP
}

export interface UserTag {
  userId: string;
  questionId: string;
  tags: string[];
}

export interface AllowedStudent {
  studentId: string;
  nickname?: string;
  addedBy: string;
  addedAt: string;
}

export interface BirthdaySettings {
  slogan: string;
  isEnabled: boolean;
}

export interface UserBackgroundSettings {
  customBgUrl: string | null;
  bgBlur: number;
}
