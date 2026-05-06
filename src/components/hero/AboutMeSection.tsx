import type { AboutPhase } from './HeroSection';

interface Props {
  /** Current about-me phase. Always mounted so the CSS transitions
   *  can play in both directions; opacity-only entrance/exit. */
  phase: AboutPhase;
}

/**
 * About-me content area, rendered as a sibling of the CenterAnchor
 * inside the hero. Layout:
 *
 *   - Profile photo: small circular crop, centered above the text
 *   - Two columns side-by-side, journal-bio style:
 *       Left  — "about me"        (origins, work, music, esports, cat)
 *       Right — "about this site" (Sperry split-brain origin + tech stack)
 *
 * No on-page heading is rendered for the section itself — the page
 * "title" is implicit in the description morph happening up in
 * CenterAnchor: "a bit of everything…" cross-fades to "a bit about
 * me" when the viewer scrolls into this section.
 *
 * Everything inside this block uses opacity-only entrance — no
 * vertical slide — so the visual feels like the content is "called
 * into focus" rather than mechanically pushed in.
 */
export default function AboutMeSection({ phase }: Props) {
  const visible = phase === 'about' || phase === 'contact';
  return (
    <section
      className="hero-about"
      data-about-visible={visible || undefined}
      aria-hidden={!visible}
    >
      <div className="hero-about-photo-wrap">
        <img
          src="/about-jackie.webp"
          alt="Jackie Hu"
          className="hero-about-photo"
          width="224"
          height="236"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="hero-about-grid">
        <article className="hero-about-col">
          <h3 className="hero-about-col-title">about me</h3>
          <p className="hero-about-body">
            Hello, I'm Jackie. Born in Shanghai, raised and still currently
            living in Vancouver, BC, Canada — IT Engineer at Amazon, working
            on internal tooling and AI evaluation.
          </p>
          <p className="hero-about-body">
            On weekends I'm a classical flutist. I also play dizi (the Chinese
            flute), piano, piccolo, and dabbled in trombone back in highschool.
          </p>
          <p className="hero-about-body">
            Previously, management and coaching in esports — most notably a
            2nd place finish at the Red Bull Campus Clutch World Final in São
            Paulo, 2022.
          </p>
          <p className="hero-about-body">
            And <strong>Sylvee</strong> — my one-year-old ragdoll — keeps me
            company at home.
          </p>
        </article>

        <article className="hero-about-col">
          <h3 className="hero-about-col-title">about this site</h3>
          <p className="hero-about-body">
            The left-brain / right-brain framing of the hero is borrowed from
            Roger W. Sperry's split-brain research — work that earned him the
            1981 Nobel Prize in Physiology or Medicine for{' '}
            <em>
              "discoveries concerning the functional specialization of the
              cerebral hemispheres."
            </em>
          </p>
          <p className="hero-about-body">
            Modern neuroimaging has complicated the strict-lateralization
            story (Nielsen et al., 2013, <em>PLoS ONE</em> — no clear
            "left-brained / right-brained" populations exist). I still liked
            the duality, and "is this a creative day or a technical one" is a
            question I actually ask myself.
          </p>
          <p className="hero-about-body">
            Built with Astro 5, React 19, Turso (libSQL), and Cloudflare R2.
            Source on{' '}
            <a
              href="https://github.com/Jackie-Who"
              target="_blank"
              rel="noopener noreferrer"
              className="hero-about-link"
            >
              GitHub
            </a>
            .
          </p>
        </article>
      </div>
    </section>
  );
}
