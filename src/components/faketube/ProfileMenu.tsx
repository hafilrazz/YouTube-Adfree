import { useEffect, useRef, useState } from "react";
import { User, Check, Plus, Pencil, Trash2, X, Camera, Moon, Sun } from "lucide-react";
import { useProfiles, MAX_PROFILES, type Profile } from "@/lib/profiles";
import { useTheme } from "@/lib/use-theme";

function Avatar({ profile, size = 32 }: { profile: Profile | undefined; size?: number }) {
  const s = { width: size, height: size };
  if (profile?.photo) {
    return <img src={profile.photo} alt={profile.name} style={s} className="rounded-full object-cover" />;
  }
  const letter = profile?.name?.[0]?.toUpperCase() ?? "?";
  return (
    <div
      style={s}
      className="rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-semibold"
    >
      {letter === "?" ? <User className="h-4 w-4" /> : <span className="text-sm">{letter}</span>}
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  // Downscale to keep localStorage small
  const img = document.createElement("img");
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  img.src = src;
  await new Promise((r) => (img.onload = r));
  const max = 192;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ProfileMenu() {
  const { profiles, active, addProfile, updateProfile, removeProfile, switchProfile } = useProfiles();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | "new" | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <button onClick={() => setOpen((v) => !v)} className="rounded-full" aria-label="Profile">
        <Avatar profile={active} size={32} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-neutral-200 flex items-center gap-3">
            <Avatar profile={active} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{active?.name}</p>
              <p className="text-xs text-neutral-500">Active profile</p>
            </div>
            <button
              onClick={() => setEditing(active!)}
              className="p-1.5 rounded-full hover:bg-neutral-100"
              aria-label="Edit profile"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>
          <div className="py-1 max-h-64 overflow-y-auto">
            <p className="px-3 py-1.5 text-xs text-neutral-500">Switch profile</p>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  switchProfile(p.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 text-left"
              >
                <Avatar profile={p} size={28} />
                <span className="flex-1 text-sm truncate">{p.name}</span>
                {p.id === active?.id && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))}
          </div>
          <div className="border-t border-neutral-200 p-2">
            <button
              disabled={profiles.length >= MAX_PROFILES}
              onClick={() => setEditing("new")}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Plus className="h-4 w-4" />
              Add profile ({profiles.length}/{MAX_PROFILES})
            </button>
          </div>
        </div>
      )}
      {editing && (
        <ProfileEditor
          profile={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(name, photo) => {
            if (editing === "new") addProfile(name, photo);
            else updateProfile(editing.id, { name, photo });
            setEditing(null);
          }}
          onDelete={
            editing !== "new" && profiles.length > 1
              ? () => {
                  removeProfile((editing as Profile).id);
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function ProfileEditor({
  profile,
  onClose,
  onSave,
  onDelete,
}: {
  profile: Profile | null;
  onClose: () => void;
  onSave: (name: string, photo: string | null) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [photo, setPhoto] = useState<string | null>(profile?.photo ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{profile ? "Edit profile" : "New profile"}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 mb-4">
          <div className="relative">
            {photo ? (
              <img src={photo} alt="" className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-3xl font-semibold">
                {(name[0] || "?").toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-lg hover:bg-neutral-700"
              aria-label="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(await fileToDataUrl(f));
            }}
          />
          {photo && (
            <button onClick={() => setPhoto(null)} className="text-xs text-neutral-500 hover:text-neutral-900">
              Remove photo
            </button>
          )}
        </div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="Your name"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <div className="flex items-center gap-2 mt-5">
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-lg text-red-600 hover:bg-red-50"
              aria-label="Delete profile"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm hover:bg-neutral-100">
            Cancel
          </button>
          <button
            onClick={() => onSave(name.trim() || "New profile", photo)}
            className="px-4 py-2 rounded-lg text-sm bg-neutral-900 text-white hover:bg-neutral-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
