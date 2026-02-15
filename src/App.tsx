import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Moon,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  X,
  Sparkles,
} from "lucide-react";

type ThemeMode = "light" | "dark";
type Gender = "Male" | "Female" | "";
type Page = "library" | "create";
type CreateTab = "overview" | "definition" | "system" | "intro" | "synopsis";

type ProxyConfig = {
  chatUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
};

type Character = {
  id: string;
  name: string;
  gender: Gender;
  imageDataUrl: string;
  age: number | "";
  height: string;
  origins: string;
  racePreset: string;
  race: string;
  personalities: string[];
  uniqueTraits: string[];
  backstory: string[];
  systemRules: string;
  synopsis: string;
  introMessages: string[];
  selectedIntroIndex: number;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "mastercreator_characters_v5";
const IDB_NAME = "mastercreator_db";
const IDB_STORE = "characters";
const THEME_KEY = "mastercreator_theme";
const PROXY_KEY = "mastercreator_proxy";

const DEFAULT_PROXY: ProxyConfig = {
  chatUrl: "https://llm.chutes.ai/v1/chat/completions",
  apiKey: "",
  model: "deepseek-ai/DeepSeek-R1",
  maxTokens: 350,
};

const PERSONALITIES: string[] = [
  "Brave",
  "Cautious",
  "Charming",
  "Stoic",
  "Ambitious",
  "Mischievous",
  "Loyal",
  "Ruthless",
  "Gentle",
  "Protective",
  "Pragmatic",
  "Dreamy",
  "Witty",
  "Blunt",
  "Diplomatic",
  "Rebellious",
  "Rule-abiding",
  "Curious",
  "Analytical",
  "Impulsive",
  "Patient",
  "Confident",
  "Secretive",
  "Open-book",
  "Optimistic",
  "Pessimistic",
];

const RACES: string[] = [
  "Human",
  "Elf",
  "Dwarf",
  "Orc",
  "Goblin",
  "Vampire",
  "Werewolf",
  "Demon",
  "Angel",
  "Fae",
  "Merfolk",
  "Dragonborn",
  "Undead",
  "Other",
];

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function collapseWhitespace(input: any) {
  return String(input ?? "").trim().replace(/\s+/g, " ");
}

function safeParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizeStringArray(v: any): string[] {
  if (Array.isArray(v)) return v.map((x) => collapseWhitespace(x)).filter(Boolean);
  if (typeof v === "string") {
    const s = collapseWhitespace(v);
    return s ? [s] : [];
  }
  return [];
}

function normalizeGender(v: any): Gender {
  const s = collapseWhitespace(v).toLowerCase();
  if (s === "male") return "Male";
  if (s === "female") return "Female";
  return "";
}

function themeVars(mode: ThemeMode): React.CSSProperties {
  if (mode === "light") {
    return {
      colorScheme: "light" as any,
      ["--background" as any]: "40 33% 96%",
      ["--foreground" as any]: "222 10% 14%",
      ["--card" as any]: "40 33% 98%",
      ["--muted" as any]: "40 18% 92%",
      ["--muted-foreground" as any]: "222 8% 40%",
      ["--border" as any]: "40 14% 84%",
      ["--ring" as any]: "44 90% 52%",
      ["--hover-accent" as any]: "44 90% 52%",
      ["--hover-accent-foreground" as any]: "0 0% 0%",
      ["--male" as any]: "205 95% 55%",
      ["--female" as any]: "330 85% 70%",
    };
  }
  return {
    colorScheme: "dark" as any,
    ["--background" as any]: "220 10% 12%",
    ["--foreground" as any]: "40 33% 96%",
    ["--card" as any]: "220 10% 16%",
    ["--muted" as any]: "220 8% 20%",
    ["--muted-foreground" as any]: "220 8% 72%",
    ["--border" as any]: "220 8% 26%",
    ["--ring" as any]: "0 45% 48%",
    ["--hover-accent" as any]: "0 45% 48%",
    ["--hover-accent-foreground" as any]: "40 33% 96%",
    ["--male" as any]: "205 95% 65%",
    ["--female" as any]: "330 85% 78%",
  };
}

function filenameSafe(name: string) {
  return collapseWhitespace(name)
    .split(" ")
    .filter(Boolean)
    .join("_")
    .replace(/[^a-zA-Z0-9_\-]/g, "")
    .slice(0, 80);
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 50);
}

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 50);
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Failed to open database."));
  });
}

async function idbGetAllCharacters(): Promise<Character[]> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const arr = Array.isArray(req.result) ? (req.result as any[]) : [];
      resolve(arr.map(normalizeCharacter).filter(Boolean) as Character[]);
    };
    req.onerror = () => reject(req.error || new Error("Failed to read characters."));
  }).finally(() => db.close());
}

async function idbPutManyCharacters(chars: Character[]): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    for (const c of chars) store.put(c);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to write characters."));
    tx.onabort = () => reject(tx.error || new Error("Write aborted."));
  }).finally(() => db.close());
}

async function idbDeleteCharacter(id: string): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to delete character."));
    tx.onabort = () => reject(tx.error || new Error("Delete aborted."));
  }).finally(() => db.close());
}

async function idbClearCharacters(): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error("Failed to clear characters."));
    tx.onabort = () => reject(tx.error || new Error("Clear aborted."));
  }).finally(() => db.close());
}

