export type Mode = 'crush' | 'new' | 'ltr' | 'healing';

export type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'fearful';

export type LoveLanguage = 'words' | 'acts' | 'gifts' | 'quality_time' | 'touch';

export interface AvwScores {
  safe: number; // 0-100
  seen: number; // 0-100
  sought: number; // 0-100
}

export interface MemoryVaultEntry {
  id: string;
  detail: string;
  date: string; // ISO date
  tags: string[];
  used: boolean;
}

export interface DesireInventoryEntry {
  id: string;
  desire: string;
  rank: number; // 1 = most wanted
  used: boolean;
}

export type BidResponse = 'toward' | 'away' | 'against';

export interface BidLogEntry {
  id: string;
  description: string;
  response: BidResponse;
  date: string; // ISO date
}

export interface UserProfile {
  mode: Mode;
  attachmentStyle: AttachmentStyle;
  attachmentSpike?: AttachmentStyle;
  loveLanguagePrimary: LoveLanguage;
  loveLanguageSecondary: LoveLanguage;
  avwScores: AvwScores;
  memoryVault: MemoryVaultEntry[];
  desireInventory: DesireInventoryEntry[];
  bidLog: BidLogEntry[];
  startDate: string; // ISO date, drives weeksSinceStart
}

export type AvwAxis = 'safe' | 'seen' | 'sought';

export interface MicroAttunement {
  axis: AvwAxis;
  strategy: string;
  tone: string;
  action: string;
}
