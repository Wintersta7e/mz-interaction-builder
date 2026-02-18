import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { SearchableSelect } from "../SearchableSelect";

const mockItems = [
  { id: 1, name: "Player HP" },
  { id: 2, name: "Player MP" },
  { id: 3, name: "Gold" },
  { id: 42, name: "Player Gold" },
  { id: 100, name: "" },
];

describe("SearchableSelect", () => {
  it("renders with placeholder when no value selected", () => {
    render(
      <SearchableSelect
        items={mockItems}
        value={null}
        onChange={vi.fn()}
        placeholder="Select..."
      />,
    );
    expect(screen.getByPlaceholderText("Select...")).toBeInTheDocument();
  });

  it("shows selected item text", () => {
    render(<SearchableSelect items={mockItems} value={3} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("0003: Gold")).toBeInTheDocument();
  });

  it("filters items by name on typing", async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect items={mockItems} value={null} onChange={vi.fn()} />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "Gold");

    expect(screen.getByText("0003: Gold")).toBeInTheDocument();
    expect(screen.getByText("0042: Player Gold")).toBeInTheDocument();
    expect(screen.queryByText("0001: Player HP")).not.toBeInTheDocument();
  });

  it("filters items by ID on typing a number", async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect items={mockItems} value={null} onChange={vi.fn()} />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "42");

    expect(screen.getByText("0042: Player Gold")).toBeInTheDocument();
  });

  it("calls onChange when item is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect items={mockItems} value={null} onChange={onChange} />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.click(screen.getByText("0003: Gold"));

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("supports keyboard navigation", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchableSelect items={mockItems} value={null} onChange={onChange} />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("shows unnamed items with (unnamed)", () => {
    render(
      <SearchableSelect items={mockItems} value={100} onChange={vi.fn()} />,
    );
    expect(screen.getByDisplayValue("0100: (unnamed)")).toBeInTheDocument();
  });

  it("closes dropdown on Escape", async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect items={mockItems} value={null} onChange={vi.fn()} />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    expect(screen.getByText("0001: Player HP")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByText("0001: Player HP")).not.toBeInTheDocument();
  });
});
