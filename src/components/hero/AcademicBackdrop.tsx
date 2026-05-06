/**
 * Academic backdrop — research-paper-styled wallpaper filling the
 * ENTIRE hero viewport in a multi-column newspaper layout. The side
 * panels (rendered above this in the stacking context) mask their
 * portions of the text with opaque bgs; only the transparent center
 * panel lets the text show through in neutral state. Fades out on
 * takeover (the side panel expands + covers the rest anyway).
 *
 * Content is a single sustained passage on hemispheric
 * lateralization, drawn from:
 *   - Nielsen JA et al. "An evaluation of the left-brain vs.
 *     right-brain hypothesis..." PLoS ONE 2013.
 *   - Sperry RW. "Lateral specialization in the surgically separated
 *     hemispheres." MIT Press 1974.
 *   - Hutchison RM et al. "Dynamic functional connectivity..."
 *     NeuroImage 2013.
 *
 * The full passage is generated and then REPEATED several times so
 * the multi-column layout actually has enough prose to fill every
 * column top-to-bottom on typical desktop viewports. Repetition is
 * fine — this is decorative texture, not reading material, and
 * repeating real text keeps the typographic rhythm honest.
 *
 * aria-hidden + pointer-events: none → invisible to assistive tech.
 */

const PARAGRAPHS: string[] = [
  `The persistent cultural shorthand dividing the brain into an analytical <em>left</em> and a creative <em>right</em> has been substantially complicated by two decades of resting-state functional connectivity research. While certain cognitive functions exhibit reliable hemispheric specialization — language processing largely localized to the left perisylvian cortex, visuospatial attention biased toward the right parietal lobe — the broader claim that individuals possess a dominant hemispheric <em>style</em> finds little empirical support.`,
  `Nielsen et al.<sup>1</sup> in an analysis of 1,011 individuals aged 7 to 29 across seven imaging cohorts, examined the connectivity of 7,266 cortical regions through a left-right hub-mapping approach. Their conclusion was unambiguous: although individual networks did show clear lateralization, no participant demonstrated a global pattern of left- or right-hemisphere dominance. The brain organizes itself by region, not by side.`,
  `What enables this distributed organization is the corpus callosum's roughly two hundred million axonal projections — the densest interhemispheric tract in the primate nervous system. Early split-brain studies by Sperry and colleagues<sup>2</sup> revealed what cognition looks like <em>without</em> this bridge: hemispheres operating with surprising independence, each handling its specialized functions but lacking the moment-to-moment integration that defines ordinary experience.`,
  `The popular dichotomy persists partly because it is pedagogically tidy and partly because true lateralization <em>is</em> meaningful at the level of specific tasks. Music perception, often invoked as a paradigmatic right-brain activity, in fact recruits left frontotemporal regions for harmonic-syntactic processing while engaging right-hemisphere structures for prosodic and timbral analysis. Creativity, on whatever level it operates, is not a hemispheric property but an emergent phenomenon of bilateral cortical coordination.`,
  `Resting-state functional connectivity, while an elegant and largely task-free protocol, is not without its critics. The seed-based methodology on which many lateralization studies rely aggregates BOLD-signal fluctuations over minutes, averaging out the kind of transient hemispheric recruitment that underlies moment-by-moment cognition. Dynamic connectivity analyses<sup>3</sup> which resolve networks at sub-second timescales, have begun to surface a more fluid picture — hemispheric balance shifting with task demand, emotional state, and even circadian phase.`,
  `That the organization is not fixed is perhaps the strongest evidence against the dominant-hemisphere hypothesis. In cases of early hemispherectomy — a surgical removal of one hemisphere typically performed for intractable pediatric epilepsy — patients frequently develop language, visuospatial, and executive capacities in the remaining hemisphere to a degree that adult lateralization would suggest impossible. The implication is that what we take to be specialization is, at least in part, the cortical manifestation of developmental history rather than an intrinsic partition.`,
  `None of which is to say hemispheric division is without functional consequence. Neurologists have for over a century relied on lateralized symptom patterns to localize stroke damage with remarkable precision: left-hemisphere lesions produce aphasia with high reliability, right-hemisphere damage disproportionately affects attention and spatial processing. What has shifted in the literature is not the fact of asymmetry but its interpretation — asymmetry as a local efficiency rather than a global identity, a feature of how cortex distributes its computation rather than a claim about who the person behind it is.`,
  `The more interesting empirical question today is not <em>which</em> hemisphere dominates for a given individual but how integration across the corpus callosum is modulated by attention, learning, and emotion. Recent graph-theoretic analyses suggest the interhemispheric tract carries more than raw signal: it appears to coordinate the temporal gating of competing processes, suppressing one hemisphere's representation to let the other's proceed. Lateralization, on this view, is less a partition than a conversation — bidirectional, continuous, and frequently unsettled.`,
  `Diffusion tensor imaging across large cohorts has further confirmed that even the most lateralized white-matter tracts show meaningful variability across individuals: the arcuate fasciculus, a left-dominant pathway central to language, exhibits partial right-homologue development in roughly a third of neurotypical adults. Such variability complicates any effort to use hemispheric dominance as a stable trait marker, and instead reinforces the view that the cortex configures itself opportunistically around its developmental and experiential history.`,
  `Cross-species comparisons complicate the picture still further. Marked lateralization has been documented in birds, cetaceans, and non-human primates — species that diverged from the mammalian common ancestor tens of millions of years ago — suggesting that hemispheric specialization is not a uniquely human achievement nor a recent evolutionary development. What is distinctive in humans is the sheer bandwidth of the corpus callosum and the density of bilateral coordination it enables, particularly in regions associated with language, planning, and social cognition.`,
  `A final methodological caveat deserves mention. The BOLD signal that underwrites most functional connectivity analyses is a hemodynamic proxy for neural activity, lagged by several seconds and spatially smoothed by the vasculature. Whether the lateralization patterns we detect at that resolution reflect the operational hemispheric dynamics at the millisecond scale of actual cognition remains an open question — one that magnetoencephalographic studies have begun to address, with preliminary findings suggesting faster, more transient hemispheric handoffs than the resting-state literature has so far captured.`,
];

