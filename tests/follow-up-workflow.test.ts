import { describe, expect, test } from 'bun:test';
import workflow from '../content/follow-up/workflow.json';

const nodeById = Object.fromEntries(workflow.nodes.map((node) => [node.id, node]));

describe('follow-up workflow safety branches', () => {
  test('keeps preliminary positive stages distinct from final approval and adverse decisions', () => {
    const edges = nodeById['DECISION.01'].edges;

    expect(edges).toEqual({
      final_positive: 'DONE.01',
      acknowledgement: 'PRELIMINARY.01',
      recording: 'PRELIMINARY.01',
      preliminary_positive: 'PRELIMINARY.01',
      adverse: 'REMEDY.01',
      unknown: 'LEGAL.01',
    });
  });

  test('requires a separate second-instance silence path', () => {
    const edges = nodeById['SILENCE.STAGE'].edges;
    if (!edges) throw new Error('SILENCE.STAGE must define explicit outcomes.');

    expect(edges.first_instance).toBe('SILENCE.01');
    expect(edges.second_instance_after_appeal).toBe('SILENCE.SECOND');
    expect(nodeById['SILENCE.SECOND'].next).toBe('FILE.GATE');
    expect(edges.unknown).toBe('LEGAL.01');
  });

  test('wait steps stop rather than loop and can re-enter only on named new events', () => {
    const waits = workflow.nodes.filter((node) => node.type === 'wait');

    expect(waits.length).toBeGreaterThan(0);
    for (const wait of waits) {
      expect('next' in wait).toBe(false);
      const resumeOn = wait.resume_on;
      if (!resumeOn) throw new Error(`${wait.id} must define explicit re-entry events.`);
      expect(resumeOn.length).toBeGreaterThan(0);
      for (const edge of resumeOn) {
        expect(nodeById[edge.next]).toBeDefined();
        expect(edge.event.length).toBeGreaterThan(0);
      }
    }
  });

  test('every decision outcome, transition, and template reference resolves', () => {
    const templateIds = new Set(['T01','T02','T03','T04','T05','T06','T07','T08','T09','T10','T11','T12','T13','T14','T15','T16']);

    for (const node of workflow.nodes) {
      for (const target of [node.next, ...Object.values(node.edges ?? {}), ...(node.resume_on ?? []).map((edge) => edge.next)]) {
        if (target) expect(nodeById[target]).toBeDefined();
      }
      for (const template of node.templates ?? []) expect(templateIds.has(template)).toBe(true);
    }
  });
});
