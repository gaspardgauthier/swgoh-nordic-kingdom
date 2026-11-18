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

## Kinderkarten members area (War Room)
A password-protected space for Kinderkarten members: TB plan, platoon assignments and guild guides.

- **Entry:** "Members area" button on the Kinderkarten page → password screen (`index.html#/kinderkarten-members`) → hyperspace jump → `kinderkarten-members.html`, the War Room: its own design, a Three.js holotable whose sectors light up with the TB phase being read, a kyber-crystal field for the platoons, and a player/unit search.
- **Encryption:** the content is stored only encrypted in `kinderkarten-members.data.js` (AES-256-GCM, key derived from the password with PBKDF2-SHA-256, 600,000 iterations) and decrypted in the browser. No server is involved, so it works the same on GitHub Pages, Netlify or any HTTPS host. The page design itself is public; only the content is secret.
- **Update the content or change the password** (Node.js 18+, from the repository root):
  1. `node tools/members.mjs decrypt` asks for the password and writes the content in clear to `tools/kinderkarten-members.md` (ignored by git, outside the published site folder).
  2. Edit that Markdown file.
  3. `node tools/members.mjs encrypt` re-encrypts it into `swgoh-nordic-kingdom/kinderkarten-members.data.js` (add `--new-password` to change the password). With the same password, devices that remembered it stay unlocked.
  4. Commit and publish `kinderkarten-members.data.js` only (GitHub and Netlify), then delete the `.md` file. Never commit or upload the plain text.
- **Content format (Markdown):** `# Title`, then `> By … · Objective: 41+`; `## TB plan` with one `### Phase` per phase whose first line is the **bold targets** separated by `~` (e.g. `**LS3 3⭐️ ~ MX3 3⭐️ ~ DS3 preload**`); `## Platoons` as a numbered list `1. **Player** — R8 Unit, R9 Unit`; any other `##` section (e.g. Guides) is shown as text.
- Use a long password: the encrypted file is public, so a short password could be guessed offline.
- "Remember me on this device" keeps the derived key in the browser; **Lock** forgets it. The War Room has no editing feature: changes are made with the tool above, by whoever can push to the repository.
- Bundled libraries in `vendor/`: [marked](https://github.com/markedjs/marked) v12.0.2 and [three.js](https://threejs.org) r147 (both MIT).

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
