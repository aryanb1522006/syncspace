// linkedinExport.js
//
// LinkedIn's public APIs do not expose a member's skills, positions or
// certifications to ordinary apps, and scraping violates LinkedIn's terms.
// The supported, user-authorized route is the member's own data export
// (LinkedIn: Settings -> Data privacy -> Get a copy of your data), a ZIP
// of CSV files. This module reads that ZIP in memory (it is never
// stored) and extracts skill evidence from:
//   Skills.csv          Name                         -> linkedin_skill (self-declared)
//   Positions.csv       Title, Company Name, Description -> linkedin_position
//   Projects.csv        Title, Description           -> linkedin_project
//   Certifications.csv  Name, Authority              -> linkedin_certification
//   Profile.csv         Headline, Summary            -> linkedin_summary
//   Education.csv       School Name, Degree Name     -> profile text only
// Only those columns are read; addresses, birth dates, contacts and
// messages in the export are ignored.

import { unzipSync } from 'fflate';
import { itemConfidence } from './evidenceScoring.js';
import { createSkillResolver, proseDictionary } from './skillNormalization.js';
import { extractSkills } from './skillExtraction.js';
import { AppError } from '../utils/AppError.js';

const WANTED_FILES = new Set(['skills.csv', 'positions.csv', 'projects.csv', 'certifications.csv', 'profile.csv', 'education.csv']);
const MAX_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_PROFILE_TEXT = 4000;
// Far above any real export (LinkedIn allows 100 skills); bounds the rows
// one import writes and every later profile response returns.
const MAX_EVIDENCE_ITEMS = 500;

const clip = (value, length) => String(value ?? '').slice(0, length);
const basename = (path) => path.split('/').pop().toLowerCase();

/** RFC 4180 CSV: quoted fields, escaped quotes, embedded commas/newlines, BOM. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text).replace(/^﻿/, '');
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

/**
 * Some LinkedIn CSVs start with "Notes:" preamble lines before the
 * header, so the header is the first row containing `requiredColumn`.
 */
export function csvRecords(text, requiredColumn) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((cells) => cells.some((cell) => cell.trim() === requiredColumn));
  if (headerIndex === -1) return [];
  const header = rows[headerIndex].map((cell) => cell.trim());
  return rows.slice(headerIndex + 1).map((cells) => Object.fromEntries(header.map((name, index) => [name, (cells[index] ?? '').trim()])));
}

export function readLinkedInZip(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new AppError(400, 'Upload the ZIP file from LinkedIn (Settings → Data privacy → Get a copy of your data).');
  }
  let entries;
  const accepted = new Set();
  try {
    entries = unzipSync(bytes, {
      // Decompress only the CSVs we read, at most one entry per file name,
      // and refuse oversized entries before inflating them (zip-bomb
      // protection: without the one-per-name rule, thousands of tiny
      // "x/Skills.csv" entries could each claim 5 MB of memory).
      filter: (file) => {
        const name = basename(file.name);
        if (!WANTED_FILES.has(name) || accepted.has(name) || file.originalSize > MAX_ENTRY_BYTES) return false;
        accepted.add(name);
        return true;
      }
    });
  } catch {
    throw new AppError(400, 'The LinkedIn export ZIP could not be read.');
  }
  const files = {};
  const decoder = new TextDecoder('utf-8');
  for (const [name, data] of Object.entries(entries)) files[basename(name)] = decoder.decode(data);
  return files;
}

/** Returns { evidence, profileText, sectionsFound } from a LinkedIn export ZIP. */
export function parseLinkedInExport(buffer, dictionary) {
  const files = readLinkedInZip(buffer);
  const sectionsFound = Object.keys(files).sort();
  if (!['skills.csv', 'positions.csv', 'projects.csv', 'certifications.csv', 'profile.csv'].some((file) => files[file])) {
    throw new AppError(422, 'This export has no Skills, Positions, Projects, Certifications or Profile data. Request the full LinkedIn archive and upload it again.');
  }

  const resolve = createSkillResolver(dictionary);
  const prose = proseDictionary(dictionary);
  const evidence = new Map();
  const profileParts = [];

  const add = (skill, rawName, method, sourceRef, text) => {
    const key = `${sourceRef}|${method}|${skill ? `id:${skill.id}` : `raw:${String(rawName).toLowerCase()}`}`;
    if (evidence.has(key) || evidence.size >= MAX_EVIDENCE_ITEMS) return;
    evidence.set(key, {
      skillId: skill ? Number(skill.id) : null,
      skillName: skill?.name ?? null,
      rawName: clip(skill?.name ?? rawName, 120),
      source: 'linkedin_export',
      sourceRef: clip(sourceRef, 300),
      evidence: clip(text, 500),
      detectionMethod: method,
      confidence: itemConfidence(method)
    });
  };
  const addMentions = (text, method, sourceRef, description) => {
    for (const match of extractSkills(String(text), prose)) {
      add({ id: match.skillId, name: match.name }, match.name, method, sourceRef, `${description} ("${match.matchedAlias}")`);
    }
  };

  for (const record of csvRecords(files['skills.csv'] ?? '', 'Name')) {
    const name = clip(record.Name, 120);
    if (name) add(resolve(name), name, 'linkedin_skill', 'LinkedIn Skills', 'Listed under Skills on LinkedIn');
  }

  for (const record of csvRecords(files['positions.csv'] ?? '', 'Title')) {
    const role = [record.Title, record['Company Name']].filter(Boolean).join(' at ');
    if (!role) continue;
    addMentions(`${record.Title}. ${record.Description ?? ''}`, 'linkedin_position', `Position: ${role}`, `Mentioned in your ${role} position`);
    profileParts.push(role);
  }

  for (const record of csvRecords(files['projects.csv'] ?? '', 'Title')) {
    if (!record.Title) continue;
    addMentions(`${record.Title}. ${record.Description ?? ''}`, 'linkedin_project', `Project: ${record.Title}`, `Mentioned in your LinkedIn project "${record.Title}"`);
    profileParts.push(`${record.Title}: ${record.Description ?? ''}`);
  }

  for (const record of csvRecords(files['certifications.csv'] ?? '', 'Name')) {
    if (!record.Name) continue;
    const label = [record.Name, record.Authority].filter(Boolean).join(' by ');
    addMentions(record.Name, 'linkedin_certification', `Certification: ${label}`, `Named in your certification "${label}"`);
    profileParts.push(`Certification: ${label}`);
  }

  const [profile] = csvRecords(files['profile.csv'] ?? '', 'Headline');
  if (profile) {
    const summary = [profile.Headline, profile.Summary].filter(Boolean).join('. ');
    if (summary) {
      addMentions(summary, 'linkedin_summary', 'LinkedIn headline and summary', 'Mentioned in your LinkedIn headline or summary');
      profileParts.unshift(summary);
    }
  }

  for (const record of csvRecords(files['education.csv'] ?? '', 'School Name')) {
    const degree = [record['Degree Name'], record['School Name']].filter(Boolean).join(', ');
    if (degree) profileParts.push(degree);
  }

  return {
    evidence: [...evidence.values()],
    profileText: clip(profileParts.join('. '), MAX_PROFILE_TEXT),
    sectionsFound
  };
}
