import FACTS from '../data/district-facts.json';

// Rank 1 = the most green space per person among Bangkok's 50 districts.
const RANKED = [...FACTS].sort((a, b) => b.greenPerPersonM2 - a.greenPerPersonM2);

/** Population and green-space figures for a district (Thai name without "เขต"), or null when unknown. */
export function districtFacts(districtTh) {
  const facts = FACTS.find((row) => row.districtTh === districtTh);
  if (!facts) return null;
  return { ...facts, rank: RANKED.indexOf(facts) + 1, of: FACTS.length };
}

/** Public green space per person (m²): the district's green now, plus `addedM2` (for example new parks). */
export function greenPerPerson(facts, addedM2 = 0) {
  return (facts.greenM2 + addedM2) / facts.population;
}
