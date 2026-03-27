// ARCH-1: Uses shared API types — single source of truth in src/shared/api-types.ts.
// Only the template API is overridden here to narrow `unknown` to `NodeTemplate`.
import type { API } from "../../../shared/api-types";
import type { NodeTemplate } from "./index";

type TypedTemplateAPI = {
  list: () => Promise<{ success: boolean; templates: NodeTemplate[]; error?: string }>;
  save: (template: NodeTemplate) => Promise<{ success: boolean; error?: string }>;
  delete: (id: string) => Promise<{ success: boolean; error?: string }>;
};

type TypedAPI = Omit<API, "template"> & { template: TypedTemplateAPI };

declare global {
  interface Window {
    api: TypedAPI;
  }
}
