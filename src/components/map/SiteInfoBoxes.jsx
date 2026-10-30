import { DASH, formatArea, formatKm, formatNumber } from '../../lib/format.js';
import { REACH_LABEL } from '../../lib/parks.js';
import MapInfoBox from './MapInfoBox.jsx';

/**
 * The box over the map for the selected recommended site (backend GA, or `added` by the app in a gap): area, score, size
 * class and nearest park.
 */
export function GaSiteInfoBox({ site, analysis, added = false, onClose }) {
  const name = added ? 'Added site (app)' : 'Recommended site (GA)';
  const nearest = analysis.nearestPark ? formatKm(analysis.nearestPark.distanceM / 1000) : DASH;
  return (
    <MapInfoBox
      label={`${name} ${site.id}`}
      closeLabel="Close site info"
      onClose={onClose}
      tags={
        <span className="rounded-md bg-amber-300 px-2 py-0.5 text-neutral-900">
          {added ? 'Picked by the app · not verified public land' : 'Candidate · not verified public land'}
        </span>
      }
    >
      <p>★ {name}</p>
      <p>Area : {formatArea(site.areaM2)}</p>
      <p>{`Score : ${analysis.score} · ${analysis.level.label}`}</p>
      <p className="text-sm">{analysis.size ? `Size : ${analysis.size.key} · reaches ${REACH_LABEL[analysis.size.key]}` : `Size : ${DASH}`}</p>
      <p className="text-sm">Nearest park : {nearest}</p>
    </MapInfoBox>
  );
}

/** The box over the map for a clicked green patch, scored like a recommended site. */
export function PatchInfoBox({ patch, analysis, onClose }) {
  const nearest = analysis.nearestPark ? formatKm(analysis.nearestPark.distanceM / 1000) : DASH;
  const tag = analysis.crowded ? (
    <span className="rounded-md bg-red-300 px-2 py-0.5 text-neutral-900">Already served by a park</span>
  ) : (
    <span className="rounded-md bg-green-300 px-2 py-0.5 text-neutral-900">Green patch · not verified public land</span>
  );
  return (
    <MapInfoBox label="Green patch" closeLabel="Close patch info" onClose={onClose} tags={tag}>
      <p>Green patch</p>
      <p>Area : {formatArea(patch.areaM2)}</p>
      <p>{`Score : ${analysis.score} · ${analysis.level.label}`}</p>
      <p className="text-sm">{analysis.size ? `Size : ${analysis.size.key} · reaches ${REACH_LABEL[analysis.size.key]}` : `Size : ${DASH}`}</p>
      <p className="text-sm">Nearest park : {nearest}</p>
    </MapInfoBox>
  );
}

/** The box over the map for the selected green group: its green, patches and circle size. */
export function GreenGroupInfoBox({ group, onClose }) {
  const name = `${group.kind === 'isolated' ? 'Isolated green' : 'Green group'} ${group.id}`;
  return (
    <MapInfoBox label={name} closeLabel="Close group info" onClose={onClose}>
      <p>{name}</p>
      <p>Green : {formatArea(group.greenM2InGroup)}</p>
      <p>Patches : {formatNumber(group.patchesInGroup)}</p>
      <p className="text-sm">{`Circle : ${formatNumber(Math.round(group.radiusM))} m radius`}</p>
    </MapInfoBox>
  );
}
