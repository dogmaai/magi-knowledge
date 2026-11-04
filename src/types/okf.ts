export type LifecycleStatus = 'draft' | 'stable' | 'deprecated';
export type TrustTier = 'unverified' | 'machine-confirmed' | 'human-reviewed';
export type TreeScope = '_lilith_safe' | 'system' | 'root' | 'skills';

export interface ActorEvent {
  by: string;
  at: string;
}

export interface ParsedConcept {
  conceptId: string;
  relPath: string;
  tree: TreeScope;
  subtree: string;
  isReserved: boolean;
  frontmatter: Record<string, any>;
  body: string;
  rawText: string;
  title: string;
  type: string;
  description: string;
  lilithSafe: boolean | null;
  status: LifecycleStatus;
  unitStatus: string | null;
  trustTier: TrustTier;
  generated: ActorEvent | null;
  verified: ActorEvent[];
  latestVerifiedAt: string | null;
  staleAfter: string | null;
  isStale: boolean;
  tags: string[];
  outgoingLinks: string[];
}

export interface LintDiagnostic {
  level: 'ERROR' | 'WARN' | 'STALE';
  relPath: string;
  conceptId: string;
  category:
    | 'okf_conformance'
    | 'trust_lifecycle'
    | 'lilith_boundary'
    | 'lilith_contamination'
    | 'deprecated_link'
    | 'reserved_index'
    | 'freshness';
  message: string;
}

export interface LintReport {
  scannedCount: number;
  errorCount: number;
  warningCount: number;
  staleCount: number;
  passed: boolean;
  failOnStale: boolean;
  timestamp: string;
  diagnostics: LintDiagnostic[];
}

export interface UnitDetectorSyncReport {
  ok: boolean;
  registryStems: string[];
  detectorNames: string[];
  linterNames: string[];
  missingFromDetector: string[];
  missingFromLinter: string[];
  detectorOnlyNames: string[];
  selfNameInDetector: boolean;
}

export interface SafeLoaderSmokeTestResult {
  id: string;
  name: string;
  description: string;
  passed: boolean;
  detail: string;
}

export interface SafeLoaderReport {
  passed: boolean;
  safeConceptCount: number;
  crossUnitDetectorNames: string[];
  verbatimOutputRules: string;
  interpolatedOutputRules: string;
  distributionPriors: any;
  tests: SafeLoaderSmokeTestResult[];
}

export interface R2SyncPreviewItem {
  conceptId: string;
  key: string;
  md5: string;
  s3Command: string;
  metadata: Record<string, string>;
  icebergRow: {
    concept_id: string;
    tree: string;
    path: string;
    title: string | null;
    type: string | null;
    status: string;
    trust_tier: string;
    verified_at: string | null;
    stale_after: string | null;
    unit_status: string | null;
    lilith_safe: boolean;
    tags: string[];
    bodyChars: number;
  };
}

export interface BundlePayload {
  okfVersion: string;
  gitRevision: string;
  bundleRootDoc: {
    relPath: string;
    frontmatter: Record<string, any>;
    body: string;
  };
  reservedDocs: Array<{
    relPath: string;
    title: string;
    body: string;
  }>;
  concepts: ParsedConcept[];
  lintReport: LintReport;
  detectorSync: UnitDetectorSyncReport;
  safeLoader: SafeLoaderReport;
  r2Preview: {
    bucket: string;
    prefix: string;
    endpoint: string;
    accountId: string;
    namespace: string;
    customMetadataSchema: Array<{ field_name: string; data_type: string }>;
    items: R2SyncPreviewItem[];
  };
}
