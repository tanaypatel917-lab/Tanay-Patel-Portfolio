export type PortfolioSectionId = 'top' | 'work' | 'proof' | 'cars' | 'contact';

export type PortfolioProjectStatus = 'Completed' | 'In progress';

export type PortfolioEvidenceStatus =
  | 'Qualification'
  | 'Academic result'
  | 'Team role';

export interface PortfolioIdentity {
  readonly name: string;
  readonly role: string;
  readonly location: string;
  readonly currentStatus: string;
}

export interface PortfolioIntro {
  readonly eyebrow: string;
  readonly headline: string;
  readonly summary: string;
}

export interface PortfolioEntry<Status extends string = string> {
  readonly id: string;
  readonly eyebrow: string;
  readonly status: Status;
  readonly title: string;
  readonly summary: string;
  readonly proof: string;
  readonly href?: string;
}

export type PortfolioProject = PortfolioEntry<PortfolioProjectStatus> & {
  readonly presentation: {
    readonly kind: 'dossier' | 'signal';
    readonly panels: readonly { readonly label: string; readonly text: string }[];
  };
};

export type PortfolioEvidence = PortfolioEntry<PortfolioEvidenceStatus>;

export interface PortfolioDiscipline {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
}

export interface PortfolioInterest {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
}

export interface PortfolioCars {
  readonly title: string;
  readonly summary: string;
  /** Functional caption for the 3D model shown in the section. */
  readonly model: string;
  readonly items: readonly PortfolioInterest[];
}

export type PortfolioNavigationItem = {
  [Target in PortfolioSectionId]: {
    readonly label: string;
    readonly target: Target;
    readonly href: `#${Target}`;
  };
}[PortfolioSectionId];

export interface PortfolioContactLink {
  readonly label: string;
  readonly value: string;
  readonly href: string;
}

export interface PortfolioContact {
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly links: readonly PortfolioContactLink[];
}

/** Narrative chapter statements. `*text*` marks the single phrase set in the serif italic. */
export interface PortfolioChapters {
  readonly work: string;
  readonly proof: string;
}

/** Interface labels; no claims, just controls. */
export interface PortfolioUi {
  readonly menu: string;
  readonly close: string;
  readonly soundOn: string;
  readonly soundOff: string;
  readonly loading: string;
  readonly skipIntro: string;
  readonly replayIntro: string;
  readonly introLabel: string;
  readonly viewWork: string;
  readonly inspectCar: string;
  readonly guidedView: string;
  readonly frontView: string;
  readonly sideView: string;
  readonly rearView: string;
  readonly resetView: string;
  readonly zoomIn: string;
  readonly zoomOut: string;
  readonly loadModel: string;
  readonly loadingModel: string;
  readonly modelUnavailable: string;
  readonly retryModel: string;
  readonly inspectHelp: string;
  readonly modelCredit: string;
  readonly signalDisclaimer: string;
  readonly motionReduced: string;
  readonly motionFull: string;
  readonly motionSystem: string;
  readonly reduceMotion: string;
  readonly copyEmail: string;
  readonly emailCopied: string;
  readonly copyUnavailable: string;
  readonly soundLoading: string;
  readonly soundBlocked: string;
  readonly soundUnavailable: string;
  readonly pageMissing: string;
  readonly pageMissingSummary: string;
  readonly backToWork: string;
  readonly home: string;
}

export interface PortfolioContent {
  readonly identity: PortfolioIdentity;
  readonly intro: PortfolioIntro;
  readonly chapters: PortfolioChapters;
  readonly projects: readonly PortfolioProject[];
  readonly evidence: readonly PortfolioEvidence[];
  readonly disciplines: readonly PortfolioDiscipline[];
  readonly cars: PortfolioCars;
  readonly navigation: readonly PortfolioNavigationItem[];
  readonly contact: PortfolioContact;
  readonly ui: PortfolioUi;
}

