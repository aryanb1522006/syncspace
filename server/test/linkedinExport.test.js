import test from 'node:test';
import assert from 'node:assert/strict';
import { strToU8, zipSync } from 'fflate';
import { csvRecords, parseCsv, parseLinkedInExport } from '../src/services/linkedinExport.js';
import { dictionary } from '../test-fixtures/skillDictionary.js';

const exportZip = (files) => Buffer.from(zipSync(Object.fromEntries(
  Object.entries(files).map(([name, text]) => [name, strToU8(text)])
)));

test('CSV parsing handles quotes, escaped quotes, embedded commas/newlines, BOM and CRLF', () => {
  const rows = parseCsv('﻿Title,Description\r\n"Intern, Platform","Built ""fast"" APIs\nwith Node"\r\n');
  assert.deepEqual(rows, [['Title', 'Description'], ['Intern, Platform', 'Built "fast" APIs\nwith Node']]);
});

test('LinkedIn "Notes:" preamble lines before the header are skipped', () => {
  const records = csvRecords('Notes:\n"Some data may be missing"\n\nName\nPython\nLeadership\n', 'Name');
  assert.deepEqual(records.map((record) => record.Name), ['Python', 'Leadership']);
});

test('a real-shaped export yields self-declared, professional and certification evidence', () => {
  const { evidence, profileText, sectionsFound } = parseLinkedInExport(exportZip({
    'Skills.csv': 'Name\nPython\nJS\nLeadership\nPython\n',
    'Positions.csv': 'Company Name,Title,Description,Location,Started On,Finished On\nAcme Labs,Backend Intern,"Built REST services with FastAPI, PostgreSQL and Docker.",Pune,Jun 2025,Aug 2025\n',
    'Certifications.csv': 'Name,Url,Authority,Started On,Finished On,License Number\nDocker Certified Associate,,Docker Inc,Jan 2026,,\n',
    'Profile.csv': 'First Name,Last Name,Address,Birth Date,Headline,Summary\nAsha,Rao,12 Secret Street,2004-01-01,Student developer,I like machine learning.\n',
    'Connections.csv': 'First Name,Last Name,Email Address\nPriya,K,priya@example.com\n',
    'nested/Education.csv': 'School Name,Start Date,End Date,Notes,Degree Name,Activities\nThapar Institute,2023,2027,,B.E. Computer Engineering,\n'
  }), dictionary);

  assert.deepEqual(sectionsFound, ['certifications.csv', 'education.csv', 'positions.csv', 'profile.csv', 'skills.csv']);
  const by = (method) => evidence.filter((item) => item.detectionMethod === method).map((item) => item.rawName).sort();
  assert.deepEqual(by('linkedin_skill'), ['JavaScript', 'Leadership', 'Python'], 'duplicates collapse; JS normalizes');
  assert.equal(evidence.find((item) => item.rawName === 'Leadership').skillId, null, 'non-dictionary skills are kept unmatched');
  assert.deepEqual(by('linkedin_position'), ['Docker', 'FastAPI', 'PostgreSQL']);
  assert.equal(evidence.find((item) => item.detectionMethod === 'linkedin_position').sourceRef, 'Position: Backend Intern at Acme Labs');
  assert.deepEqual(by('linkedin_certification'), ['Docker']);
  assert.deepEqual(by('linkedin_summary'), ['Machine Learning']);
  assert.match(profileText, /Student developer/);
  assert.match(profileText, /B\.E\. Computer Engineering/);
  assert.doesNotMatch(JSON.stringify({ evidence, profileText }), /Secret Street|2004-01-01|priya@example\.com/, 'addresses, birth dates and contacts are never read');
});

test('duplicate entries cannot multiply memory and evidence stays bounded', () => {
  const skills = `Name\n${Array.from({ length: 2000 }, (_, index) => `Skill ${index}`).join('\n')}\n`;
  const zip = exportZip(Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`copy${index}/Skills.csv`, skills])));
  const { evidence, sectionsFound } = parseLinkedInExport(zip, dictionary);
  assert.deepEqual(sectionsFound, ['skills.csv']);
  assert.equal(evidence.length, 500);
});

test('non-ZIP uploads and exports without relevant data are rejected with guidance', () => {
  assert.throws(() => parseLinkedInExport(Buffer.from('Name\nPython\n'), dictionary), (error) => error.status === 400 && /ZIP file from LinkedIn/.test(error.message));
  assert.throws(() => parseLinkedInExport(Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]), dictionary), (error) => error.status === 400);
  assert.throws(() => parseLinkedInExport(exportZip({ 'Connections.csv': 'First Name\nPriya\n' }), dictionary), (error) => error.status === 422);
});
