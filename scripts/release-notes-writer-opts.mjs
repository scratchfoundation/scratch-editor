// Custom writerOpts for @semantic-release/release-notes-generator.
//
// commitsSort orders each commit group newest-first by committerDate, so the
// collapser logic can rely on entries[0] being the most recent commit.
//
// finalizeContext walks each commit group and, for any dependency that has
// 2+ Renovate "update dependency NAME to vVERSION" commits in this release,
// collapses them onto the most recent entry. Every commit's shortHash lands
// in the kept subject as a comma-separated list of markdown links (newest
// first), and any PR references that the angular preset substituted into
// the dropped subjects ("[#NNN](url)") get pulled back into the kept entry's
// references so the angular template renders them in its trailing
// "closes ..." list. Collapsed entries also set skipAutoLink so the
// (overridden) commitPartial below skips its own commit-link rendering for
// that entry; lone entries leave skipAutoLink unset and the template
// renders their SHA exactly as the angular preset would.
//
// Renovate group PRs (subjects naming several deps in one commit) don't
// match the singular-NAME regex and pass through unchanged.

import createAngularPreset from 'conventional-changelog-angular';

// Trailing .* tolerates anything GitHub or Renovate appends after the
// version (e.g. " (#538)" from a squash-merge, " ([#538](url))" after
// angular's transform converts it, or future markers).
const DEP_SUBJECT_RE = /^update dependency (\S+) to v?(\S+).*$/;

// Matches markdown-style PR refs (already substituted by angular's transform)
// so we can recover them when rebuilding the kept entry's subject.
const PR_REF_LINK_RE = /\[(#\d+)\]\(([^)]+)\)/g;

// Wrap angular's auto-shortHash block in {{#unless skipAutoLink}}...{{/unless}}
// so collapsed entries can opt out of the template's commit-link rendering
// (they embed the full SHA list in the subject instead). Lone entries leave
// skipAutoLink unset and the template renders their SHA as before. The block
// sits between the "commit link" and "commit references" comments in the
// upstream template; if those markers ever move, this throws at module load
// so the regression is loud rather than silent.
const COMMIT_LINK_BLOCK_RE = /(\{\{~!-- commit link --\}\}[\s\S]*?)(?=\{\{~!-- commit references --\}\})/;
const angularCommitPartial = createAngularPreset().writer.commitPartial;
if (!COMMIT_LINK_BLOCK_RE.test(angularCommitPartial)) {
    throw new Error('release-notes-writer-opts: could not find the commit-link block in the angular preset\'s commit partial. The upstream template structure may have changed.');
}
export const commitPartial = angularCommitPartial.replace(
    COMMIT_LINK_BLOCK_RE,
    '{{~#unless skipAutoLink~}}$1{{~/unless~}}'
);

export function commitsSort(a, b) {
    return Date.parse(b.committerDate) - Date.parse(a.committerDate);
}

function buildCommitUrl(context, hash) {
    const base = context.repository
        ? [context.host, context.owner, context.repository].filter(Boolean).join('/')
        : context.repoUrl || '';
    return `${base}/${context.commit || 'commit'}/${hash}`;
}

function extractPrRefs(subject) {
    if (!subject) return [];
    const refs = [];
    PR_REF_LINK_RE.lastIndex = 0;
    let match;
    while ((match = PR_REF_LINK_RE.exec(subject)) !== null) {
        const issue = match[1].slice(1); // strip the leading '#'
        refs.push({raw: match[1], prefix: '#', issue});
    }
    return refs;
}

export function finalizeContext(context) {
    for (const group of context.commitGroups || []) {
        const byDep = new Map();
        for (const entry of group.commits) {
            const match = entry.subject && entry.subject.match(DEP_SUBJECT_RE);
            if (!match) continue;
            const depName = match[1];
            const depVersion = match[2];
            const item = {entry, depVersion};
            if (byDep.has(depName)) {
                byDep.get(depName).push(item);
            } else {
                byDep.set(depName, [item]);
            }
        }

        for (const [depName, items] of byDep) {
            if (items.length < 2) continue;
            const kept = items[0];
            const links = items
                .map(it => `[${it.entry.shortHash}](${buildCommitUrl(context, it.entry.hash)})`)
                .join(', ');
            const recoveredRefs = items.flatMap(it => extractPrRefs(it.entry.subject));
            kept.entry.subject = `update dependency ${depName} to v${kept.depVersion} (${links})`;
            // Tell the (overridden) commitPartial to skip its auto-shortHash
            // rendering for this entry; the SHA list above already includes
            // every commit's link.
            kept.entry.skipAutoLink = true;
            const existingRefs = kept.entry.references || [];
            const seen = new Set();
            kept.entry.references = existingRefs.concat(recoveredRefs).filter(r => {
                const key = `${r.prefix || ''}${r.issue}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            const droppedEntries = new Set(items.slice(1).map(it => it.entry));
            group.commits = group.commits.filter(e => !droppedEntries.has(e));
        }
    }
    return context;
}
