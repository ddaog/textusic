# Ambient skill adaptation

Reviewed and installed two documentation-only skills from
[vanities/toaster-strudel](https://github.com/vanities/toaster-strudel), pinned to
`1b53c590b1d84e9eff2904cdd29dae1e719c7014`:

- `skills/skills/strudel-harmony`: common tones, restrained extensions, voice leading.
- `skills/skills/strudel-texture`: foreground/background separation and restrained evolving texture.

Original implementation in `src/ambient-harmony.js` keeps the existing stanza
roots, tempo, four-bar structure and major/minor scale. It chooses four bounded
scale-degree voices and favors smaller movements between chords, including the
loop boundary. It is a heuristic, not a global optimum or a guarantee of pleasant
sound. Fear/anger retain seventh-chord material instead of suspended colors.

The pad uses the existing triangle voice, a high-pass filter, bounded release,
lower gain, and slow sampled filter/pan changes. No new samples, granular clouds,
supersaw stacks or additional layers were added. A sampled LFO changes at event
onsets; it is not continuous intra-note filter modulation.

The skill examples are not treated as authoritative APIs. The
[official effects reference](https://strudel.cc/learn/effects/) documents fixed
effect order and shared reverb/delay per orbit; changing source-code method order
does not reorder the effects. Existing shared effect settings are preserved.

Verification: deterministic voice-count/register tests, full project tests,
production build, and real browser Pattern evaluation (16 pad onsets in four
bars, no evaluation error). These checks do not establish subjective audio quality
or physical iPhone performance. Listening and further iteration remain important.

## Shared melodic and rhythmic materials

The harmony skill's common-tone principle now informs twelve melodic contours:
simple and modular voices use the same first-stanza seed, with alternating
modules answering the motif two steps later. Later stanzas retain that seed,
root and tempo while their emotional shading can change. The texture skill's
use of space informs sustained calls, short answers and deliberate rests.

Twelve sparse drum skeletons keep their first kick on the downbeat. Poetic word
order can add pickups rather than replace the foundational groove. Additional
hat probability is reduced. No new audio layers, samples, effects or AI work
are introduced; existing voice limits and subdivisions remain bounded. This
does not substitute for physical iPhone performance measurements.

The UI derives counts from the generator's shared catalogs: four progressions,
twelve contours, twelve grooves and four pad colors give 2,304 theoretical
ingredient combinations. These are not guaranteed independently reachable or
audibly distinct songs: text, seeds and emotional rules constrain selection.

## Stanza seams

Installed `strudel-arrangement` and `strudel-transitions` from the same pinned
repository revision. Applied their common-material, restrained bridging and
subtractive-arrangement guidance, not their workspace-specific player behavior
or generic long-form EDM section lengths. Our stanzas remain four bars.

The final pad voicing now considers the next stanza's opening chord in actual
semitones, including major/minor changes. The two-note pickup first uses a shared
outgoing chord tone in the next mode, then previews the next melodic motif.
Calm arrivals get a quieter two-hit fill instead of three. These rules include
the final-to-first seam. No extra layers, samples, FFTs, or AI inference are added.
The ingredient catalog count stays unchanged: these are connection rules, not
new independently selectable musical materials. Musical smoothness remains a
listening judgment; symbolic tests cannot establish it by themselves.
