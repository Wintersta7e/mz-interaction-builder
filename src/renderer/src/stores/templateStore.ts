import { create } from "zustand";
import type { NodeTemplate } from "../types";

interface TemplateState {
  templates: NodeTemplate[];
  isLoaded: boolean;

  loadTemplates: () => Promise<void>;
  saveTemplate: (template: NodeTemplate) => Promise<boolean>;
  deleteTemplate: (id: string) => Promise<boolean>;
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
      set((state) => ({ templates: [...state.templates, template] }));
      return true;
    }
    console.error("Failed to save template:", result.error);
    return false;
  },

  deleteTemplate: async (id) => {
    const result = await window.api.template.delete(id);
    if (result.success) {
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
      }));
      return true;
    }
    console.error("Failed to delete template:", result.error);
    return false;
  },
}));
