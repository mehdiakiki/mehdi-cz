"use client";
import { useState } from "react";

export default function ReportPicker({ options }: { options: { id: string; label: string }[] }) {
  const [selected, setSelected] = useState(options[0]?.id ?? "");
  return <label>Period<select value={selected} onChange={(event) => setSelected(event.target.value)}>
    {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
  </select></label>;
}
