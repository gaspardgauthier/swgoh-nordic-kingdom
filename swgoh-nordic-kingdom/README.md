# Nordic Kingdom — SWGOH Alliance Website

Single-page website presenting **Nordic Kingdom**, a 10-guild alliance in *Star Wars: Galaxy of Heroes*.

## Features
- 10 guild cards on the main page, each opening a dedicated guild page
- Shareable URL per guild (`#/kinderkarten`, `#/rohan`…); browser Back and `Esc` close a guild page
- Animated navigation: hero entrance, cards revealed on scroll, guild emblem morphing from card to page (View Transitions API, with a fade fallback), guild background preview on hover (desktop), reading progress bar on guild pages
- Respects `prefers-reduced-motion`; keyboard accessible
- Per-guild visual identity (colors, gradients, backgrounds)
- Guild histories, styled leader tables and leadership-change markers
- Dynamic tenure calculation in JavaScript
- Links to SWGOH.GG, YouTube and Discord

## Kinderkarten members area
A password-protected page (`#/kinderkarten-members`, button on the Kinderkarten page) for platoons, the TB plan and guild guides.

- The content is stored **encrypted** in `kinderkarten-members.data.js` (AES-256-GCM, key derived from the password with PBKDF2-SHA-256, 600,000 iterations). It is decrypted in the visitor's browser; no server is involved, so it works the same on GitHub Pages, Netlify or any HTTPS host.
- **To update the content or change the password:** open the members area, unlock it, click **Edit**, change the Markdown (and optionally set a new password), click **Download encrypted file**, then replace `kinderkarten-members.data.js` in the site (GitHub and Netlify). Never commit the plain text.
- Use a long password (4–5 random words): the encrypted file is public, so a short password could be guessed offline.
- "Remember me on this device" keeps the derived key in the browser's local storage; **Lock** forgets it.
- Markdown is rendered with [marked](https://github.com/markedjs/marked) v12.0.2 (MIT), bundled in `vendor/`.

## Tech
- Plain HTML, CSS and JavaScript — no build step, no dependencies
- `index.html` — page structure, styles, scripts and guild histories
- `images/` — guild backgrounds (`bg-<guild>.jpg`), guild icons (`icon-<guild>`), logos
- `fonts/` — Nordvik, Aurebesh and GreekFreak fonts

To change a guild background, replace `images/bg-<guild>.jpg` with a new image of the same name.

## Run locally
Download the whole folder and open `index.html` in a browser (keep `images/` and `fonts/` next to it).

## Deployment
https://gaspardgauthier.github.io/swgoh-nordic-kingdom/

## Credits
Crafted by Wali, Kinderkarten leader (Gaspard Gauthier). Guild histories written by their respective guild members.
Star Wars: Galaxy of Heroes is a trademark of its respective owners; this is an unofficial fan project.
