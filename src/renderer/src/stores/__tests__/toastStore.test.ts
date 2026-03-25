import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../index";

describe("Toast store", () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [] });
  });

  it("adds a toast with auto-generated id", () => {
    useUIStore.getState().addToast({ message: "Saved!", type: "success" });
    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.message).toBe("Saved!");
    expect(toasts[0]!.type).toBe("success");
    expect(toasts[0]!.id).toBeDefined();
  });

  it("limits to 3 toasts max (removes oldest)", () => {
    const { addToast } = useUIStore.getState();
    addToast({ message: "Toast 1", type: "info" });
    addToast({ message: "Toast 2", type: "info" });
    addToast({ message: "Toast 3", type: "info" });
    addToast({ message: "Toast 4", type: "info" });
    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(3);
    expect(toasts[0]!.message).toBe("Toast 2");
    expect(toasts[2]!.message).toBe("Toast 4");
  });

  it("removes a toast by id", () => {
    useUIStore.getState().addToast({ message: "Temp", type: "info" });
    const id = useUIStore.getState().toasts[0]!.id;
    useUIStore.getState().removeToast(id);
    expect(useUIStore.getState().toasts).toHaveLength(0);
  });
});
