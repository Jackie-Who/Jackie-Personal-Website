/**
 * Academic backdrop — fills the hero's center panel in neutral state
 * with research-paper-styled text on hemispheric lateralization.
 *
 * Sits behind the neural brain (z:1) and fades out on takeover.
 * Pure decoration: aria-hidden + pointer-events: none. The point is
 * the texture / sophistication signal, not making the visitor read.
 *
 * Content drawn from the actual conclusions of two papers Jackie
 * surfaced on the topic:
 *   - Nielsen JA, Zielinski BA, Ferguson MA, Lainhart JE, Anderson JS.
 *     "An evaluation of the left-brain vs. right-brain hypothesis with
 *     resting state functional connectivity magnetic resonance imaging."
 *     PLoS One. 2013;8(8):e71275.
 *   - Sperry RW. "Lateral specialization in the surgically separated
 *     hemispheres." MIT Press; 1974.
 */
export default function AcademicBackdrop() {
  return (
    <div className="hero-academic-backdrop" aria-hidden="true">
      <p className="hero-academic-paragraph">
        The persistent cultural shorthand dividing the brain into an analytical
        <em> left</em> and a creative <em>right</em> has been substantially complicated
        by two decades of resting-state functional connectivity research. While certain
        cognitive functions exhibit reliable hemispheric specialization — language
        processing largely localized to the left perisylvian cortex, visuospatial
        attention biased toward the right parietal lobe — the broader claim that
        individuals possess a dominant hemispheric <em>style</em> finds little
        empirical support.
      </p>
      <p className="hero-academic-paragraph">
        Nielsen et al.<sup>1</sup> in an analysis of 1,011 individuals aged 7 to 29
        across seven imaging cohorts, examined the connectivity of 7,266 cortical
        regions through a left-right hub-mapping approach. Their conclusion was
        unambiguous: although individual networks did show clear lateralization, no
        participant demonstrated a global pattern of left- or right-hemisphere
        dominance. The brain organizes itself by region, not by side.
      </p>
      <p className="hero-academic-paragraph">
        What enables this distributed organization is the corpus callosum's roughly
        two hundred million axonal projections — the densest interhemispheric tract
        in the primate nervous system. Early split-brain studies by Sperry and
        colleagues<sup>2</sup> revealed what cognition looks like <em>without</em>
        this bridge: hemispheres operating with surprising independence, each
        handling its specialized functions but lacking the moment-to-moment
        integration that defines ordinary experience.
      </p>
      <p className="hero-academic-paragraph">
        The popular dichotomy persists partly because it is pedagogically tidy and
        partly because true lateralization <em>is</em> meaningful at the level of
        specific tasks. Music perception, often invoked as a paradigmatic
        right-brain activity, in fact recruits left frontotemporal regions for
        harmonic-syntactic processing while engaging right-hemisphere structures
        for prosodic and timbral analysis. Creativity, on whatever level it
        operates, is not a hemispheric property but an emergent phenomenon of
        bilateral cortical coordination.
      </p>
      <ol className="hero-academic-refs">
        <li>
          Nielsen JA, Zielinski BA, Ferguson MA, Lainhart JE, Anderson JS.
          <em> An evaluation of the left-brain vs. right-brain hypothesis with
          resting state functional connectivity magnetic resonance imaging.</em>{' '}
          PLoS ONE. 2013;8(8):e71275.
        </li>
        <li>
          Sperry RW. <em>Lateral specialization in the surgically separated
          hemispheres.</em> In: The Neurosciences: Third Study Program. MIT
          Press; 1974.
        </li>
      </ol>
    </div>
  );
}
