// Era and Instrument are kept as string so both the jazz and design datasets
// can use the same Musician type without duplication.

export type Instrument = string;
export type Era = string;

export type SourceType =
  | 'interview'
  | 'autobiography'
  | 'biography'
  | 'liner-notes'
  | 'documentary'
  | 'attributed';

export interface HeroRef {
  heroId: string;
  quote?: string;
  source?: string;
  sourceUrl?: string;
  sourceYear?: number;
  sourceType: SourceType;
  notes?: string;
}

export interface Musician {
  id: string;
  name: string;
  born: number;
  died?: number;
  instruments: Instrument[];
  eras: Era[];
  heroes: HeroRef[];
  bio?: string;
  bioUrl?: string;
}
