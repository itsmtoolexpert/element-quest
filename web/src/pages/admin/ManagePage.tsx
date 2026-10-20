import { NavLink, Navigate, Route, Routes } from "react-router";

import ManageContent from "./ManageContent";
import ManageFinders from "./ManageFinders";
import ManageMaterials from "./ManageMaterials";
import ManageSearches from "./ManageSearches";
import ManageStudents from "./ManageStudents";

const SECTIONS = [
  ["students", "Accounts"],
  ["content", "Element content"],
  ["materials", "What's inside"],
  ["finders", "Find elements in"],
  ["searches", "Missed searches"],
] as const;

export default function ManagePage() {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Manage" className="flex flex-wrap gap-2">
        {SECTIONS.map(([path, label]) => (
          <NavLink key={path} to={`/manage/${path}`}
            className={({ isActive }) => `rounded-full border px-4 py-2 text-sm font-bold ${isActive ? "border-fg bg-fg text-bg" : "border-line bg-surface hover:border-accent"}`}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<Navigate to="students" replace />} />
        <Route path="students" element={<ManageStudents />} />
        <Route path="content" element={<ManageContent />} />
        <Route path="materials" element={<ManageMaterials />} />
        <Route path="finders" element={<ManageFinders />} />
        <Route path="searches" element={<ManageSearches />} />
      </Routes>
    </div>
  );
}
