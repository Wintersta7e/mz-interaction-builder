import { create } from "zustand";
import type { NodeTemplate } from "../types";

export interface TemplateResult {
  success: boolean;
  error?: string;
}

interface TemplateState {
  templates: NodeTemplate[];
  isLoaded: boolean;

  loadTemplates: () => Promise<void>;
  saveTemplate: (template: NodeTemplate) => Promise<TemplateResult>;
  deleteTemplate: (id: string) => Promise<TemplateResult>;
}

export const useTemplateStore = create<TemplateState>()((set) => ({
  templates: [],
  isLoaded: false,

  loadTemplates: async () => {
    const result = await window.api.template.list();
    if (result.success) {
      set({ templates: result.templates, isLoaded: true });
    } else {
      console.error("Failed to load templates:", result.error);
      set({ isLoaded: true });
    }
  },

  saveTemplate: async (template) => {
    const result = await window.api.template.save(template);
    if (result.success) {
      set((state) => ({
        // Replace existing template with same ID, or append
        templates: state.templates.some((t) => t.id === template.id)
          ? state.templates.map((t) => (t.id === template.id ? template : t))
          : [...state.templates, template],
      }));
      return { success: true };
    }
    console.error("Failed to save template:", result.error);
    return { success: false, error: result.error };
  },

  deleteTemplate: async (id) => {
    const result = await window.api.template.delete(id);
    if (result.success) {
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
      }));
      return { success: true };
    }
    console.error("Failed to delete template:", result.error);
    return { success: false, error: result.error };
  },
}));
