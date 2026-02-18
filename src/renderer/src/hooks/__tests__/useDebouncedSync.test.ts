import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebouncedSync } from "../useDebouncedSync";

describe("useDebouncedSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the store value initially", () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSync<string>("hello", commit, 300),
    );
    expect(result.current.localValue).toBe("hello");
  });

  it("updates local value immediately on change", () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSync<string>("hello", commit, 300),
    );

    act(() => {
      result.current.setLocalValue("hello world");
    });

    expect(result.current.localValue).toBe("hello world");
    expect(commit).not.toHaveBeenCalled();
  });

  it("commits after delay", () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSync<string>("hello", commit, 300),
    );

    act(() => {
      result.current.setLocalValue("hello world");
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(commit).toHaveBeenCalledWith("hello world");
  });

  it("resets timer on rapid changes", () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSync<string>("", commit, 300),
    );

    act(() => {
      result.current.setLocalValue("a");
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.setLocalValue("ab");
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(commit).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(commit).toHaveBeenCalledWith("ab");
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it("commits immediately on flush", () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSync<string>("", commit, 300),
    );

    act(() => {
      result.current.setLocalValue("typed");
    });

    expect(commit).not.toHaveBeenCalled();

    act(() => {
      result.current.flush();
    });

    expect(commit).toHaveBeenCalledWith("typed");
  });

  it("flushes null values correctly", () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedSync<string | null>("initial", commit, 300),
    );

    act(() => {
      result.current.setLocalValue(null);
    });

    act(() => {
      result.current.flush();
    });

    expect(commit).toHaveBeenCalledWith(null);
  });

  it("syncs when store value changes externally", () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook(
      ({ storeValue }) => useDebouncedSync<string>(storeValue, commit, 300),
      { initialProps: { storeValue: "initial" } },
    );

    rerender({ storeValue: "external update" });

    expect(result.current.localValue).toBe("external update");
  });
});