export const portfolioContent = {
  identity: {
    name: 'Tanay Patel',
    role: 'High-school builder',
    location: 'New Jersey',
    currentStatus: 'Building alongside school',
  },
  intro: {
    eyebrow: 'Finance / systems / design',
    headline: 'I turn curiosity into work I can *test*.',
    summary:
      'I am a high-school builder interested in how financial decisions, technical systems, and thoughtful design can make difficult ideas clearer and more useful.',
  },
  chapters: {
    work: 'Built. *Building*.',
    proof: 'Evidence, not *adjectives*.',
  },
  projects: [
    {
      id: 'kean-idea-eco-grocery',
      eyebrow: 'Kean I.D.E.A.',
      status: 'Completed',
      title: 'A solo eco-grocery concept',
      summary:
        'I built and presented an eco-grocery competition entry independently, shaping the idea and its case from the ground up.',
      proof: 'Solo winner of the Kean I.D.E.A. eco-grocery competition.',
      presentation: {
        kind: 'dossier',
        panels: [
          { label: 'The idea', text: 'An eco-grocery competition concept.' },
          { label: 'The role', text: 'Built and presented independently.' },
          { label: 'The result', text: 'Solo winner of the Kean I.D.E.A. eco-grocery competition.' },
        ],
      },
    },
    {
      id: 'wifi-heartbeat-security',
      eyebrow: 'Security R&D',
      status: 'In progress',
      title: 'Heartbeat sensing through Wi-Fi',
      summary:
        'I am working on a security system that uses AI to analyze Wi-Fi frequency changes and detect human heartbeats.',
      proof:
        'This is ongoing work; I do not present it as a finished or deployed product.',
      presentation: {
        kind: 'signal',
        panels: [
          { label: 'Input', text: 'Wi-Fi frequency changes' },
          { label: 'Approach', text: 'AI analysis' },
          { label: 'Research goal', text: 'Heartbeat detection' },
        ],
      },
    },
  ],
  evidence: [
    {
      id: 'deca-finance-state-qualifier',
      eyebrow: 'Finance',
      status: 'Qualification',
      title: 'DECA Finance state qualifier',
      summary:
        'Qualified for state-level competition through a DECA finance event.',
      proof: 'State qualifier in DECA Finance.',
    },
    {
      id: 'ap-microeconomics-score',
      eyebrow: 'Economics',
      status: 'Academic result',
      title: 'AP Microeconomics',
      summary:
        'Studied how incentives, tradeoffs, and markets shape individual and business decisions.',
      proof: 'AP score: 5.',
    },
    {
      id: 'honors-accounting-grade',
      eyebrow: 'Accounting',
      status: 'Academic result',
      title: 'Honors Accounting',
      summary:
        'Built a formal grounding in accounting principles and financial statements.',
      proof: 'Course grade: 92%.',
    },
    {
      id: 'princeton-volleyball-setter',
      eyebrow: 'Team discipline',
      status: 'Team role',
      title: 'Princeton Volleyball Club',
      summary:
        'Contribute as the setter, where preparation and communication shape every point.',
      proof: '16U setter.',
    },
    {
      id: 'high-school-jv-starter',
      eyebrow: 'Competitive discipline',
      status: 'Team role',
      title: 'High-school JV',
      summary:
        'Compete in a role that rewards consistency, preparation, and composure.',
      proof: '128 lb starter.',
    },
  ],
  disciplines: [
    {
      id: 'finance',
      title: 'Finance',
      summary:
        'I study markets, accounting, and the decisions behind how resources move.',
    },
    {
      id: 'systems',
      title: 'Systems',
      summary:
        'I am drawn to signals, constraints, and the technical work of making an idea testable.',
    },
    {
      id: 'design',
      title: 'Design',
      summary:
        'I care about turning complex thinking into something clear, useful, and considered.',
    },
    {
      id: 'team-discipline',
      title: 'Team discipline',
      summary:
        'Competition reinforces the preparation, communication, and consistency I bring to the rest of my work.',
    },
  ],
  cars: {
    title: 'And then there are *cars*.',
    summary:
      'Motorsport is engineering, finance, and design tested in public every weekend. It is where the things I care about overlap.',
    model: 'Lamborghini Huracán GT3 EVO2',
    items: [
      {
        id: 'huracan-gt3',
        eyebrow: 'The dream',
        title: 'Huracán GT3',
        summary:
          'A 5.2L V10 behind your head, motorsport aero, and a presence that stops the room. To me it is the perfect mix of art and engineering.',
      },
      {
        id: 'mclaren-f1',
        eyebrow: 'The team',
        title: 'McLaren Formula 1',
        summary:
          'McLaren has been my team since I started watching F1. The papaya orange, constant innovation, and the way they attack every season mirror how I build.',
      },
      {
        id: 'car-meets',
        eyebrow: 'The community',
        title: 'Car meets',
        summary:
          'Car meets have never just been about cars. They are where I have met mentors, friends, and people who push me to learn more about builds, finance, and the next track day.',
      },
    ],
  },
  navigation: [
    { label: 'Top', target: 'top', href: '#top' },
    { label: 'Work', target: 'work', href: '#work' },
    { label: 'Proof', target: 'proof', href: '#proof' },
    { label: 'Cars', target: 'cars', href: '#cars' },
    { label: 'Contact', target: 'contact', href: '#contact' },
  ],
  contact: {
    eyebrow: 'Contact',
    title: 'Let us *compare notes*.',
    summary:
      'If you are working on something thoughtful in finance, systems, or design, I would be glad to hear about it.',
    links: [
      {
        label: 'Email',
        value: 'Tanay001@icloud.com',
        href: 'mailto:Tanay001@icloud.com',
      },
      {
        label: 'LinkedIn',
        value: 'tanay-patel-1b2b2332b',
        href: 'https://www.linkedin.com/in/tanay-patel-1b2b2332b/',
      },
    ],
  },
  ui: {
    menu: 'Menu',
    close: 'Close',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    loading: 'Loading',
    skipIntro: 'Skip intro',
    replayIntro: 'Replay intro',
    introLabel: 'Introduction',
    viewWork: 'View work',
    inspectCar: 'Inspect car',
    guidedView: 'Return to guided view',
    frontView: 'Front',
    sideView: 'Side',
    rearView: 'Rear',
    resetView: 'Reset view',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    loadModel: 'Load 3D',
    loadingModel: 'Loading the 3D model',
    modelUnavailable: 'The 3D view is unavailable. You can still explore the page.',
    retryModel: 'Retry 3D',
    inspectHelp: 'Use the view and zoom controls. With a mouse, drag to rotate. Esc returns to the guided view.',
    modelCredit: 'Lamborghini Huracán GT3 EVO2',
    signalDisclaimer: 'Illustrative signal, not sensor data.',
    motionReduced: 'Reduced motion',
    motionFull: 'Full motion',
    motionSystem: 'Reduced by system',
    reduceMotion: 'Reduce motion',
    copyEmail: 'Copy email',
    emailCopied: 'Email copied',
    copyUnavailable: 'Copy unavailable. Select the email address instead.',
    soundLoading: 'Enabling sound',
    soundBlocked: 'Enable sound',
    soundUnavailable: 'Sound unavailable',
    pageMissing: 'That page is not here.',
    pageMissingSummary: 'Try the homepage or jump straight to the work.',
    backToWork: 'Back to work',
    home: 'Home',
  },
} as const satisfies PortfolioContent;
