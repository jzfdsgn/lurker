// In-memory scan store. One operator, one in-flight scan at a time — sample
// scope. Restart drops history; that's acceptable here.

import { randomUUID } from "node:crypto";

const scans = new Map();

export function createScan({ networkId, target, depth }) {
  const id = randomUUID();
  const scan = {
    id,
    networkId,
    target,
    depth,
    status: "running",
    toolCallCount: 0,
    proposals: null,
    messages: null, // map of messageId -> message, for evidence rendering
    events: [], // ordered trace of model turns / tool calls; consumed by the UI
    error: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
  scans.set(id, scan);
  return scan;
}

export function appendEvent(id, event) {
  const scan = scans.get(id);
  if (!scan) return null;
  scan.events.push({ ...event, at: Date.now() });
  return scan;
}

export function getScan(id) {
  return scans.get(id) ?? null;
}

export function updateScan(id, patch) {
  const scan = scans.get(id);
  if (!scan) return null;
  Object.assign(scan, patch);
  return scan;
}

export function finishScan(id, { proposals, messages }) {
  return updateScan(id, {
    status: "done",
    proposals,
    messages,
    finishedAt: Date.now(),
  });
}

export function errorScan(id, error) {
  return updateScan(id, {
    status: "error",
    error: error?.message ?? String(error),
    finishedAt: Date.now(),
  });
}
