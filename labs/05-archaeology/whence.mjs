#!/usr/bin/env node
// Given a commit (SHA, or anything `git rev-parse` accepts), print where it came from:
// its PR, the first release that shipped it, and the CHANGELOG lines for that PR.
//
//   node labs/05-archaeology/whence.mjs 0672e4822
//   git -C svelte blame -L 150,160 main -- packages/svelte/src/internal/client/runtime.js   # find a SHA first
import { git, first_release, changelog_entries, PR_URL } from './git.mjs';

const ref = process.argv[2];
if (!ref) {
	console.error('usage: node labs/05-archaeology/whence.mjs <commit>');
	process.exit(1);
}

const sha = git(['rev-parse', '--verify', `${ref}^{commit}`]).trim();
if (!sha) {
	console.error(`not a commit: ${ref}`);
	process.exit(1);
}

const [subject, author, date] = git(['show', '-s', '--format=%s%n%an%n%ad', '--date=short', sha]).split('\n');
const pr = /\(#(\d+)\)\s*$/.exec(subject)?.[1];

console.log(`commit   ${sha.slice(0, 12)}  (${date}, ${author})`);
console.log(`subject  ${subject}`);
console.log(`PR       ${pr ? PR_URL(pr) : '(no PR number in subject)'}`);
console.log(`release  ${first_release(sha) ?? '(not in any svelte@x.y.z release yet)'}`);
const pre = first_release(sha, { prerelease: true });
if (pre && pre !== first_release(sha)) console.log(`first tag ${pre}  (prerelease)`);

if (pr) {
	const entries = changelog_entries('main').filter((e) => e.prs.includes(pr));
	console.log(`changelog${entries.length ? '' : '  (no entry; chores often have no changeset)'}`);
	for (const e of entries) console.log(`  ${e.version}: ${e.text.replace(/^- /, '').replace(/\s*\(\[#.*$/, '')}`);
}

const stat = git(['show', '--stat=120', '--format=', sha])
	.split('\n')
	.filter((l) => l.includes('packages/svelte/src/'));
if (stat.length) {
	console.log('runtime/compiler files touched');
	for (const l of stat.slice(0, 15)) console.log(' ' + l);
	if (stat.length > 15) console.log(`  ... and ${stat.length - 15} more`);
}
