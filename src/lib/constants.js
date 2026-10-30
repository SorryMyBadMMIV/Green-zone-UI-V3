// Park size classes and how far each park reaches (Rocket Media Lab / BMA Office of Environment).
export const PARK_SIZE_CLASSES = [
  { key: 'S', maxM2: 16000, radiusM: 500 },
  { key: 'M', maxM2: 80000, radiusM: 1000 },
  { key: 'L', maxM2: 160000, radiusM: 3000 },
  { key: 'XL', maxM2: Infinity, radiusM: 5000 },
];

// Bangkok's own planning target for public green space per person (project report, chapter 1).
export const TARGET_M2_PER_PERSON = 9;

// Green Bangkok 2030 / 15-minute parks: everyone within 400 m of a park.
export const POLICY_RADIUS_M = 400;

// Planting score (0–100) for the example abandoned plots: far from parks and big is better; every park circle that
// already covers the plot takes points off. A "good example plot" (✓) is outside every 400 m ring and scores 60 or more.
export const SCORE_DISTANCE_FULL_M = 2000;
export const SCORE_AREA_FULL_M2 = 5000;
export const SCORE_POINTS = { distance: 50, size: 30, overlap: 20, perCircle: 10 };
export const RECOMMEND_MIN_SCORE = 60;

// Recommended sites (the backend GA's ★). A ★ is removed when existing parks already serve its spot: inside an S park
// circle (the "barrier") or less than 400 m from a park. Of two ★ whose circles overlap by more than 25% of the smaller
// circle, only the better score is kept. Each ★ gets a score (0–100): far from parks (40, full at 1 km), its own reach
// circle not already covered by S, M or L park circles (30; XL is left out, one XL park covers the whole district), and
// its size (30, full at 16,000 m²).
export const SITE_BARRIER_CLASSES = ['S'];
export const SITE_MAX_OVERLAP = 0.25;
export const SITE_OVERLAP_CLASSES = ['S', 'M', 'L'];
export const SITE_SCORE_POINTS = { distance: 40, overlap: 30, size: 30 };
export const SITE_DISTANCE_FULL_M = 1000;
export const SITE_AREA_FULL_M2 = 16000;

// Gaps between the ★ are filled by the app with the best green patch there ("Added site (app)"): at least 300 m²
// (the backend GA's own minimum) and scoring fair or better, under the same barrier and 25% overlap rules.
export const GAP_MIN_AREA_M2 = 300;
export const GAP_MIN_SCORE = 40;

// Green patches of the green layer can be clicked from this zoom on (about street level), when patches are big enough.
export const GREEN_CLICK_MIN_ZOOM = 16;

// Data colors. UI chrome colors live in src/index.css.
// The park circle colours keep a clear hue gap from the Recommend ★, the green groups and the red plots (constants.test.js).
export const COLORS = {
  greenZoneFill: '#22c55e',
  greenImage: '#00b441', // the backend green layer (docs/mock-data/make-green-layer.py)
  selected: '#0b0b0b',
  mask: '#334155',
  // Park size classes: dot fill and reach circle (readable on the satellite photo and the street map).
  parkS: '#4ade80',
  parkM: '#60a5fa',
  parkL: '#2dd4bf',
  parkXL: '#c084fc',
  policyRing: '#f8fafc',
  policyShade: 'rgba(15, 23, 42, 0.28)',
  abandonedFill: '#dc2626',
  abandonedStroke: '#991b1b',
  recommendStar: '#fcd34d',
  greenGroup: '#f472b6', // backend green groups (pink circles)
  focusOutline: '#14532d',
  frameOutline: '#111827',
};
