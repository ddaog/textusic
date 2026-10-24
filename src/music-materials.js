// Shared by the generator and the UI: counts describe ingredients, not unique songs.
export const MELODY_CONTOURS = [
  [0,2,4,2,6,4,2,0], [0,4,2,6,4,2,6,0], [4,2,0,2,6,4,2,0],
  [0,2,6,4,2,4,6,0], [2,0,4,6,4,0,2,0], [0,6,4,2,4,6,2,0],
  [0,2,2,4,4,6,4,2], [4,4,2,0,2,4,2,0], [0,4,4,2,2,0,2,4],
  [2,4,6,4,2,2,0,2], [0,0,2,4,6,4,4,2], [6,4,2,4,2,0,2,0],
];
export const CHORD_PROGRESSIONS = [[0,5,3,4], [0,3,5,4], [0,4,5,3], [0,5,1,4]];
export const PAD_COLORS = [[0,2,4,6], [0,2,4,8], [0,1,4,8], [0,2,6,8]];
// All grounded skeletons sit on quarter-note beats. Poetic ordering adds pickups.
export const GROOVES = [
  {kick:[0,8],snare:[4,12],hat:[0,8]},
  {kick:[0,4,8,12],snare:[4,12],hat:[0,4,8,12]},
  {kick:[0,8,12],snare:[4,12],hat:[0,8,12]},
  {kick:[0,8],snare:[8],hat:[0,4,12]},
  {kick:[0,4,8],snare:[12],hat:[0,4,8,12]},
  {kick:[0],snare:[8],hat:[0,8]},
  {kick:[0,12],snare:[4,12],hat:[0,4,8]},
  {kick:[0,4],snare:[8],hat:[0,4,12]},
  {kick:[0,8,12],snare:[8],hat:[0,8]},
  {kick:[0,4,12],snare:[4,12],hat:[0,4,8,12]},
  {kick:[0],snare:[4,12],hat:[0,4,8]},
  {kick:[0,4,8,12],snare:[8],hat:[0,8,12]},
];
export const MUSIC_MATERIAL_COUNTS = Object.freeze({
  harmony:CHORD_PROGRESSIONS.length, melody:MELODY_CONTOURS.length,
  rhythm:GROOVES.length, pad:PAD_COLORS.length,
});
