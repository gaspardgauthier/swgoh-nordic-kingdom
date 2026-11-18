#!/usr/bin/env node
// Kinderkarten War Room: decrypt / re-encrypt the members content (Node.js 18+, no dependencies).
//
//   node tools/members.mjs decrypt                 → writes tools/kinderkarten-members.md (plain text, git-ignored)
//   node tools/members.mjs encrypt                 → re-encrypts it into swgoh-nordic-kingdom/kinderkarten-members.data.js
//   node tools/members.mjs encrypt --new-password  → same, with a new password
//
// The password is typed at the prompt (hidden) or read from the NK_PASS environment variable.
// Never commit or upload tools/kinderkarten-members.md: it is the content in clear.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'swgoh-nordic-kingdom', 'kinderkarten-members.data.js');
const PLAIN = join(ROOT, 'tools', 'kinderkarten-members.md');
const ITERATIONS = 600000;
const rel = p => relative(process.cwd(), p) || p;

const b64 = u => Buffer.from(u).toString('base64');
const unb64 = s => new Uint8Array(Buffer.from(s, 'base64'));

function readData() {
  const src = readFileSync(DATA, 'utf8');
  const m = src.match(/window\.NK_KK_MEMBERS\s*=\s*(\{[\s\S]*\})\s*;/);
  if (!m) throw new Error(`Cannot read ${rel(DATA)}`);
  return JSON.parse(m[1]);
}

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function decrypt(data, password) {
  const key = await deriveKey(password, unb64(data.salt));
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(data.iv) }, key, unb64(data.ct));
    return new TextDecoder().decode(plain);
  } catch {
    throw new Error('Wrong password.');
  }
}

// Reads one line from the terminal without echoing it. Keeps any extra input for the next question,
// so answers can also be piped in (e.g. printf 'new\nnew\n' | node tools/members.mjs encrypt --new-password).
let pending = '';
function ask(question) {
  if (process.env.NK_PASS && !question.includes('New')) return Promise.resolve(process.env.NK_PASS);
  const { stdin, stdout } = process;
  stdout.write(question);
  return new Promise(resolve => {
    let value = '';
    const raw = stdin.isTTY;
    const finish = rest => {
      stdin.removeListener('data', onData);
      stdin.removeListener('end', onEnd);
      if (raw) stdin.setRawMode(false);
      stdin.pause();
      pending = rest;
      stdout.write('\n');
      resolve(value);
    };
    const consume = chunk => {
      for (let i = 0; i < chunk.length; i++) {
        const ch = chunk[i];
        if (ch === '\r' || ch === '\n') {
          const rest = chunk.slice(i + (ch === '\r' && chunk[i + 1] === '\n' ? 2 : 1));
          finish(rest);
          return true;
        }
        if (ch === '\u0003') { stdout.write('\n'); process.exit(130); }      // Ctrl+C
        if (ch === '\u007f' || ch === '\b') { value = value.slice(0, -1); continue; }
        value += ch;
      }
      return false;
    };
    const onData = chunk => consume(chunk);
    const onEnd = () => finish('');
    if (pending) { const p = pending; pending = ''; if (consume(p)) return; }
    if (raw) stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
    stdin.on('end', onEnd);
    stdin.resume();
  });
}

async function main() {
  const [cmd, ...flags] = process.argv.slice(2);
  if (cmd === 'decrypt') {
    const data = readData();
    const text = await decrypt(data, await ask('Password: '));
    if (existsSync(PLAIN) && !flags.includes('--force')) {
      throw new Error(`${rel(PLAIN)} already exists. Edit it, or run again with --force to overwrite it.`);
    }
    writeFileSync(PLAIN, text);
    console.log(`Decrypted to ${rel(PLAIN)} — edit it, then run: node tools/members.mjs encrypt`);
    return;
  }
  if (cmd === 'encrypt') {
    if (!existsSync(PLAIN)) throw new Error(`${rel(PLAIN)} not found. Run "node tools/members.mjs decrypt" first.`);
    const text = readFileSync(PLAIN, 'utf8');
    const old = readData();
    let salt, password;
    if (flags.includes('--new-password')) {
      await decrypt(old, await ask('Current password: '));            // only the current holder can rotate it
      password = await ask('New password: ');
      if (password.length < 8) throw new Error('The new password is too short (8 characters minimum, longer is safer).');
      if (password !== await ask('New password again: ')) throw new Error('The two new passwords do not match.');
      salt = crypto.getRandomValues(new Uint8Array(16));
    } else {
      password = await ask('Password: ');
      await decrypt(old, password);                                      // same password: keep the salt, so remembered devices stay unlocked
      salt = unb64(old.salt);
    }
    const key = await deriveKey(password, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
    const payload = { v: 1, kdf: 'PBKDF2-SHA256', iter: ITERATIONS, cipher: 'AES-256-GCM', salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) };
    writeFileSync(DATA, '/* Kinderkarten members area: encrypted content (AES-256-GCM, PBKDF2-SHA256).\n   Generated '
      + new Date().toISOString().slice(0, 10) + ' with tools/members.mjs. Do not edit by hand. */\n'
      + 'window.NK_KK_MEMBERS = ' + JSON.stringify(payload) + ';\n');
    console.log(`Encrypted into ${rel(DATA)}. Commit and publish that file (never the .md).`);
    return;
  }
  console.log('Usage:\n  node tools/members.mjs decrypt [--force]\n  node tools/members.mjs encrypt [--new-password]');
  process.exitCode = 1;
}

main().catch(e => { console.error('Error: ' + e.message); process.exit(1); });
