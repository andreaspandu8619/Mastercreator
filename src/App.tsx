import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  Moon,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sun,
  Trash2,
  MessageCircle,
  BookOpen,
  Library,
  UserRound,
  Upload,
  X,
  Sparkles,
} from "lucide-react";

type ThemeMode = "light" | "dark";
type Gender = "Male" | "Female" | "";
type Page = "library" | "create" | "chat" | "storywriting" | "my_stories" | "story_editor" | "story_relationship_board";
type CreateTab = "overview" | "definition" | "system" | "intro" | "synopsis";
type StoryTab = "scenario" | "relationships" | "plot_points";

type ProxyConfig = {
  chatUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  contextSize: number;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: string;
  characterId: string;
  characterName: string;
  characterImageDataUrl: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

type StoryRelationship = {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  alignment: string;
  relationType: string;
  details: string;
  createdAt: string;
};

type StoryBoardNode = {
  characterId: string;
  x: number;
  y: number;
};

type StoryProject = {
  id: string;
  title: string;
  characterIds: string[];
  imageDataUrl: string;
  scenario: string;
  plotPoints: string[];
  relationships: StoryRelationship[];
  boardNodes: StoryBoardNode[];
  createdAt: string;
  updatedAt: string;
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
const PERSONA_KEY = "mastercreator_persona";
const CHAT_SESSIONS_KEY = "mastercreator_chat_sessions_v1";
const STORIES_KEY = "mastercreator_stories_v1";

const DEFAULT_PROXY: ProxyConfig = {
  chatUrl: "https://llm.chutes.ai/v1/chat/completions",
  apiKey: "",
  model: "deepseek-ai/DeepSeek-R1",
  maxTokens: 350,
  temperature: 0.9,
  contextSize: 32000,
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

const REL_ALIGNMENTS = [
  "Allied",
  "Friendly",
  "Neutral",
  "Tense",
  "Hostile",
  "Rival",
  "Dependent",
  "Manipulative",
];

const REL_TYPES = [
  "Romantic",
  "Platonic",
  "Familial",
  "Step-familial",
  "Professional",
  "Mentor/Student",
  "Enemy",
  "Ally",
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
   return new Promise<Character[]>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const arr = Array.isArray(req.result) ? (req.result as any[]) : [];
      const normalized = arr
        .map(normalizeCharacter)
        .filter((x): x is Character => !!x);
      resolve(normalized);
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

function RichText({ text }: { text: string }) {
  const renderInline = (raw: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(raw))) {
      if (m.index > last) parts.push(raw.slice(last, m.index));
      const token = m[0];
      if (token.startsWith("***") && token.endsWith("***")) {
        parts.push(<strong key={m.index}><em>{token.slice(3, -3)}</em></strong>);
      } else if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(<strong key={m.index}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(<em key={m.index}>{token.slice(1, -1)}</em>);
      }
      last = m.index + token.length;
    }
    if (last < raw.length) parts.push(raw.slice(last));
    return parts;
  };

  return <>{String(text || "").split("\n").map((line, i) => <React.Fragment key={i}>{i > 0 ? <br /> : null}{renderInline(line)}</React.Fragment>)}</>;
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
  const [proxyTemperature, setProxyTemperature] = useState(DEFAULT_PROXY.temperature);
  const [proxyTemperatureInput, setProxyTemperatureInput] = useState(String(DEFAULT_PROXY.temperature));
  const [proxyContextSize, setProxyContextSize] = useState(DEFAULT_PROXY.contextSize);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [personaText, setPersonaText] = useState("");

  const [chatCharacter, setChatCharacter] = useState<Character | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreamEnabled, setChatStreamEnabled] = useState(true);
  const [introStreamEnabled, setIntroStreamEnabled] = useState(false);
  const [synopsisStreamEnabled, setSynopsisStreamEnabled] = useState(false);
  const [backstoryStreamEnabled, setBackstoryStreamEnabled] = useState(false);

  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [stories, setStories] = useState<StoryProject[]>([]);
  const [storyDraftCharacterIds, setStoryDraftCharacterIds] = useState<string[]>([]);
  const [storySidebarHidden, setStorySidebarHidden] = useState(false);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [storyTab, setStoryTab] = useState<StoryTab>("scenario");
  const [storyScenarioPrompt, setStoryScenarioPrompt] = useState("");
  const [storyScenarioRevision, setStoryScenarioRevision] = useState("");
  const [storyImageDataUrl, setStoryImageDataUrl] = useState("");
  const [storyPlotPointInput, setStoryPlotPointInput] = useState("");
  const [storyPlotPointRevision, setStoryPlotPointRevision] = useState("");
  const [storyRelationshipEditorOpen, setStoryRelationshipEditorOpen] = useState(false);
  const [storyRelFromId, setStoryRelFromId] = useState("");
  const [storyRelToId, setStoryRelToId] = useState("");
  const [storyRelAlignment, setStoryRelAlignment] = useState("Neutral");
  const [storyRelType, setStoryRelType] = useState("Platonic");
  const [storyRelDetails, setStoryRelDetails] = useState("");
  const [pendingRelationshipEdge, setPendingRelationshipEdge] = useState<{ fromCharacterId: string; toCharacterId: string } | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [connectingPointer, setConnectingPointer] = useState<{ x: number; y: number } | null>(null);
  const [connectionSnapTargetId, setConnectionSnapTargetId] = useState<string | null>(null);
  const [storyDragCharacterId, setStoryDragCharacterId] = useState<string | null>(null);
  const [draggedToDeckCharacterId, setDraggedToDeckCharacterId] = useState<string | null>(null);
  const [boardDragPreview, setBoardDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [storywritingDragPreview, setStorywritingDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [boardPan, setBoardPan] = useState({ x: 0, y: 0 });
  const [boardPanning, setBoardPanning] = useState(false);
  const boardPanStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [saveToastOpen, setSaveToastOpen] = useState(false);
  const dotPointerDownRef = useRef(false);
  const connectingFromIdRef = useRef<string | null>(null);
  const connectionSnapTargetIdRef = useRef<string | null>(null);
  const transparentDragImageRef = useRef<HTMLCanvasElement | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const storywritingDndRef = useRef<HTMLDivElement | null>(null);
  const [showCreatePreview, setShowCreatePreview] = useState(true);
  const [createPreviewOpen, setCreatePreviewOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

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

  useEffect(() => {
    const resetDotState = () => {
      dotPointerDownRef.current = false;
    };
    window.addEventListener("mouseup", resetDotState);
    window.addEventListener("dragend", resetDotState);
    window.addEventListener("blur", resetDotState);
    return () => {
      window.removeEventListener("mouseup", resetDotState);
      window.removeEventListener("dragend", resetDotState);
      window.removeEventListener("blur", resetDotState);
    };
  }, []);

  const [backstoryRevisionFeedback, setBackstoryRevisionFeedback] = useState("");
  const [introRevisionFeedback, setIntroRevisionFeedback] = useState("");
  const [synopsisRevisionFeedback, setSynopsisRevisionFeedback] = useState("");

  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [proxyProgress, setProxyProgress] = useState(0);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const storyImageFileRef = useRef<HTMLInputElement | null>(null);
  const [historyStack, setHistoryStack] = useState<Page[]>([]);

  useEffect(() => {
    if (import.meta.env.MODE === "test") runTests();
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
      const temp = Number((savedProxy as any).temperature);
      if (Number.isFinite(temp) && temp >= 0 && temp <= 2) {
        setProxyTemperature(temp);
        setProxyTemperatureInput(String(temp));
      }
      const ctx = Number((savedProxy as any).contextSize);
      if (Number.isFinite(ctx) && ctx > 1) setProxyContextSize(Math.floor(ctx));
    }

    const savedPersona = localStorage.getItem(PERSONA_KEY);
    if (typeof savedPersona === "string") setPersonaText(savedPersona);

    const savedSessions = safeParseJSON(localStorage.getItem(CHAT_SESSIONS_KEY) || "");
    if (Array.isArray(savedSessions)) {
      const normalized = savedSessions
        .map((s) => {
          if (!s || typeof s !== "object") return null;
          const msgs = Array.isArray((s as any).messages)
            ? (s as any).messages
                .map((m: any) => {
                  const role = m?.role === "assistant" ? "assistant" : m?.role === "user" ? "user" : null;
                  const content = collapseWhitespace(m?.content ?? "");
                  if (!role || !content) return null;
                  return { role, content } as ChatMessage;
                })
                .filter(Boolean)
            : [];
          const id = typeof (s as any).id === "string" ? (s as any).id : uid();
          const characterId = typeof (s as any).characterId === "string" ? (s as any).characterId : "";
          const characterName = collapseWhitespace((s as any).characterName ?? "");
          if (!characterId || !characterName) return null;
          const now = new Date().toISOString();
          return {
            id,
            characterId,
            characterName,
            characterImageDataUrl:
              typeof (s as any).characterImageDataUrl === "string" ? (s as any).characterImageDataUrl : "",
            messages: msgs,
            createdAt: typeof (s as any).createdAt === "string" ? (s as any).createdAt : now,
            updatedAt: typeof (s as any).updatedAt === "string" ? (s as any).updatedAt : now,
          } as ChatSession;
        })
        .filter((x): x is ChatSession => !!x)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setChatSessions(normalized);
    }

    const savedStories = safeParseJSON(localStorage.getItem(STORIES_KEY) || "");
    if (Array.isArray(savedStories)) {
      const normalizedStories = savedStories
        .map((s) => {
          if (!s || typeof s !== "object") return null;
          const id = typeof (s as any).id === "string" ? (s as any).id : uid();
          const now = new Date().toISOString();
          return {
            id,
            title: collapseWhitespace((s as any).title || "Untitled story"),
            characterIds: normalizeStringArray((s as any).characterIds),
            imageDataUrl: typeof (s as any).imageDataUrl === "string" ? (s as any).imageDataUrl : "",
            scenario: typeof (s as any).scenario === "string" ? (s as any).scenario : "",
            plotPoints: normalizeStringArray((s as any).plotPoints),
            relationships: Array.isArray((s as any).relationships) ? (s as any).relationships : [],
            boardNodes: Array.isArray((s as any).boardNodes) ? (s as any).boardNodes : [],
            createdAt: typeof (s as any).createdAt === "string" ? (s as any).createdAt : now,
            updatedAt: typeof (s as any).updatedAt === "string" ? (s as any).updatedAt : now,
          } as StoryProject;
        })
        .filter((x): x is StoryProject => !!x)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setStories(normalizedStories);
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
    if (!genLoading) {
      setProxyProgress(0);
      return;
    }
    setProxyProgress(6);
    const t = window.setInterval(() => {
      setProxyProgress((prev) => {
        if (prev >= 92) return prev;
        const step = Math.max(1, Math.round((100 - prev) / 14));
        return Math.min(92, prev + step);
      });
    }, 180);
    return () => {
      window.clearInterval(t);
      setProxyProgress(100);
    };
  }, [genLoading]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => {
      const mobile = media.matches;
      setIsMobileViewport(mobile);
      if (mobile) {
        setCreatePreviewOpen(false);
      } else {
        setShowCreatePreview(true);
      }
    };
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      PROXY_KEY,
      JSON.stringify({
        chatUrl: proxyChatUrl,
        apiKey: proxyApiKey,
        model: proxyModel,
        maxTokens: proxyMaxTokens,
        temperature: proxyTemperature,
        contextSize: proxyContextSize,
      })
    );
  }, [proxyChatUrl, proxyApiKey, proxyModel, proxyMaxTokens, proxyTemperature, proxyContextSize]);

  useEffect(() => {
    setProxyTemperatureInput(String(proxyTemperature));
  }, [proxyTemperature]);

  useEffect(() => {
    localStorage.setItem(PERSONA_KEY, personaText);
  }, [personaText]);

  useEffect(() => {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
  }, [chatSessions]);

  useEffect(() => {
    localStorage.setItem(STORIES_KEY, JSON.stringify(stories));
  }, [stories]);

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

    setBackstoryRevisionFeedback("");
    setIntroRevisionFeedback("");
    setSynopsisRevisionFeedback("");

    setGenError(null);
    setGenLoading(false);
    setChatCharacter(null);
    setActiveChatSessionId(null);
    setChatMessages([]);
    setChatInput("");
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

  function moveBackstoryEntry(from: number, to: number) {
    setBackstory((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
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
    navigateTo("library");
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

  async function handlePickStoryImage(file: File) {
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setStoryImageDataUrl(dataUrl);
      if (activeStory) {
        updateStory(activeStory.id, { imageDataUrl: dataUrl });
      }
    } catch {
      // ignore invalid story image
    }
  }

  function navigateTo(next: Page) {
    setHistoryStack((prev) => {
      if (prev[prev.length - 1] === page) return prev;
      return [...prev, page];
    });
    setPage(next);
  }

  function goBack() {
    setHistoryStack((prev) => {
      if (!prev.length) {
        setPage("library");
        return prev;
      }
      const next = prev[prev.length - 1];
      setPage(next);
      return prev.slice(0, -1);
    });
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

    navigateTo("library");
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

    setBackstoryRevisionFeedback("");
    setIntroRevisionFeedback("");
    setSynopsisRevisionFeedback("");

    setGenError(null);
    setGenLoading(false);

    navigateTo("create");
    setTab("overview");
    requestAnimationFrame(() =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  function upsertChatSession(session: ChatSession) {
    setChatSessions((prev) => {
      const exists = prev.some((s) => s.id === session.id);
      const merged = exists ? prev.map((s) => (s.id === session.id ? session : s)) : [session, ...prev];
      return merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    });
  }

  function openChatSession(session: ChatSession) {
    setActiveChatSessionId(session.id);
    setChatMessages(Array.isArray(session.messages) ? session.messages : []);
    const linked = characters.find((c) => c.id === session.characterId) || null;
    setChatCharacter(linked);
    setChatInput("");
    setGenError(null);
    navigateTo("chat");
  }

  function startChatWithCharacter(c: Character) {
    const now = new Date().toISOString();
    const latest = chatSessions.find((s) => s.characterId === c.id);
    if (latest) {
      openChatSession({ ...latest, characterName: c.name, characterImageDataUrl: c.imageDataUrl || latest.characterImageDataUrl });
      return;
    }
    const greeting = collapseWhitespace(
      c.introMessages?.[
        clampIndex(c.selectedIntroIndex || 0, Math.max(1, c.introMessages?.length || 1))
      ] || ""
    );
    const session: ChatSession = {
      id: uid(),
      characterId: c.id,
      characterName: c.name,
      characterImageDataUrl: c.imageDataUrl || "",
      messages: greeting ? [{ role: "assistant", content: greeting }] : [],
      createdAt: now,
      updatedAt: now,
    };
    upsertChatSession(session);
    openChatSession(session);
  }

  function buildCharacterChatSystemPrompt(c: Character) {
    const persona = collapseWhitespace(personaText);
    return [
      "You are roleplaying as the following character. Stay in-character and speak naturally.",
      `Name: ${c.name}`,
      `Gender: ${c.gender || ""}`,
      `Age: ${c.age === "" ? "" : String(c.age)}`,
      `Height: ${c.height || ""}`,
      `Origins: ${c.origins || ""}`,
      `Race: ${c.race || ""}`,
      `Personalities: ${(c.personalities || []).join(", ")}`,
      `Unique traits: ${(c.uniqueTraits || []).join(", ")}`,
      `Backstory: ${(c.backstory || []).join(" | ")}`,
      `Synopsis: ${c.synopsis || ""}`,
      `System rules: ${c.systemRules || ""}`,
      persona ? `User persona: ${persona}` : "User persona: (not provided)",
      "Respond as the character in chat. Keep continuity with prior messages.",
    ].join("\n");
  }

  const activeStory = useMemo(
    () => stories.find((s) => s.id === activeStoryId) || null,
    [stories, activeStoryId]
  );

  useEffect(() => {
    setStoryImageDataUrl(activeStory?.imageDataUrl || "");
  }, [activeStory?.id, activeStory?.imageDataUrl]);

  const latestCharacter = useMemo(
    () => (characters.length ? [...characters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] : null),
    [characters]
  );

  const latestStory = useMemo(
    () => (stories.length ? [...stories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] : null),
    [stories]
  );

  const canGoBack = historyStack.length > 0;

  function updateStory(id: string, patch: Partial<StoryProject>) {
    setStories((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : s
      )
    );
    setSaveToastOpen(true);
    window.setTimeout(() => setSaveToastOpen(false), 1400);
  }

  function proceedStoryDraft() {
    if (!storyDraftCharacterIds.length) {
      alert("Add at least one character to the story field.");
      return;
    }
    const now = new Date().toISOString();
    const title = `Story ${new Date().toLocaleDateString()}`;
    const story: StoryProject = {
      id: uid(),
      title,
      characterIds: Array.from(new Set(storyDraftCharacterIds)),
      imageDataUrl: storyImageDataUrl,
      scenario: "",
      plotPoints: [],
      relationships: [],
      boardNodes: [],
      createdAt: now,
      updatedAt: now,
    };
    setStories((prev) => [story, ...prev]);
    setActiveStoryId(story.id);
    setStoryDraftCharacterIds([]);
    setStoryImageDataUrl("");
    navigateTo("story_editor");
    setStoryTab("scenario");
  }

  function exportStoryTxt(story: StoryProject) {
    const chars = story.characterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter((c): c is Character => !!c);
    const relLines = story.relationships.map((r) => {
      const a = chars.find((c) => c.id === r.fromCharacterId)?.name || r.fromCharacterId;
      const b = chars.find((c) => c.id === r.toCharacterId)?.name || r.toCharacterId;
      return `- ${a} -> ${b} | ${r.alignment} | ${r.relationType}${r.details ? ` | ${r.details}` : ""}`;
    });
    const text = [
      `# ${story.title}`,
      "",
      "## Characters",
      ...chars.map((c) => characterToTxt(c)),
      "",
      "## Storywriting",
      "### Scenario",
      story.scenario || "",
      "",
      "### Relationships",
      ...(relLines.length ? relLines : ["- None"]),
      "",
      "### Plot Points",
      ...(story.plotPoints.length ? story.plotPoints.map((p) => `- ${p}`) : ["- None"]),
      "",
    ].join("\n");
    downloadText((filenameSafe(story.title) || "story") + ".txt", text);
  }

  function toggleStoryDraftCharacter(id: string) {
    setStoryDraftCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function dropCharacterToStoryDraft(e: React.DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/character-id");
    if (!id) return;
    setStoryDraftCharacterIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function upsertBoardNode(characterId: string, x: number, y: number) {
    if (!activeStory) return;
    const clampedX = Math.max(-100000, Math.min(100000, x));
    const clampedY = Math.max(-100000, Math.min(100000, y));
    const exists = activeStory.boardNodes.some((n) => n.characterId === characterId);
    const nextNodes = exists
      ? activeStory.boardNodes.map((n) =>
          n.characterId === characterId ? { ...n, x: clampedX, y: clampedY } : n
        )
      : [...activeStory.boardNodes, { characterId, x: clampedX, y: clampedY }];
    updateStory(activeStory.id, { boardNodes: nextNodes });
  }

  function dropCharacterToRelationshipBoard(e: React.DragEvent<HTMLDivElement>) {
    if (!activeStory) return;
    e.preventDefault();
    const id = e.dataTransfer.getData("text/character-id");
    if (!id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    upsertBoardNode(id, e.clientX - rect.left - boardPan.x - 128, e.clientY - rect.top - boardPan.y - 60);
    setDraggedToDeckCharacterId((prev) => (prev === id ? null : prev));
  }

  function removeBoardNode(characterId: string) {
    if (!activeStory) return;
    updateStory(activeStory.id, {
      boardNodes: activeStory.boardNodes.filter((n) => n.characterId !== characterId),
      relationships: activeStory.relationships.filter(
        (r) => r.fromCharacterId !== characterId && r.toCharacterId !== characterId
      ),
    });
    if (selectedRelationshipId) {
      const stillExists = activeStory.relationships.some(
        (r) =>
          r.id === selectedRelationshipId &&
          r.fromCharacterId !== characterId &&
          r.toCharacterId !== characterId
      );
      if (!stillExists) {
        setSelectedRelationshipId(null);
      }
    }
  }

  function dropCharacterToBottomDeck(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/character-id");
    if (!id) return;
    setDraggedToDeckCharacterId(id);
    removeBoardNode(id);
  }

  function closeRelationshipBoard() {
    setStoryRelationshipEditorOpen(false);
    setSelectedRelationshipId(null);
    setConnectingFromId(null);
    setConnectingPointer(null);
    setConnectionSnapTargetId(null);
    connectingFromIdRef.current = null;
    connectionSnapTargetIdRef.current = null;
    setDraggedToDeckCharacterId(null);
    setBoardDragPreview(null);
    setBoardPanning(false);
    boardPanStartRef.current = null;
    navigateTo("story_editor");
  }

  function openRelationshipEditor(fromId: string, toId: string) {
    setStoryRelFromId(fromId);
    setStoryRelToId(toId);
    setStoryRelAlignment("Neutral");
    setStoryRelType("Platonic");
    setStoryRelDetails("");
    setPendingRelationshipEdge({ fromCharacterId: fromId, toCharacterId: toId });
    setStoryRelationshipEditorOpen(true);
  }

  function closeRelationshipEditor() {
    setStoryRelationshipEditorOpen(false);
    setPendingRelationshipEdge(null);
  }

  function getBoardNodeCenter(characterId: string, side: "from" | "to") {
    if (!activeStory) return null;
    const node = activeStory.boardNodes.find((n) => n.characterId === characterId);
    if (!node) return null;
    const baseX = node.x;
    const baseY = node.y;
    return {
      x: side === "from" ? baseX + 14 : baseX + 242,
      y: baseY + 10,
    };
  }

  function findConnectionSnapTarget(x: number, y: number) {
    const currentFromId = connectingFromIdRef.current;
    if (!activeStory || !currentFromId) return null;
    let best: { id: string; distSq: number } | null = null;
    const SNAP_RADIUS = 36;
    const SNAP_RADIUS_SQ = SNAP_RADIUS * SNAP_RADIUS;
    for (const node of activeStory.boardNodes) {
      if (node.characterId === currentFromId) continue;
      const center = getBoardNodeCenter(node.characterId, "from");
      if (!center) continue;
      const dx = center.x - x;
      const dy = center.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= SNAP_RADIUS_SQ && (!best || distSq < best.distSq)) {
        best = { id: node.characterId, distSq };
      }
    }
    return best?.id || null;
  }

  function beginConnectionDrag(characterId: string, e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    connectingFromIdRef.current = characterId;
    setConnectingFromId(characterId);
    connectionSnapTargetIdRef.current = null;
    setConnectionSnapTargetId(null);
  }

  function finishConnectionDrag(targetCharacterId: string, e: React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
    const currentFromId = connectingFromIdRef.current;
    if (!currentFromId || currentFromId === targetCharacterId) {
      connectingFromIdRef.current = null;
      setConnectingFromId(null);
      setConnectingPointer(null);
      connectionSnapTargetIdRef.current = null;
      setConnectionSnapTargetId(null);
      return;
    }
    openRelationshipEditor(currentFromId, targetCharacterId);
    connectingFromIdRef.current = null;
    setConnectingFromId(null);
    setConnectingPointer(null);
    connectionSnapTargetIdRef.current = null;
    setConnectionSnapTargetId(null);
  }

  function saveRelationshipEdge() {
    if (!activeStory || !storyRelFromId || !storyRelToId) return;
    const rel: StoryRelationship = {
      id: uid(),
      fromCharacterId: storyRelFromId,
      toCharacterId: storyRelToId,
      alignment: storyRelAlignment,
      relationType: storyRelType,
      details: storyRelDetails,
      createdAt: new Date().toISOString(),
    };
    updateStory(activeStory.id, {
      relationships: [rel, ...activeStory.relationships],
    });
    setPendingRelationshipEdge(null);
    setStoryRelationshipEditorOpen(false);
  }

  async function sendChatMessage() {
    if (!chatCharacter || !activeChatSessionId || genLoading) return;
    const text = collapseWhitespace(chatInput);
    if (!text) return;
    setGenError(null);
    const newHistory = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(newHistory);
    setChatInput("");

    const approxPerMessage = 220;
    const maxHistory = Math.max(2, Math.floor(proxyContextSize / approxPerMessage));
    const trimmedHistory = newHistory.slice(-maxHistory);
    const system = buildCharacterChatSystemPrompt(chatCharacter);
    const transcript = trimmedHistory
      .map((m) => `${m.role === "user" ? "User" : chatCharacter.name}: ${m.content}`)
      .join("\n");
    const user = `Conversation so far:
${transcript}

Write the character's next reply to the latest user message.`;

    setGenLoading(true);
    try {
      const reply = await callProxyChatCompletion({
        system,
        user,
        stream: chatStreamEnabled,
      });
      const finalMessages = [...newHistory, { role: "assistant" as const, content: reply }];
      setChatMessages(finalMessages);
      const now = new Date().toISOString();
      upsertChatSession({
        id: activeChatSessionId,
        characterId: chatCharacter.id,
        characterName: chatCharacter.name,
        characterImageDataUrl: chatCharacter.imageDataUrl || "",
        messages: finalMessages,
        createdAt: chatSessions.find((s) => s.id === activeChatSessionId)?.createdAt || now,
        updatedAt: now,
      });
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Chat failed.");
    } finally {
      setGenLoading(false);
    }
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

  function getOverviewAndSystemContextForRevision() {
    return [
      `Name: ${collapseWhitespace(name) || "(unnamed)"}`,
      `Gender: ${gender || ""}`,
      `Age: ${age === "" ? "" : String(age)}`,
      `Height: ${collapseWhitespace(height)}`,
      `Origins: ${collapseWhitespace(origins)}`,
      `Race: ${getFinalRace()}`,
      `Personalities: ${(personalities || []).join(", ")}`,
      `Unique traits: ${(traits || []).join(", ")}`,
      `System rules: ${collapseWhitespace(systemRules)}`,
    ].join("\n");
  }


  function parseGeneratedBackstoryEntries(text: string) {
    const clean = String(text || "").trim();
    if (!clean) return [] as string[];

    const parseAsArray = (value: any): string[] => {
      if (!Array.isArray(value)) return [];
      return value
        .map((entry) => {
          if (typeof entry === "string") return collapseWhitespace(entry);
          if (entry && typeof entry === "object") {
            return collapseWhitespace(entry.entry ?? entry.text ?? entry.content ?? "");
          }
          return "";
        })
        .filter(Boolean);
    };

    const tryParse = (raw: string) => {
      try {
        const parsed = JSON.parse(raw);
        return parseAsArray(parsed);
      } catch {
        return [] as string[];
      }
    };

    const direct = tryParse(clean);
    if (direct.length) return direct;

    const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      const fromFence = tryParse(fenced[1].trim());
      if (fromFence.length) return fromFence;
    }

    return clean
      .split(/\n+/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, ""))
      .map((line) => collapseWhitespace(line))
      .filter(Boolean);
  }


  async function callProxyChatCompletion(args: {
    system: string;
    user: string;
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
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
        temperature: args.temperature ?? proxyTemperature,
        max_tokens: args.maxTokens ?? proxyMaxTokens,
        stream: !!args.stream,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}). ${text}`);
    }

    if (args.stream) {
      const raw = await res.text();
      const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.replace(/^data:\s*/, ""))
        .filter((l) => l && l !== "[DONE]");
      let merged = "";
      for (const line of lines) {
        try {
          const part = JSON.parse(line);
          merged +=
            part?.choices?.[0]?.delta?.content ??
            part?.choices?.[0]?.message?.content ??
            part?.choices?.[0]?.text ??
            "";
        } catch {
          merged += line;
        }
      }
      const clean = String(merged ?? "").trim();
      if (!clean) throw new Error("No text returned by the model.");
      return clean;
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
        stream: introStreamEnabled,
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
        stream: synopsisStreamEnabled,
      });
      setSynopsis(text);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function generateBackstoryFromEntries() {
    setGenError(null);

    if (!backstory.length) {
      setGenError("Add at least one backstory entry first.");
      return;
    }

    const system =
      "You are a roleplay writing editor. Expand rough backstory notes into a rich, coherent backstory timeline. Fill in missing connective details, resolve contradictions, and infer sensible transitions while preserving the character's established facts and tone. You may add NEW timeline entries that were not in the original notes whenever needed for context, causality, and detail. Return valid JSON only in this format: [\"entry 1\", \"entry 2\", ...]. Each entry should be detailed (2-5 sentences), specific, and ordered chronologically.";

    const user = `Character info:\n${getCharacterSummaryForLLM()}\n\nRaw backstory notes:\n${backstory
      .map((entry, i) => `${i + 1}. ${entry}`)
      .join("\n")}\n\nRewrite these into a comprehensive, polished backstory list and add NEW detailed entries wherever missing context, causality, or timeline transitions are needed. It is good to return more entries than the input if that improves clarity and depth.`;

    setGenLoading(true);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        maxTokens: Math.min(1000, Math.max(300, proxyMaxTokens * 3)),
        temperature: 0.8,
        stream: backstoryStreamEnabled,
      });
      const generated = parseGeneratedBackstoryEntries(text);
      if (!generated.length) {
        throw new Error("The model did not return usable backstory entries.");
      }
      setBackstory(generated);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function reviseBackstoryFromFeedback() {
    setGenError(null);
    const feedback = collapseWhitespace(backstoryRevisionFeedback);
    if (!backstory.length) {
      setGenError("Generate or add backstory entries before revising.");
      return;
    }
    if (!feedback) {
      setGenError("Write feedback for how to revise the backstory.");
      return;
    }

    const system =
      "You revise a roleplay backstory timeline based on user feedback. Keep chronology coherent, preserve established facts unless feedback asks to change them, and improve detail/clarity. You may add NEW entries when needed to satisfy feedback and continuity. Return valid JSON array only: [\"entry 1\", \"entry 2\", ...].";

    const user = `Overview and system context:
${getOverviewAndSystemContextForRevision()}

Current backstory entries:
${backstory
      .map((entry, i) => `${i + 1}. ${entry}`)
      .join("\n")}

User revision feedback:
${feedback}

Revise the backstory entries now.`;

    setGenLoading(true);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        maxTokens: Math.min(1200, Math.max(300, proxyMaxTokens * 3)),
        temperature: 0.8,
      });
      const revised = parseGeneratedBackstoryEntries(text);
      if (!revised.length) throw new Error("The model did not return usable revised backstory entries.");
      setBackstory(revised);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Revision failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function reviseSelectedIntro() {
    setGenError(null);
    const feedback = collapseWhitespace(introRevisionFeedback);
    const currentIntro =
      introMessages[clampIndex(introIndex, Math.max(1, introMessages.length))] || "";

    if (!collapseWhitespace(currentIntro)) {
      setGenError("Generate or write this intro before revising it.");
      return;
    }
    if (!feedback) {
      setGenError("Write feedback for how to revise this intro.");
      return;
    }

    const system =
      "You revise exactly ONE roleplay intro message based on feedback. Only use overview/system context and the provided current intro. Do not use other intros. Keep it in-character and ready to use. Return ONLY the revised intro text.";

    const user = `Overview and system context:
${getOverviewAndSystemContextForRevision()}

Current intro message (only this one should be revised):
${currentIntro}

User revision feedback:
${feedback}

Return only the revised intro message.`;

    setGenLoading(true);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        temperature: 0.9,
      });
      setIntroMessages((prev) => {
        const base = prev.length ? [...prev] : [""];
        const i = clampIndex(introIndex, base.length);
        base[i] = text;
        return base;
      });
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Revision failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function reviseSynopsis() {
    setGenError(null);
    const feedback = collapseWhitespace(synopsisRevisionFeedback);
    if (!collapseWhitespace(synopsis)) {
      setGenError("Generate or write a synopsis before revising it.");
      return;
    }
    if (!feedback) {
      setGenError("Write feedback for how to revise the synopsis.");
      return;
    }

    const system =
      "You revise a roleplay character synopsis based on user feedback. Only use the provided overview/system context and current synopsis. Keep it cohesive, vivid, and roleplay-oriented. Return ONLY the revised synopsis text.";

    const user = `Overview and system context:
${getOverviewAndSystemContextForRevision()}

Current synopsis:
${synopsis}

User revision feedback:
${feedback}

Return only the revised synopsis.`;

    setGenLoading(true);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        maxTokens: Math.min(280, Math.max(80, proxyMaxTokens)),
        temperature: 0.9,
      });
      setSynopsis(text);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Revision failed.");
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

  async function generateStoryScenario() {
    if (!activeStory) return;
    const prompt = collapseWhitespace(storyScenarioPrompt);
    if (!prompt) {
      setGenError("Write a scenario prompt first.");
      return;
    }
    const charBlob = activeStory.characterIds
      .map((id) => characters.find((c) => c.id === id)?.name || id)
      .join(", ");
    setGenError(null);
    setGenLoading(true);
    try {
      const out = await callProxyChatCompletion({
        system:
          "You create roleplay story scenarios for multi-character casts. Return only scenario prose.",
        user: `Characters: ${charBlob}\nPrompt: ${prompt}`,
        maxTokens: Math.min(400, Math.max(120, proxyMaxTokens)),
      });
      updateStory(activeStory.id, { scenario: out });
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Scenario generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function reviseStoryScenario() {
    if (!activeStory) return;
    const feedback = collapseWhitespace(storyScenarioRevision);
    if (!feedback) {
      setGenError("Write scenario revision feedback first.");
      return;
    }
    setGenError(null);
    setGenLoading(true);
    try {
      const out = await callProxyChatCompletion({
        system: "Revise scenario text based on feedback. Return only revised scenario.",
        user: `Current scenario:\n${activeStory.scenario}\n\nFeedback:\n${feedback}`,
        maxTokens: Math.min(450, Math.max(140, proxyMaxTokens)),
      });
      updateStory(activeStory.id, { scenario: out });
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Scenario revision failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function generateStoryPlotPoints() {
    if (!activeStory) return;
    if (!activeStory.plotPoints.length) {
      setGenError("Add at least one plot point first.");
      return;
    }
    setGenError(null);
    setGenLoading(true);
    try {
      const out = await callProxyChatCompletion({
        system:
          "Expand plot points into more detailed entries, each max 30 words. Return JSON array of strings only.",
        user: `Current plot points:\n${activeStory.plotPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
        maxTokens: Math.min(900, Math.max(250, proxyMaxTokens * 2)),
      });
      const items = parseGeneratedBackstoryEntries(out);
      if (!items.length) throw new Error("No valid plot points returned.");
      updateStory(
        activeStory.id,
        { plotPoints: items.map((x) => x.split(/\s+/).slice(0, 30).join(" ")) }
      );
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Plot point generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function reviseStoryPlotPoints() {
    if (!activeStory) return;
    const feedback = collapseWhitespace(storyPlotPointRevision);
    if (!feedback) {
      setGenError("Write plot point revision feedback first.");
      return;
    }
    setGenError(null);
    setGenLoading(true);
    try {
      const out = await callProxyChatCompletion({
        system: "Revise plot point list with each entry max 30 words. Return JSON array of strings only.",
        user: `Current points:\n${activeStory.plotPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\nFeedback:\n${feedback}`,
        maxTokens: Math.min(900, Math.max(250, proxyMaxTokens * 2)),
      });
      const items = parseGeneratedBackstoryEntries(out);
      if (!items.length) throw new Error("No valid revised plot points returned.");
      updateStory(
        activeStory.id,
        { plotPoints: items.map((x) => x.split(/\s+/).slice(0, 30).join(" ")) }
      );
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Plot point revision failed.");
    } finally {
      setGenLoading(false);
    }
  }

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
        <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {page !== "library" && canGoBack ? (
              <Button variant="secondary" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : null}
            <button
              type="button"
              className="text-2xl font-semibold tracking-tight md:text-3xl"
              onClick={() => navigateTo("library")}
            >
              Mastercreator
            </button>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <Button variant="secondary" onClick={() => setProxyOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Proxy
            </Button>
            <Button variant="secondary" onClick={() => setPersonaOpen(true)}>
              <UserRound className="h-4 w-4" /> Persona
            </Button>
            <Button variant="secondary" onClick={() => navigateTo("chat")}>
              <MessageCircle className="h-4 w-4" /> Chats
            </Button>
            <Button variant="secondary" onClick={() => navigateTo("storywriting")}>
              <BookOpen className="h-4 w-4" /> Storywriting
            </Button>
            <Button variant="secondary" onClick={() => navigateTo("my_stories")}>
              <Library className="h-4 w-4" /> My Stories
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

        {page === "chat" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-1">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <div>
                  <div className="text-sm font-semibold">Chats</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Continue latest or pick a session.</div>
                </div>
                <Button variant="secondary" onClick={() => navigateTo("library")}>
                  <ArrowLeft className="h-4 w-4" /> Dashboard
                </Button>
              </div>
              {chatSessions.length ? (
                <div className="space-y-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => openChatSession(chatSessions[0])}
                  >
                    Continue latest chat
                  </Button>
                  {chatSessions.map((s) => (
                    <button
                      key={s.id}
                      className={cn(
                        "clickable w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-left",
                        activeChatSessionId === s.id && "border-[hsl(var(--hover-accent))]"
                      )}
                      onClick={() => openChatSession(s)}
                      type="button"
                    >
                      <div className="text-sm font-medium">{s.characterName}</div>
                      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                        {new Date(s.updatedAt).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                  No chats yet. Start a chat from a character.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-sm lg:col-span-2">
              {chatCharacter ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-lg font-semibold">Chat with {chatCharacter.name}</div>
                    <label className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                      <input
                        type="checkbox"
                        checked={chatStreamEnabled}
                        onChange={(e) => setChatStreamEnabled(e.target.checked)}
                      />
                      Stream text
                    </label>
                  </div>
                  <div className="max-h-[62vh] space-y-2 overflow-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                    {chatMessages.length ? (
                      chatMessages.map((m, i) => (
                        <div
                          key={`${m.role}-${i}`}
                          className={cn(
                            "flex max-w-[95%] items-start gap-2 rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                            m.role === "user"
                              ? "ml-auto border border-[hsl(var(--border))]"
                              : "mr-auto border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                          )}
                        >
                          {m.role === "assistant" ? (
                            chatCharacter.imageDataUrl ? (
                              <img
                                src={chatCharacter.imageDataUrl}
                                alt={chatCharacter.name}
                                className="mt-0.5 h-7 w-7 rounded-full object-cover"
                              />
                            ) : (
                              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-[hsl(var(--border))] text-[10px]">AI</div>
                            )
                          ) : null}
                          <div className="min-w-0">
                            <RichText text={m.content} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">No messages yet. Start chatting.</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => onEnterAdd(e, sendChatMessage)}
                      placeholder="Type your message…"
                    />
                    <Button variant="primary" onClick={sendChatMessage} disabled={!collapseWhitespace(chatInput) || genLoading}>
                      Send
                    </Button>
                  </div>
                  {genError ? <div className="text-sm text-[hsl(0_75%_55%)]">{genError}</div> : null}
                </div>
              ) : (
                <div className="text-sm text-[hsl(var(--muted-foreground))]">Pick a chat session from the left.</div>
              )}
            </div>
          </div>
        ) : page === "storywriting" ? (
          <div className="mt-6 space-y-4" ref={storywritingDndRef}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xl font-semibold">Storywriting</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">Build a cast by dragging characters into the story field.</div>
              </div>
              <Button variant="secondary" onClick={() => navigateTo("library")}>
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              {!storySidebarHidden ? (
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 lg:col-span-1">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-semibold">Character Field</div>
                    <Button variant="secondary" onClick={() => setStorySidebarHidden(true)}>Hide</Button>
                  </div>
                  <div className="space-y-2">
                    {characters.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => {
                          if (!transparentDragImageRef.current) {
                            const canvas = document.createElement("canvas");
                            canvas.width = 1;
                            canvas.height = 1;
                            transparentDragImageRef.current = canvas;
                          }
                          e.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0);
                          e.dataTransfer.setData("text/character-id", c.id);
                          setStoryDragCharacterId(c.id);
                          setStorywritingDragPreview({ id: c.id, x: 20, y: 20 });
                        }}
                        onDrag={(e) => {
                          if (!storywritingDndRef.current) return;
                          if (e.clientX === 0 && e.clientY === 0) return;
                          const rect = storywritingDndRef.current.getBoundingClientRect();
                          setStorywritingDragPreview({ id: c.id, x: e.clientX - rect.left - 80, y: e.clientY - rect.top - 90 });
                        }}
                        onDragEnd={() => {
                          setStoryDragCharacterId(null);
                          setStorywritingDragPreview(null);
                        }}
                        className={cn(
                          "clickable rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2 transition-all duration-200",
                          storyDragCharacterId === c.id && "scale-95 opacity-70"
                        )}
                      >
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                          {c.imageDataUrl ? (
                            <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">No image</div>
                          )}
                          <div className="absolute inset-x-0 top-0 bg-black/45 px-2 py-1 text-xs font-semibold text-white">{c.name}</div>
                        </div>
                      </div>
                    ))}
                    {characters.length === 0 ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No characters available.</div> : null}
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-1">
                  <Button variant="secondary" onClick={() => setStorySidebarHidden(false)}>Unhide Character Field</Button>
                </div>
              )}

              <div
                className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 lg:col-span-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={dropCharacterToStoryDraft}
              >
                <div className="mb-3 text-sm font-semibold">Story Field (drop characters here)</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {storyDraftCharacterIds.map((id) => {
                    const c = characters.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                      <div key={id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2 transition-all duration-200">
                        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                          {c.imageDataUrl ? (
                            <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">No image</div>
                          )}
                          <div className="absolute inset-x-0 top-0 bg-black/45 px-2 py-1 text-xs font-semibold text-white">{c.name}</div>
                        </div>
                        <Button className="mt-2 w-full" variant="secondary" onClick={() => toggleStoryDraftCharacter(id)}>Remove</Button>
                      </div>
                    );
                  })}
                </div>
                {!storyDraftCharacterIds.length ? (
                  <div className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">No characters dropped yet.</div>
                ) : null}
              </div>
            </div>

            <div className="fixed bottom-4 right-4">
              <Button variant="primary" className="rounded-full px-6 py-3" onClick={proceedStoryDraft}>
                Proceed
              </Button>
            </div>

            {storywritingDragPreview ? (() => {
              const c = characters.find((x) => x.id === storywritingDragPreview.id);
              if (!c) return null;
              return (
                <div className="pointer-events-none fixed z-40 w-44 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-2xl" style={{ left: storywritingDragPreview.x, top: storywritingDragPreview.y }}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                    {c.imageDataUrl ? <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" /> : <div className="absolute inset-0 bg-[hsl(var(--muted))]" />}
                    <div className="absolute inset-x-0 top-0 bg-black/45 px-2 py-1 text-xs font-semibold text-white">{c.name}</div>
                  </div>
                </div>
              );
            })() : null}
          </div>
        ) : page === "my_stories" ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xl font-semibold">My Stories</div>
              <Button variant="secondary" onClick={() => navigateTo("library")}>
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Button>
            </div>
            <div className="space-y-2">
              {stories.map((s) => (
                <div key={s.id} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.updatedAt).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => { setActiveStoryId(s.id); navigateTo("story_editor"); }}>Open</Button>
                      <Button variant="secondary" onClick={() => downloadJSON((filenameSafe(s.title) || "story") + ".json", s)}>
                        <Download className="h-4 w-4" /> JSON
                      </Button>
                      <Button variant="secondary" onClick={() => exportStoryTxt(s)}>
                        <Download className="h-4 w-4" /> TXT
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {stories.length === 0 ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No stories yet.</div> : null}
            </div>
          </div>
        ) : page === "story_editor" ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xl font-semibold">{activeStory?.title || "Story Editor"}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">Scenario • Relationships • Plot Points</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigateTo("my_stories")}>My Stories</Button>
                <Button variant="secondary" onClick={() => activeStory && downloadJSON((filenameSafe(activeStory.title) || "story") + ".json", activeStory)}>
                  <Download className="h-4 w-4" /> JSON
                </Button>
                <Button variant="secondary" onClick={() => activeStory && exportStoryTxt(activeStory)}>
                  <Download className="h-4 w-4" /> TXT
                </Button>
                <Button variant="primary" onClick={() => activeStory && updateStory(activeStory.id, {})}>Save</Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["scenario", "Scenario"],
                ["relationships", "Relationships"],
                ["plot_points", "Plot Points"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={cn(
                    "clickable rounded-xl border px-3 py-2 text-sm",
                    storyTab === id ? "border-[hsl(var(--hover-accent))]" : "border-[hsl(var(--border))]"
                  )}
                  onClick={() => {
                    setStoryTab(id as StoryTab);
                    if (id === "relationships") {
                      closeRelationshipEditor();
                      setSelectedRelationshipId(null);
                    }
                  }}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            {!activeStory ? (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">Select a story first.</div>
            ) : storyTab === "scenario" ? (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                <div className="grid gap-4 md:grid-cols-[220px,1fr]">
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                    <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Story Image</div>
                    <div className="mt-2 relative aspect-[3/4] overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                      {storyImageDataUrl ? <img src={storyImageDataUrl} alt="Story" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-xs text-[hsl(var(--muted-foreground))]">No image</div>}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" className="w-full" onClick={() => storyImageFileRef.current?.click()}>Upload</Button>
                      <Button variant="secondary" className="w-full" onClick={() => { setStoryImageDataUrl(""); updateStory(activeStory.id, { imageDataUrl: "" }); }}>Clear</Button>
                    </div>
                    <input ref={storyImageFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePickStoryImage(f); e.currentTarget.value = ""; }} />
                  </div>
                  <Textarea
                    value={activeStory.scenario}
                    onChange={(e) => updateStory(activeStory.id, { scenario: e.target.value })}
                    rows={10}
                    placeholder="Scenario..."
                  />
                </div>
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 space-y-2">
                  <div className="text-sm font-medium">Generate scenario</div>
                  <Textarea value={storyScenarioPrompt} onChange={(e) => setStoryScenarioPrompt(e.target.value)} rows={3} placeholder="Prompt..." />
                  <Button variant="secondary" onClick={generateStoryScenario} disabled={genLoading}><Sparkles className="h-4 w-4" /> Generate</Button>
                </div>
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 space-y-2">
                  <div className="text-sm font-medium">Revise scenario</div>
                  <Textarea value={storyScenarioRevision} onChange={(e) => setStoryScenarioRevision(e.target.value)} rows={3} placeholder="Revision feedback..." />
                  <Button variant="secondary" onClick={reviseStoryScenario} disabled={genLoading}><Sparkles className="h-4 w-4" /> Revise</Button>
                </div>
              </div>
            ) : storyTab === "relationships" ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                  <div className="mb-3 text-sm text-[hsl(var(--muted-foreground))]">Build one-way visual links between cast cards in the full relationship board.</div>
                  <Button variant="secondary" onClick={() => navigateTo("story_relationship_board")}>Open Relationship Builder</Button>
                </div>
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                  <div className="mb-2 text-sm font-medium">Relationships</div>
                  {activeStory.relationships.length ? (
                    <div className="space-y-2">
                      {activeStory.relationships.map((r) => {
                        const a = characters.find((c) => c.id === r.fromCharacterId)?.name || "?";
                        const b = characters.find((c) => c.id === r.toCharacterId)?.name || "?";
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedRelationshipId(r.id);
                              setStoryRelFromId(r.fromCharacterId);
                              setStoryRelToId(r.toCharacterId);
                              setStoryRelAlignment(r.alignment);
                              setStoryRelType(r.relationType);
                              setStoryRelDetails(r.details);
                              setStoryRelationshipEditorOpen(true);
                            }}
                            className={cn(
                              "w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                              selectedRelationshipId === r.id ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--background))]" : "border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                            )}
                          >
                            <div className="font-medium">{a} → {b}</div>
                            <div className="text-[hsl(var(--muted-foreground))]">{r.alignment}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">No relationships yet.</div>
                  )}
                </div>
                {storyRelationshipEditorOpen ? (
                <div className="fixed right-0 top-0 z-40 h-full w-[min(92vw,360px)] border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                  <div className="text-sm font-semibold">Relationship Editor</div>
                  <div className="mt-3 space-y-3">
                    <div>
                      <div className="text-xs">From</div>
                      <Select value={storyRelFromId} onChange={(e) => setStoryRelFromId(e.target.value)}>
                        <option value="">Select character…</option>
                        {activeStory.characterIds.map((id) => {
                          const c = characters.find((x) => x.id === id);
                          return c ? <option key={id} value={id}>{c.name}</option> : null;
                        })}
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs">To</div>
                      <Select value={storyRelToId} onChange={(e) => setStoryRelToId(e.target.value)}>
                        <option value="">Select character…</option>
                        {activeStory.characterIds.map((id) => {
                          const c = characters.find((x) => x.id === id);
                          return c ? <option key={id} value={id}>{c.name}</option> : null;
                        })}
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs">Alignment</div>
                      <Select value={storyRelAlignment} onChange={(e) => setStoryRelAlignment(e.target.value)}>
                        {REL_ALIGNMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs">Relationship</div>
                      <Select value={storyRelType} onChange={(e) => setStoryRelType(e.target.value)}>
                        {REL_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs">Details</div>
                      <Textarea value={storyRelDetails} onChange={(e) => setStoryRelDetails(e.target.value)} rows={4} />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={saveRelationshipEdge}>Save relation</Button>
                      <Button variant="secondary" onClick={closeRelationshipEditor}>Close</Button>
                    </div>
                  </div>
                </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={storyPlotPointInput}
                    onChange={(e) => setStoryPlotPointInput(e.target.value)}
                    onKeyDown={(e) => onEnterAdd(e, () => {
                      if (!activeStory) return;
                      const v = collapseWhitespace(storyPlotPointInput);
                      if (!v) return;
                      updateStory(activeStory.id, { plotPoints: [...activeStory.plotPoints, v] });
                      setStoryPlotPointInput("");
                    })}
                    placeholder="Add plot point..."
                  />
                  <Button variant="secondary" onClick={() => {
                    if (!activeStory) return;
                    const v = collapseWhitespace(storyPlotPointInput);
                    if (!v) return;
                    updateStory(activeStory.id, { plotPoints: [...activeStory.plotPoints, v] });
                    setStoryPlotPointInput("");
                  }}>Add</Button>
                </div>
                <div className="space-y-2">
                  {activeStory.plotPoints.map((p, i) => (
                    <div key={p + i} className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 text-sm">
                      <RichText text={p} />
                    </div>
                  ))}
                  {!activeStory.plotPoints.length ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No plot points yet.</div> : null}
                </div>
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 space-y-2">
                  <div className="text-sm font-medium">Generate detailed list</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Turns your written list into a more described list (max 30 words per entry).</div>
                  <Button variant="secondary" onClick={generateStoryPlotPoints} disabled={genLoading || !activeStory.plotPoints.length}><Sparkles className="h-4 w-4" /> Generate detailed list</Button>
                </div>
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 space-y-2">
                  <div className="text-sm font-medium">Revise plot points</div>
                  <Textarea value={storyPlotPointRevision} onChange={(e) => setStoryPlotPointRevision(e.target.value)} rows={3} placeholder="Revision feedback..." />
                  <Button variant="secondary" onClick={reviseStoryPlotPoints} disabled={genLoading}><Sparkles className="h-4 w-4" /> Revise</Button>
                </div>
              </div>
            )}

            {genError ? <div className="text-sm text-[hsl(0_75%_55%)]">{genError}</div> : null}
          </div>
        ) : page === "story_relationship_board" ? (
          !activeStory ? (
            <div className="mt-6 text-sm text-[hsl(var(--muted-foreground))]">Select a story first.</div>
          ) : (
            <div className="fixed inset-0 z-30 bg-[hsl(var(--background))] p-3 md:p-6">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-[hsl(var(--muted-foreground))]">Drag picture cards and connect To → From dots</div>
                <Button variant="secondary" onClick={closeRelationshipBoard}>Close full board</Button>
              </div>
              <div className="relative h-[calc(100vh-86px)] w-full overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-0">
                <div
                  ref={boardContainerRef}
                  className={cn(
                    "h-full w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))]",
                    boardPanning ? "cursor-grabbing" : "cursor-grab"
                  )}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    const target = e.target as HTMLElement;
                    if (target.closest("[data-board-item],button,input,textarea,select")) return;
                    setBoardPanning(true);
                    boardPanStartRef.current = { x: e.clientX, y: e.clientY, panX: boardPan.x, panY: boardPan.y };
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={dropCharacterToRelationshipBoard}
                  onMouseMove={(e) => {
                    if (boardPanning && boardPanStartRef.current) {
                      const dx = e.clientX - boardPanStartRef.current.x;
                      const dy = e.clientY - boardPanStartRef.current.y;
                      setBoardPan({ x: boardPanStartRef.current.panX + dx, y: boardPanStartRef.current.panY + dy });
                      return;
                    }
                    if (!connectingFromIdRef.current) return;
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const px = e.clientX - rect.left - boardPan.x;
                    const py = e.clientY - rect.top - boardPan.y;
                    const snapTargetId = findConnectionSnapTarget(px, py);
                    connectionSnapTargetIdRef.current = snapTargetId;
                    setConnectionSnapTargetId(snapTargetId);
                    if (snapTargetId) {
                      const snapPoint = getBoardNodeCenter(snapTargetId, "from");
                      if (snapPoint) {
                        setConnectingPointer(snapPoint);
                        return;
                      }
                    }
                    setConnectingPointer({ x: px, y: py });
                  }}
                  onMouseUp={() => {
                    setBoardPanning(false);
                    boardPanStartRef.current = null;
                    const currentFromId = connectingFromIdRef.current;
                    const snapTargetId = connectionSnapTargetIdRef.current;
                    if (currentFromId && snapTargetId && currentFromId !== snapTargetId) {
                      openRelationshipEditor(currentFromId, snapTargetId);
                    }
                    if (currentFromId) {
                      connectingFromIdRef.current = null;
                      setConnectingFromId(null);
                      setConnectingPointer(null);
                      connectionSnapTargetIdRef.current = null;
                      setConnectionSnapTargetId(null);
                    }
                  }}
                  onMouseLeave={() => {
                    setBoardPanning(false);
                    boardPanStartRef.current = null;
                  }}
                >
                  <div className="absolute inset-0" style={{ transform: `translate(${boardPan.x}px, ${boardPan.y}px)` }}>
                  <svg className="pointer-events-none absolute inset-0 h-full w-full">
                    {activeStory.relationships.map((r) => {
                      const from = getBoardNodeCenter(r.fromCharacterId, "to");
                      const to = getBoardNodeCenter(r.toCharacterId, "from");
                      if (!from || !to) return null;
                      const c1x = from.x + 80;
                      const c2x = to.x - 80;
                      const selected = selectedRelationshipId === r.id;
                      return (
                        <path
                          key={r.id}
                          d={`M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`}
                          stroke={selected ? "hsl(var(--hover-accent))" : "hsl(var(--muted-foreground))"}
                          strokeWidth={selected ? 3 : 2}
                          fill="none"
                        />
                      );
                    })}
                    {pendingRelationshipEdge ? (() => {
                      const from = getBoardNodeCenter(pendingRelationshipEdge.fromCharacterId, "to");
                      const to = getBoardNodeCenter(pendingRelationshipEdge.toCharacterId, "from");
                      if (!from || !to) return null;
                      const c1x = from.x + 120;
                      const c2x = to.x - 120;
                      return (
                        <path
                          d={`M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`}
                          stroke="hsl(var(--hover-accent))"
                          strokeWidth={3}
                          fill="none"
                          strokeDasharray="8 5"
                        />
                      );
                    })() : null}
                    {connectingFromId && connectingPointer ? (() => {
                      const from = getBoardNodeCenter(connectingFromId, "to");
                      if (!from) return null;
                      return (
                        <path
                          d={`M ${from.x} ${from.y} C ${from.x + 80} ${from.y}, ${connectingPointer.x - 80} ${connectingPointer.y}, ${connectingPointer.x} ${connectingPointer.y}`}
                          stroke="hsl(var(--hover-accent))"
                          strokeWidth={2}
                          fill="none"
                          strokeDasharray="6 4"
                        />
                      );
                    })() : null}
                  </svg>
                  {activeStory.boardNodes.map((n) => {
                    const c = characters.find((x) => x.id === n.characterId);
                    if (!c) return null;
                    return (
                      <div
                        key={n.characterId}
                        data-board-item="1"
                        draggable
                        onDragStart={(e) => {
                          if (dotPointerDownRef.current) {
                            e.preventDefault();
                            return;
                          }
                          if (!transparentDragImageRef.current) {
                            const canvas = document.createElement("canvas");
                            canvas.width = 1;
                            canvas.height = 1;
                            transparentDragImageRef.current = canvas;
                          }
                          e.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0);
                          e.dataTransfer.setData("text/character-id", n.characterId);
                          setStoryDragCharacterId(n.characterId);
                          setBoardDragPreview({ id: n.characterId, x: n.x, y: n.y });
                        }}
                        onDrag={(e) => {
                          if (!boardContainerRef.current) return;
                          if (e.clientX === 0 && e.clientY === 0) return;
                          const rect = boardContainerRef.current.getBoundingClientRect();
                          setBoardDragPreview({
                            id: n.characterId,
                            x: e.clientX - rect.left - boardPan.x - 128,
                            y: e.clientY - rect.top - boardPan.y - 60,
                          });
                        }}
                        onDragEnd={(e) => {
                          setBoardDragPreview(null);
                          if (draggedToDeckCharacterId === n.characterId) {
                            setStoryDragCharacterId(null);
                            setDraggedToDeckCharacterId(null);
                            return;
                          }
                          const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                          upsertBoardNode(n.characterId, e.clientX - rect.left - boardPan.x - 128, e.clientY - rect.top - boardPan.y - 60);
                          setStoryDragCharacterId(null);
                        }}
                        className={cn(
                          "absolute w-64 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 text-sm shadow transition-all duration-200",
                          storyDragCharacterId === n.characterId && "scale-95 opacity-70"
                        )}
                        style={{ left: n.x, top: n.y }}
                      >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                          {c.imageDataUrl ? (
                            <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" />
                          ) : (
                            <div className="absolute inset-0 bg-[hsl(var(--muted))]" />
                          )}
                          <button
                            type="button"
                            className={cn(
                              "absolute left-1 top-1 h-3 w-3 rounded-full bg-[hsl(var(--ring))] transition-all",
                              connectionSnapTargetId === n.characterId && "ring-2 ring-[hsl(var(--hover-accent))]"
                            )}
                            onMouseDown={() => {
                              dotPointerDownRef.current = true;
                            }}
                            onMouseUp={(e) => {
                              dotPointerDownRef.current = false;
                              if (connectingFromIdRef.current && connectingFromIdRef.current !== n.characterId) {
                                finishConnectionDrag(n.characterId, e);
                              }
                            }}
                            aria-label="from-dot"
                          />
                          <button
                            type="button"
                            className="absolute right-1 top-1 h-3 w-3 rounded-full bg-[hsl(var(--hover-accent))]"
                            onMouseDown={(e) => {
                              dotPointerDownRef.current = true;
                              beginConnectionDrag(n.characterId, e);
                            }}
                            onMouseUp={(e) => {
                              dotPointerDownRef.current = false;
                              if (connectingFromIdRef.current && connectingFromIdRef.current !== n.characterId) {
                                finishConnectionDrag(n.characterId, e);
                              }
                            }}
                            aria-label="to-dot"
                          />
                          <div className="absolute inset-x-0 top-4 bg-black/45 px-1 py-0.5 text-center text-[11px] font-semibold text-white">{c.name}</div>
                        </div>
                      </div>
                    );
                  })}
                  {boardDragPreview ? (() => {
                    const c = characters.find((x) => x.id === boardDragPreview.id);
                    if (!c) return null;
                    return (
                      <div
                        className="pointer-events-none absolute z-20 w-64 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 text-sm shadow-2xl"
                        style={{ left: boardDragPreview.x, top: boardDragPreview.y }}
                      >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                          {c.imageDataUrl ? (
                            <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" />
                          ) : (
                            <div className="absolute inset-0 bg-[hsl(var(--muted))]" />
                          )}
                          <div className="absolute inset-x-0 top-4 bg-black/45 px-1 py-0.5 text-center text-[11px] font-semibold text-white">{c.name}</div>
                        </div>
                      </div>
                    );
                  })() : null}
                  </div>
                </div>

                <div
                  className="absolute inset-x-6 bottom-0 h-36 rounded-t-2xl border border-b-0 border-[hsl(var(--border))] bg-[hsl(var(--card))]/90 px-3 pb-3 pt-1"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={dropCharacterToBottomDeck}
                >
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {activeStory.characterIds
                      .filter((id) => !activeStory.boardNodes.some((n) => n.characterId === id))
                      .map((id) => {
                        const c = characters.find((x) => x.id === id);
                        if (!c) return null;
                        return (
                          <div
                            key={id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData("text/character-id", id)}
                            className="relative -mt-10 shrink-0 w-28 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1"
                          >
                            <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                              {c.imageDataUrl ? (
                                <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" />
                              ) : (
                                <div className="absolute inset-0 bg-[hsl(var(--muted))]" />
                              )}
                              <div className="absolute inset-x-0 top-0 bg-black/45 px-1 py-0.5 text-center text-[10px] font-semibold text-white">{c.name}</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {storyRelationshipEditorOpen ? (
                  <div className="fixed right-0 top-0 z-40 h-full w-[min(92vw,360px)] border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <div className="text-sm font-semibold">Relationship Editor</div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-xs">From</div>
                        <Select value={storyRelFromId} onChange={(e) => setStoryRelFromId(e.target.value)}>
                          <option value="">Select character…</option>
                          {activeStory.characterIds.map((id) => {
                            const c = characters.find((x) => x.id === id);
                            return c ? <option key={id} value={id}>{c.name}</option> : null;
                          })}
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs">To</div>
                        <Select value={storyRelToId} onChange={(e) => setStoryRelToId(e.target.value)}>
                          <option value="">Select character…</option>
                          {activeStory.characterIds.map((id) => {
                            const c = characters.find((x) => x.id === id);
                            return c ? <option key={id} value={id}>{c.name}</option> : null;
                          })}
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs">Alignment</div>
                        <Select value={storyRelAlignment} onChange={(e) => setStoryRelAlignment(e.target.value)}>
                          {REL_ALIGNMENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs">Relationship</div>
                        <Select value={storyRelType} onChange={(e) => setStoryRelType(e.target.value)}>
                          {REL_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs">Details</div>
                        <Textarea value={storyRelDetails} onChange={(e) => setStoryRelDetails(e.target.value)} rows={4} />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" onClick={saveRelationshipEdge}>Save relation</Button>
                        <Button variant="secondary" onClick={closeRelationshipEditor}>Close</Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )
        ) : page === "library" ? (
          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <Button variant="primary" className="w-full justify-center py-3" onClick={() => { resetForm(); navigateTo("create"); setTab("overview"); }}>
                  <Plus className="h-4 w-4" /> Create a new character
                </Button>
                <Button variant="secondary" className="mt-3 w-full" onClick={() => setQuery("")}>View characters</Button>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <Button variant="primary" className="w-full justify-center py-3" onClick={() => navigateTo("storywriting")}>
                  <Plus className="h-4 w-4" /> Create a new story
                </Button>
                <Button variant="secondary" className="mt-3 w-full" onClick={() => navigateTo("my_stories")}>View stories</Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Your latest character</div>
              <button
                type="button"
                onClick={() => latestCharacter && setPreviewId(latestCharacter.id)}
                className="group relative h-36 w-full overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--hover-accent))/0.18] text-left"
              >
                {latestCharacter?.imageDataUrl ? (
                  <img src={latestCharacter.imageDataUrl} alt={latestCharacter.name} className="absolute inset-y-0 left-0 h-full w-1/2 object-cover opacity-35 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[hsl(var(--card))]" />
                <div className="relative z-10 p-4">
                  <div className="text-lg font-semibold">{latestCharacter?.name || "No character yet"}</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">Continue your last character</div>
                </div>
                <div className="absolute inset-y-0 right-0 w-24 translate-x-14 bg-[hsl(var(--foreground))/0.12] transition-transform duration-300 group-hover:translate-x-0">
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <ArrowLeft className="h-4 w-4 rotate-180 animate-[spin_1.2s_linear_1]" />
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Your latest story</div>
              <button
                type="button"
                onClick={() => {
                  if (!latestStory) return;
                  setActiveStoryId(latestStory.id);
                  navigateTo("story_editor");
                }}
                className="group relative h-36 w-full overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--hover-accent))/0.18] text-left"
              >
                {latestStory?.imageDataUrl ? (
                  <img src={latestStory.imageDataUrl} alt={latestStory.title} className="absolute inset-y-0 left-0 h-full w-1/2 object-cover opacity-35 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[hsl(var(--card))]" />
                <div className="relative z-10 p-4">
                  <div className="text-lg font-semibold">{latestStory?.title || "No story yet"}</div>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">Continue your last story</div>
                </div>
                <div className="absolute inset-y-0 right-0 w-24 translate-x-14 bg-[hsl(var(--foreground))/0.12] transition-transform duration-300 group-hover:translate-x-0">
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                      <ArrowLeft className="h-4 w-4 rotate-180 animate-[spin_1.2s_linear_1]" />
                    </div>
                  </div>
                </div>
              </button>
            </div>

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
                <Button variant="secondary" onClick={() => navigateTo("library")}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">
                  {selectedId ? "Editing" : "Creating"}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto lg:hidden"
                  onClick={() => setCreatePreviewOpen(true)}
                >
                  Preview
                </Button>
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

            <Button
              variant="secondary"
              className="w-full rounded-2xl lg:hidden"
              onClick={() => {
                const chatTarget = getDraftCharacter();
                if (!chatTarget) return alert("Please enter a character name before chatting.");
                startChatWithCharacter(chatTarget);
              }}
            >
              <MessageCircle className="h-4 w-4" /> Open Character Chat
            </Button>

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
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        Backstory entries stay as a list. You can reorder them and generate an expanded,
                        comprehensive version from your notes.
                      </div>
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
                      <div className="flex flex-wrap justify-end gap-2">
                        <label className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <input
                            type="checkbox"
                            checked={backstoryStreamEnabled}
                            onChange={(e) => setBackstoryStreamEnabled(e.target.checked)}
                          />
                          Stream text
                        </label>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={generateBackstoryFromEntries}
                          disabled={!backstory.length || genLoading}
                        >
                          <Sparkles className="h-4 w-4" /> Generate detailed backstory
                        </Button>
                      </div>
                      <div className="space-y-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                        <div className="text-sm font-medium">Revise generated backstory</div>
                        <Textarea
                          value={backstoryRevisionFeedback}
                          onChange={(e) => setBackstoryRevisionFeedback(e.target.value)}
                          rows={3}
                          placeholder="Give feedback for revision (e.g., make it longer, add richer dialogue and scene details)…"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={reviseBackstoryFromFeedback}
                            disabled={!backstory.length || !collapseWhitespace(backstoryRevisionFeedback) || genLoading}
                          >
                            <Sparkles className="h-4 w-4" /> Revise backstory
                          </Button>
                          <div className="text-xs text-[hsl(var(--muted-foreground))]">
                            Revises only this output using overview + system context.
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {backstory.length ? (
                          backstory.map((b, i) => (
                            <div
                              key={b + i}
                              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                              <div className="whitespace-pre-wrap text-sm"><RichText text={b} /></div>
                                <div className="flex gap-2">
                                  <button
                                    className="clickable rounded-xl border border-[hsl(var(--border))] p-2 disabled:opacity-40"
                                    onClick={() => moveBackstoryEntry(i, i - 1)}
                                    type="button"
                                    aria-label="Move up"
                                    disabled={i === 0}
                                  >
                                    <ChevronUp className="h-4 w-4" />
                                  </button>
                                  <button
                                    className="clickable rounded-xl border border-[hsl(var(--border))] p-2 disabled:opacity-40"
                                    onClick={() => moveBackstoryEntry(i, i + 1)}
                                    type="button"
                                    aria-label="Move down"
                                    disabled={i === backstory.length - 1}
                                  >
                                    <ChevronDown className="h-4 w-4" />
                                  </button>
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
                        <label className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <input
                            type="checkbox"
                            checked={introStreamEnabled}
                            onChange={(e) => setIntroStreamEnabled(e.target.checked)}
                          />
                          Stream text
                        </label>
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
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Revise selected intro with feedback</div>
                          <Textarea
                            value={introRevisionFeedback}
                            onChange={(e) => setIntroRevisionFeedback(e.target.value)}
                            rows={3}
                            placeholder="Feedback for this intro only (e.g., make it longer and add more descriptive dialogue)…"
                          />
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={reviseSelectedIntro}
                            disabled={!collapseWhitespace(introRevisionFeedback) || genLoading}
                          >
                            <Sparkles className="h-4 w-4" /> Revise this intro
                          </Button>
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
                      <label className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                        <input
                          type="checkbox"
                          checked={synopsisStreamEnabled}
                          onChange={(e) => setSynopsisStreamEnabled(e.target.checked)}
                        />
                        Stream text
                      </label>
                      <Textarea
                        value={synopsis}
                        onChange={(e) => setSynopsis(e.target.value)}
                        rows={10}
                        placeholder="Synopsis…"
                      />
                      <div className="space-y-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
                        <div className="text-sm font-medium">Revise synopsis with feedback</div>
                        <Textarea
                          value={synopsisRevisionFeedback}
                          onChange={(e) => setSynopsisRevisionFeedback(e.target.value)}
                          rows={3}
                          placeholder="Feedback for synopsis revision (e.g., longer narration, richer dialogue cues, stronger tension)…"
                        />
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={reviseSynopsis}
                          disabled={!collapseWhitespace(synopsisRevisionFeedback) || genLoading}
                        >
                          <Sparkles className="h-4 w-4" /> Revise synopsis
                        </Button>
                      </div>
                      {genError ? (
                        <div className="text-sm text-[hsl(0_75%_55%)]">{genError}</div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {!isMobileViewport && showCreatePreview ? (
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm lg:col-span-2">
                    <div className="space-y-4 p-5 md:p-6">
                      <Button
                        variant="secondary"
                        className="w-full rounded-2xl"
                        type="button"
                        onClick={() => {
                          const chatTarget = getDraftCharacter();
                          if (!chatTarget) return alert("Please enter a character name before chatting.");
                          startChatWithCharacter(chatTarget);
                        }}
                      >
                        <MessageCircle className="h-4 w-4" /> Open Character Chat
                      </Button>
                      <div className="flex items-center justify-between gap-2">
                      <div className="text-lg font-semibold">Preview</div>
                      <Button variant="secondary" type="button" onClick={() => setShowCreatePreview(false)}>
                        Hide
                      </Button>
                    </div>
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
              ) : null}
              {!isMobileViewport && !showCreatePreview ? (
                <div className="hidden items-start lg:col-span-2 lg:flex">
                  <Button variant="secondary" type="button" onClick={() => setShowCreatePreview(true)}>
                    Show Preview
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}

        <Modal
          open={isMobileViewport && createPreviewOpen}
          onClose={() => setCreatePreviewOpen(false)}
          title="Preview"
          widthClass="max-w-xl"
        >
          <div className="space-y-4">
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

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  if (!draft) return alert("Enter a character name first.");
                  downloadText((filenameSafe(draft.name) || "character") + ".txt", characterToTxt(draft));
                }}
              >
                <Download className="h-4 w-4" /> Export TXT
              </Button>
              <Button variant="primary" type="button" onClick={saveCharacter}>
                <Plus className="h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        </Modal>

        {genLoading ? (
          <div
            className={cn(
              "fixed z-40 w-[min(92vw,340px)] rounded-xl border p-3 shadow-lg",
              "left-1/2 top-3 -translate-x-1/2 md:left-auto md:top-auto md:bottom-4 md:right-4 md:translate-x-0"
            )}
            style={{
              background: theme === "light" ? "hsl(222 10% 14%)" : "hsl(40 33% 96%)",
              borderColor: theme === "light" ? "hsl(222 10% 24%)" : "hsl(40 14% 80%)",
            }}
          >
            <div
              className="mb-2 text-xs font-medium"
              style={{ color: theme === "light" ? "hsl(40 33% 96%)" : "hsl(222 10% 14%)" }}
            >
              Proxy is writing…
            </div>
            <div
              className="h-2 overflow-hidden rounded-full"
              style={{
                background: theme === "light" ? "hsl(222 10% 26%)" : "hsl(220 8% 82%)",
              }}
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${proxyProgress}%`,
                  background: theme === "light" ? "hsl(44 90% 52%)" : "hsl(0 45% 48%)",
                }}
              />
            </div>
          </div>
        ) : null}


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
            <div className="space-y-2">
              <div className="text-sm font-medium">Temperature</div>
              <Input
                value={proxyTemperatureInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setProxyTemperatureInput(v);
                  if (v.trim() === "") return;
                  const n = Number(v);
                  if (Number.isFinite(n) && n >= 0 && n <= 2) setProxyTemperature(n);
                }}
                placeholder="e.g., 0.9"
                inputMode="decimal"
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Context size (tokens)</div>
              <input
                type="range"
                min={16000}
                max={128000}
                step={16000}
                value={proxyContextSize}
                onChange={(e) => setProxyContextSize(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                <span>16k</span>
                <span>32k</span>
                <span>64k</span>
                <span>128k</span>
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Current: {Math.round(proxyContextSize / 1000)}k tokens.</div>
            </div>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setProxyOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>

        <Modal open={personaOpen} onClose={() => setPersonaOpen(false)} title="Your Persona" widthClass="max-w-2xl">
          <div className="space-y-3">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Describe who you are / what you look like so characters can use this context in chat.
            </div>
            <Textarea
              value={personaText}
              onChange={(e) => setPersonaText(e.target.value)}
              rows={8}
              placeholder="Example: I am a 24-year-old detective with short black hair, calm voice, and a cautious personality..."
            />
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setPersonaOpen(false)}>
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
                  <div className="text-sm text-[hsl(var(--muted-foreground))]"><RichText text={previewChar.synopsis || ""} /></div>
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
                <div className="flex flex-wrap gap-2">
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
                    variant="secondary"
                    onClick={() => startChatWithCharacter(previewChar)}
                  >
                    <MessageCircle className="h-4 w-4" /> Chat
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

        <div className="pointer-events-none fixed inset-x-0 bottom-3 px-4 text-center text-[10px] text-[hsl(var(--muted-foreground))] md:inset-x-auto md:bottom-4 md:right-4 md:px-0 md:text-xs">
          © {new Date().getFullYear()} Sancte™. All rights reserved.
        </div>

        {saveToastOpen ? (
          <div className="fixed bottom-4 right-4 z-[70] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm shadow-lg">
            Saved.
          </div>
        ) : null}
      </div>
    </div>
  );
}