function characterToTxt(c: Character) {
  const lines = [
    `# ${c.name || "Character"}`,
    "",
    "## Details",
    `Name: ${c.name || ""}`,
    `Age: ${c.age === "" ? "" : String(c.age)}`,
    `Height: ${c.height || ""}`,
    `Origins: ${c.origins || ""}`,
    `Race: ${c.race || ""}`,
    `Personality: ${(c.personalities || []).join(", ")}`,
    `Unique traits: ${(c.uniqueTraits || []).join(", ")}`,
    "",
    "## Synopsis",
    c.synopsis || "",
    "",
    "## Backstory",
    ...(c.backstory || []).map((b) => `- ${b}`),
    "",
    "## System Rules",
    c.systemRules || "",
    "",
    "## Intro Messages",
    ...(c.introMessages || []).map((m, i) => {
      const mark = i === c.selectedIntroIndex ? "*" : "-";
      return `${mark} Intro ${i + 1}:\n${m || ""}`;
    }),
    "",
  ];
  return lines.join("\n");
}

function normalizeCharacter(x: any): Character | null {
  if (!x || typeof x !== "object") return null;
  if (typeof x.name !== "string") return null;

  const now = new Date().toISOString();

  const introMessages = (() => {
    const arr = normalizeStringArray(x.introMessages);
    if (arr.length) return arr;
    const legacy = collapseWhitespace(x.introMessage);
    return legacy ? [legacy] : [""];
  })();

  const selectedIntroIndex =
    typeof x.selectedIntroIndex === "number" &&
    x.selectedIntroIndex >= 0 &&
    x.selectedIntroIndex < introMessages.length
      ? x.selectedIntroIndex
      : 0;

  const racePresetRaw = typeof x.racePreset === "string" ? x.racePreset : "";
  const raceRaw = typeof x.race === "string" ? x.race : "";
  const racePreset = RACES.includes(racePresetRaw)
    ? racePresetRaw
    : raceRaw && !RACES.includes(raceRaw)
      ? "Other"
      : RACES.includes(raceRaw)
        ? raceRaw
        : "";

  const race =
    racePreset && racePreset !== "Other" ? racePreset : collapseWhitespace(raceRaw);

  return {
    id: typeof x.id === "string" ? x.id : uid(),
    name: collapseWhitespace(x.name),
    gender: normalizeGender(x.gender),
    imageDataUrl: typeof x.imageDataUrl === "string" ? x.imageDataUrl : "",
    age: x.age ?? "",
    height: typeof x.height === "string" ? collapseWhitespace(x.height) : "",
    origins: typeof x.origins === "string" ? collapseWhitespace(x.origins) : "",
    racePreset,
    race,
    personalities: normalizeStringArray(x.personalities ?? x.personality),
    uniqueTraits: normalizeStringArray(x.uniqueTraits),
    backstory: normalizeStringArray(x.backstory),
    systemRules: typeof x.systemRules === "string" ? x.systemRules : "",
    synopsis: typeof x.synopsis === "string" ? x.synopsis : "",
    introMessages: introMessages.length ? introMessages : [""],
    selectedIntroIndex,
    createdAt: typeof x.createdAt === "string" ? x.createdAt : now,
    updatedAt: typeof x.updatedAt === "string" ? x.updatedAt : now,
  };
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[hsl(var(--border))] px-2.5 py-1 text-xs font-medium",
        className
      )}
    >
      {children}
    </span>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
        props.className
      )}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
        props.className
      )}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
        props.className
      )}
    >
      {props.children}
    </select>
  );
}

