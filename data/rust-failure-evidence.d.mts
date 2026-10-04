export interface RustFailureEvidenceCase {
  id: `RFA-${string}`;
  runner?:
    | "rustc"
    | "rustc-run"
    | "rustc-link"
    | "rustc-symbol-matrix"
    | "rustc-native-target-matrix"
    | "rustc-native-discovery"
    | "rustc-native-owner"
    | "rustc-invariant-matrix"
    | "rustc-allocator-sanitizer"
    | "rustc-link-resource-matrix"
    | "cargo"
    | "cargo-rebuild"
    | "cargo-runtime-env"
    | "cargo-package"
    | "cargo-profile-pair"
    | "cargo-test-surfaces"
    | "cargo-suite-isolation"
    | "cargo-subprocess";
  toolchain: string;
  edition: string;
  verifiedAt: string;
  failureFile: string;
  repairedFile: string;
  hostFile?: string;
  allocatorFile?: string;
  resourceRunnerFile?: string;
  hostTriple?: string;
  targetTriple?: string;
  nativeCompiler?: string;
  expectedHostMachine?: string;
  expectedTargetMachine?: string;
  memoryLimitKiB?: number;
  baselineLimitKiB?: number;
  objectCopies?: number;
  failureManifest?: string;
  repairedManifest?: string;
  failureCargoConfig?: string;
  repairedCargoConfig?: string;
  failureAction?: "build" | "check" | "run" | "test";
  repairedAction?: "build" | "check" | "run" | "test";
  trackedEnvironment?: string;
  firstEnvironmentValue?: string;
  secondEnvironmentValue?: string;
  binaryNameFailure?: string;
  binaryNameRepaired?: string;
  failureTimeoutMs?: number;
  repairedTimeoutMs?: number;
  locked?: boolean;
  isolatedTestFilters?: string[];
  suiteTimeoutMs?: number;
  unsetEnvironment?: string[];
  expectedDiagnostics: string[];
}

export const rustFailureAtlasGoal: {
  authorityCheckpoint: number;
  canonicalCases: number;
  nextCanonicalCaseTarget: number;
  systemsAtlasMilestoneCases: number;
  evidenceCoverageTarget: number;
  reverificationCadenceDays: number;
  evidenceContractVersion: number;
};
export const rustFailureEvidenceCases: RustFailureEvidenceCase[];
export function getRustFailureEvidence(caseId: string): RustFailureEvidenceCase | undefined;
export function rustFailureEvidenceUrl(caseId: string, fileName: string): string;