const REFS: string[] = [
  `Nielsen JA, Zielinski BA, Ferguson MA, Lainhart JE, Anderson JS. <em>An evaluation of the left-brain vs. right-brain hypothesis with resting state functional connectivity magnetic resonance imaging.</em> PLoS ONE. 2013;8(8):e71275.`,
  `Sperry RW. <em>Lateral specialization in the surgically separated hemispheres.</em> In: The Neurosciences: Third Study Program. MIT Press; 1974.`,
  `Hutchison RM, Womelsdorf T, Allen EA, et al. <em>Dynamic functional connectivity: promise, issues, and interpretations.</em> NeuroImage. 2013;80:360–378.`,
];

/** How many times to repeat the passage. Sized to fill the
 *  multi-column layout top-to-bottom even on tall aspect ratios
 *  (4:3, portrait tablets) where each column needs ~190+ lines. At
 *  ~240 lines per cycle and ~12 columns × 80–190 lines per column
 *  needed depending on aspect, 10 cycles guarantees full coverage.
 *  Extra rows clip invisibly via `overflow: hidden` on the parent.
 *
 *  The CSS font-size is proportional to viewport width, so the
 *  cycle count works identically at 1080p / 4K / 8K — only the
 *  aspect ratio changes how many lines a column holds. */
const REPEAT_COUNT = 10;

export default function AcademicBackdrop() {
  return (
    <div className="hero-academic-backdrop" aria-hidden="true">
      {Array.from({ length: REPEAT_COUNT }).map((_, cycle) => (
        <div className="hero-academic-cycle" key={cycle}>
          {PARAGRAPHS.map((html, i) => (
            <p
              className="hero-academic-paragraph"
              key={i}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ))}
          <ol className="hero-academic-refs">
            {REFS.map((html, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: html }} />
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}
