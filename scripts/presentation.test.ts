import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { orderAngles } from '../shared/presentation';
import { studySchema, type Angle, type Reference, type Study } from '../shared/schema';
import { Workspace } from '../src/Workspace';

const original = studySchema.parse(await Bun.file('data/demo-study.json').json());

function direction({ id, proximity, referenceIds = [] }: { id: string; proximity?: Angle['proximity']; referenceIds?: string[] }): Angle {
  return { ...original.angles[0], id, title: id, label: 'Approach', description: `${id} description`, suggestedHook: `${id} hook`, proximity, referenceIds };
}

function reference(id: string, relevance: Reference['relevance']): Reference {
  return { ...original.references[0], id, title: id, relevance };
}

function study(angles: Angle[], references: Reference[] = []): Study {
  return { ...original, angles, references, constraints: { noRealPeople: false, exclude: '' }, excludedReferences: [], uncertainReferences: [], constraintAssessments: {} };
}

function render(value: Study, view: 'study' | 'storyboard' = 'study') {
  return renderToStaticMarkup(createElement(Workspace, { study: value, view, onView: () => {}, onHistory: () => {}, onCorrectBrief: () => {} }));
}

test('approaches follow actual proximity to the brief independently of source classification', () => {
  const angles = [
    direction({ id: 'Technique', proximity: 'mechanism', referenceIds: ['direct-source'] }),
    direction({ id: 'Closest', proximity: 'direct', referenceIds: ['mechanism-source'] }),
    direction({ id: 'Broader', proximity: 'adjacent', referenceIds: ['direct-source'] }),
  ];
  const acceptedReferences = [reference('direct-source', 'direct'), reference('mechanism-source', 'mechanism')];
  expect(orderAngles(angles, acceptedReferences).map(angle => angle.title)).toEqual(['Closest', 'Broader', 'Technique']);
});

test('ties preserve original order without changing stored angles or references', () => {
  const angles = Object.freeze([
    Object.freeze(direction({ id: 'Second technique', proximity: 'mechanism' })),
    Object.freeze(direction({ id: 'First direct', proximity: 'direct' })),
    Object.freeze(direction({ id: 'Second direct', proximity: 'direct' })),
    Object.freeze(direction({ id: 'First technique', proximity: 'mechanism' })),
  ]);
  const acceptedReferences = Object.freeze([Object.freeze(reference('source', 'direct'))]);
  const before = JSON.stringify({ angles, acceptedReferences });
  const sorted = orderAngles(angles, acceptedReferences);
  expect(sorted.map(angle => angle.title)).toEqual(['First direct', 'Second direct', 'Second technique', 'First technique']);
  expect(sorted[0]).toBe(angles[1]);
  expect(JSON.stringify({ angles, acceptedReferences })).toBe(before);
});

test('legacy angles use their nearest accepted supporting source', () => {
  const acceptedReferences = [reference('technique', 'mechanism'), reference('nearby', 'adjacent'), reference('exact', 'direct')];
  const angles = [
    direction({ id: 'Legacy technique', referenceIds: ['technique'] }),
    direction({ id: 'Legacy adjacent', referenceIds: ['technique', 'nearby'] }),
    direction({ id: 'Legacy direct', referenceIds: ['nearby', 'exact'] }),
  ];
  expect(orderAngles(angles, acceptedReferences).map(angle => angle.title)).toEqual(['Legacy direct', 'Legacy adjacent', 'Legacy technique']);
  expect(angles.every(angle => angle.proximity === undefined)).toBe(true);
});

test('unknown supporting IDs cannot elevate an angle and unsupported ties remain stable', () => {
  const acceptedReferences = [reference('technique', 'mechanism')];
  const angles = [
    direction({ id: 'Unknown', referenceIds: ['not-accepted'] }),
    direction({ id: 'No sources' }),
    direction({ id: 'Supported', referenceIds: ['not-accepted', 'technique'] }),
    direction({ id: 'Also unknown', referenceIds: ['another-unknown'] }),
  ];
  expect(orderAngles(angles, acceptedReferences).map(angle => angle.title)).toEqual(['Supported', 'Unknown', 'No sources', 'Also unknown']);
});

test('explicit proximity wins over legacy inference while ties keep their original order', () => {
  const acceptedReferences = [reference('exact', 'direct')];
  const angles = [
    direction({ id: 'Explicit technique', proximity: 'mechanism', referenceIds: ['exact'] }),
    direction({ id: 'Legacy direct', referenceIds: ['exact'] }),
    direction({ id: 'Explicit direct', proximity: 'direct' }),
  ];
  expect(orderAngles(angles, acceptedReferences).map(angle => angle.title)).toEqual(['Legacy direct', 'Explicit direct', 'Explicit technique']);
});

