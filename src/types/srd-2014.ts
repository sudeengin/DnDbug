// SRD 2014 Character Creation Types

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface AbilityScoreModifiers {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface RaceTrait {
  name: string;
  description: string;
}

export interface Race {
  name: string;
  subraces?: Subrace[];
  abilityScoreIncrease: Partial<AbilityScores>;
  traits: RaceTrait[];
  languages: string[];
  speed: number;
  size: 'Small' | 'Medium' | 'Large';
}

export interface Subrace {
  name: string;
  abilityScoreIncrease: Partial<AbilityScores>;
  traits: RaceTrait[];
}

export interface BackgroundFeature {
  name: string;
  description: string;
}

export interface Background {
  name: string;
  skillProficiencies: string[];
  toolProficiencies: string[];
  languages: string[];
  equipment: string[];
  feature: BackgroundFeature;
  personalityTraits: string[];
  ideals: string[];
  bonds: string[];
  flaws: string[];
}

export interface SRD2014Character {
  // Core Info
  id: string;
  name: string;
  level: number;
  ruleset: 'SRD2014';
  
  // Ability Scores
  abilityScores: AbilityScores;
  abilityScoreMethod: 'standard' | 'point-buy';
  pointBuyTotal?: number;
  
  // Race & Background
  race: Race;
  subrace?: Subrace;
  background: Background;
  
  // Computed values
  abilityModifiers: AbilityScoreModifiers;
  
  // Reference to original story character
  storyCharacterId?: string;
  
  // Custom fields from story character
  customLanguages?: string[]; // Languages from story character
  customProficiencies?: string[]; // Proficiencies from story character
  customAge?: number; // Age from story character
  customHeight?: string; // Height from story character
  customPhysicalDescription?: string; // Physical description from story character
  customEquipmentPreferences?: string[]; // Equipment preferences from story character
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Validation and calculation utilities
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;
export const POINT_BUY_COSTS = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
} as const;

export const ABILITY_SCORE_NAMES = [
  'strength', 'dexterity', 'constitution', 
  'intelligence', 'wisdom', 'charisma'
] as const;

export function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function calculateAbilityModifiers(scores: AbilityScores): AbilityScoreModifiers {
  return {
    strength: calculateAbilityModifier(scores.strength),
    dexterity: calculateAbilityModifier(scores.dexterity),
    constitution: calculateAbilityModifier(scores.constitution),
    intelligence: calculateAbilityModifier(scores.intelligence),
    wisdom: calculateAbilityModifier(scores.wisdom),
    charisma: calculateAbilityModifier(scores.charisma),
  };
}

export function calculatePointBuyCost(scores: AbilityScores): number {
  return Object.values(scores).reduce((total, score) => {
    return total + (POINT_BUY_COSTS[score as keyof typeof POINT_BUY_COSTS] || 0);
  }, 0);
}

export function validateAbilityScores(scores: AbilityScores, method: 'standard' | 'point-buy'): string[] {
  const errors: string[] = [];
  
  // Check score ranges
  Object.entries(scores).forEach(([ability, score]) => {
    if (score < 8 || score > 15) {
      errors.push(`${ability} score must be between 8 and 15`);
    }
  });
  
  if (method === 'standard') {
    // Check if scores match standard array (in any order)
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const sortedStandard = [...STANDARD_ARRAY].sort((a, b) => b - a);
    
    if (JSON.stringify(sortedScores) !== JSON.stringify(sortedStandard)) {
      errors.push('Standard array scores must be exactly: 15, 14, 13, 12, 10, 8');
    }
  } else if (method === 'point-buy') {
    // Check point buy total
    const cost = calculatePointBuyCost(scores);
    if (cost > 27) {
      errors.push(`Point buy total (${cost}) exceeds maximum of 27 points`);
    }
  }
  
  return errors;
}

export function validateCharacter(character: Partial<SRD2014Character>): string[] {
  const errors: string[] = [];
  
  if (!character.name?.trim()) {
    errors.push('Character name is required');
  }
  
  if (!character.race) {
    errors.push('Race selection is required');
  }
  
  if (!character.background) {
    errors.push('Background selection is required');
  }
  
  if (character.abilityScores) {
    const abilityErrors = validateAbilityScores(
      character.abilityScores, 
      character.abilityScoreMethod || 'standard'
    );
    errors.push(...abilityErrors);
  }
  
  return errors;
}

// Race data (SRD 2014)
export const SRD_RACES: Race[] = [
  {
    name: 'Human',
    abilityScoreIncrease: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    traits: [
      { name: 'Extra Language', description: 'You can speak, read, and write one extra language of your choice.' }
    ],
    languages: ['Common'],
    speed: 30,
    size: 'Medium'
  },
  {
    name: 'Elf',
    abilityScoreIncrease: { dexterity: 2 },
    traits: [
      { name: 'Darkvision', description: 'You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light.' },
      { name: 'Keen Senses', description: 'You have proficiency in the Perception skill.' },
      { name: 'Fey Ancestry', description: 'You have advantage on saving throws against being charmed, and magic can\'t put you to sleep.' },
      { name: 'Trance', description: 'You don\'t need to sleep. Instead, you meditate deeply, remaining semiconscious, for 4 hours a day.' }
    ],
    languages: ['Common', 'Elvish'],
    speed: 30,
    size: 'Medium',
    subraces: [
      {
        name: 'High Elf',
        abilityScoreIncrease: { intelligence: 1 },
        traits: [
          { name: 'Elf Weapon Training', description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.' },
          { name: 'Cantrip', description: 'You know one cantrip of your choice from the wizard spell list.' },
          { name: 'Extra Language', description: 'You can speak, read, and write one extra language of your choice.' }
        ]
      },
      {
        name: 'Wood Elf',
        abilityScoreIncrease: { wisdom: 1 },
        traits: [
          { name: 'Elf Weapon Training', description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.' },
          { name: 'Fleet of Foot', description: 'Your base walking speed increases to 35 feet.' },
          { name: 'Mask of the Wild', description: 'You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena.' }
        ]
      }
    ]
  },
  {
    name: 'Dwarf',
    abilityScoreIncrease: { constitution: 2 },
    traits: [
      { name: 'Darkvision', description: 'You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light.' },
      { name: 'Dwarven Resilience', description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.' },
      { name: 'Dwarven Combat Training', description: 'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.' },
      { name: 'Tool Proficiency', description: 'You gain proficiency with the artisan\'s tools of your choice: smith\'s tools, brewer\'s supplies, or mason\'s tools.' },
      { name: 'Stonecunning', description: 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.' }
    ],
    languages: ['Common', 'Dwarvish'],
    speed: 25,
    size: 'Medium',
    subraces: [
      {
        name: 'Hill Dwarf',
        abilityScoreIncrease: { wisdom: 1 },
        traits: [
          { name: 'Dwarven Toughness', description: 'Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.' }
        ]
      },
      {
        name: 'Mountain Dwarf',
        abilityScoreIncrease: { strength: 2 },
        traits: [
          { name: 'Dwarven Armor Training', description: 'You have proficiency with light and medium armor.' }
        ]
      }
    ]
  },
  {
    name: 'Halfling',
    abilityScoreIncrease: { dexterity: 2 },
    traits: [
      { name: 'Lucky', description: 'When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.' },
      { name: 'Brave', description: 'You have advantage on saving throws against being frightened.' },
      { name: 'Halfling Nimbleness', description: 'You can move through the space of any creature that is of a size larger than yours.' }
    ],
    languages: ['Common', 'Halfling'],
    speed: 25,
    size: 'Small',
    subraces: [
      {
        name: 'Lightfoot',
        abilityScoreIncrease: { charisma: 1 },
        traits: [
          { name: 'Naturally Stealthy', description: 'You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.' }
        ]
      },
      {
        name: 'Stout',
        abilityScoreIncrease: { constitution: 1 },
        traits: [
          { name: 'Stout Resilience', description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.' }
        ]
      }
    ]
  }
];

// Background data (SRD 2014)
export const SRD_BACKGROUNDS: Background[] = [
  {
    name: 'Acolyte',
    skillProficiencies: ['Insight', 'Religion'],
    toolProficiencies: [],
    languages: ['Two of your choice'],
    equipment: [
      'A holy symbol (a gift to you when you entered the priesthood)',
      'A prayer book or prayer wheel',
      '5 sticks of incense',
      'Common clothes',
      'A belt pouch containing 15 gp'
    ],
    feature: {
      name: 'Shelter of the Faithful',
      description: 'As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle.'
    },
    personalityTraits: [
      'I idolize a particular hero of my faith, and constantly refer to that person\'s deeds and example.',
      'I can find common ground between the fiercest enemies, empathizing with them and always working toward peace.',
      'I see omens in every event and action. The gods try to speak to us, we just need to listen.',
      'Nothing can shake my optimistic attitude.',
      'I quote (or misquote) sacred texts and proverbs in almost every situation.',
      'I am tolerant (or intolerant) of other faiths and respect (or condemn) the worship of other gods.',
      'I\'ve enjoyed fine food, drink, and high society among my temple\'s elite. Rough living grates on me.',
      'I\'ve spent so long in the temple that I have little practical experience dealing with people in the outside world.'
    ],
    ideals: [
      'Tradition. The ancient traditions of worship and sacrifice must be preserved and upheld. (Lawful)',
      'Charity. I always try to help those in need, no matter what the personal cost. (Good)',
      'Change. We must help bring about the changes the gods are constantly working in the world. (Chaotic)',
      'Power. I hope to one day rise to the top of my faith\'s religious hierarchy. (Lawful)',
      'Faith. I trust that my deity will guide my actions. I have faith that if I work hard, things will go well. (Lawful)',
      'Aspiration. I seek to prove myself worthy of my god\'s favor by matching my actions against his or her teachings. (Any)'
    ],
    bonds: [
      'I would die to recover an ancient relic of my faith that was lost long ago.',
      'I will someday get revenge on the corrupt temple hierarchy who branded me a heretic.',
      'I owe my life to the priest who took me in when my parents died.',
      'Everything I do is for the common people.',
      'I will do anything to protect the temple where I served.',
      'I seek to preserve a sacred text that my enemies consider heretical and seek to destroy.'
    ],
    flaws: [
      'I judge others harshly, and myself even more severely.',
      'I put too much trust in those who wield power within my temple\'s hierarchy.',
      'My piety sometimes leads me to blindly trust those that profess faith in my god.',
      'I am inflexible in my thinking.',
      'I am suspicious of strangers and expect the worst of them.',
      'Once I pick a goal, I become obsessed with it to the detriment of everything else in my life.'
    ]
  },
  {
    name: 'Criminal',
    skillProficiencies: ['Deception', 'Stealth'],
    toolProficiencies: ['One type of gaming set', 'Thieves\' tools'],
    languages: [],
    equipment: [
      'A crowbar',
      'A set of dark common clothes including a hood',
      'A belt pouch containing 15 gp'
    ],
    feature: {
      name: 'Criminal Contact',
      description: 'You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.'
    },
    personalityTraits: [
      'I always have a plan for what to do when things go wrong.',
      'I am always calm, no matter what the situation. I never raise my voice or let my emotions control me.',
      'The first thing I do in a new place is note the locations of everything valuable—or where such things could be hidden.',
      'I would rather make a new friend than a new enemy.',
      'I am incredibly slow to trust. Those who seem the fairest often have the most to hide.',
      'I don\'t pay attention to the risks in a situation. Never tell me the odds.',
      'The best way to get me to do something is to tell me I can\'t do it.',
      'I blow up at the slightest insult.'
    ],
    ideals: [
      'Honor. I don\'t steal from others in the trade. (Lawful)',
      'Freedom. Chains are meant to be broken, as are those who would forge them. (Chaotic)',
      'Charity. I steal from the wealthy so that I can help people in need. (Good)',
      'Greed. I will do whatever it takes to become wealthy. (Evil)',
      'People. I\'m loyal to my friends, not to any ideals, and everyone else can take care of themselves. (Neutral)',
      'Redemption. There\'s a spark of good in everyone. (Good)'
    ],
    bonds: [
      'I\'m trying to pay off an old debt I owe to a generous benefactor.',
      'My ill-gotten gains go to support my family.',
      'Something important was taken from me, and I aim to steal it back.',
      'I will become the greatest thief that ever lived.',
      'I\'m guilty of a terrible crime. I hope I can redeem myself for it.',
      'Someone I loved died because of a mistake I made. That will never happen again.'
    ],
    flaws: [
      'When I see something valuable, I can\'t think about anything but how to steal it.',
      'When faced with a choice between money and my friends, I usually choose the money.',
      'If there\'s a plan, I\'ll forget it. If I don\'t forget it, I\'ll ignore it.',
      'I have a "tell" that reveals when I\'m lying.',
      'I turn tail and run when things look bad.',
      'An innocent person is in prison for a crime that I committed. I\'m okay with that.'
    ]
  },
  {
    name: 'Folk Hero',
    skillProficiencies: ['Animal Handling', 'Survival'],
    toolProficiencies: ['One type of artisan\'s tools', 'Vehicles (land)'],
    languages: [],
    equipment: [
      'A set of artisan\'s tools (one of your choice)',
      'A shovel',
      'An iron pot',
      'A set of common clothes',
      'A belt pouch containing 10 gp'
    ],
    feature: {
      name: 'Rustic Hospitality',
      description: 'Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.'
    },
    personalityTraits: [
      'I judge people by their actions, not their words.',
      'If someone is in trouble, I\'m always ready to lend help.',
      'When I set my mind to something, I follow through no matter what gets in my way.',
      'I have a strong sense of fair play and always try to find the most equitable solution to arguments.',
      'I\'m confident in my own abilities and do what I can to instill confidence in others.',
      'Thinking is for other people. I prefer action.',
      'I misuse long words in an attempt to sound smarter.',
      'I get bored easily. When am I going to get on with my destiny?'
    ],
    ideals: [
      'Respect. People deserve to be treated with dignity and respect. (Good)',
      'Fairness. No one should get preferential treatment before the law, and no one is above the law. (Lawful)',
      'Freedom. Tyrants must not be allowed to oppress the people. (Chaotic)',
      'Might. If I become strong, I can take what I want—what I deserve. (Evil)',
      'Sincerity. There\'s no good in pretending to be something I\'m not. (Neutral)',
      'Destiny. Nothing and no one can steer me away from my higher calling. (Any)'
    ],
    bonds: [
      'I have a family, but I have no idea where they are. One day, I hope to see them again.',
      'I worked the land, making the most of what\'s mine. I\'ll never let anyone take what I\'ve earned.',
      'I\'m proud of what I\'ve accomplished, and I\'m not afraid to tell anyone about it.',
      'I\'m not afraid of hard work, and I\'m not afraid to get my hands dirty.',
      'I\'m not afraid of hard work, and I\'m not afraid to get my hands dirty.',
      'I\'m not afraid of hard work, and I\'m not afraid to get my hands dirty.'
    ],
    flaws: [
      'The tyrant who rules my land will stop at nothing to see me killed.',
      'I\'m convinced of the significance of my destiny, and blind to my shortcomings and the risk of failure.',
      'The people who knew me when I was young know my shameful secret, so I can never go home again.',
      'I have trouble trusting in my allies.',
      'I\'ll never forget the crushing defeat my company suffered or the enemies who dealt it.',
      'I\'m too sympathetic; I can\'t resist helping someone in need, even if it\'s not in my best interests.'
    ]
  }
];

// Re-export Character type from macro-chain for convenience
export type { Character as StoryCharacter } from './macro-chain';
