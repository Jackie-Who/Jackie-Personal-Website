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
      <p className="hero-academic-paragraph">
        Resting-state functional connectivity, while an elegant and largely
        task-free protocol, is not without its critics. The seed-based
        methodology on which many lateralization studies rely aggregates
        BOLD-signal fluctuations over minutes, averaging out the kind of
        transient hemispheric recruitment that underlies moment-by-moment
        cognition. Dynamic connectivity analyses,<sup>3</sup> which resolve
        networks at sub-second timescales, have begun to surface a more fluid
        picture — hemispheric balance shifting with task demand, emotional
        state, and even circadian phase.
      </p>
      <p className="hero-academic-paragraph">
        That the organization is not fixed is perhaps the strongest evidence
        against the dominant-hemisphere hypothesis. In cases of early
        hemispherectomy — a surgical removal of one hemisphere typically
        performed for intractable pediatric epilepsy — patients frequently
        develop language, visuospatial, and executive capacities in the
        remaining hemisphere to a degree that adult lateralization would
        suggest impossible. The implication is that what we take to be
        specialization is, at least in part, the cortical manifestation of
        developmental history rather than an intrinsic partition.
      </p>
      <p className="hero-academic-paragraph">
        None of which is to say hemispheric division is without functional
        consequence. Neurologists have for over a century relied on lateralized
        symptom patterns to localize stroke damage with remarkable precision:
        left-hemisphere lesions produce aphasia with high reliability,
        right-hemisphere damage disproportionately affects attention and
        spatial processing. What has shifted in the literature is not the fact
        of asymmetry but its interpretation — asymmetry as a local efficiency
        rather than a global identity, a feature of how cortex distributes its
        computation rather than a claim about who the person behind it is.
      </p>
      <p className="hero-academic-paragraph">
        The more interesting empirical question today is not <em>which</em>{' '}
        hemisphere dominates for a given individual but how integration across
        the corpus callosum is modulated by attention, learning, and emotion.
        Recent graph-theoretic analyses suggest the interhemispheric tract
        carries more than raw signal: it appears to coordinate the temporal
        gating of competing processes, suppressing one hemisphere's
        representation to let the other's proceed. Lateralization, on this
        view, is less a partition than a conversation — bidirectional,
        continuous, and frequently unsettled.
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
        <li>
          Hutchison RM, Womelsdorf T, Allen EA, et al. <em>Dynamic functional
          connectivity: promise, issues, and interpretations.</em> NeuroImage.
          2013;80:360–378.
        </li>
      </ol>
    </div>
  );
}
