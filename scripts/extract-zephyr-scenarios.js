#!/usr/bin/env node

/**
 * Extract Zephyr test scenarios from atm-exporter.xlsx (Zephyr export).
 * Source of truth: the xlsx file. This script writes docs/zephyr-scenarios.json
 * for use by run-scenario-tests and docs.
 *
 * Usage:
 *   node scripts/extract-zephyr-scenarios.js [path-to-atm-exporter.xlsx]
 *   ZEPHYR_XLSX=/path/to/atm-exporter.xlsx node scripts/extract-zephyr-scenarios.js
 *
 * Default xlsx path: docs/atm-exporter.xlsx (or pass as first arg).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const xlsxPath = process.env.ZEPHYR_XLSX || process.argv[2] || path.join(rootDir, 'docs', 'atm-exporter.xlsx');
const outPath = path.join(rootDir, 'docs', 'zephyr-scenarios.json');

// Column indices (A=0, B=1, ..., R=17)
const COL = {
  Key: 0,
  Name: 1,
  Status: 2,
  Precondition: 3,
  Objective: 4,
  Folder: 5,
  Priority: 6,
  ExpectedResult: 17,
};

function getCell(row, colIndex) {
  const val = row[colIndex];
  return val != null ? String(val).trim() : '';
}

function run() {
  if (!fs.existsSync(xlsxPath)) {
    console.warn(`Zephyr xlsx not found at ${xlsxPath}. Create docs/atm-exporter.xlsx or set ZEPHYR_XLSX.`);
    const empty = { source: xlsxPath, generatedAt: new Date().toISOString(), scenarios: [] };
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(empty, null, 2), 'utf8');
    console.log('Wrote', outPath, 'with empty scenarios.');
    return;
  }

  const workbook = XLSX.readFile(xlsxPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    console.warn('Sheet has no data rows.');
    const empty = { source: xlsxPath, generatedAt: new Date().toISOString(), scenarios: [] };
    fs.writeFileSync(outPath, JSON.stringify(empty, null, 2), 'utf8');
    return;
  }

  const scenarios = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const key = getCell(row, COL.Key);
    if (!key) continue;
    scenarios.push({
      key,
      name: getCell(row, COL.Name),
      status: getCell(row, COL.Status),
      precondition: getCell(row, COL.Precondition),
      objective: getCell(row, COL.Objective),
      folder: getCell(row, COL.Folder),
      priority: getCell(row, COL.Priority),
      expectedResult: getCell(row, COL.ExpectedResult) || undefined,
    });
  }

  const out = {
    source: xlsxPath,
    generatedAt: new Date().toISOString(),
    scenarioCount: scenarios.length,
    scenarios,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', outPath, 'with', scenarios.length, 'scenarios.');
}

run();
