export interface PredefinedService {
  name: string;
  category: string;
  price: number;
  duration: number; // in minutes
  description: string;
}

export const PREDEFINED_CATEGORIES = [
  { name: 'HAIR', description: 'Hair cuts, washes, spa, styling and treatments', displayOrder: 1 },
  { name: 'FACIAL & SKIN', description: 'Facials, cleanups, bleaches and glow treatments', displayOrder: 2 },
  { name: 'WAXING', description: 'Hygiene and gentle hair removal waxing services', displayOrder: 3 },
  { name: 'THREADING', description: 'Precision facial hair shaping and threading', displayOrder: 4 },
  { name: 'MANICURE / PEDICURE', description: 'Nail, hand and foot grooming and spa care', displayOrder: 5 },
  { name: 'MAKEUP', description: 'Party, engagement and bridal makeup artistry', displayOrder: 6 },
  { name: 'OTHER', description: 'Traditional head massage and saree draping services', displayOrder: 7 },
];

export const PREDEFINED_SERVICES: PredefinedService[] = [
  // 1. HAIR
  { name: 'Haircut', category: 'HAIR', price: 375, duration: 30, description: 'Classic professional haircut with consultation and styling finish' },
  { name: 'Hair Wash', category: 'HAIR', price: 225, duration: 15, description: 'Cleansing hair shampoo and deep conditioning wash' },
  { name: 'Hair Spa', category: 'HAIR', price: 1200, duration: 60, description: 'Nourishing cream massage, steam, and scalp rejuvenation' },
  { name: 'Hair Styling', category: 'HAIR', price: 600, duration: 45, description: 'Ironing, curls, or formal hair styling for events' },
  { name: 'Blow Dry', category: 'HAIR', price: 450, duration: 20, description: 'Professional volume blow dry with heat protectant' },
  { name: 'Hair Straightening', category: 'HAIR', price: 3750, duration: 180, description: 'Permanent chemical hair straightening and shine treatment' },
  { name: 'Hair Smoothening', category: 'HAIR', price: 5250, duration: 180, description: 'Frizz-free silk smoothening treatment for manageable locks' },
  { name: 'Hair Keratin Treatment', category: 'HAIR', price: 6750, duration: 150, description: 'Intensive protein infusion restoring damaged hair fibres' },

  // 2. FACIAL & SKIN
  { name: 'Basic Facial', category: 'FACIAL & SKIN', price: 900, duration: 45, description: 'Hydrating cleanse, scrub, gentle steam, and soothing pack' },
  { name: 'Fruit Facial', category: 'FACIAL & SKIN', price: 1050, duration: 45, description: 'Antioxidant-rich natural fruit extracts for instant skin glow' },
  { name: 'Cleanup', category: 'FACIAL & SKIN', price: 675, duration: 30, description: 'Quick deep pore cleaning, blackhead removal and tone' },
  { name: 'Gold Facial', category: 'FACIAL & SKIN', price: 1800, duration: 60, description: 'Luxury 24K gold dust brightening facial for bridal and festive radiance' },
  { name: 'De-Tan Facial', category: 'FACIAL & SKIN', price: 1200, duration: 45, description: 'Sun tan removal and complexion evening facial treatment' },
  { name: 'Bleach', category: 'FACIAL & SKIN', price: 450, duration: 20, description: 'Gentle facial bleaching for golden skin glow' },

  // 3. WAXING
  { name: 'Full Arms Wax', category: 'WAXING', price: 600, duration: 30, description: 'Hygienic strip waxing for both arms including underarm touchup' },
  { name: 'Full Legs Wax', category: 'WAXING', price: 900, duration: 45, description: 'Smooth waxing from thighs to ankles with post-wax oil' },
  { name: 'Underarms Wax', category: 'WAXING', price: 300, duration: 15, description: 'Quick sensitive-area waxing' },
  { name: 'Full Body Wax', category: 'WAXING', price: 2250, duration: 90, description: 'Comprehensive full body waxing package for complete smoothness' },

  // 4. THREADING
  { name: 'Eyebrow Threading', category: 'THREADING', price: 120, duration: 10, description: 'Precision arch definition and threading' },
  { name: 'Upper Lip Threading', category: 'THREADING', price: 75, duration: 5, description: 'Gentle hair removal above upper lip' },
  { name: 'Full Face Threading', category: 'THREADING', price: 375, duration: 20, description: 'Complete facial threading including brows, forehead, chin, and sides' },

  // 5. MANICURE / PEDICURE
  { name: 'Basic Manicure', category: 'MANICURE / PEDICURE', price: 750, duration: 30, description: 'Nail shaping, cuticle care, hand scrub and buffing' },
  { name: 'Spa Manicure', category: 'MANICURE / PEDICURE', price: 1200, duration: 45, description: 'Aromatic soak, deep exfoliating scrub, hand massage and polish' },
  { name: 'Basic Pedicure', category: 'MANICURE / PEDICURE', price: 900, duration: 40, description: 'Foot soak, calloused skin filing, nail shaping and moisturiser' },
  { name: 'Spa Pedicure', category: 'MANICURE / PEDICURE', price: 1350, duration: 60, description: 'Herbal salt soak, foot scrub, relaxing calf massage and nail lacquer' },

  // 6. MAKEUP
  { name: 'Basic Makeup', category: 'MAKEUP', price: 2250, duration: 60, description: 'Natural day makeup with flawless base and light eye accents' },
  { name: 'Party Makeup', category: 'MAKEUP', price: 3750, duration: 90, description: 'Glamorous evening makeup with contour, shimmer and eyelashes' },
  { name: 'Bridal Makeup', category: 'MAKEUP', price: 12000, duration: 180, description: 'HD bridal makeup with pre-makeup hydration, contour, lashes & draping' },
  { name: 'Engagement Makeup', category: 'MAKEUP', price: 7500, duration: 120, description: 'Long-lasting signature radiant makeover for engagement ceremony' },

  // 7. OTHER
  { name: 'Head Massage', category: 'OTHER', price: 525, duration: 20, description: 'Stress-relieving warm Ayurvedic hair oil scalp and neck massage' },
  { name: 'Saree Draping', category: 'OTHER', price: 750, duration: 30, description: 'Traditional or contemporary pleating and pinning of saree' },
];
