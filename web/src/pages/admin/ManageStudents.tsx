import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

import { api, type AdminUser } from "../../api";
import Avatar from "../../components/Avatar";
import { useToast } from "../../components/Toast";
import { Btn, ErrorText, Field, Input, Panel } from "../../components/ui";
import { relativeTime } from "../../lib/time";

const AVATARS = ["atom", "flask", "rocket", "magnet", "flame", "bolt", "teacher"];

export default function ManageStudents() {
  const users = useQuery({ queryKey: ["admin", "users"], queryFn: api.admin.users });
  return (
    <div className="flex flex-col gap-4">
      <NewStudent />
      {users.data?.map((u) => <UserRow key={u.id} u={u} />)}
    </div>
  );
}

function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar">
      {AVATARS.map((a) => (
        <button key={a} type="button" role="radio" aria-checked={value === a} onClick={() => onChange(a)}
          className={`rounded-2xl p-0.5 ${value === a ? "ring-3 ring-accent" : "opacity-70 hover:opacity-100"}`}>
          <Avatar avatar={a} size={40} />
        </button>
      ))}
    </div>
  );
}

function NewStudent() {
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ display_name: "", username: "", password: "", avatar: "rocket", grade: "" });
  const create = useMutation({
    mutationFn: () => api.admin.createUser({ ...f, grade: f.grade || null }),
    onSuccess: (u) => {
      toast(`${u.display_name} can now sign in`);
      setF({ display_name: "", username: "", password: "", avatar: "rocket", grade: "" });
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };

  return (
    <Panel>
      <h3 className="mb-3 font-display text-lg font-bold">Add a student</h3>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Display name"><Input required value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} placeholder="e.g. Ketchup King" /></Field>
        <Field label="Username" hint="Lowercase letters, numbers and _ only.">
          <Input required pattern="[a-z0-9_]{2,32}" value={f.username}
            onFocus={() => !f.username && setF((x) => ({ ...x, username: x.display_name.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
            onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase() })} /></Field>
        <Field label="Starting password" hint="At least 4 characters. They can change it later."><Input required minLength={4} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Field label="Grade (optional)"><Input value={f.grade} maxLength={16} onChange={(e) => setF({ ...f, grade: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Avatar"><AvatarPicker value={f.avatar} onChange={(avatar) => setF({ ...f, avatar })} /></Field></div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Btn type="submit" disabled={create.isPending}><Plus size={16} /> Add student</Btn>
          <ErrorText error={create.error} />
        </div>
      </form>
    </Panel>
  );
}

function UserRow({ u }: { u: AdminUser }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(u.display_name);
  const [grade, setGrade] = useState(u.grade ?? "");
  const [avatar, setAvatar] = useState(u.avatar ?? "atom");
  const [pw, setPw] = useState("");
  const done = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["profiles"] }); };

  const save = useMutation({
    mutationFn: () => api.admin.updateUser(u.id, { display_name: name, grade: grade || null, avatar }),
    onSuccess: () => { toast("Saved"); done(); },
  });
  const active = useMutation({
    mutationFn: () => api.admin.updateUser(u.id, { is_active: !u.is_active }),
    onSuccess: () => { toast(u.is_active ? `${u.display_name} can no longer sign in` : `${u.display_name} can sign in again`); done(); },
  });
  const setPassword = useMutation({
    mutationFn: () => api.admin.setPassword(u.id, pw),
    onSuccess: () => { toast(`New password set for ${u.display_name}`); setPw(""); },
  });

  return (
    <Panel className={u.is_active ? "" : "opacity-70"}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Avatar avatar={avatar} size={44} />
        <div className="min-w-0 flex-1">
          <b className="block font-display text-lg">{u.display_name} {u.role === "admin" && <span className="text-xs uppercase tracking-widest text-muted">Admin</span>}</b>
          <span className="text-sm text-muted">@{u.username} · last sign-in {relativeTime(u.last_seen_at).toLowerCase()}{u.is_active ? "" : " · turned off"}</span>
        </div>
        {u.role === "student" && (
          <Btn variant={u.is_active ? "ghost" : "primary"} onClick={() => active.mutate()} disabled={active.isPending}>
            {u.is_active ? "Turn off account" : "Turn back on"}
          </Btn>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_auto]">
        <Field label="Display name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Grade"><Input value={grade} maxLength={16} onChange={(e) => setGrade(e.target.value)} /></Field>
        <div className="flex items-end"><Btn onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}><Save size={16} /> Save</Btn></div>
      </div>
      <div className="mt-3"><Field label="Avatar"><AvatarPicker value={avatar} onChange={setAvatar} /></Field></div>
      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); setPassword.mutate(); }}>
        <div className="min-w-48 flex-1">
          <Field label="Set a new password" hint={u.role === "admin" ? "At least 8 characters." : "At least 4 characters."}>
            <Input value={pw} minLength={u.role === "admin" ? 8 : 4} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        <Btn type="submit" variant="ghost" disabled={!pw || setPassword.isPending} className="mb-5"><KeyRound size={16} /> Set password</Btn>
      </form>
      <ErrorText error={save.error || active.error || setPassword.error} />
    </Panel>
  );
}
