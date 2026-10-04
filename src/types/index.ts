export type SectionId = 'top' | 'work' | 'proof' | 'cars' | 'contact';

export interface SocialLink {
  label: string;
  href: string;
  icon: string;
}

export interface ExperienceItem {
  id: string;
  title: string;
  role: string;
  period: string;
  description: string;
}
