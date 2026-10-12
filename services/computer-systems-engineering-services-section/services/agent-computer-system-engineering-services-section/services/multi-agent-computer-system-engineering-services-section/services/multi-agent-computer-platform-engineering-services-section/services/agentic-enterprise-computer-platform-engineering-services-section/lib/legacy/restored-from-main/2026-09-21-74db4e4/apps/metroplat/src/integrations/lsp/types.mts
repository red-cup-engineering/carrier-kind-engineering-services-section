/**
 * @packageDocumentation
 *
 * LSP protocol data model for MetroPlat's stateless language-server face.
 *
 * @metroplatSubject lsp
 */
import type { SchemaContract } from "../../lib/schema/index.mts";
import type { LspRequestEnvelope, LspResponseEnvelope } from "./codec.mts";
import type { Operation } from "../../rpc/index.mts";
import type { ProgramEndpoint } from "../../presentation/surface.mts";
import type { PromptDescriptor } from "../../presentation/prompt.mts";
import type { ResourceDescriptor } from "../../presentation/resources.mts";
import type {
  LeanDeclarationIndex,
  LeanFormalizationClaim,
  LeanTheoremReferenceIndex,
} from "../lean/view.mts";
import type { AgentEventChronicle, OtlpTraces } from "../../lib/codecs/json/otlp.mts";
import type { AccountableTransaction } from "../accountable-transaction/codec.mts";
import type { DataArtifactDescriptor } from "../../lib/addressing/index.mts";
import type { UtteranceObject } from "../../lib/records/utterance/index.mts";

export type LspPosition = Readonly<{ line: number; character: number }>;
export type LspRange = Readonly<{ start: LspPosition; end: LspPosition }>;
export type LspLocation = Readonly<{ uri: string; range: LspRange }>;
export type LspDiagnostic = Readonly<{
  range: LspRange;
  severity: 1 | 2 | 3;
  source: "@red-cup-engineering/metroplat/lsp";
  message: string;
}>;
export type LspHover = Readonly<{
  contents: Readonly<{ kind: "markdown"; value: string }>;
  range: LspRange;
}>;

export type TextDocumentPositionParams = Readonly<{
  textDocument: Readonly<{ uri: string }>;
  position: LspPosition;
}>;

export type ReferenceParams = TextDocumentPositionParams & Readonly<{
  context?: Readonly<{ includeDeclaration?: boolean }>;
}>;

export type DiagnosticParams = Readonly<{
  schemaId?: string;
  textDocument?: Readonly<{ uri: string }>;
  value: unknown;
}>;

export type FormattingParams = Readonly<{
  textDocument: Readonly<{ uri: string }>;
}>;

export type CodeActionParams = Readonly<{
  textDocument: Readonly<{ uri: string }>;
  range?: LspRange;
  context?: Readonly<{
    diagnostics?: readonly LspDiagnostic[];
    only?: readonly string[];
  }>;
}>;

export type DocumentSymbolParams = Readonly<{
  textDocument: Readonly<{ uri: string }>;
}>;

export type DocumentLinkParams = Readonly<{
  textDocument: Readonly<{ uri: string }>;
}>;

export type FoldingRangeParams = Readonly<{
  textDocument: Readonly<{ uri: string }>;
}>;

export type SelectionRangeParams = Readonly<{
  textDocument: Readonly<{ uri: string }>;
  positions: readonly LspPosition[];
}>;

export type LspTextEdit = Readonly<{
  range: LspRange;
  newText: string;
}>;

export type LspWorkspaceEdit = Readonly<{
  changes: Readonly<Record<string, readonly LspTextEdit[]>>;
}>;

export type LspCodeAction = Readonly<{
  title: string;
  kind: "quickfix" | "source.fixAll" | "source.format";
  diagnostics?: readonly LspDiagnostic[];
  edit: LspWorkspaceEdit;
}>;

export type LspDocumentSymbol = Readonly<{
  name: string;
  detail?: string;
  kind: 1 | 3 | 19;
  range: LspRange;
  selectionRange: LspRange;
  children?: readonly LspDocumentSymbol[];
}>;

export type LspDocumentLink = Readonly<{
  range: LspRange;
  target?: string;
  tooltip?: string;
  data?: unknown;
}>;

export type LspFoldingRange = Readonly<{
  startLine: number;
  startCharacter?: number;
  endLine: number;
  endCharacter?: number;
  kind?: "comment" | "imports" | "region";
}>;

export type LspSelectionRange = Readonly<{
  range: LspRange;
  parent?: LspSelectionRange;
}>;

export type LspTextEditApplication = Readonly<{
  readonly kind: "metroplat.lsp.text-edit-application";
  readonly edits: number;
  readonly changed: boolean;
  readonly beforeBytes: number;
  readonly afterBytes: number;
  readonly text: string;
}>;

export interface LspMarkdownDocument {
  readonly uri: string;
  readonly text: string;
  readonly id?: string;
}

export interface LspVirtualDocument {
  readonly kind: "schema" | "action" | "resource" | "prompt" | "utterance-projection" | "markdown";
  readonly id: string;
  readonly uri: string;
  readonly text: string;
}

/** The stateless LSP face projected from MetroPlat's live operation family. */
export interface MetroPlatLspProjection {
  readonly schemas: readonly SchemaContract[];
  readonly operations: readonly Operation[];
  readonly documents: readonly LspVirtualDocument[];
  readonly definition: (params: TextDocumentPositionParams) => LspLocation | null;
  readonly hover: (params: TextDocumentPositionParams) => LspHover | null;
  readonly references: (params: ReferenceParams) => readonly LspLocation[];
  readonly diagnostics: (params: DiagnosticParams) => readonly LspDiagnostic[];
  readonly formatting: (params: FormattingParams) => readonly LspTextEdit[];
  readonly codeAction: (params: CodeActionParams) => readonly LspCodeAction[];
  readonly documentSymbol: (params: DocumentSymbolParams) => readonly LspDocumentSymbol[];
  readonly documentLink: (params: DocumentLinkParams) => readonly LspDocumentLink[];
  readonly foldingRange: (params: FoldingRangeParams) => readonly LspFoldingRange[];
  readonly selectionRange: (params: SelectionRangeParams) => readonly LspSelectionRange[];
  readonly handle: (request: LspRequestEnvelope) => LspResponseEnvelope;
}

export interface MetroPlatLspOptions {
  readonly schemas?: readonly SchemaContract[];
  readonly operations?: readonly Operation[];
  readonly endpoints?: readonly ProgramEndpoint[];
  readonly resourceDescriptors?: readonly ResourceDescriptor[];
  readonly promptDescriptors?: readonly PromptDescriptor[];
  readonly utterances?: readonly UtteranceObject[];
  readonly leanFormalizationClaims?: readonly LeanFormalizationClaim[];
  readonly leanDeclarationIndexes?: readonly LeanDeclarationIndex[];
  readonly leanTheoremReferenceIndexes?: readonly LeanTheoremReferenceIndex[];
  readonly openaiChronicles?: readonly AgentEventChronicle[];
  readonly accountableTransactions?: readonly AccountableTransaction[];
  readonly dataArtifacts?: readonly DataArtifactDescriptor[];
  readonly runtimeTraces?: readonly OtlpTraces[];
  readonly markdownDocuments?: readonly LspMarkdownDocument[];
  readonly scheme?: string;
}
