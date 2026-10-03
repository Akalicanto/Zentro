import { useState } from "react";
import { currentMonth } from "../../../domain/index.ts";

export function useHistoryView() {
  const [year, setYear] = useState(() => currentMonth().slice(0, 4));
  const [view, setView] = useState("Acumulado");
  const [tableOrder, setTableOrder] = useState("desc");
  const [editingHistory, setEditingHistory] = useState(false);
  return {
    year,
    setYear,
    view,
    setView,
    tableOrder,
    setTableOrder,
    editingHistory,
    setEditingHistory,
  };
}
export type HistoryControls = ReturnType<typeof useHistoryView>;
