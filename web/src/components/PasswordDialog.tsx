import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { api, type User } from "../api";
import { useToast } from "./Toast";
import { Btn, ErrorText, Field, Input } from "./ui";

export default function PasswordDialog({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const min = user.role === "admin" ? 8 : 4;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); setCurrent(""); setNext(""); setAgain(""); }
    if (!open && d.open) d.close();
  }, [open]);

  const change = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => { toast("Password changed"); onClose(); },
  });
  const mismatch = again.length > 0 && again !== next;

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="pw-title"
      className="m-auto w-[min(420px,calc(100vw-24px))] rounded-3xl bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/50">
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); change.mutate(); }} className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <h2 id="pw-title" className="font-display text-xl font-bold">Change your password</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-surface-2"><X size={18} /></button>
        </div>
        <Field label="Current password"><Input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field label="New password" hint={`At least ${min} characters.`}>
          <Input type="password" required minLength={min} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="New password again">
          <Input type="password" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
        </Field>
        {mismatch && <p className="text-sm text-bad">The two new passwords don't match.</p>}
        <ErrorText error={change.error} />
        <Btn type="submit" disabled={change.isPending || mismatch || !next}>Change password</Btn>
      </form>
    </dialog>
  );
}
