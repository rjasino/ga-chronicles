const socialLinks = [
  { name: "Facebook", href: "#" },
  { name: "YouTube", href: "#" },
  { name: "Twitch", href: "#" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <p className="site-footer__name">Game Ako Chronicles</p>
        <p className="site-footer__about">An independent gaming outlet for reviews, stories, and player-first commentary. Play thoughtfully.</p>
        <p className="site-footer__motto">#fortheloveofgaming</p>
      </div>
      <div className="site-footer__socials">
        <p className="site-footer__socials-heading">Follow Game Ako</p>
        <ul className="site-footer__social-list">
          {socialLinks.map(({ name, href }) => (
            <li key={name}><a href={href} rel="noopener noreferrer">{name}</a></li>
          ))}
        </ul>
        <p className="site-footer__forthcoming">Channel links go here — coming soon.</p>
      </div>
    </footer>
  );
}