function Button({
  children,
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const base =
    "clickable inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:cursor-not-allowed";

  const v =
    variant === "primary"
      ? "border-transparent bg-[hsl(var(--hover-accent))] text-[hsl(var(--hover-accent-foreground))]"
      : variant === "danger"
        ? "border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(0_75%_45%)] hover:text-white"
        : "border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))]";

  return (
    <button {...props} className={cn(base, v, className)}>
      {children}
    </button>
  );
}

function Modal({
  open,
  onClose,
  children,
  title,
  widthClass = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  widthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onMouseDown={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            "w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl",
            widthClass
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-4">
            <div className="text-sm font-semibold">{title || ""}</div>
            <button
              className="clickable rounded-xl border border-[hsl(var(--border))] p-2"
              onClick={onClose}
              aria-label="Close"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function clampIndex(i: number, len: number) {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

function runTests() {
  const c0 = normalizeCharacter({ name: "A", personalities: undefined, introMessages: undefined });
  if (!c0) throw new Error("normalizeCharacter should return a character");
  if (!Array.isArray(c0.personalities)) throw new Error("personalities should be array");
  if (!Array.isArray(c0.introMessages) || c0.introMessages.length < 1) throw new Error("introMessages should default");
  const t = characterToTxt({
    ...c0,
    id: "1",
    name: "A",
    gender: "Male",
    imageDataUrl: "",
    age: "",
    height: "",
    origins: "",
    racePreset: "",
    race: "",
    personalities: ["Brave"],
    uniqueTraits: ["Scar"],
    backstory: ["Born in the rain"],
    systemRules: "No OOC",
    synopsis: "A hunter.",
    introMessages: ["Hello", "Hi"],
    selectedIntroIndex: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!t.includes("# A")) throw new Error("TXT export header missing");
  if (!t.includes("Personality: Brave")) throw new Error("TXT export personality missing");
  if (!t.includes("* Intro 2:")) throw new Error("TXT export selected intro marker missing");
}

export default function CharacterCreatorApp() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [page, setPage] = useState<Page>("library");
  const [tab, setTab] = useState<CreateTab>("overview");

  const [characters, setCharacters] = useState<Character[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [proxyOpen, setProxyOpen] = useState(false);
  const [proxyChatUrl, setProxyChatUrl] = useState(DEFAULT_PROXY.chatUrl);
  const [proxyApiKey, setProxyApiKey] = useState(DEFAULT_PROXY.apiKey);
  const [proxyModel, setProxyModel] = useState(DEFAULT_PROXY.model);
  const [proxyMaxTokens, setProxyMaxTokens] = useState(DEFAULT_PROXY.maxTokens);

  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [age, setAge] = useState<number | "">("");
  const [height, setHeight] = useState("");
  const [origins, setOrigins] = useState("");

  const [racePreset, setRacePreset] = useState("");
  const [customRace, setCustomRace] = useState("");

  const [personalitySearch, setPersonalitySearch] = useState("");
  const [personalityPick, setPersonalityPick] = useState("");
  const [personalityCustom, setPersonalityCustom] = useState("");
  const [personalities, setPersonalities] = useState<string[]>([]);

  const [traitInput, setTraitInput] = useState("");
  const [traits, setTraits] = useState<string[]>([]);

  const [backstoryInput, setBackstoryInput] = useState("");
  const [backstory, setBackstory] = useState<string[]>([]);

  const [systemRules, setSystemRules] = useState("");
  const [synopsis, setSynopsis] = useState("");

  const [introMessages, setIntroMessages] = useState<string[]>([""]);
  const [introIndex, setIntroIndex] = useState(0);
  const [introPrompt, setIntroPrompt] = useState("");

  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const imageFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const isTest =
      typeof process !== "undefined" &&
      !!(process as any)?.env &&
      (process as any).env.NODE_ENV === "test";
    if (isTest) runTests();
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);

    const savedProxy = safeParseJSON(localStorage.getItem(PROXY_KEY) || "");
    if (savedProxy && typeof savedProxy === "object") {
      if (typeof (savedProxy as any).chatUrl === "string") setProxyChatUrl((savedProxy as any).chatUrl);
      if (typeof (savedProxy as any).apiKey === "string") setProxyApiKey((savedProxy as any).apiKey);
      if (typeof (savedProxy as any).model === "string") setProxyModel((savedProxy as any).model);
      const mt = Number((savedProxy as any).maxTokens);
      if (Number.isFinite(mt) && mt > 0) setProxyMaxTokens(Math.floor(mt));
    }

    (async () => {
      try {
        const fromIdb = await idbGetAllCharacters();
        if (fromIdb.length) {
          setCharacters(fromIdb);
          setHydrated(true);
          return;
        }

        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = safeParseJSON(raw);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map(normalizeCharacter).filter(Boolean) as Character[];
            setCharacters(normalized);
            try {
              await idbPutManyCharacters(normalized);
              localStorage.removeItem(STORAGE_KEY);
            } catch {}
          }
        }
        setHydrated(true);
      } catch (e: any) {
        setStorageError(e?.message ? String(e.message) : "Failed to load saved data.");
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      PROXY_KEY,
      JSON.stringify({
        chatUrl: proxyChatUrl,
        apiKey: proxyApiKey,
        model: proxyModel,
        maxTokens: proxyMaxTokens,
      })
    );
  }, [proxyChatUrl, proxyApiKey, proxyModel, proxyMaxTokens]);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        await idbPutManyCharacters(characters);
        setStorageError(null);
      } catch (e: any) {
        setStorageError(e?.message ? String(e.message) : "Failed to save data.");
      }
    })();
  }, [characters, hydrated]);

  const selected = useMemo(
    () => characters.find((c) => c.id === selectedId) || null,
    [characters, selectedId]
  );

  const previewChar = useMemo(
    () => characters.find((c) => c.id === previewId) || null,
    [characters, previewId]
  );

  const filteredCharacters = useMemo(() => {
    const q = collapseWhitespace(query).toLowerCase();
    if (!q) return characters;
    return characters.filter((c) => {
      const blob = [
        c.name,
        c.gender,
        String(c.age ?? ""),
        c.height,
        c.origins,
        c.race,
        ...(c.personalities || []),
        ...(c.uniqueTraits || []),
        ...(c.backstory || []),
        ...(c.introMessages || []),
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [characters, query]);

  const filteredPersonalities = useMemo(() => {
    const q = collapseWhitespace(personalitySearch).toLowerCase();
    if (!q) return PERSONALITIES;
    return PERSONALITIES.filter((p) => p.toLowerCase().includes(q));
  }, [personalitySearch]);

  function genderColorClass(g: Gender) {
    if (g === "Male") return "text-[hsl(var(--male))]";
    if (g === "Female") return "text-[hsl(var(--female))]";
    return "text-[hsl(var(--muted-foreground))]";
  }

  function resetForm() {
    setSelectedId(null);
    setTab("overview");

    setImageDataUrl("");
    setImageError(null);

    setName("");
    setGender("");
    setAge("");
    setHeight("");
    setOrigins("");

    setRacePreset("");
    setCustomRace("");

    setPersonalitySearch("");
    setPersonalityPick("");
    setPersonalityCustom("");
    setPersonalities([]);

    setTraitInput("");
    setTraits([]);

    setBackstoryInput("");
    setBackstory([]);

    setSystemRules("");
    setSynopsis("");

    setIntroMessages([""]);
    setIntroIndex(0);
    setIntroPrompt("");

    setGenError(null);
    setGenLoading(false);
  }

  function addToList(
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    after?: () => void
  ) {
    const clean = collapseWhitespace(value);
    if (!clean) return;
    if (list.some((x) => x.toLowerCase() === clean.toLowerCase())) {
      after?.();
      return;
    }
    setList((prev) => [...prev, clean]);
    after?.();
  }

  function removeFromList(
    value: string,
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setList((prev) => prev.filter((x) => x !== value));
  }

  function addTrait() {
    addToList(traitInput, traits, setTraits, () => setTraitInput(""));
  }

  function onEnterAdd(e: React.KeyboardEvent, fn: () => void) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    fn();
  }

  function addPersonalityPick() {
    addToList(personalityPick, personalities, setPersonalities, () =>
      setPersonalityPick("")
    );
  }

  function addPersonalityCustom() {
    addToList(personalityCustom, personalities, setPersonalities, () =>
      setPersonalityCustom("")
    );
  }

  function addBackstoryEntry() {
    const b = collapseWhitespace(backstoryInput);
    if (!b) return;
    setBackstory((prev) => [...prev, b]);
    setBackstoryInput("");
  }

  function removeBackstoryEntry(idx: number) {
    setBackstory((prev) => prev.filter((_, i) => i !== idx));
  }

  function getFinalRace() {
    return racePreset && racePreset !== "Other"
      ? racePreset
      : collapseWhitespace(customRace);
  }

  function validate(): string | null {
    if (!collapseWhitespace(name)) return "Name is required.";
    if (age !== "" && (Number.isNaN(Number(age)) || Number(age) < 0))
      return "Age must be a positive number.";
    if (racePreset === "Other" && !collapseWhitespace(customRace))
      return "Please enter a custom race.";
    return null;
  }

  function getDraftCharacter(): Character | null {
    const cleanName = collapseWhitespace(name);
    if (!cleanName) return null;

    const now = new Date().toISOString();
    const finalRace = getFinalRace();

    const baseIntro = introMessages.length ? introMessages : [""];
    const safeIntroIndex = clampIndex(introIndex, Math.max(1, baseIntro.length));

    const base: Omit<Character, "id" | "createdAt" | "updatedAt"> = {
      name: cleanName,
      gender,
      imageDataUrl,
      age,
      height: collapseWhitespace(height),
      origins: collapseWhitespace(origins),
      racePreset: racePreset || (finalRace ? "Other" : ""),
      race: finalRace,
      personalities: Array.isArray(personalities) ? personalities : [],
      uniqueTraits: Array.isArray(traits) ? traits : [],
      backstory: Array.isArray(backstory) ? backstory : [],
      systemRules,
      synopsis,
      introMessages: baseIntro,
      selectedIntroIndex: safeIntroIndex,
    };

    if (selected && selectedId) {
      return { ...selected, ...base, updatedAt: now };
    }

    return {
      id: uid(),
      ...base,
      createdAt: now,
      updatedAt: now,
    };
  }

  function saveCharacter() {
    const err = validate();
    if (err) return alert(err);
    const draft = getDraftCharacter();
    if (!draft) return;

    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === draft.id);
      if (exists) return prev.map((c) => (c.id === draft.id ? draft : c));
      return [draft, ...prev];
    });

    setSelectedId(draft.id);
    setPage("library");
  }

  function deleteCharacter(id: string) {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (previewId === id) setPreviewId(null);
    idbDeleteCharacter(id).catch(() => {});
  }

  async function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsDataURL(file);
    });
  }

  async function handlePickImage(file: File) {
    setImageError(null);
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setImageError("Image is too large. Max size is 10MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Please upload an image file.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setImageDataUrl(dataUrl);
    } catch (e: any) {
      setImageError(e?.message ? String(e.message) : "Failed to load image.");
    }
  }

  function exportAll() {
    downloadJSON(
      "characters_" + new Date().toISOString().slice(0, 10) + ".json",
      characters
    );
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const parsed = safeParseJSON(text);
    if (!Array.isArray(parsed)) return alert("Invalid file. Import a JSON export from this app.");

    const cleaned: Character[] = parsed.map(normalizeCharacter).filter(Boolean) as Character[];

    setCharacters((prev) => {
      const map = new Map<string, Character>();
      for (const c of prev) map.set(c.id, c);
      for (const c of cleaned) map.set(c.id, c);
      return Array.from(map.values()).sort((a, b) =>
        (b.updatedAt || "").localeCompare(a.updatedAt || "")
      );
    });

    try {
      await idbPutManyCharacters(cleaned);
    } catch {}

    setPage("library");
  }

  function loadCharacterIntoForm(c: Character) {
    setSelectedId(c.id);

    setImageDataUrl(c.imageDataUrl || "");
    setImageError(null);

    setName(c.name || "");
    setGender(c.gender || "");
    setAge(c.age ?? "");
    setHeight(c.height || "");
    setOrigins(c.origins || "");

    const preset = c.racePreset || "";
    setRacePreset(preset);
    setCustomRace(preset === "Other" ? c.race || "" : "");

    setPersonalities(Array.isArray(c.personalities) ? c.personalities : []);
    setTraits(Array.isArray(c.uniqueTraits) ? c.uniqueTraits : []);
    setBackstory(Array.isArray(c.backstory) ? c.backstory : []);

    setSystemRules(c.systemRules || "");
    setSynopsis(c.synopsis || "");

    const im =
      Array.isArray(c.introMessages) && c.introMessages.length
        ? c.introMessages
        : [""];
    setIntroMessages(im);
    setIntroIndex(clampIndex(c.selectedIntroIndex ?? 0, im.length));
    setIntroPrompt("");

    setGenError(null);
    setGenLoading(false);

    setPage("create");
    setTab("overview");
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  function getCharacterSummaryForLLM() {
    return [
      `Name: ${collapseWhitespace(name) || "(unnamed)"}`,
      `Gender: ${gender || ""}`,
      `Age: ${age === "" ? "" : String(age)}`,
      `Height: ${collapseWhitespace(height)}`,
      `Origins: ${collapseWhitespace(origins)}`,
      `Race: ${getFinalRace()}`,
      `Personalities: ${(personalities || []).join(", ")}`,
      `Unique traits: ${(traits || []).join(", ")}`,
      `Backstory: ${(backstory || []).join(" | ")}`,
      `System rules: ${collapseWhitespace(systemRules)}`,
      `Synopsis: ${collapseWhitespace(synopsis)}`,
    ].join("\n");
  }

  async function callProxyChatCompletion(args: {
    system: string;
    user: string;
    maxTokens?: number;
    temperature?: number;
  }) {
    const chatUrl = collapseWhitespace(proxyChatUrl);
    const apiKey = collapseWhitespace(proxyApiKey);
    const model = collapseWhitespace(proxyModel);

    if (!chatUrl) throw new Error("Please set a Chat Completion URL in Proxy.");
    if (!apiKey) throw new Error("Please set an API key in Proxy.");
    if (!model) throw new Error("Please set a model name in Proxy.");

    const res = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        temperature: args.temperature ?? 0.9,
        max_tokens: args.maxTokens ?? proxyMaxTokens,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}). ${text}`);
    }

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "";
    const clean = String(content ?? "").trim();
    if (!clean) throw new Error("No text returned by the model.");
    return clean;
  }

  async function generateSelectedIntro() {
    setGenError(null);
    const userPrompt = collapseWhitespace(introPrompt);
    if (!userPrompt) {
      setGenError("Please write a prompt for the intro message.");
      return;
    }

    const system =
      "You write an INTRO MESSAGE for a roleplay character. Write a compelling opening message that starts the roleplay immediately. Keep it in-character, vivid, and usable as the first message. Do not add explanations or meta commentary.";

    const user = `Character info:\n${getCharacterSummaryForLLM()}\n\nUser prompt:\n${userPrompt}\n\nReturn ONLY the intro message text.`;

    setGenLoading(true);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        temperature: 0.95,
      });
      setIntroMessages((prev) => {
        const base = prev.length ? [...prev] : [""];
        const i = clampIndex(introIndex, base.length);
        base[i] = text;
        return base;
      });
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function generateSynopsis() {
    setGenError(null);

    const system =
      "You are a creative editor generating a SYNOPSIS for a roleplay character sheet. The synopsis must be hooky, cinematic, and invite roleplay. Write 3–6 sentences. Include (subtly) a core desire, a flaw, and a tension/stake. Avoid lists, avoid headings, avoid quotes. Do not mention that you are an AI. Return ONLY the synopsis.";

    const user = `Character info:\n${getCharacterSummaryForLLM()}\n\nWrite the synopsis now.`;

    setGenLoading(true);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        maxTokens: Math.min(220, Math.max(64, proxyMaxTokens)),
        temperature: 0.9,
      });
      setSynopsis(text);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  function addNewIntro() {
    setIntroMessages((prev) => {
      const next = prev.length ? [...prev] : [""];
      next.push("");
      return next;
    });
    setIntroIndex((prev) => prev + 1);
  }

  useEffect(() => {
    setIntroIndex((i) => clampIndex(i, Math.max(1, introMessages.length)));
  }, [introMessages.length]);

  const draft = getDraftCharacter();

  const tabs: Array<{ id: CreateTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "definition", label: "Definition" },
    { id: "system", label: "System Rules" },
    { id: "intro", label: "Intro Message" },
    { id: "synopsis", label: "Synopsis" },
  ];

  return (
    <div
      className="min-h-screen w-full bg-[hsl(var(--background))] p-4 text-[hsl(var(--foreground))] md:p-8"
      style={themeVars(theme)}
    >
      <style>{`
        html, body, #root {
          height: 100%;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        body {
          margin: 0;
        }
        .clickable:hover {
          background-color: hsl(var(--hover-accent)) !important;
          color: hsl(var(--hover-accent-foreground)) !important;
          border-color: hsl(var(--hover-accent)) !important;
        }
        .clickable:hover svg {
          color: hsl(var(--hover-accent-foreground)) !important;
        }
        input:hover, textarea:hover, select:hover {
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
        }
      `}</style>

      <div className="mx-auto max-w-7xl">
        {storageError ? (
          <div className="mt-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm">
            <div className="font-semibold">Storage issue</div>
            <div className="mt-1 text-[hsl(var(--muted-foreground))]">{storageError}</div>
          </div>
        ) : null}
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Mastercreator</h1>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setProxyOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Proxy
            </Button>
            <Button
              variant="secondary"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {theme === "light" ? "Dark" : "Light"}
            </Button>
            <Button variant="secondary" onClick={exportAll}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Import
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImportFile(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </header>

        {page === "library" ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search characters…"
                  className="pl-9"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={() => {
                    resetForm();
                    setPage("create");
                    setTab("overview");
                  }}
                >
                  <Plus className="h-4 w-4" /> Create
                </Button>
              </div>
            </div>

            {filteredCharacters.length === 0 ? (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-sm text-[hsl(var(--muted-foreground))]">
                {characters.length === 0
                  ? "No characters yet. Click Create to make your first one."
                  : "No matches for your search."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredCharacters.map((c) => (
                  <button
                    key={c.id}
                    className={cn(
                      "clickable group relative overflow-hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left shadow-sm",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                    )}
                    onClick={() => setPreviewId(c.id)}
                    type="button"
                  >
                    <div className="relative aspect-[3/4] w-full">
                      {c.imageDataUrl ? (
                        <img
                          src={c.imageDataUrl}
                          alt={c.name}
                          className="absolute inset-0 h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          <span className="text-sm">No image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(var(--card))]" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-[hsl(var(--foreground))]">
                              {c.name}
                            </div>
                            <div className={cn("text-sm", genderColorClass(c.gender))}>
                              {c.gender || "—"}
                            </div>
                          </div>
                          {c.race ? <Badge className="shrink-0">{c.race}</Badge> : null}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setPage("library")}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  {selectedId ? "Editing" : "Creating"}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!draft) return alert("Please enter a character name before exporting.");
                    downloadText(
                      (filenameSafe(draft.name) || "character") + ".txt",
                      characterToTxt(draft)
                    );
                  }}
                >
                  <Download className="h-4 w-4" /> Export TXT
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!draft) return alert("Please enter a character name before exporting.");
                    downloadJSON(
                      (filenameSafe(draft.name) || "character") + ".json",
                      draft
                    );
                  }}
                >
                  <Download className="h-4 w-4" /> Export JSON
                </Button>
                <Button variant="primary" onClick={saveCharacter}>
                  <Plus className="h-4 w-4" /> {selectedId ? "Update" : "Save"}
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={cn(
                    "clickable rounded-xl border px-3 py-2 text-sm font-medium",
                    tab === t.id
                      ? "border-[hsl(var(--hover-accent))]"
                      : "border-[hsl(var(--border))]"
                  )}
                  onClick={() => setTab(t.id)}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm lg:col-span-3">
                <div className="space-y-6 p-5 md:p-6">
                  {tab === "overview" ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <div className="text-lg font-semibold">Overview</div>
                        <div className="text-sm text-[hsl(var(--muted-foreground))]">
                          Upload an image (max 10MB) and fill the essentials.
                        </div>
                      </div>

                      <div className="space-y-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">Character image</div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))]">
                              Stored locally.
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="secondary"
                              type="button"
                              onClick={() => imageFileRef.current?.click()}
                            >
                              Upload
                            </Button>
                            <Button
                              variant="secondary"
                              type="button"
                              onClick={() => {
                                setImageDataUrl("");
                                setImageError(null);
                              }}
                              disabled={!imageDataUrl}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                        <input
                          ref={imageFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePickImage(f);
                            e.currentTarget.value = "";
                          }}
                        />
                        {imageError ? (
                          <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3 text-sm">
                            {imageError}
                          </div>
                        ) : null}
                        {imageDataUrl ? (
                          <div className="relative w-full overflow-hidden rounded-2xl border border-[hsl(var(--border))] aspect-[3/4]">
                            <img
                              src={imageDataUrl}
                              alt="Character"
                              className="absolute inset-0 h-full w-full object-cover object-top"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))]">
                            No image yet
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Name</div>
                          <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Character name"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Gender</div>
                          <Select
                            value={gender}
                            onChange={(e) => setGender(e.target.value as Gender)}
                          >
                            <option value="">—</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Age</div>
                          <Input
                            value={age}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "") return setAge("");
                              const n = Number(v);
                              if (Number.isFinite(n)) setAge(n);
                            }}
                            placeholder="e.g., 23"
                            inputMode="numeric"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Height</div>
                          <Input
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="e.g., 175 cm"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <div className="text-sm font-medium">Origins (place of birth)</div>
                          <Input
                            value={origins}
                            onChange={(e) => setOrigins(e.target.value)}
                            placeholder="Where are they from?"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Race</div>
                          <Select
                            value={racePreset}
                            onChange={(e) => {
                              const v = e.target.value;
                              setRacePreset(v);
                              if (v !== "Other") setCustomRace("");
                            }}
                          >
                            <option value="">—</option>
                            {RACES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Custom race</div>
                          <Input
                            value={customRace}
                            onChange={(e) => setCustomRace(e.target.value)}
                            placeholder={racePreset === "Other" ? "Type your race" : "(choose Other)"}
                            disabled={racePreset !== "Other"}
                          />
                        </div>
                      </div>

                      <div className="h-px w-full bg-[hsl(var(--border))]" />

                      <div className="space-y-3">
                        <div className="text-sm font-medium">Personalities</div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Input
                              value={personalitySearch}
                              onChange={(e) => setPersonalitySearch(e.target.value)}
                              placeholder="Search personalities…"
                            />
                            <Select
                              value={personalityPick}
                              onChange={(e) => setPersonalityPick(e.target.value)}
                              onKeyDown={(e) => onEnterAdd(e, addPersonalityPick)}
                            >
                              <option value="">Pick one…</option>
                              {filteredPersonalities.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </Select>
                            <Button
                              variant="secondary"
                              type="button"
                              onClick={addPersonalityPick}
                              disabled={!collapseWhitespace(personalityPick)}
                            >
                              Add
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Input
                              value={personalityCustom}
                              onChange={(e) => setPersonalityCustom(e.target.value)}
                              onKeyDown={(e) => onEnterAdd(e, addPersonalityCustom)}
                              placeholder="Custom personality…"
                            />
                            <Button
                              variant="secondary"
                              type="button"
                              onClick={addPersonalityCustom}
                              disabled={!collapseWhitespace(personalityCustom)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {personalities.length ? (
                            personalities.map((p) => (
                              <button
                                key={p}
                                className="clickable rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs font-medium"
                                onClick={() => removeFromList(p, setPersonalities)}
                                type="button"
                              >
                                {p} <span className="opacity-70">×</span>
                              </button>
                            ))
                          ) : (
                            <div className="text-sm text-[hsl(var(--muted-foreground))]">No personalities yet.</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium">Unique traits</div>
                        <div className="flex gap-2">
                          <Input
                            value={traitInput}
                            onChange={(e) => setTraitInput(e.target.value)}
                            onKeyDown={(e) => onEnterAdd(e, addTrait)}
                            placeholder="Type a trait…"
                          />
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={addTrait}
                            disabled={!collapseWhitespace(traitInput)}
                          >
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {traits.length ? (
                            traits.map((t) => (
                              <button
                                key={t}
                                className="clickable rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs font-medium"
                                onClick={() => removeFromList(t, setTraits)}
                                type="button"
                              >
                                {t} <span className="opacity-70">×</span>
                              </button>
                            ))
                          ) : (
                            <div className="text-sm text-[hsl(var(--muted-foreground))]">No traits yet.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "definition" ? (
                    <div className="space-y-4">
                      <div className="text-lg font-semibold">Definition</div>
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">Backstory entries become a list.</div>
                      <div className="flex gap-2">
                        <Input
                          value={backstoryInput}
                          onChange={(e) => setBackstoryInput(e.target.value)}
                          onKeyDown={(e) => onEnterAdd(e, addBackstoryEntry)}
                          placeholder="Add a backstory entry…"
                        />
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={addBackstoryEntry}
                          disabled={!collapseWhitespace(backstoryInput)}
                        >
                          Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {backstory.length ? (
                          backstory.map((b, i) => (
                            <div
                              key={b + i}
                              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="whitespace-pre-wrap text-sm">{b}</div>
                                <button
                                  className="clickable rounded-xl border border-[hsl(var(--border))] p-2"
                                  onClick={() => removeBackstoryEntry(i)}
                                  type="button"
                                  aria-label="Remove"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-[hsl(var(--muted-foreground))]">No backstory entries yet.</div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {tab === "system" ? (
                    <div className="space-y-4">
                      <div className="text-lg font-semibold">System Rules</div>
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        Write rules to guide the roleplay (OOC/context commands, etc.).
                      </div>
                      <Textarea
                        value={systemRules}
                        onChange={(e) => setSystemRules(e.target.value)}
                        rows={10}
                        placeholder="System rules…"
                      />
                    </div>
                  ) : null}

                  {tab === "intro" ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">Intro Message</div>
                          <div className="text-sm text-[hsl(var(--muted-foreground))]">
                            Create multiple intros and switch between them.
                          </div>
                        </div>
                        <Button variant="secondary" type="button" onClick={addNewIntro}>
                          <Plus className="h-4 w-4" /> New
                        </Button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() =>
                            setIntroIndex((i) =>
                              clampIndex(i - 1, Math.max(1, introMessages.length))
                            )
                          }
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-sm">
                          Intro <span className="font-semibold">{introIndex + 1}</span> / {Math.max(1, introMessages.length)}
                        </div>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() =>
                            setIntroIndex((i) =>
                              clampIndex(i + 1, Math.max(1, introMessages.length))
                            )
                          }
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={
                          introMessages[
                            clampIndex(introIndex, Math.max(1, introMessages.length))
                          ] || ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setIntroMessages((prev) => {
                            const base = prev.length ? [...prev] : [""];
                            const i = clampIndex(introIndex, base.length);
                            base[i] = v;
                            return base;
                          });
                        }}
                        rows={9}
                        placeholder="Write the opening message…"
                      />

                      <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                        <div className="text-sm font-medium">Generate with Proxy</div>
                        <Textarea
                          value={introPrompt}
                          onChange={(e) => setIntroPrompt(e.target.value)}
                          rows={4}
                          placeholder="Prompt for the model…"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            variant="primary"
                            type="button"
                            onClick={generateSelectedIntro}
                            disabled={genLoading}
                          >
                            <Sparkles className="h-4 w-4" /> {genLoading ? "Generating…" : "Generate"}
                          </Button>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            Only affects the selected intro.
                          </div>
                        </div>
                        {genError ? (
                          <div className="text-sm text-[hsl(0_75%_55%)]">{genError}</div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {tab === "synopsis" ? (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-semibold">Synopsis</div>
                          <div className="text-sm text-[hsl(var(--muted-foreground))]">
                            Write it yourself or generate a hooky synopsis.
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          type="button"
                          onClick={generateSynopsis}
                          disabled={genLoading}
                        >
                          <Sparkles className="h-4 w-4" /> {genLoading ? "Generating…" : "Generate"}
                        </Button>
                      </div>
                      <Textarea
                        value={synopsis}
                        onChange={(e) => setSynopsis(e.target.value)}
                        rows={10}
                        placeholder="Synopsis…"
                      />
                      {genError ? (
                        <div className="text-sm text-[hsl(0_75%_55%)]">{genError}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm lg:col-span-2">
                <div className="space-y-4 p-5 md:p-6">
                  <div className="text-lg font-semibold">Preview</div>
                  <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold">{collapseWhitespace(name) || "(unnamed)"}</div>
                        <div className={cn("text-sm", genderColorClass(gender))}>{gender || "—"}</div>
                      </div>
                      {getFinalRace() ? <Badge>{getFinalRace()}</Badge> : null}
                    </div>
                    {imageDataUrl ? (
                      <div className="relative w-full overflow-hidden rounded-2xl border border-[hsl(var(--border))] aspect-[3/4]">
                        <img
                          src={imageDataUrl}
                          alt="Preview"
                          className="absolute inset-0 h-full w-full object-cover object-top"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))]">
                        No image
                      </div>
                    )}
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">Saved locally in your browser.</div>
                    <div className="flex flex-wrap gap-2">
                      {(personalities || []).slice(0, 6).map((p) => (
                        <Badge key={p}>{p}</Badge>
                      ))}
                      {personalities.length > 6 ? (
                        <Badge>+{personalities.length - 6}</Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        if (!draft) return alert("Enter a character name first.");
                        downloadText(
                          (filenameSafe(draft.name) || "character") + ".txt",
                          characterToTxt(draft)
                        );
                      }}
                    >
                      <Download className="h-4 w-4" /> Export TXT
                    </Button>
                    <Button variant="primary" type="button" onClick={saveCharacter}>
                      <Plus className="h-4 w-4" /> Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <Modal open={proxyOpen} onClose={() => setProxyOpen(false)} title="Proxy" widthClass="max-w-xl">
          <div className="space-y-4">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              You can type any OpenAI-compatible Chat Completions URL (Chutes, OpenRouter, etc.).
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Chat completion URL</div>
              <Input
                value={proxyChatUrl}
                onChange={(e) => setProxyChatUrl(e.target.value)}
                placeholder="https://…/v1/chat/completions"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Proxy API key</div>
              <Input
                value={proxyApiKey}
                onChange={(e) => setProxyApiKey(e.target.value)}
                placeholder="Bearer token"
                type="password"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Model name</div>
              <Input
                value={proxyModel}
                onChange={(e) => setProxyModel(e.target.value)}
                placeholder="e.g., gpt-4.1-mini"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Max tokens</div>
              <Input
                value={String(proxyMaxTokens)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") return;
                  const n = Math.floor(Number(v));
                  if (Number.isFinite(n) && n > 0) setProxyMaxTokens(n);
                }}
                placeholder="e.g., 800"
                inputMode="numeric"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setProxyOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>

        <Modal open={!!previewChar} onClose={() => setPreviewId(null)} title="Character" widthClass="max-w-3xl">
          {previewChar ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  {previewChar.imageDataUrl ? (
                    <div className="relative w-full overflow-hidden rounded-2xl border border-[hsl(var(--border))] aspect-[3/4]">
                      <img
                        src={previewChar.imageDataUrl}
                        alt={previewChar.name}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-sm text-[hsl(var(--muted-foreground))]">
                      No image
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xl font-semibold">{previewChar.name}</div>
                    <div className={cn("text-sm", genderColorClass(previewChar.gender))}>
                      {previewChar.gender || "—"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {previewChar.race ? <Badge>{previewChar.race}</Badge> : null}
                    {previewChar.origins ? <Badge>{previewChar.origins}</Badge> : null}
                    {previewChar.height ? <Badge>{previewChar.height}</Badge> : null}
                    {previewChar.age !== "" ? <Badge>{String(previewChar.age)}</Badge> : null}
                  </div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">{previewChar.synopsis || ""}</div>
                  <div className="flex flex-wrap gap-2">
                    {(previewChar.personalities || []).slice(0, 10).map((p) => (
                      <Badge key={p}>{p}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                  Updated {new Date(previewChar.updatedAt).toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      downloadText(
                        (filenameSafe(previewChar.name) || "character") + ".txt",
                        characterToTxt(previewChar)
                      );
                    }}
                  >
                    <Download className="h-4 w-4" /> TXT
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setPreviewId(null);
                      loadCharacterIntoForm(previewChar);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      const ok = window.confirm(`Delete ${previewChar.name}?`);
                      if (ok) deleteCharacter(previewChar.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Modal>

        <div className="pointer-events-none fixed bottom-4 right-4 text-xs text-[hsl(var(--muted-foreground))]">
          © {new Date().getFullYear()} Sancte™. All rights reserved.
        </div>
      </div>
    </div>
  );
}