test('Workspace displays, expands and links evidence for the first sorted approach', () => {
  const value = study([
    direction({ id: 'Technique', proximity: 'mechanism', referenceIds: ['technique-evidence'] }),
    direction({ id: 'Closest', proximity: 'direct', referenceIds: ['closest-evidence'] }),
    direction({ id: 'Broader', proximity: 'adjacent' }),
  ], [reference('technique-evidence', 'direct'), reference('closest-evidence', 'mechanism')]);
  const html = render(value);
  expect(html.indexOf('<h2>Closest</h2>')).toBeLessThan(html.indexOf('<h2>Broader</h2>'));
  expect(html.indexOf('<h2>Broader</h2>')).toBeLessThan(html.indexOf('<h2>Technique</h2>'));
  const cards = html.match(/<article class="angle-card[\s\S]*?<\/article>/g) ?? [];
  expect(cards).toHaveLength(3);
  expect(cards[0]).toContain('angle-selected');
  expect(cards[0]).toContain('aria-expanded="true"');
  expect(cards[0]).toContain('Closest description');
  expect(cards[0]).toContain('Closest to your brief');
  expect(cards[1]).toContain('Broader inspiration');
  expect(cards[2]).toContain('Presentation technique');
  expect(html).toContain('Closest hook');
  expect(html).not.toContain('Technique hook');
  expect(html).toContain('<h3>closest-evidence</h3>');
  expect(html).not.toContain('<h3>technique-evidence</h3>');
});

test('legacy Workspace selects its nearest supported approach without inventing approach classifications', () => {
  const html = render(study([
    direction({ id: 'Legacy technique', referenceIds: ['technique'] }),
    direction({ id: 'Legacy direct', referenceIds: ['exact'] }),
  ], [reference('technique', 'mechanism'), reference('exact', 'direct')]));
  expect(html.indexOf('<h2>Legacy direct</h2>')).toBeLessThan(html.indexOf('<h2>Legacy technique</h2>'));
  expect(html).toContain('Legacy direct hook');
  expect(html).not.toContain('Legacy technique hook');
  expect(html).not.toContain('Closest to your brief');
});

test('mechanism-only studies retain their ideas without implying a direct approach or forcing categories', () => {
  const angles = [direction({ id: 'First technique', proximity: 'mechanism' }), direction({ id: 'Second technique', proximity: 'mechanism' })];
  expect(orderAngles(angles, [])).toEqual(angles);
  const html = render(study(angles));
  expect(html.match(/Presentation technique/g)).toHaveLength(2);
  expect(html).not.toContain('Closest to your brief');
  expect(html).not.toContain('Broader inspiration');
  expect(html).toContain('First technique hook');
  expect(html.match(/<article class="angle-card/g)).toHaveLength(2);
});

test('a single adjacent idea stays adjacent with no manufactured direct or technique ideas', () => {
  const html = render(study([direction({ id: 'Only adjacent', proximity: 'adjacent' })]));
  expect(html).toContain('Broader inspiration');
  expect(html).not.toContain('Closest to your brief');
  expect(html).not.toContain('Presentation technique');
  expect(html.match(/<article class="angle-card/g)).toHaveLength(1);
});

test('excluded, uncertain and unassessed constraint sources cannot promote legacy approaches or appear as evidence', () => {
  const value = study([
    direction({ id: 'Unsupported direct', referenceIds: ['excluded', 'uncertain', 'unassessed'] }),
    direction({ id: 'Accepted technique', referenceIds: ['accepted'] }),
  ], [reference('unassessed', 'direct'), reference('accepted', 'mechanism')]);
  value.constraints = { noRealPeople: true, exclude: '' };
  value.excludedReferences = [reference('excluded', 'direct')];
  value.uncertainReferences = [reference('uncertain', 'direct')];
  value.constraintAssessments = {
    accepted: { status: 'fits', reason: 'Recorded constraint evidence.' },
    excluded: { status: 'excluded', reason: 'Outside constraints.' },
    uncertain: { status: 'uncertain', reason: 'Insufficient evidence.' },
  };
  const html = render(value);
  expect(html.indexOf('<h2>Accepted technique</h2>')).toBeLessThan(html.indexOf('<h2>Unsupported direct</h2>'));
  expect(html).toContain('Accepted technique hook');
  expect(html).toContain('<h3>accepted</h3>');
  for (const id of ['excluded', 'uncertain', 'unassessed']) expect(html).not.toContain(`<h3>${id}</h3>`);
  expect(html).not.toContain('Open storyboard');
});

test('empty studies keep the no-directions and no-storyboard behavior', () => {
  const value = study([]);
  expect(orderAngles([], [])).toEqual([]);
  const html = render(value);
  expect(html).toContain('No supported creative directions yet.');
  expect(html).not.toContain('Open storyboard');
  expect(html).not.toContain('Closest to your brief');
  expect(html).not.toContain('A HOOK TO MAKE YOUR OWN');
  expect(render(value, 'storyboard')).toContain('Storyboard unavailable.');
});
