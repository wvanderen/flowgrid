// log_rejuvenation command handler (REJ-01/02/03/04, D-03/D-04, SPEC R3 amended).
//
// Duration-gated rejuvenation finish: derives the session duration from the command's
// startedAt/endedAt (D-04 diff-for-truth), processes stored Core Charge into Integration
// at REJUVENATION_CHARGE_PER_MINUTE (capped by available Charge), runs the geometric
// threshold-grant loop, decrements Charge by what was actually consumed (odd remainder
// retained — Pitfall 3), and appends exactly one RejuvenationRecord whose id is 1:1 with
// the command operationId (idempotent replay — prohibition 2).
//
// ALL time comes from env.now and the command's ISO strings. `new Date(iso).getTime()`
// parses the command's strings deterministically — it is NOT the ambient wall-clock
// function and never reads the clock at runtime (boundary scanner S6 enforces this).
//
// Integer discipline (S4): every durable economy value is multiply-then-floor. The
// threshold ratio (1.5) is a multiplier inside Math.floor only — the float never
// persists. Pitfall 3 ordering: chargeProcessedRaw -> integrationGained ->
// chargeConsumed = integrationGained * 2 (NOT chargeProcessedRaw, which would lose the
// odd remainder). Pitfall 4: the threshold is DERIVED from the monotonic moduleTokens
// counter, so the grant loop is bounded and self-advancing (no infinite loop, no
// threshold re-grant).

import type {
  CoreRecord,
  EconomyEvent,
  FlowgridSnapshot,
  IntNonNegative,
  LogRejuvenationCommand,
  RejuvenationRecord,
  SimulationEnv,
  SimulationResult,
  ValidationIssue,
  VisualEvent,
} from '../../domain/index.js';

import { operationFromCommand } from '../operation-events.js';
import {
  rejuvenationCompletedEvent,
  tokenGrantedEvent,
} from '../economy-events.js';
import { tokenGrantedVisual } from '../visual-events.js';
import {
  REJUVENATION_CHARGE_PER_MINUTE,
  nextIntegrationThreshold,
} from '../../content/index.js';

function rejectWith(
  state: FlowgridSnapshot,
  issues: readonly ValidationIssue[],
): SimulationResult {
  return {
    status: 'rejected',
    previousState: state,
    nextState: state,
    economyEvents: [],
    visualEvents: [],
    operations: [],
    validationIssues: issues,
  };
}

export function logRejuvenation(
  previousState: FlowgridSnapshot,
  command: LogRejuvenationCommand,
  env: SimulationEnv,
): SimulationResult {
  const issues: ValidationIssue[] = [];

  // D-04: derive duration from startedAt/endedAt (the command's ISO strings —
  // deterministic; never the wall clock). Mirrors complete_focus_session timing.
  if (command.endedAt < command.startedAt) {
    issues.push({
      code: 'invalid_reference',
      severity: 'error',
      entityType: 'rejuvenation',
      entityId: command.operationId,
      message: `log_rejuvenation: endedAt must not precede startedAt.`,
      path: 'command.startedAt,command.endedAt',
    });
  }

  if (issues.length > 0) {
    return rejectWith(previousState, issues);
  }

  const durationSeconds = Math.floor(
    (new Date(command.endedAt).getTime() - new Date(command.startedAt).getTime()) / 1000,
  );
  const durationMinutes = Math.floor(durationSeconds / 60);

  const prevCore = previousState.core;

  // --- Payout derivation (SPEC R3 amended, Pitfall 3 ordering) ---
  // chargeProcessedRaw caps how much Charge the duration allows; min with available
  // Charge ensures we never consume more than exists.
  const chargeProcessedRaw: IntNonNegative = Math.min(
    prevCore.coreCharge,
    Math.floor(durationMinutes * REJUVENATION_CHARGE_PER_MINUTE),
  );
  // 2:1 ratio. floor() collapses to the even 2:1 grid.
  const integrationGained: IntNonNegative = Math.floor(chargeProcessedRaw / 2);
  // Pitfall 3: consume integrationGained * 2, NOT chargeProcessedRaw, so the odd
  // remainder below the 2:1 step is retained (101 Charge -> 50 Integration -> 100
  // consumed -> 1 retained).
  const chargeConsumed: IntNonNegative = integrationGained * 2;

  // --- Threshold-grant loop (SPEC R4, Pitfall 4 — derive from monotonic counter) ---
  // nextIntegrationThreshold derives from moduleTokens, and moduleTokens increments
  // each iteration, so the loop is bounded and self-advancing. A single rejuvenation
  // that crosses multiple thresholds grants all of them.
  const newIntegration: IntNonNegative = prevCore.integration + integrationGained;
  let moduleTokens: IntNonNegative = prevCore.moduleTokens;
  while (newIntegration >= nextIntegrationThreshold(moduleTokens)) {
    moduleTokens += 1;
  }
  const tokensGranted: IntNonNegative = moduleTokens - prevCore.moduleTokens;

  const newCore: CoreRecord = {
    ...prevCore,
    coreCharge: prevCore.coreCharge - chargeConsumed,
    integration: newIntegration,
    moduleTokens,
    // Finish clears the live-timed marker (D-01/D-02 session is over).
    activeRejuvenationStartedAt: null,
    updatedAt: env.now,
  };

  // REJ-01 append-only record. id is 1:1 with operationId so replays are idempotent.
  // ALWAYS append (including 0-Charge no-op rest — REJ-03 rest is honored, not
  // rewarded: chargeConsumed=0/integrationGained=0/tokensGranted=0).
  const record: RejuvenationRecord = {
    id: command.operationId,
    startedAt: command.startedAt,
    endedAt: command.endedAt,
    durationSeconds,
    chargeConsumed,
    integrationGained,
    tokensGranted,
    createdAt: env.now,
  };

  const operation = operationFromCommand(command, env.now, {
    entityId: prevCore.id,
    payload: {
      durationSeconds,
      chargeConsumed,
      integrationGained,
      tokensGranted,
      startedAt: command.startedAt,
      endedAt: command.endedAt,
    },
  });

  const economyEvents: EconomyEvent[] = [
    rejuvenationCompletedEvent(env.now, prevCore.id, record.id, chargeConsumed, integrationGained),
  ];
  const visualEvents: VisualEvent[] = [];
  if (tokensGranted > 0) {
    economyEvents.push(tokenGrantedEvent(env.now, prevCore.id, tokensGranted, moduleTokens));
    // D-04: transient visual event emitted exactly when the tokenGranted economy
    // event fires (RESEARCH Open Question Q4). UI-04 — dropping it changes nothing.
    visualEvents.push(tokenGrantedVisual(env.now, prevCore.id, {
      tokensGranted,
      moduleTokensAfter: moduleTokens,
    }));
  }

  const nextState: FlowgridSnapshot = {
    ...previousState,
    core: newCore,
    rejuvenations: [...previousState.rejuvenations, record],
    operations: [...previousState.operations, operation],
    client: { ...previousState.client, updatedAt: env.now },
  };

  return {
    status: 'applied',
    previousState,
    nextState,
    economyEvents,
    visualEvents,
    operations: [operation],
    validationIssues: [],
  };
}
