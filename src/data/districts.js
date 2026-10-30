// The districts the app can show (only Suan Luang for now). Each one has its outline (and grey neighbours), its THEOS-2
// image frame, its green image and which data the backend (or the example files in src/mock/<id>/) provides for it.
// `abandoned` is example data from OpenStreetMap until the backend can detect abandoned land.
// With one district the District drop-down is hidden; adding another entry here brings it back.
import suanLuangBoundaries from './districts/suan-luang.json';
import suanLuangFrame from '../mock/suan-luang/frame.json';
import suanLuangSummary from '../mock/suan-luang/summary.json';
import suanLuangGreen from '../mock/suan-luang/green.png';

export const DISTRICTS = [
  {
    id: 'suan-luang',
    nameEn: 'Suan Luang',
    nameTh: 'สวนหลวง',
    boundaries: suanLuangBoundaries,
    frame: {
      id: 'theosmain',
      label: 'Theosmain',
      corners: suanLuangFrame.corners,
      source: 'THEOS-2 (GISTDA), backend v3',
      note: suanLuangFrame.note,
      // The image's size in metres (from its UTM extent), for the area of a clicked green patch.
      sizeM: [suanLuangFrame.extent.east - suanLuangFrame.extent.west, suanLuangFrame.extent.north - suanLuangFrame.extent.south],
    },
    images: { green: suanLuangGreen },
    data: { abandoned: true, parkChecks: true, gaSites: true, greenGroups: true },
    greenSummary: {
      greenM2: suanLuangSummary.green_area_m2,
      validM2: suanLuangSummary.valid_area_km2 * 1e6,
      patches: suanLuangSummary.patches_kept,
    },
  },
];

export const DEFAULT_DISTRICT_ID = 'suan-luang';

/** The district with this id, or the default district. */
export function getDistrict(id) {
  return DISTRICTS.find((district) => district.id === id) ?? DISTRICTS.find((district) => district.id === DEFAULT_DISTRICT_ID);
}
