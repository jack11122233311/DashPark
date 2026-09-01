#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const type = process.argv[2] || 'patch';

if (!['patch', 'minor', 'major'].includes(type) && !/^\d+\.\d+\.\d+$/.test(type)) {
  console.error(`
Usage:
  npm run bump patch
  npm run bump minor
  npm run bump major
  npm run bump 0.1.0
  `);
  process.exit(1);
}

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;

let [major, minor, patch] = currentVersion.split('.').map((n) => parseInt(n, 10));

let nextVersion = '';
if (type === 'patch') patch += 1;
else if (type === 'minor') {
  minor += 1;
  patch = 0;
} else if (type === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else {
  nextVersion = type;
}

if (!nextVersion) {
  nextVersion = `${major}.${minor}.${patch}`;
}

console.log(`\n📦 Bumping DashPark version: v${currentVersion} -> v${nextVersion}`);

// 1. Update package.json
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');

// 2. Update package-lock.json if exists
const pkgLockPath = path.resolve(process.cwd(), 'package-lock.json');
if (fs.existsSync(pkgLockPath)) {
  const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf-8'));
  pkgLock.version = nextVersion;
  if (pkgLock.packages && pkgLock.packages['']) {
    pkgLock.packages[''].version = nextVersion;
  }
  fs.writeFileSync(pkgLockPath, JSON.stringify(pkgLock, null, 2) + '\n', 'utf-8');
}

console.log(`
✓ Updated package.json to ${nextVersion}
✓ Updated package-lock.json

Next Steps to Publish:
  1. git add .
  2. git commit -m "chore(release): bump version to v${nextVersion}"
  3. git tag -a v${nextVersion} -m "Release v${nextVersion}"
  4. git push origin main --tags
`);
