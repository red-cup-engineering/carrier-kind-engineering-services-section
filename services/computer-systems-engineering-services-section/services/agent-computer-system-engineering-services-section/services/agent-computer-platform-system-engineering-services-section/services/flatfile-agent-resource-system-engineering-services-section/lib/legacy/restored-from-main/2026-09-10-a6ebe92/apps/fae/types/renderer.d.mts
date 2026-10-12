import type { Composition } from "./compositor.d.mts";
export interface RenderRequest<Selection = unknown, Parameters = Record<string, unknown>> { readonly composition: Composition; readonly selection: Selection; readonly parameters: Parameters }
export interface Renderer<Selection = unknown, Parameters = Record<string, unknown>, Body = unknown> {
  readonly id: string; readonly mediaType: string;
  accepts(request: RenderRequest<Selection, Parameters>): boolean;
  render(request: RenderRequest<Selection, Parameters>): Body | Promise<Body>;
}
export function defineRenderer<Selection = unknown, Parameters = Record<string, unknown>, Body = unknown>(renderer: Renderer<Selection, Parameters, Body>): Renderer<Selection, Parameters, Body>;
export function createRendererRegistry(renderers: readonly Renderer[]): { readonly renderers: readonly Renderer[]; readonly byId: Map<string, Renderer> };
export function renderGraph(registry: ReturnType<typeof createRendererRegistry>, request: { composition: Composition; selection: unknown; rendererId?: string | null; parameters?: Record<string, unknown> }): Promise<{ readonly renderer: string; readonly mediaType: string; readonly body: unknown }>;
