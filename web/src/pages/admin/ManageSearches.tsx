import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { Link } from "react-router";

import { api } from "../../api";
import { useToast } from "../../components/Toast";
import { Btn, Panel } from "../../components/ui";
import { relativeTime } from "../../lib/time";

/** Things students searched for that matched nothing: add them as materials or dismiss them. */
export default function ManageSearches() {
  const qc = useQueryClient();
  const toast = useToast();
  const misses = useQuery({ queryKey: ["admin", "misses"], queryFn: api.admin.misses });
  const dismiss = useMutation({
    mutationFn: api.admin.dismissMiss,
    onSuccess: (_, q) => { toast(`Dismissed “${q}”`); qc.invalidateQueries({ queryKey: ["admin", "misses"] }); },
  });

  return (
    <Panel>
      <p className="mb-4 text-muted">
        When a student's search matches no element or material, it lands here. Adding it as a material (with the search
        as one of its names) clears it automatically.
      </p>
      {misses.isPending && <p className="text-muted">Loading…</p>}
      {misses.data?.length === 0 && <p className="text-muted">Nothing here. Every search has matched something.</p>}
      {!!misses.data?.length && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="text-xs uppercase tracking-widest text-muted">
              <tr><th className="py-2">Search</th><th className="text-right">Times</th><th>Who</th><th>Last</th><th /></tr>
            </thead>
            <tbody>
              {misses.data.map((m) => (
                <tr key={m.query} className="border-t border-line">
                  <td className="py-2.5 font-bold">{m.query}</td>
                  <td className="text-right font-mono">{m.count}</td>
                  <td className="text-sm">{m.students.join(", ")}</td>
                  <td className="text-sm text-muted">{relativeTime(m.last_at)}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link to={`/manage/materials?new=${encodeURIComponent(m.query)}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-white"><Plus size={14} /> Add material</Link>
                      <Btn variant="ghost" className="!px-3 !py-1.5 text-sm" onClick={() => dismiss.mutate(m.query)}><Check size={14} /> Dismiss</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
