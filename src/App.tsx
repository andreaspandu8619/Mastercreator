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
  Settings,
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
type Page = "library" | "characters" | "create" | "chat" | "storywriting" | "my_stories" | "story_editor" | "story_relationship_board" | "lorebooks" | "lorebook_create";
type CreateTab = "overview" | "personality" | "behavior" | "definition" | "system" | "intro" | "synopsis";
type StoryTab = "scenario" | "first_message" | "system_rules" | "relationships" | "plot_points";
type LorebookTab = "overview" | "world" | "locations" | "factions" | "rules" | "items" | "specials";

type ProxyConfig = {
  chatUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  contextSize: number;
  customPrompt: string;
  streamingEnabled: boolean;
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

type GeneratedTextPage = {
  id: string;
  text: string;
  isFinal: boolean;
};

type GeneratedTextState = {
  pages: GeneratedTextPage[];
  activeIndex: number;
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
  firstMessage: string;
  firstMessageVersions: string[];
  selectedFirstMessageIndex: number;
  firstMessageStyle: "realistic" | "dramatic" | "melancholic";
  systemRules: string;
  selectedSystemRuleIds: string[];
  plotPoints: string[];
  relationships: StoryRelationship[];
  boardNodes: StoryBoardNode[];
  assignedLorebookIds: string[];
  createdAt: string;
  updatedAt: string;
};

type LorebookEntry = {
  id: string;
  name: string;
  comment: string;
  content: string;
  keysRaw: string;
  keysecondaryRaw: string;
  enabled: boolean;
  constant: boolean;
  selective: boolean;
  disable: boolean;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  keyMatchPriority: boolean;
  priority: number;
  probability: number;
  minMessages: number;
  groupWeight: number;
  insertionOrder: number;
  order: number;
  position: number;
  activationMode: "standard";
  activationSetting: "any_key" | "selective" | "always_active" | "disabled";
  keyMatchMode: "partial" | "exact";
  tagsRaw: string;
  category: "world" | "location" | "faction" | "rule" | "item" | "special" | "character";
};

type LorebookFaction = {
  id: string;
  name: string;
  imageDataUrl: string;
  factionType: "passive" | "hostile";
  factionSize: "micro" | "small" | "medium" | "large" | "massive" | "colossal" | "mega-faction";
  details: string;
  entry: LorebookEntry;
  createdAt: string;
};

type Lorebook = {
  id: string;
  name: string;
  description: string;
  author: string;
  metaTagsRaw: string;
  coverImageDataUrl: string;
  worldEntry: LorebookEntry;
  locationEntries: LorebookEntry[];
  rulesEntries: LorebookEntry[];
  itemEntries: LorebookEntry[];
  specialsEntries: LorebookEntry[];
  factions: LorebookFaction[];
  createdAt: string;
  updatedAt: string;
};

type LoreMemoryTurn = {
  lorebookId: string;
  entryId: string;
  prompt: string;
  output: string;
  createdAt: string;
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
  physicalAppearance: string[];
  respondToProblems: string[];
  sexualBehavior: string[];
  backstory: string[];
  systemRules: string;
  synopsis: string;
  introMessages: string[];
  selectedIntroIndex: number;
  assignedLorebookIds: string[];
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
const LOREBOOKS_KEY = "mastercreator_lorebooks_v1";

const DEFAULT_PROXY: ProxyConfig = {
  chatUrl: "https://llm.chutes.ai/v1/chat/completions",
  apiKey: "",
  model: "deepseek-ai/DeepSeek-R1",
  maxTokens: 350,
  temperature: 0.9,
  contextSize: 32000,
  customPrompt: "",
  streamingEnabled: true,
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
  "Protective Leader", "Chaotic", "Lawful", "Honorable", "Sarcastic", "Flirtatious", "Jealous", "Idealistic", "Cynical", "Obsessive", "Merciful", "Vengeful", "Resourceful", "Disciplined", "Nurturing", "Intimidating", "Shy", "Extroverted", "Playful", "Serious", "Arrogant", "Humble", "Greedy", "Generous", "Reckless", "Calculated", "Devout", "Skeptical", "Detached", "Melancholic", "Stubborn", "Adaptable", "Dominant", "Submissive"
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

const STORY_SYSTEM_RULE_CARDS = [
  { id: "no-user-control", label: "Never speak or act as user", text: "{{char}} will NEVER talk nor act as {{user}} under any circumstances whatsoever." },
  { id: "personality-consistent", label: "Stay true to personality", text: "{{char}} will ALWAYS stay true to their/his/her personality." },
  { id: "story-forward", label: "Always move story forward", text: "The story will ALWAYS move forward with {{user}}’s and {{char}}’s actions." },
  { id: "no-fancy-language", label: "Avoid fancy language", text: "{{char}} will NEVER talk in overly fancy language." },
  { id: "speech-pattern", label: "Match speech pattern", text: "{{char}} will ALWAYS speak according to their/his/her personality, this includes speech pattern in responses." },
  { id: "interesting-dialogue", label: "Use interesting dialogue", text: "{{char}} will ALWAYS answer in interesting dialogues according to the conversation and topic and/or mood of the interaction, not short answers or short quips." },
  { id: "situational-awareness", label: "Situational awareness", text: "Have situational awareness and be cognizant of intercharacter relationships, characters avoid being overly familiar or sexually pushy towards {{user}} unless the situation calls for it, it is in character for them to do so, or they have a sexual relationship." },
  { id: "long-replies", label: "Reply over 500 tokens", text: "{{char}} will ALWAYS reply in over 500 tokens." },
] as const;

const USER_NODE_ID = "{{user}}";

const RESPONSE_TO_PROBLEMS_PRESETS = ["Logical", "Empathetic", "Aggressive", "Avoidant", "Strategic", "Impulsive", "Diplomatic", "Humorous", "Self-sacrificing", "Manipulative", "Defensive", "Calm under pressure"] as const;

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

function splitCsv(input: string): string[] {
  return String(input || "")
    .split(",")
    .map((v) => collapseWhitespace(v))
    .filter(Boolean);
}

function createDefaultLoreEntry(name = "", category: LorebookEntry["category"] = "rule", order = 100): LorebookEntry {
  const tag = category === "world" ? "world" : category === "faction" ? "faction" : "important";
  return {
    id: uid(),
    name,
    comment: "",
    content: "",
    keysRaw: "",
    keysecondaryRaw: "",
    enabled: true,
    constant: false,
    selective: false,
    disable: false,
    caseSensitive: false,
    matchWholeWords: true,
    keyMatchPriority: false,
    priority: 1,
    probability: 100,
    minMessages: 0,
    groupWeight: 100,
    insertionOrder: order,
    order,
    position: 0,
    activationMode: "standard",
    activationSetting: "any_key",
    keyMatchMode: "partial",
    tagsRaw: tag,
    category,
  };
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
    "## Assigned Lorebooks",
    (c.assignedLorebookIds || []).join(", "),
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
    physicalAppearance: normalizeStringArray(x.physicalAppearance),
    respondToProblems: normalizeStringArray(x.respondToProblems),
    sexualBehavior: normalizeStringArray(x.sexualBehavior),
    backstory: normalizeStringArray(x.backstory),
    systemRules: typeof x.systemRules === "string" ? x.systemRules : "",
    synopsis: typeof x.synopsis === "string" ? x.synopsis : "",
    introMessages: introMessages.length ? introMessages : [""],
    selectedIntroIndex,
    assignedLorebookIds: normalizeStringArray(x.assignedLorebookIds),
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
    "clickable inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition duration-200 hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100";

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
    physicalAppearance: ["Tall"],
    respondToProblems: ["Logical"],
    sexualBehavior: ["Reserved"],
    backstory: ["Born in the rain"],
    systemRules: "No OOC",
    synopsis: "A hunter.",
    introMessages: ["Hello", "Hi"],
    selectedIntroIndex: 1,
    assignedLorebookIds: [],
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
  const [proxyCustomPrompt, setProxyCustomPrompt] = useState(DEFAULT_PROXY.customPrompt);
  const [proxyStreamingEnabled, setProxyStreamingEnabled] = useState(DEFAULT_PROXY.streamingEnabled);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [personaText, setPersonaText] = useState("");

  const [chatCharacter, setChatCharacter] = useState<Character | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [stories, setStories] = useState<StoryProject[]>([]);
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [activeLorebookId, setActiveLorebookId] = useState<string | null>(null);
  const [lorebookTab, setLorebookTab] = useState<LorebookTab>("overview");
  const [lorebookWorldPrompt, setLorebookWorldPrompt] = useState("");
  const [loreEntryPrompts, setLoreEntryPrompts] = useState<Record<string, string>>({});
  const [loreMemoryTurns, setLoreMemoryTurns] = useState<LoreMemoryTurn[]>([]);
  const [characterAssignedLorebookIds, setCharacterAssignedLorebookIds] = useState<string[]>([]);
  const [characterLorebookPickerOpen, setCharacterLorebookPickerOpen] = useState(false);
  const [storyLorebookPickerOpen, setStoryLorebookPickerOpen] = useState(false);
  const [factionEditorOpen, setFactionEditorOpen] = useState(false);
  const [editingFactionId, setEditingFactionId] = useState<string | null>(null);
  const [factionNameInput, setFactionNameInput] = useState("");
  const [factionTypeInput, setFactionTypeInput] = useState<"passive" | "hostile">("passive");
  const [factionSizeInput, setFactionSizeInput] = useState<LorebookFaction["factionSize"]>("small");
  const [factionDetailsInput, setFactionDetailsInput] = useState("");
  const [factionImageDataUrl, setFactionImageDataUrl] = useState("");
  const [factionCommentInput, setFactionCommentInput] = useState("");
  const [factionKeysInput, setFactionKeysInput] = useState("");
  const [factionTagsInput, setFactionTagsInput] = useState("faction");
  const [factionPriorityInput, setFactionPriorityInput] = useState(1);
  const [factionEnabledInput, setFactionEnabledInput] = useState(true);
  const [factionEntryDraft, setFactionEntryDraft] = useState<LorebookEntry>(createDefaultLoreEntry("", "faction", 100));
  const [activeLocationEntryId, setActiveLocationEntryId] = useState<string | null>(null);
  const [activeRuleEntryId, setActiveRuleEntryId] = useState<string | null>(null);
  const [activeItemEntryId, setActiveItemEntryId] = useState<string | null>(null);
  const [activeSpecialEntryId, setActiveSpecialEntryId] = useState<string | null>(null);
  const [storyDraftCharacterIds, setStoryDraftCharacterIds] = useState<string[]>([]);
  const [storyDraftMobileSelection, setStoryDraftMobileSelection] = useState<string[]>([]);
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
  const [relationshipDrag, setRelationshipDrag] = useState<{
    id: string;
    source: "board" | "deck";
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [deckDropHover, setDeckDropHover] = useState(false);
  const [storywritingDragPreview, setStorywritingDragPreview] = useState<{
    id: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [boardPan, setBoardPan] = useState({ x: 0, y: 0 });
  const [boardPanning, setBoardPanning] = useState(false);
  const boardPanStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [saveToastOpen, setSaveToastOpen] = useState(false);
  const dotPointerDownRef = useRef(false);
  const connectingFromIdRef = useRef<string | null>(null);
  const connectionSnapTargetIdRef = useRef<string | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const relationshipDeckRef = useRef<HTMLDivElement | null>(null);
  const storywritingDndRef = useRef<HTMLDivElement | null>(null);
  const storywritingFieldRef = useRef<HTMLDivElement | null>(null);
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
  const [personalities, setPersonalities] = useState<string[]>([]);

  const [traitInput, setTraitInput] = useState("");
  const [traits, setTraits] = useState<string[]>([]);
  const [appearanceInput, setAppearanceInput] = useState("");
  const [physicalAppearance, setPhysicalAppearance] = useState<string[]>([]);
  const [problemBehavior, setProblemBehavior] = useState<string[]>([]);
  const [sexualBehaviorInput, setSexualBehaviorInput] = useState("");
  const [sexualBehavior, setSexualBehavior] = useState<string[]>([]);

  const [backstoryText, setBackstoryText] = useState("");
  const [backstoryPrompt, setBackstoryPrompt] = useState("");
  const [backstory, setBackstory] = useState<string[]>([]);

  const [systemRules, setSystemRules] = useState("");
  const [synopsis, setSynopsis] = useState("");

  const [storyFirstMessageInput, setStoryFirstMessageInput] = useState("");
  const [storyFirstMessageStyle, setStoryFirstMessageStyle] = useState<"realistic" | "dramatic" | "melancholic">("realistic");
  const [storyFirstMessagePrompt, setStoryFirstMessagePrompt] = useState("");
  const [storyFirstMessageRevisionPrompt, setStoryFirstMessageRevisionPrompt] = useState("");
  const [storyFirstMessageHistories, setStoryFirstMessageHistories] = useState<string[][]>([[""]]);
  const [storyFirstMessageHistoryIndices, setStoryFirstMessageHistoryIndices] = useState<number[]>([0]);
  const [storySystemRulesInput, setStorySystemRulesInput] = useState("");

  const [introMessages, setIntroMessages] = useState<string[]>([""]);
  const [introIndex, setIntroIndex] = useState(0);
  const [introVersionHistories, setIntroVersionHistories] = useState<string[][]>([[""]]);
  const [introVersionIndices, setIntroVersionIndices] = useState<number[]>([0]);
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

  useEffect(() => {
    if (!connectingFromId) return;
    const handleRelease = () => {
      const currentFromId = connectingFromIdRef.current;
      const snapTargetId = connectionSnapTargetIdRef.current;
      if (currentFromId && snapTargetId && currentFromId !== snapTargetId) {
        openRelationshipEditor(currentFromId, snapTargetId);
      }
      connectingFromIdRef.current = null;
      connectionSnapTargetIdRef.current = null;
      setConnectingFromId(null);
      setConnectingPointer(null);
      setConnectionSnapTargetId(null);
    };
    window.addEventListener("mouseup", handleRelease);
    return () => {
      window.removeEventListener("mouseup", handleRelease);
    };
  }, [connectingFromId]);

  useEffect(() => {
    if (!relationshipDrag) return;
    const handleMouseMove = (e: MouseEvent) => {
      updateRelationshipCardDrag(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      endRelationshipCardDrag();
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [relationshipDrag, boardPan.x, boardPan.y, activeStoryId]);

  useEffect(() => {
    if (!storywritingDragPreview) return;
    const handleMouseMove = (e: MouseEvent) => {
      updateStorywritingCardDrag(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      endStorywritingCardDrag();
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [storywritingDragPreview]);

  const [introRevisionPrompt, setIntroRevisionPrompt] = useState("");
  const [relationshipDetailsPrompt, setRelationshipDetailsPrompt] = useState("");
  const [synopsisRevisionFeedback, setSynopsisRevisionFeedback] = useState("");
  const [generatedTextStates, setGeneratedTextStates] = useState<Record<string, GeneratedTextState>>({});

  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [proxyProgress, setProxyProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState<null | "characters" | "stories" | "lorebooks" | "settings">(null);
  const navMenusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 768);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!navMenusRef.current) return;
      const target = event.target as Node | null;
      if (target && navMenusRef.current.contains(target)) return;
      setNavMenuOpen(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function startGeneratedTextPage(fieldKey: string) {
    const pageId = uid();
    setGeneratedTextStates((prev) => {
      const state = prev[fieldKey] || { pages: [], activeIndex: 0 };
      const nextPages = [...state.pages, { id: pageId, text: "", isFinal: false }];
      return { ...prev, [fieldKey]: { pages: nextPages, activeIndex: nextPages.length - 1 } };
    });
  }

  function updateGeneratedTextPage(fieldKey: string, text: string, isFinal?: boolean) {
    setGeneratedTextStates((prev) => {
      const state = prev[fieldKey];
      if (!state || !state.pages.length) return prev;
      const idx = Math.max(0, Math.min(state.activeIndex, state.pages.length - 1));
      const nextPages = [...state.pages];
      nextPages[idx] = {
        ...nextPages[idx],
        text,
        isFinal: typeof isFinal === "boolean" ? isFinal : nextPages[idx].isFinal,
      };
      return { ...prev, [fieldKey]: { ...state, pages: nextPages } };
    });
  }

  function setGeneratedTextActivePage(fieldKey: string, activeIndex: number) {
    setGeneratedTextStates((prev) => {
      const state = prev[fieldKey];
      if (!state || !state.pages.length) return prev;
      const next = Math.max(0, Math.min(activeIndex, state.pages.length - 1));
      return { ...prev, [fieldKey]: { ...state, activeIndex: next } };
    });
  }

  function commitGeneratedText(fieldKey: string, text: string, onCommit: (next: string) => void, isFinal?: boolean) {
    updateGeneratedTextPage(fieldKey, text, isFinal);
    onCommit(text);
  }

  function renderGeneratedTextarea(args: {
    fieldKey: string;
    value: string;
    onChange: (next: string) => void;
    rows: number;
    placeholder?: string;
  }) {
    const state = generatedTextStates[args.fieldKey];
    const pages = state?.pages || [];
    const activeIndex = state ? Math.max(0, Math.min(state.activeIndex, Math.max(0, pages.length - 1))) : 0;
    const activePage = pages[activeIndex];
    const effectiveValue = activePage ? activePage.text : args.value;
    const isStreaming = !!activePage && !activePage.isFinal;

    const canBack = pages.length > 0 && activeIndex > 0;
    const canForward = pages.length > 0 && activeIndex < pages.length - 1;

    return (
      <div className="space-y-2">
        {pages.length > 0 ? (
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              type="button"
              disabled={!canBack}
              onClick={() => {
                const next = Math.max(0, activeIndex - 1);
                setGeneratedTextActivePage(args.fieldKey, next);
                args.onChange(pages[next]?.text || "");
              }}
            >
              <ChevronLeft className="h-4 w-4" /> Roll back
            </Button>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Iteration {activeIndex + 1} / {pages.length}</div>
            <Button
              variant="secondary"
              type="button"
              disabled={!canForward}
              onClick={() => {
                const next = Math.min(pages.length - 1, activeIndex + 1);
                setGeneratedTextActivePage(args.fieldKey, next);
                args.onChange(pages[next]?.text || "");
              }}
            >
              Roll forward <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
        <Textarea
          value={effectiveValue}
          onChange={(e) => commitGeneratedText(args.fieldKey, e.target.value, args.onChange, true)}
          rows={args.rows}
          placeholder={args.placeholder}
          className={cn(isStreaming && "opacity-60")}
        />
      </div>
    );
  }

  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const storyImageFileRef = useRef<HTMLInputElement | null>(null);
  const lorebookCoverFileRef = useRef<HTMLInputElement | null>(null);
  const factionImageFileRef = useRef<HTMLInputElement | null>(null);
  const sexualBehaviorImportRef = useRef<HTMLInputElement | null>(null);
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
      if (typeof (savedProxy as any).customPrompt === "string") setProxyCustomPrompt((savedProxy as any).customPrompt);
      if (typeof (savedProxy as any).streamingEnabled === "boolean") setProxyStreamingEnabled((savedProxy as any).streamingEnabled);
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
            firstMessage: typeof (s as any).firstMessage === "string" ? (s as any).firstMessage : "",
            firstMessageVersions: normalizeStringArray((s as any).firstMessageVersions).length
              ? normalizeStringArray((s as any).firstMessageVersions)
              : (typeof (s as any).firstMessage === "string" && collapseWhitespace((s as any).firstMessage))
                ? [String((s as any).firstMessage)]
                : [""],
            selectedFirstMessageIndex: Number.isFinite(Number((s as any).selectedFirstMessageIndex))
              ? Math.max(0, Number((s as any).selectedFirstMessageIndex))
              : 0,
            firstMessageStyle: (s as any).firstMessageStyle === "dramatic" || (s as any).firstMessageStyle === "melancholic" ? (s as any).firstMessageStyle : "realistic",
            systemRules: typeof (s as any).systemRules === "string" ? (s as any).systemRules : "",
            selectedSystemRuleIds: normalizeStringArray((s as any).selectedSystemRuleIds),
            plotPoints: normalizeStringArray((s as any).plotPoints),
            relationships: Array.isArray((s as any).relationships) ? (s as any).relationships : [],
            boardNodes: Array.isArray((s as any).boardNodes) ? (s as any).boardNodes : [],
            assignedLorebookIds: normalizeStringArray((s as any).assignedLorebookIds),
            createdAt: typeof (s as any).createdAt === "string" ? (s as any).createdAt : now,
            updatedAt: typeof (s as any).updatedAt === "string" ? (s as any).updatedAt : now,
          } as StoryProject;
        })
        .filter((x): x is StoryProject => !!x)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setStories(normalizedStories);
    }

    const savedLorebooks = safeParseJSON(localStorage.getItem(LOREBOOKS_KEY) || "");
    if (Array.isArray(savedLorebooks)) {
      const normalizedLorebooks = savedLorebooks
        .map((book) => {
          if (!book || typeof book !== "object") return null;
          const id = typeof (book as any).id === "string" ? (book as any).id : uid();
          const now = new Date().toISOString();

          const normalizeEntry = (raw: any, defaultName: string, category: LorebookEntry["category"], order: number) => {
            const base = createDefaultLoreEntry(defaultName, category, order);
            if (!raw || typeof raw !== "object") return base;
            const activationSetting = raw.activationSetting === "selective" || raw.activationSetting === "always_active" || raw.activationSetting === "disabled" ? raw.activationSetting : "any_key";
            return {
              ...base,
              id: typeof raw.id === "string" ? raw.id : base.id,
              name: collapseWhitespace(raw.name ?? base.name),
              comment: typeof raw.comment === "string" ? raw.comment : base.comment,
              content: typeof raw.content === "string" ? raw.content : base.content,
              keysRaw: typeof raw.keysRaw === "string" ? raw.keysRaw : Array.isArray(raw.key) ? raw.key.join(", ") : base.keysRaw,
              keysecondaryRaw: typeof raw.keysecondaryRaw === "string" ? raw.keysecondaryRaw : Array.isArray(raw.keysecondary) ? raw.keysecondary.join(", ") : base.keysecondaryRaw,
              enabled: raw.enabled !== false && raw.disable !== true,
              constant: !!raw.constant,
              selective: !!raw.selective,
              disable: !!raw.disable,
              caseSensitive: !!raw.caseSensitive || !!raw.case_sensitive,
              matchWholeWords: raw.matchWholeWords !== false,
              keyMatchPriority: !!raw.keyMatchPriority,
              priority: Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : base.priority,
              probability: Number.isFinite(Number(raw.probability)) ? Number(raw.probability) : base.probability,
              minMessages: Number.isFinite(Number(raw.minMessages)) ? Number(raw.minMessages) : base.minMessages,
              groupWeight: Number.isFinite(Number(raw.groupWeight)) ? Number(raw.groupWeight) : base.groupWeight,
              insertionOrder: Number.isFinite(Number(raw.insertionOrder)) ? Number(raw.insertionOrder) : Number.isFinite(Number(raw.insertion_order)) ? Number(raw.insertion_order) : base.insertionOrder,
              order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : base.order,
              position: Number.isFinite(Number(raw.position)) ? Number(raw.position) : base.position,
              activationSetting,
              keyMatchMode: raw.keyMatchMode === "exact" ? "exact" : "partial",
              tagsRaw: typeof raw.tagsRaw === "string" ? raw.tagsRaw : base.tagsRaw,
              category: ["world","location","faction","rule","item","special","character"].includes(raw.category) ? raw.category : category,
            } as LorebookEntry;
          };

          const factions = Array.isArray((book as any).factions)
            ? (book as any).factions
                .map((f: any, idx: number) => {
                  if (!f || typeof f !== "object") return null;
                  const name = collapseWhitespace(f.name ?? f.entry?.name ?? "");
                  if (!name) return null;
                  const entry = normalizeEntry(f.entry, name, "faction", (idx + 1) * 100);
                  if (typeof f.description === "string" && !entry.content) entry.content = f.description;
                  return {
                    id: typeof f.id === "string" ? f.id : uid(),
                    name,
                    imageDataUrl: typeof f.imageDataUrl === "string" ? f.imageDataUrl : "",
                    factionType: f.factionType === "hostile" ? "hostile" : "passive",
                    factionSize: ["micro", "small", "medium", "large", "massive", "colossal", "mega-faction"].includes(f.factionSize) ? f.factionSize : "small",
                    details: typeof f.details === "string" ? f.details : entry.content,
                    entry,
                    createdAt: typeof f.createdAt === "string" ? f.createdAt : now,
                  } as LorebookFaction;
                })
                .filter((f: LorebookFaction | null): f is LorebookFaction => !!f)
            : [];

          const worldEntry = (book as any).worldEntry
            ? normalizeEntry((book as any).worldEntry, "World Overview", "world", 100)
            : normalizeEntry({
                name: "World Overview",
                content: typeof (book as any).world === "string" ? (book as any).world : "",
                tagsRaw: "world",
                keysRaw: "world",
              }, "World Overview", "world", 100);

          const locationEntries = Array.isArray((book as any).locationEntries)
            ? (book as any).locationEntries.map((entry: any, idx: number) => normalizeEntry(entry, `Location ${idx + 1}`, "location", (idx + 1) * 100))
            : [];

          const rulesEntries = Array.isArray((book as any).rulesEntries)
            ? (book as any).rulesEntries.map((entry: any, idx: number) => normalizeEntry(entry, `Rule ${idx + 1}`, "rule", (idx + 1) * 100))
            : [];

          const itemEntries = Array.isArray((book as any).itemEntries)
            ? (book as any).itemEntries.map((entry: any, idx: number) => normalizeEntry(entry, `Item ${idx + 1}`, "item", (idx + 1) * 100))
            : [];

          const specialsEntries = Array.isArray((book as any).specialsEntries)
            ? (book as any).specialsEntries.map((entry: any, idx: number) => normalizeEntry(entry, `Special ${idx + 1}`, "special", (idx + 1) * 100))
            : Array.isArray((book as any).powers)
              ? (book as any).powers.map((entry: any, idx: number) => normalizeEntry(entry, `Special ${idx + 1}`, "special", (idx + 1) * 100))
              : [];

          return {
            id,
            name: collapseWhitespace((book as any).name || "Untitled lorebook"),
            description: typeof (book as any).description === "string" ? (book as any).description : "",
            author: typeof (book as any).author === "string" ? (book as any).author : "",
            metaTagsRaw: typeof (book as any).metaTagsRaw === "string" ? (book as any).metaTagsRaw : "",
            coverImageDataUrl: typeof (book as any).coverImageDataUrl === "string" ? (book as any).coverImageDataUrl : "",
            worldEntry,
            locationEntries,
            rulesEntries,
            itemEntries,
            specialsEntries,
            factions,
            createdAt: typeof (book as any).createdAt === "string" ? (book as any).createdAt : now,
            updatedAt: typeof (book as any).updatedAt === "string" ? (book as any).updatedAt : now,
          } as Lorebook;
        })
        .filter((book: Lorebook | null): book is Lorebook => !!book)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setLorebooks(normalizedLorebooks);
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
        customPrompt: proxyCustomPrompt,
        streamingEnabled: proxyStreamingEnabled,
      })
    );
  }, [proxyChatUrl, proxyApiKey, proxyModel, proxyMaxTokens, proxyTemperature, proxyContextSize, proxyCustomPrompt, proxyStreamingEnabled]);

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
    localStorage.setItem(LOREBOOKS_KEY, JSON.stringify(lorebooks));
  }, [lorebooks]);

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
    setPersonalities([]);

    setTraitInput("");
    setTraits([]);
    setAppearanceInput("");
    setPhysicalAppearance([]);
    setProblemBehavior([]);
    setSexualBehaviorInput("");
    setSexualBehavior([]);

    setBackstoryText("");
    setBackstoryPrompt("");
    setBackstory([]);

    setSystemRules("");
    setSynopsis("");

    setIntroMessages([""]);
    setIntroIndex(0);
    setIntroVersionHistories([[""]]);
    setIntroVersionIndices([0]);
    setIntroPrompt("");

    setIntroRevisionPrompt("");
    setSynopsisRevisionFeedback("");

    setGenError(null);
    setGenLoading(false);
    setChatCharacter(null);
    setActiveChatSessionId(null);
    setChatMessages([]);
    setChatInput("");
    setCharacterAssignedLorebookIds([]);
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
      physicalAppearance: Array.isArray(physicalAppearance) ? physicalAppearance : [],
      respondToProblems: Array.isArray(problemBehavior) ? problemBehavior : [],
      sexualBehavior: Array.isArray(sexualBehavior) ? sexualBehavior : [],
      backstory: collapseWhitespace(backstoryText) ? [backstoryText] : [],
      systemRules,
      synopsis,
      introMessages: baseIntro,
      selectedIntroIndex: safeIntroIndex,
      assignedLorebookIds: characterAssignedLorebookIds,
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

  async function handlePickLorebookCover(file: File) {
    if (!activeLorebook) return;
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateLorebook(activeLorebook.id, { coverImageDataUrl: dataUrl });
    } catch {
      // ignore invalid lorebook cover
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
    setIntroVersionHistories(im.map((text) => [text || ""]));
    setIntroVersionIndices(im.map(() => 0));
    setIntroPrompt("");
    setCharacterAssignedLorebookIds(Array.isArray(c.assignedLorebookIds) ? c.assignedLorebookIds : []);

    setIntroRevisionPrompt("");
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

  function serializeLorebookForContext(book: Lorebook) {
    const parts: string[] = [];
    if (book.worldEntry?.name || book.worldEntry?.content) {
      parts.push(`[World] ${book.worldEntry.name || "World"}: ${book.worldEntry.content || ""}`);
    }
    for (const e of book.locationEntries || []) parts.push(`[Location] ${e.name}: ${e.content}`);
    for (const f of book.factions || []) parts.push(`[Faction] ${f.name}: ${f.details || f.entry?.content || ""}`);
    for (const e of book.rulesEntries || []) parts.push(`[Rule] ${e.name}: ${e.content}`);
    for (const e of book.itemEntries || []) parts.push(`[Item] ${e.name}: ${e.content}`);
    for (const e of book.specialsEntries || []) parts.push(`[Special] ${e.name}: ${e.content}`);
    return `# Lorebook: ${book.name}\n${parts.join("\n")}`;
  }

  function getAssignedLorebookContext(assignedLorebookIds: string[] = []) {
    const ids = Array.from(new Set((assignedLorebookIds || []).filter(Boolean)));
    if (!ids.length) return "";
    const assigned = ids
      .map((id) => lorebooks.find((b) => b.id === id))
      .filter((b): b is Lorebook => !!b);
    if (!assigned.length) return "";
    return assigned.map(serializeLorebookForContext).join("\n\n");
  }

  const activeStory = useMemo(
    () => stories.find((s) => s.id === activeStoryId) || null,
    [stories, activeStoryId]
  );

  useEffect(() => {
    const versions = activeStory?.firstMessageVersions?.length
      ? activeStory.firstMessageVersions
      : [activeStory?.firstMessage || ""];
    const selectedIdx = clampIndex(activeStory?.selectedFirstMessageIndex || 0, versions.length);
    setStoryImageDataUrl(activeStory?.imageDataUrl || "");
    setStoryFirstMessageInput(versions[selectedIdx] || "");
    setStoryFirstMessageHistories(versions.map((text) => [text || ""]));
    setStoryFirstMessageHistoryIndices(versions.map(() => 0));
    setStoryFirstMessageRevisionPrompt(`Current first message context:\n${versions[selectedIdx] || "(empty)"}\n\nRevision instructions:\n`);
    setStoryFirstMessageStyle(activeStory?.firstMessageStyle || "realistic");
    setStorySystemRulesInput(activeStory?.systemRules || "");
  }, [activeStory?.id]);

  const latestCharacter = useMemo(
    () => (characters.length ? [...characters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] : null),
    [characters]
  );

  const latestStory = useMemo(
    () => (stories.length ? [...stories].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] : null),
    [stories]
  );

  const activeLorebook = useMemo(
    () => lorebooks.find((book) => book.id === activeLorebookId) || null,
    [lorebooks, activeLorebookId]
  );

  useEffect(() => {
    if (!activeLorebook) return;
    if (!activeLocationEntryId && activeLorebook.locationEntries.length) {
      setActiveLocationEntryId(activeLorebook.locationEntries[0].id);
    }
    if (!activeRuleEntryId && activeLorebook.rulesEntries.length) {
      setActiveRuleEntryId(activeLorebook.rulesEntries[0].id);
    }
    if (!activeItemEntryId && activeLorebook.itemEntries.length) {
      setActiveItemEntryId(activeLorebook.itemEntries[0].id);
    }
    if (!activeSpecialEntryId && activeLorebook.specialsEntries.length) {
      setActiveSpecialEntryId(activeLorebook.specialsEntries[0].id);
    }
  }, [activeLorebook?.id, activeLorebook?.locationEntries.length, activeLorebook?.rulesEntries.length, activeLorebook?.itemEntries.length, activeLorebook?.specialsEntries.length]);

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

  function deleteStory(id: string) {
    setStories((prev) => prev.filter((s) => s.id !== id));
    if (activeStoryId === id) setActiveStoryId(null);
  }


  function toggleCharacterLorebookAssignment(lorebookId: string) {
    setCharacterAssignedLorebookIds((prev) =>
      prev.includes(lorebookId) ? prev.filter((id) => id !== lorebookId) : [...prev, lorebookId]
    );
  }

  function toggleStoryLorebookAssignment(lorebookId: string) {
    if (!activeStory) return;
    const next = activeStory.assignedLorebookIds.includes(lorebookId)
      ? activeStory.assignedLorebookIds.filter((id) => id !== lorebookId)
      : [...activeStory.assignedLorebookIds, lorebookId];
    updateStory(activeStory.id, { assignedLorebookIds: next });
  }

  function togglePreviewCharacterLorebookAssignment(characterId: string, lorebookId: string) {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== characterId) return c;
        const assigned = c.assignedLorebookIds || [];
        const next = assigned.includes(lorebookId)
          ? assigned.filter((id) => id !== lorebookId)
          : [...assigned, lorebookId];
        return { ...c, assignedLorebookIds: next, updatedAt: new Date().toISOString() };
      })
    );
  }

  function createLorebook() {
    const now = new Date().toISOString();
    const book: Lorebook = {
      id: uid(),
      name: `Lorebook ${lorebooks.length + 1}`,
      description: "",
      author: "",
      metaTagsRaw: "",
      coverImageDataUrl: "",
      worldEntry: createDefaultLoreEntry("World Overview", "world", 100),
      locationEntries: [],
      rulesEntries: [],
      itemEntries: [],
      specialsEntries: [],
      factions: [],
      createdAt: now,
      updatedAt: now,
    };
    setLorebooks((prev) => [book, ...prev]);
    setActiveLorebookId(book.id);
    setLorebookTab("overview");
    navigateTo("lorebook_create");
  }

  function updateLorebook(id: string, patch: Partial<Lorebook>) {
    setLorebooks((prev) =>
      prev.map((book) =>
        book.id === id
          ? {
              ...book,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : book
      )
    );
  }

  function updateLorebookEntry(listKey: "locationEntries" | "rulesEntries" | "itemEntries" | "specialsEntries", entryId: string, patch: Partial<LorebookEntry>) {
    if (!activeLorebook) return;
    const next = activeLorebook[listKey].map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry));
    updateLorebook(activeLorebook.id, { [listKey]: next } as Partial<Lorebook>);
  }

  function addLorebookEntry(listKey: "locationEntries" | "rulesEntries" | "itemEntries" | "specialsEntries", baseName: string) {
    if (!activeLorebook) return;
    const current = activeLorebook[listKey];
    const entryCategory = listKey === "locationEntries" ? "location" : listKey === "itemEntries" ? "item" : listKey === "specialsEntries" ? "special" : "rule";
    const entry = createDefaultLoreEntry(`${baseName} ${current.length + 1}`, entryCategory, (current.length + 1) * 100);
    updateLorebook(activeLorebook.id, { [listKey]: [entry, ...current] } as Partial<Lorebook>);
    if (listKey === "locationEntries") setActiveLocationEntryId(entry.id);
    if (listKey === "rulesEntries") setActiveRuleEntryId(entry.id);
    if (listKey === "itemEntries") setActiveItemEntryId(entry.id);
    if (listKey === "specialsEntries") setActiveSpecialEntryId(entry.id);
  }

  function removeLorebookEntry(listKey: "locationEntries" | "rulesEntries" | "itemEntries" | "specialsEntries", entryId: string) {
    if (!activeLorebook) return;
    updateLorebook(activeLorebook.id, { [listKey]: activeLorebook[listKey].filter((entry) => entry.id !== entryId) } as Partial<Lorebook>);
    if (listKey === "locationEntries" && activeLocationEntryId === entryId) setActiveLocationEntryId(null);
    if (listKey === "rulesEntries" && activeRuleEntryId === entryId) setActiveRuleEntryId(null);
    if (listKey === "itemEntries" && activeItemEntryId === entryId) setActiveItemEntryId(null);
    if (listKey === "specialsEntries" && activeSpecialEntryId === entryId) setActiveSpecialEntryId(null);
  }

  async function handlePickFactionImage(file: File) {
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFactionImageDataUrl(dataUrl);
    } catch {
      // ignore
    }
  }

  function openFactionEditor(faction?: LorebookFaction) {
    if (!faction) {
      setEditingFactionId(null);
      setFactionNameInput("");
      setFactionTypeInput("passive");
      setFactionSizeInput("small");
      setFactionDetailsInput("");
      setFactionImageDataUrl("");
      setFactionCommentInput("");
      setFactionKeysInput("");
      setFactionTagsInput("faction");
      setFactionPriorityInput(1);
      setFactionEnabledInput(true);
      setFactionEntryDraft(createDefaultLoreEntry("", "faction", 100));
      setFactionEditorOpen(true);
      return;
    }
    setEditingFactionId(faction.id);
    setFactionNameInput(faction.name);
    setFactionTypeInput(faction.factionType);
    setFactionSizeInput(faction.factionSize);
    setFactionDetailsInput(faction.details);
    setFactionImageDataUrl(faction.imageDataUrl || "");
    setFactionCommentInput(faction.entry.comment || "");
    setFactionKeysInput(faction.entry.keysRaw || "");
    setFactionTagsInput(faction.entry.tagsRaw || "faction");
    setFactionPriorityInput(faction.entry.priority || 1);
    setFactionEnabledInput(faction.entry.enabled !== false);
    setFactionEntryDraft({ ...createDefaultLoreEntry(faction.name, "faction", 100), ...faction.entry, category: "faction" });
    setFactionEditorOpen(true);
  }

  function saveFactionEditor() {
    if (!activeLorebook) return;
    const cleanName = collapseWhitespace(factionNameInput);
    if (!cleanName) return;
    const now = new Date().toISOString();
    const entryBase = createDefaultLoreEntry(cleanName, "faction", factionEntryDraft.order || 100);
    const payload: LorebookFaction = {
      id: editingFactionId || uid(),
      name: cleanName,
      imageDataUrl: factionImageDataUrl,
      factionType: factionTypeInput,
      factionSize: factionSizeInput,
      details: factionDetailsInput,
      entry: {
        ...entryBase,
        ...factionEntryDraft,
        id: editingFactionId || uid(),
        name: cleanName,
        comment: factionCommentInput,
        content: factionDetailsInput,
        keysRaw: factionKeysInput,
        priority: Math.max(1, Number(factionPriorityInput) || 1),
        enabled: factionEnabledInput,
        tagsRaw: factionTagsInput || "faction",
        category: "faction",
      },
      createdAt: now,
    };
    const nextFactions = editingFactionId
      ? activeLorebook.factions.map((f) => (f.id === editingFactionId ? { ...payload, createdAt: f.createdAt } : f))
      : [payload, ...activeLorebook.factions];
    updateLorebook(activeLorebook.id, { factions: nextFactions });
    setFactionEditorOpen(false);
  }

  function exportLorebookAsEntries(book: Lorebook) {
    const allEntries: Array<{ entry: LorebookEntry; contentOverride?: string }> = [
      { entry: { ...book.worldEntry, category: "world" as const, tagsRaw: "world" } },
      ...book.locationEntries.map((entry) => ({ entry: { ...entry, category: "location" as const, tagsRaw: "important" } })),
      ...book.factions.map((f) => ({ entry: { ...f.entry, category: "faction" as const, tagsRaw: "faction", name: f.name }, contentOverride: f.details || f.entry.content })),
      ...book.rulesEntries.map((entry) => ({ entry: { ...entry, category: "rule" as const, tagsRaw: "important" } })),
      ...book.itemEntries.map((entry) => ({ entry: { ...entry, category: "item" as const, tagsRaw: "important" } })),
      ...book.specialsEntries.map((entry) => ({ entry: { ...entry, category: "special" as const, tagsRaw: "important" } })),
    ];

    const entries: Record<string, any> = {};
    allEntries.forEach((item, index) => {
      const entry = item.entry;
      const key = String(index + 1);
      entries[key] = {
        uid: index + 1,
        name: entry.name,
        key: splitCsv(entry.keysRaw).length ? splitCsv(entry.keysRaw) : [entry.name],
        keysecondary: splitCsv(entry.keysecondaryRaw),
        comment: entry.comment,
        content: item.contentOverride ?? entry.content,
        constant: entry.activationSetting === "always_active" ? true : entry.constant,
        selective: entry.activationSetting === "selective" ? true : entry.selective,
        disable: entry.activationSetting === "disabled" ? true : entry.disable || !entry.enabled,
        order: entry.order,
        position: entry.position,
        category: entry.category,
        keyMatchMode: entry.keyMatchMode,
      };
    });

    const out = {
      name: book.name,
      description: book.description || "",
      entries,
      extensions: {
        world_info_depth: 2,
        world_info_budget: 2048,
        world_info_min_activations: 0,
        world_info_max_activations: 100,
        world_info_recursive_scanning: true,
        world_info_overflow_alert: true,
        world_info_case_sensitive: false,
        world_info_match_whole_words: false,
      },
      meta: {
        title: book.name,
        author: book.author || "",
        description: book.description || "",
        category: "original",
        tags: splitCsv(book.metaTagsRaw),
        entryCount: allEntries.length,
        totalTokens: 0,
        featured: false,
        lastChanges: {
          descriptionChanged: false,
          entriesChanged: [],
          entriesAdded: [],
          entriesDeleted: [],
          metaChanged: [],
        },
        changelog: [],
        source: "LoreBary",
        version: "1.0",
      },
    };

    downloadJSON((filenameSafe(book.name) || "lorebook") + "_entries.json", out);
  }

  function buildLorebookContextForEditing(book: Lorebook) {
    return [
      `Lorebook: ${book.name}`,
      book.description ? `Description: ${book.description}` : "",
      serializeLorebookForContext(book),
    ].filter(Boolean).join("\n\n");
  }

  function trimTextToContextWindow(text: string, contextTokens: number) {
    const maxChars = Math.max(2000, Math.floor(contextTokens * 4));
    const raw = String(text || "");
    return raw.length > maxChars ? raw.slice(raw.length - maxChars) : raw;
  }

  function getLoreMemoryContext(lorebookId: string, entryId?: string) {
    const turns = loreMemoryTurns.filter((t) => t.lorebookId === lorebookId && (!entryId || t.entryId === entryId));
    if (!turns.length) return "";
    const joined = turns
      .map((t, i) => `Iteration ${i + 1}\nPrompt: ${t.prompt}\nResult:\n${t.output}`)
      .join("\n\n");
    return trimTextToContextWindow(joined, proxyContextSize);
  }

  function rememberLoreIteration(lorebookId: string, entryId: string, prompt: string, output: string) {
    const turn: LoreMemoryTurn = { lorebookId, entryId, prompt, output, createdAt: new Date().toISOString() };
    setLoreMemoryTurns((prev) => {
      const merged = [...prev, turn];
      const hardCap = Math.max(20, Math.floor(proxyContextSize / 128));
      return merged.slice(-hardCap);
    });
  }

  async function applyLoreEntryPrompt(
    entry: LorebookEntry,
    promptInput: string,
    onPatch: (patch: Partial<LorebookEntry>) => void,
    contentLabel: string
  ) {
    if (!activeLorebook) return;
    const prompt = collapseWhitespace(promptInput);
    if (!prompt) {
      setGenError("Write a prompt first.");
      return;
    }
    const fieldKey = `lore-entry:${activeLorebook.id}:${entry.id}`;
    setGenError(null);
    setGenLoading(true);
    startGeneratedTextPage(fieldKey);
    try {
      const context = buildLorebookContextForEditing(activeLorebook);
      const memoryContext = getLoreMemoryContext(activeLorebook.id, entry.id);
      const text = await callProxyChatCompletion({
        system: `You are a lorebook writing assistant. Improve and extend an existing ${contentLabel.toLowerCase()} using the user prompt and lorebook context. Keep continuity with what is already written. Do not restart from scratch, refine the existing text. Return only the revised ${contentLabel.toLowerCase()}.`,
        user: `Lorebook context:
${context}

Iteration memory (keep all of this consistent):
${memoryContext || "(none yet)"}

Entry name: ${entry.name || "Untitled"}
Current ${contentLabel.toLowerCase()}:
${entry.content || "(empty)"}

User prompt for improvements:
${prompt}`,
        maxTokens: proxyMaxTokens,
        temperature: 0.8,
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => commitGeneratedText(fieldKey, partial, (next) => onPatch({ content: next })),
      });
      commitGeneratedText(fieldKey, text, (next) => onPatch({ content: next }), true);
      rememberLoreIteration(activeLorebook.id, entry.id, prompt, text);
      setLoreEntryPrompts((prev) => ({ ...prev, [entry.id]: "" }));
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Lorebook generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function generateLorebookWorld() {
    if (!activeLorebook) return;
    setGenError(null);
    const prompt = collapseWhitespace(lorebookWorldPrompt);
    if (!prompt) {
      setGenError("Write a world prompt first.");
      return;
    }
    const fieldKey = `lore-world:${activeLorebook.id}`;
    setGenLoading(true);
    startGeneratedTextPage(fieldKey);
    try {
      const context = buildLorebookContextForEditing(activeLorebook);
      const memoryContext = getLoreMemoryContext(activeLorebook.id, activeLorebook.worldEntry.id);
      const text = await callProxyChatCompletion({
        system: "You are a worldbuilding assistant. Improve and extend the current world entry using the lorebook context and latest prompt. Keep existing details and add depth instead of replacing everything.",
        user: `Lorebook context:
${context}

Iteration memory (keep all of this consistent):
${memoryContext || "(none yet)"}

Current world entry:
${activeLorebook.worldEntry.content || "(empty)"}

New prompt:
${prompt}

Return only the revised world entry content.`,
        maxTokens: proxyMaxTokens,
        temperature: 0.85,
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) =>
          commitGeneratedText(
            fieldKey,
            partial,
            (next) =>
              updateLorebook(activeLorebook.id, {
                worldEntry: { ...activeLorebook.worldEntry, content: next, tagsRaw: "world", category: "world" },
              })
          ),
      });
      commitGeneratedText(
        fieldKey,
        text,
        (next) => updateLorebook(activeLorebook.id, { worldEntry: { ...activeLorebook.worldEntry, content: next, tagsRaw: "world", category: "world" } }),
        true
      );
      rememberLoreIteration(activeLorebook.id, activeLorebook.worldEntry.id, prompt, text);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "World generation failed.");
    } finally {
      setGenLoading(false);
    }
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
      firstMessage: "",
      firstMessageVersions: [""],
      selectedFirstMessageIndex: 0,
      firstMessageStyle: "realistic",
      systemRules: "",
      selectedSystemRuleIds: [],
      plotPoints: [],
      relationships: [],
      boardNodes: [],
      assignedLorebookIds: [],
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
    const selectedRuleTexts = STORY_SYSTEM_RULE_CARDS
      .filter((r) => (story.selectedSystemRuleIds || []).includes(r.id))
      .map((r) => r.text);
    const firstMessages = story.firstMessageVersions?.length
      ? story.firstMessageVersions
      : [story.firstMessage || ""];

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
      "### Intro Messages (Storywriting)",
      ...firstMessages.map((m, i) => `${i === (story.selectedFirstMessageIndex || 0) ? "*" : "-"} Intro ${i + 1}:\n${m || ""}`),
      "",
      "### First Message Style",
      story.firstMessageStyle || "realistic",
      "",
      "### System Rules",
      story.systemRules || "",
      "",
      "### Selected Rule Cards",
      ...(selectedRuleTexts.length ? selectedRuleTexts.map((x) => `- ${x}`) : ["- None"]),
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

  function beginStorywritingCardDrag(characterId: string, e: React.MouseEvent<HTMLDivElement>) {
    if (!storywritingDndRef.current) return;
    e.preventDefault();
    const dragRootRect = storywritingDndRef.current.getBoundingClientRect();
    const cardRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const offsetX = e.clientX - cardRect.left;
    const offsetY = e.clientY - cardRect.top;
    setStoryDragCharacterId(characterId);
    setStorywritingDragPreview({
      id: characterId,
      x: e.clientX - dragRootRect.left - offsetX,
      y: e.clientY - dragRootRect.top - offsetY,
      offsetX,
      offsetY,
    });
  }

  function updateStorywritingCardDrag(clientX: number, clientY: number) {
    if (!storywritingDndRef.current) return;
    const dragRootRect = storywritingDndRef.current.getBoundingClientRect();
    setStorywritingDragPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        x: clientX - dragRootRect.left - prev.offsetX,
        y: clientY - dragRootRect.top - prev.offsetY,
      };
    });
  }

  function endStorywritingCardDrag() {
    if (!storywritingDragPreview || !storywritingDndRef.current || !storywritingFieldRef.current) {
      setStorywritingDragPreview(null);
      setStoryDragCharacterId(null);
      return;
    }
    const dragRootRect = storywritingDndRef.current.getBoundingClientRect();
    const cardCenterX = dragRootRect.left + storywritingDragPreview.x + 88;
    const cardCenterY = dragRootRect.top + storywritingDragPreview.y + 120;
    const fieldRect = storywritingFieldRef.current.getBoundingClientRect();
    const droppedInField =
      cardCenterX >= fieldRect.left &&
      cardCenterX <= fieldRect.right &&
      cardCenterY >= fieldRect.top &&
      cardCenterY <= fieldRect.bottom;
    if (droppedInField) {
      setStoryDraftCharacterIds((prev) => (prev.includes(storywritingDragPreview.id) ? prev : [...prev, storywritingDragPreview.id]));
    }
    setStorywritingDragPreview(null);
    setStoryDragCharacterId(null);
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

  function moveCharacterOnRelationshipBoard(characterId: string, x: number, y: number) {
    upsertBoardNode(characterId, x, y);
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

  function closeRelationshipBoard() {
    setStoryRelationshipEditorOpen(false);
    setSelectedRelationshipId(null);
    setConnectingFromId(null);
    setConnectingPointer(null);
    setConnectionSnapTargetId(null);
    connectingFromIdRef.current = null;
    connectionSnapTargetIdRef.current = null;
    setRelationshipDrag(null);
    setDeckDropHover(false);
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

  function getBoardNodeCenter(characterId: string) {
    if (!activeStory) return null;
    const node = activeStory.boardNodes.find((n) => n.characterId === characterId);
    if (!node && characterId !== USER_NODE_ID) return null;
    const refNode = node || { characterId: USER_NODE_ID, x: 40, y: 120 };
    const baseX = refNode.x;
    const baseY = refNode.y;
    return {
      x: baseX + 128,
      y: baseY + 10,
    };
  }

  function getFlowPath(from: { x: number; y: number }, to: { x: number; y: number }) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  function selectExistingRelationship(rel: StoryRelationship) {
    setSelectedRelationshipId(rel.id);
    setStoryRelFromId(rel.fromCharacterId);
    setStoryRelToId(rel.toCharacterId);
    setStoryRelAlignment(rel.alignment);
    setStoryRelType(rel.relationType);
    setStoryRelDetails(rel.details);
    setPendingRelationshipEdge(null);
    setStoryRelationshipEditorOpen(true);
  }

  function findConnectionSnapTarget(x: number, y: number) {
    const currentFromId = connectingFromIdRef.current;
    if (!activeStory || !currentFromId) return null;
    let best: { id: string; distSq: number } | null = null;
    const SNAP_RADIUS = 36;
    const SNAP_RADIUS_SQ = SNAP_RADIUS * SNAP_RADIUS;
    for (const node of activeStory.boardNodes) {
      if (node.characterId === currentFromId) continue;
      const center = getBoardNodeCenter(node.characterId);
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
    const startPoint = getBoardNodeCenter(characterId);
    setConnectingPointer(startPoint);
    connectionSnapTargetIdRef.current = null;
    setConnectionSnapTargetId(null);
  }

  function beginRelationshipCardDrag(
    characterId: string,
    source: "board" | "deck",
    e: React.MouseEvent<HTMLDivElement>,
    boardX?: number,
    boardY?: number
  ) {
    if (!boardContainerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const boardRect = boardContainerRef.current.getBoundingClientRect();
    const cardRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const offsetX = e.clientX - cardRect.left;
    const offsetY = e.clientY - cardRect.top;
    const initialX = source === "board" ? boardX ?? 0 : e.clientX - boardRect.left - boardPan.x - offsetX;
    const initialY = source === "board" ? boardY ?? 0 : e.clientY - boardRect.top - boardPan.y - offsetY;
    setRelationshipDrag({
      id: characterId,
      source,
      x: initialX,
      y: initialY,
      offsetX,
      offsetY,
    });
    setDeckDropHover(false);
    setStoryDragCharacterId(characterId);
  }

  function updateRelationshipCardDrag(clientX: number, clientY: number) {
    if (!relationshipDrag || !boardContainerRef.current) return;
    const boardRect = boardContainerRef.current.getBoundingClientRect();
    const deckRect = relationshipDeckRef.current?.getBoundingClientRect();
    if (deckRect) {
      const previewLeft = clientX - relationshipDrag.offsetX;
      const previewTop = clientY - relationshipDrag.offsetY;
      const centerX = previewLeft + 128;
      const centerY = previewTop + 190;
      setDeckDropHover(
        centerX >= deckRect.left &&
          centerX <= deckRect.right &&
          centerY >= deckRect.top &&
          centerY <= deckRect.bottom
      );
    } else {
      setDeckDropHover(false);
    }
    setRelationshipDrag((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        x: clientX - boardRect.left - boardPan.x - prev.offsetX,
        y: clientY - boardRect.top - boardPan.y - prev.offsetY,
      };
    });
  }

  function endRelationshipCardDrag() {
    if (!relationshipDrag || !boardContainerRef.current || !activeStory) {
      setRelationshipDrag(null);
      setDeckDropHover(false);
      setStoryDragCharacterId(null);
      return;
    }
    const boardRect = boardContainerRef.current.getBoundingClientRect();
    const absoluteLeft = boardRect.left + boardPan.x + relationshipDrag.x;
    const absoluteTop = boardRect.top + boardPan.y + relationshipDrag.y;
    const deckRect = relationshipDeckRef.current?.getBoundingClientRect();
    const centerX = absoluteLeft + 128;
    const centerY = absoluteTop + 190;
    const droppedToDeck =
      !!deckRect &&
      centerX >= deckRect.left &&
      centerX <= deckRect.right &&
      centerY >= deckRect.top &&
      centerY <= deckRect.bottom;
    if (droppedToDeck) {
      removeBoardNode(relationshipDrag.id);
    } else {
      moveCharacterOnRelationshipBoard(relationshipDrag.id, relationshipDrag.x, relationshipDrag.y);
    }
    setRelationshipDrag(null);
    setDeckDropHover(false);
    setStoryDragCharacterId(null);
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
    const [aId, bId] = [storyRelFromId, storyRelToId].sort();
    const relId = selectedRelationshipId || uid();
    const rel: StoryRelationship = {
      id: relId,
      fromCharacterId: aId,
      toCharacterId: bId,
      alignment: storyRelAlignment,
      relationType: storyRelType,
      details: storyRelDetails,
      createdAt: new Date().toISOString(),
    };
    const others = activeStory.relationships.filter(
      (r) =>
        r.id !== relId &&
        !(
          (r.fromCharacterId === aId && r.toCharacterId === bId) ||
          (r.fromCharacterId === bId && r.toCharacterId === aId)
        )
    );
    updateStory(activeStory.id, {
      relationships: [rel, ...others],
    });
    setSelectedRelationshipId(relId);
    setPendingRelationshipEdge(null);
    setStoryRelationshipEditorOpen(false);
  }

  function deleteSelectedRelationship() {
    if (!activeStory || !selectedRelationshipId) return;
    updateStory(activeStory.id, {
      relationships: activeStory.relationships.filter((r) => r.id !== selectedRelationshipId),
    });
    setSelectedRelationshipId(null);
    setPendingRelationshipEdge(null);
    setStoryRelationshipEditorOpen(false);
  }

  async function improveSelectedRelationshipDetails(mode: "generate" | "revise") {
    if (!activeStory || !selectedRelationshipId) return;
    const rel = activeStory.relationships.find((r) => r.id === selectedRelationshipId);
    if (!rel) return;
    const prompt = collapseWhitespace(relationshipDetailsPrompt);
    if (!prompt) {
      setGenError("Write a relationship details prompt first.");
      return;
    }
    const fromName = rel.fromCharacterId === USER_NODE_ID ? "USER" : (characters.find((c) => c.id === rel.fromCharacterId)?.name || rel.fromCharacterId);
    const toName = rel.toCharacterId === USER_NODE_ID ? "USER" : (characters.find((c) => c.id === rel.toCharacterId)?.name || rel.toCharacterId);
    const fieldKey = `story-relationship-details:${activeStory.id}:${rel.id}`;
    setGenError(null);
    setGenLoading(true);
    startGeneratedTextPage(fieldKey);
    try {
      const out = await callProxyChatCompletion({
        system: mode === "generate"
          ? "Generate rich relationship details for the given pair. Return only details text."
          : "Revise and improve the current relationship details based on prompt. Return only details text.",
        user: `Relationship: ${fromName} ↔ ${toName}
Type: ${rel.relationType}
Alignment: ${rel.alignment}
Current details:
${rel.details || "(empty)"}

Prompt:
${prompt}`,
        maxTokens: Math.min(150, proxyMaxTokens),
        lorebookIds: getStoryGenerationLorebookIds(activeStory),
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => {
          commitGeneratedText(fieldKey, partial, (next) => {
            setStoryRelDetails(next);
            updateStory(activeStory.id, {
              relationships: activeStory.relationships.map((r) =>
                r.id === rel.id ? { ...r, details: next } : r
              ),
            });
          });
        },
      });
      commitGeneratedText(fieldKey, out, (next) => {
        setStoryRelDetails(next);
        updateStory(activeStory.id, {
          relationships: activeStory.relationships.map((r) =>
            r.id === rel.id ? { ...r, details: next } : r
          ),
        });
      }, true);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Relationship details generation failed.");
    } finally {
      setGenLoading(false);
    }
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
    const fieldKey = `chat:${activeChatSessionId}`;
    startGeneratedTextPage(fieldKey);
    try {
      const reply = await callProxyChatCompletion({
        system,
        user,
        stream: proxyStreamingEnabled,
        lorebookIds: chatCharacter.assignedLorebookIds,
        onStreamUpdate: (partial) => {
          updateGeneratedTextPage(fieldKey, partial);
          setChatMessages([...newHistory, { role: "assistant" as const, content: partial }]);
        },
      });
      updateGeneratedTextPage(fieldKey, reply, true);
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

  async function reviseBackstoryTextWithPrompt() {
    const prompt = collapseWhitespace(backstoryPrompt);
    if (!prompt) {
      setGenError("Write a backstory prompt first.");
      return;
    }
    const fieldKey = "character:backstory";
    setGenError(null);
    setGenLoading(true);
    startGeneratedTextPage(fieldKey);
    try {
      const text = await callProxyChatCompletion({
        system: "Revise and improve the character backstory based on user instruction while preserving continuity. Return only the revised backstory text.",
        user: `Character summary:
${getCharacterSummaryForLLM()}

Current backstory:
${backstoryText || "(empty)"}

Instruction:
${prompt}`,
        maxTokens: proxyMaxTokens,
        lorebookIds: characterAssignedLorebookIds,
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => commitGeneratedText(fieldKey, partial, setBackstoryText),
      });
      commitGeneratedText(fieldKey, text, setBackstoryText, true);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Backstory revision failed.");
    } finally {
      setGenLoading(false);
    }
  }

  function exportSexualBehaviorJSON() {
    downloadJSON((filenameSafe(name) || "character") + "_sexual_behavior.json", { sexualBehavior });
  }

  async function importSexualBehaviorJSON(file: File) {
    try {
      const raw = await file.text();
      const parsed = safeParseJSON(raw);
      const arr = Array.isArray((parsed as any)?.sexualBehavior) ? normalizeStringArray((parsed as any).sexualBehavior) : [];
      if (arr.length) setSexualBehavior(arr);
    } catch {
      // ignore
    }
  }

  async function generateStoryFirstMessage() {
    if (!activeStory) return;
    const styleInstruction =
      storyFirstMessageStyle === "dramatic"
        ? "Write in dramatic, vivid, somewhat verbose prose."
        : storyFirstMessageStyle === "melancholic"
          ? "Write in sophisticated, melancholic, reflective prose."
          : "Write in realistic, natural language grounded in context.";
    const prompt = collapseWhitespace(storyFirstMessagePrompt) || "Generate an opening first message.";
    const cast = activeStory.characterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter((c): c is Character => !!c)
      .map((c) => `${c.name}: ${c.synopsis || ""}`)
      .join("\n");
    const storyCharacterContext = getStoryCharacterContext(activeStory);
    const relationshipContext = getStoryRelationshipContext(activeStory);
    const selectedRules = getStorySelectedSystemRules(activeStory);
    const targetIndex = clampIndex(activeStory.selectedFirstMessageIndex || 0, Math.max(1, activeStory.firstMessageVersions?.length || 1));
    const baseVersions = activeStory.firstMessageVersions?.length ? [...activeStory.firstMessageVersions] : [activeStory.firstMessage || ""];
    const baseline = baseVersions[targetIndex] || "";
    if (collapseWhitespace(baseline)) {
      const ok = window.confirm("This message already has text. Generating will overwrite it. Use revise to refine instead. Continue?");
      if (!ok) return;
    }
    setStoryFirstMessageHistories((prev) => {
      const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
      while (base.length <= targetIndex) base.push([""]);
      base[targetIndex].push(baseline);
      return base;
    });
    setStoryFirstMessageHistoryIndices((prev) => {
      const base = prev.length ? [...prev] : [0];
      while (base.length <= targetIndex) base.push(0);
      base[targetIndex] = Math.max(0, (base[targetIndex] || 0) + 1);
      return base;
    });
    setGenError(null);
    setGenLoading(true);
    try {
      const out = await callProxyChatCompletion({
        system: `You create first messages for roleplay story sessions. ${styleInstruction} Return only the message text.`,
        user: `Scenario:
${activeStory.scenario}

System rules:
${storySystemRulesInput || activeStory.systemRules || ""}

Selected system rules:
${selectedRules.length ? selectedRules.join("\n") : "(none selected)"}

Characters:
${cast}

Character context:
${storyCharacterContext}

Relationships:
${relationshipContext}

Plot points:
${activeStory.plotPoints.join("\n")}

Prompt:
${prompt}`,
        lorebookIds: getStoryGenerationLorebookIds(activeStory),
        maxTokens: proxyMaxTokens,
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => {
          setStoryFirstMessageInput(partial);
          setStoryFirstMessageHistories((prev) => {
            const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
            while (base.length <= targetIndex) base.push([""]);
            const history = base[targetIndex];
            history[history.length - 1] = partial;
            return base;
          });
          updateStory(activeStory.id, {
            firstMessageVersions: baseVersions.map((m, i) => (i === targetIndex ? partial : m)),
            selectedFirstMessageIndex: targetIndex,
            firstMessage: partial,
            firstMessageStyle: storyFirstMessageStyle,
            systemRules: storySystemRulesInput,
          });
        },
      });
      setStoryFirstMessageInput(out);
      setStoryFirstMessageHistories((prev) => {
        const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
        while (base.length <= targetIndex) base.push([""]);
        base[targetIndex][base[targetIndex].length - 1] = out;
        return base;
      });
      updateStory(activeStory.id, {
        firstMessageVersions: baseVersions.map((m, i) => (i === targetIndex ? out : m)),
        selectedFirstMessageIndex: targetIndex,
        firstMessage: out,
        firstMessageStyle: storyFirstMessageStyle,
        systemRules: storySystemRulesInput,
      });
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "First message generation failed.");
    } finally {
      setGenLoading(false);
    }
  }

  async function reviseStoryFirstMessage() {
    if (!activeStory) return;
    const feedback = collapseWhitespace(storyFirstMessageRevisionPrompt);
    const currentMessage = storyFirstMessageInput || activeStory.firstMessage || "";
    if (!collapseWhitespace(currentMessage)) {
      setGenError("Write or generate a first message before revising.");
      return;
    }
    if (!feedback) {
      setGenError("Write revision instructions first.");
      return;
    }

    const cast = activeStory.characterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter((c): c is Character => !!c)
      .map((c) => `${c.name}: ${c.synopsis || ""}`)
      .join("\n");
    const storyCharacterContext = getStoryCharacterContext(activeStory);
    const relationshipContext = getStoryRelationshipContext(activeStory);
    const selectedRules = getStorySelectedSystemRules(activeStory);

    const baseVersions = activeStory.firstMessageVersions?.length ? [...activeStory.firstMessageVersions] : [activeStory.firstMessage || ""];
    const targetIndex = clampIndex(activeStory.selectedFirstMessageIndex || 0, Math.max(1, baseVersions.length));
    const baseline = baseVersions[targetIndex] || "";
    setStoryFirstMessageHistories((prev) => {
      const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
      while (base.length <= targetIndex) base.push([""]);
      base[targetIndex].push(baseline);
      return base;
    });
    setStoryFirstMessageHistoryIndices((prev) => {
      const base = prev.length ? [...prev] : [0];
      while (base.length <= targetIndex) base.push(0);
      base[targetIndex] = Math.max(0, (base[targetIndex] || 0) + 1);
      return base;
    });
    setGenError(null);
    setGenLoading(true);
    try {
      const out = await callProxyChatCompletion({
        system: "Revise the first message while preserving continuity with story context and character details. Return only the revised first message text.",
        user: `Scenario:\n${activeStory.scenario}\n\nSystem rules:\n${storySystemRulesInput || activeStory.systemRules || ""}\n\nSelected system rules:\n${selectedRules.length ? selectedRules.join("\n") : "(none selected)"}\n\nCharacters:\n${cast}\n\nCharacter context:\n${storyCharacterContext}\n\nRelationships:\n${relationshipContext}\n\nCurrent first message:\n${currentMessage}\n\nRevision instructions:\n${feedback}`,
        lorebookIds: getStoryGenerationLorebookIds(activeStory),
        maxTokens: proxyMaxTokens,
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => {
          setStoryFirstMessageInput(partial);
          setStoryFirstMessageHistories((prev) => {
            const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
            while (base.length <= targetIndex) base.push([""]);
            const history = base[targetIndex];
            history[history.length - 1] = partial;
            return base;
          });
          updateStory(activeStory.id, {
            firstMessageVersions: baseVersions.map((m, i) => (i === targetIndex ? partial : m)),
            selectedFirstMessageIndex: targetIndex,
            firstMessage: partial,
            firstMessageStyle: storyFirstMessageStyle,
            systemRules: storySystemRulesInput,
          });
        },
      });
      setStoryFirstMessageInput(out);
      setStoryFirstMessageHistories((prev) => {
        const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
        while (base.length <= targetIndex) base.push([""]);
        base[targetIndex][base[targetIndex].length - 1] = out;
        return base;
      });
      updateStory(activeStory.id, {
        firstMessageVersions: baseVersions.map((m, i) => (i === targetIndex ? out : m)),
        selectedFirstMessageIndex: targetIndex,
        firstMessage: out,
        firstMessageStyle: storyFirstMessageStyle,
        systemRules: storySystemRulesInput,
      });
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "First message revision failed.");
    } finally {
      setGenLoading(false);
    }
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
    lorebookIds?: string[];
    onStreamUpdate?: (text: string) => void;
  }) {
    const chatUrl = collapseWhitespace(proxyChatUrl);
    const apiKey = collapseWhitespace(proxyApiKey);
    const model = collapseWhitespace(proxyModel);

    if (!chatUrl) throw new Error("Please set a Chat Completion URL in Proxy.");
    if (!apiKey) throw new Error("Please set an API key in Proxy.");
    if (!model) throw new Error("Please set a model name in Proxy.");

    const lorebookContext = getAssignedLorebookContext(args.lorebookIds || []);
    const customPrompt = collapseWhitespace(proxyCustomPrompt);
    const effectiveSystem = [
      customPrompt ? `Global behavior instructions:
${customPrompt}` : "",
      args.system,
      lorebookContext ? `Always-active assigned lorebooks context:
${lorebookContext}` : "",
    ].filter(Boolean).join("\n\n");

    const res = await fetch(chatUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: effectiveSystem },
          { role: "user", content: args.user },
        ],
        temperature: args.temperature ?? proxyTemperature,
        max_tokens: args.maxTokens ?? proxyMaxTokens,
        max_completion_tokens: args.maxTokens ?? proxyMaxTokens,
        context_size: proxyContextSize,
        max_context_tokens: proxyContextSize,
        num_ctx: proxyContextSize,
        stream: !!args.stream,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Request failed (${res.status}). ${text}`);
    }

    if (args.stream) {
      const reader = res.body?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let merged = "";
        let buffer = "";

        const parseEventLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) return;
          const payload = trimmed.replace(/^data:\s*/, "");
          if (!payload || payload === "[DONE]") return;
          let delta = "";
          try {
            const part = JSON.parse(payload);
            delta =
              part?.choices?.[0]?.delta?.content ??
              part?.choices?.[0]?.message?.content ??
              part?.choices?.[0]?.text ??
              "";
          } catch {
            delta = payload;
          }
          if (!delta) return;
          merged += delta;
          args.onStreamUpdate?.(merged);
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split(/\r?\n/);
          buffer = lines.pop() || "";
          for (const line of lines) parseEventLine(line);
        }
        if (buffer) parseEventLine(buffer);

        const clean = String(merged ?? "").trim();
        if (!clean) throw new Error("No text returned by the model.");
        return clean;
      }

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
        args.onStreamUpdate?.(merged);
      }
      const clean = String(merged ?? "").trim();
      if (!clean) throw new Error("No text returned by the model.");
      return clean;
    }

    const data = await res.json();
    let content =
      data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "";
    let finishReason = String(data?.choices?.[0]?.finish_reason || "").toLowerCase();
    let clean = String(content ?? "").trim();
    if (!clean) throw new Error("No text returned by the model.");

    let guard = 0;
    while (finishReason === "length" && guard < 3) {
      guard += 1;
      const contRes = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: effectiveSystem },
            { role: "assistant", content: clean },
            { role: "user", content: "Continue exactly where you left off. Do not repeat prior text." },
          ],
          temperature: args.temperature ?? proxyTemperature,
          max_tokens: args.maxTokens ?? proxyMaxTokens,
          max_completion_tokens: args.maxTokens ?? proxyMaxTokens,
          context_size: proxyContextSize,
          max_context_tokens: proxyContextSize,
          num_ctx: proxyContextSize,
          stream: false,
        }),
      });
      if (!contRes.ok) break;
      const contData = await contRes.json();
      const more = String(contData?.choices?.[0]?.message?.content ?? contData?.choices?.[0]?.text ?? "").trim();
      if (!more) break;
      clean = `${clean}
${more}`.trim();
      finishReason = String(contData?.choices?.[0]?.finish_reason || "").toLowerCase();
    }

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

    const targetIndex = clampIndex(introIndex, Math.max(1, introMessages.length));
    const existing = introMessages[targetIndex] || "";
    if (collapseWhitespace(existing)) {
      const ok = window.confirm(
        "This intro already has text. Generating will overwrite this intro. Use the revise box to refine instead. Continue?"
      );
      if (!ok) return;
    }

    const baseline = existing;
    setIntroVersionHistories((prev) => {
      const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
      while (base.length <= targetIndex) base.push([""]);
      const history = base[targetIndex];
      history.push(baseline);
      return base;
    });
    setIntroVersionIndices((prev) => {
      const base = prev.length ? [...prev] : [0];
      while (base.length <= targetIndex) base.push(0);
      base[targetIndex] = Math.max(0, (base[targetIndex] || 0) + 1);
      return base;
    });
    setGenLoading(true);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        temperature: 0.95,
        stream: proxyStreamingEnabled,
        lorebookIds: characterAssignedLorebookIds,
        onStreamUpdate: (partial) => {
          setIntroVersionHistories((prev) => {
            const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
            while (base.length <= targetIndex) base.push([""]);
            const history = base[targetIndex];
            if (!history.length) history.push("");
            history[history.length - 1] = partial;
            return base;
          });
          setIntroMessages((prev) => {
            const base = prev.length ? [...prev] : [""];
            const i = clampIndex(targetIndex, base.length);
            base[i] = partial;
            return base;
          });
        },
      });
      setIntroMessages((prev) => {
        const base = prev.length ? [...prev] : [""];
        const i = clampIndex(targetIndex, base.length);
        base[i] = text;
        return base;
      });
      setIntroVersionHistories((prev) => {
        const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
        while (base.length <= targetIndex) base.push([""]);
        const history = base[targetIndex];
        if (!history.length) history.push(text);
        else history[history.length - 1] = text;
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
    const fieldKey = "character:synopsis";

    const system =
      "You are a creative editor generating a SYNOPSIS for a roleplay character sheet. The synopsis must be hooky, cinematic, and invite roleplay. Write 3–6 sentences. Include (subtly) a core desire, a flaw, and a tension/stake. Avoid lists, avoid headings, avoid quotes. Do not mention that you are an AI. Return ONLY the synopsis.";

    const user = `Character info:\n${getCharacterSummaryForLLM()}\n\nWrite the synopsis now.`;

    setGenLoading(true);
    startGeneratedTextPage(fieldKey);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        maxTokens: proxyMaxTokens,
        temperature: 0.9,
        stream: proxyStreamingEnabled,
        lorebookIds: characterAssignedLorebookIds,
        onStreamUpdate: (partial) => commitGeneratedText(fieldKey, partial, setSynopsis),
      });
      commitGeneratedText(fieldKey, text, setSynopsis, true);
    } catch (e: any) {
      setGenError(e?.message ? String(e.message) : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  }



  async function reviseSelectedIntro() {
    setGenError(null);
    const feedback = collapseWhitespace(introRevisionPrompt);
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

    const targetIndex = clampIndex(introIndex, Math.max(1, introMessages.length));
    setIntroVersionHistories((prev) => {
      const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
      while (base.length <= targetIndex) base.push([""]);
      const history = base[targetIndex];
      history.push(currentIntro);
      return base;
    });
    setIntroVersionIndices((prev) => {
      const base = prev.length ? [...prev] : [0];
      while (base.length <= targetIndex) base.push(0);
      base[targetIndex] = Math.max(0, (base[targetIndex] || 0) + 1);
      return base;
    });
    setGenLoading(true);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        temperature: 0.9,
        lorebookIds: characterAssignedLorebookIds,
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => {
          setIntroVersionHistories((prev) => {
            const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
            while (base.length <= targetIndex) base.push([""]);
            const history = base[targetIndex];
            if (!history.length) history.push("");
            history[history.length - 1] = partial;
            return base;
          });
          setIntroMessages((prev) => {
            const base = prev.length ? [...prev] : [""];
            const i = clampIndex(targetIndex, base.length);
            base[i] = partial;
            return base;
          });
        },
      });
      setIntroMessages((prev) => {
        const base = prev.length ? [...prev] : [""];
        const i = clampIndex(targetIndex, base.length);
        base[i] = text;
        return base;
      });
      setIntroVersionHistories((prev) => {
        const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
        while (base.length <= targetIndex) base.push([""]);
        const history = base[targetIndex];
        if (!history.length) history.push(text);
        else history[history.length - 1] = text;
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
    const fieldKey = "character:synopsis";
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
    startGeneratedTextPage(fieldKey);
    try {
      const text = await callProxyChatCompletion({
        system,
        user,
        maxTokens: proxyMaxTokens,
        temperature: 0.9,
        lorebookIds: characterAssignedLorebookIds,
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => commitGeneratedText(fieldKey, partial, setSynopsis),
      });
      commitGeneratedText(fieldKey, text, setSynopsis, true);
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
    setIntroVersionHistories((prev) => {
      const next = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
      next.push([""]);
      return next;
    });
    setIntroVersionIndices((prev) => {
      const next = prev.length ? [...prev] : [0];
      next.push(0);
      return next;
    });
    setIntroIndex((prev) => prev + 1);
  }

  function buildIntroRevisionTemplate(introText: string) {
    return `Current intro context:
${introText || "(empty)"}

Revision instructions:
`;
  }

  useEffect(() => {
    setIntroIndex((i) => clampIndex(i, Math.max(1, introMessages.length)));
  }, [introMessages.length]);

  useEffect(() => {
    const current = introMessages[clampIndex(introIndex, Math.max(1, introMessages.length))] || "";
    setIntroRevisionPrompt(buildIntroRevisionTemplate(current));
  }, [introIndex, introMessages.length]);

  function getStoryCharacterContext(story: StoryProject) {
    const cast = story.characterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter((c): c is Character => !!c);
    if (!cast.length) return "No character data available.";
    return cast
      .map((c) => [
        `Character: ${collapseWhitespace(c.name) || "(unnamed)"}`,
        `Gender: ${c.gender || ""}`,
        `Race: ${collapseWhitespace(c.race) || collapseWhitespace(c.racePreset) || ""}`,
        `Origins: ${collapseWhitespace(c.origins)}`,
        `Personality: ${(c.personalities || []).join(", ")}`,
        `Unique traits: ${(c.uniqueTraits || []).join(", ")}`,
        `Behavior (problem response): ${(c.respondToProblems || []).join(", ")}`,
        `Behavior (sexual): ${(c.sexualBehavior || []).join(", ")}`,
        `Backstory: ${(c.backstory || []).join(" | ")}`,
        `Synopsis: ${collapseWhitespace(c.synopsis)}`,
      ].join("\n"))
      .join("\n\n");
  }

  function getStoryRelationshipContext(story: StoryProject) {
    if (!story.relationships.length) return "None";
    return story.relationships
      .map((r) => {
        const from = characters.find((c) => c.id === r.fromCharacterId)?.name || r.fromCharacterId;
        const to = characters.find((c) => c.id === r.toCharacterId)?.name || r.toCharacterId;
        const details = collapseWhitespace(r.details);
        return `${from} -> ${to}: ${r.relationType} (${r.alignment})${details ? ` | ${details}` : ""}`;
      })
      .join("\n");
  }

  function getStorySelectedSystemRules(story: StoryProject) {
    const selected = new Set(story.selectedSystemRuleIds || []);
    return STORY_SYSTEM_RULE_CARDS.filter((rule) => selected.has(rule.id)).map((rule) => rule.text);
  }

  function getStoryGenerationLorebookIds(story: StoryProject) {
    const ids = new Set<string>(story.assignedLorebookIds || []);
    for (const characterId of story.characterIds || []) {
      const c = characters.find((ch) => ch.id === characterId);
      for (const lorebookId of c?.assignedLorebookIds || []) ids.add(lorebookId);
    }
    return Array.from(ids);
  }

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
    const storyCharacterContext = getStoryCharacterContext(activeStory);
    const selectedRules = getStorySelectedSystemRules(activeStory);
    const fieldKey = `story-scenario:${activeStory.id}`;
    setGenError(null);
    setGenLoading(true);
    startGeneratedTextPage(fieldKey);
    try {
      const out = await callProxyChatCompletion({
        system:
          "You create roleplay story scenarios for multi-character casts. Preserve continuity with provided character context and selected story rules. Return only scenario prose.",
        user: `Characters: ${charBlob}

Character context:
${storyCharacterContext}

Selected system rules:
${selectedRules.length ? selectedRules.join("\n") : "(none selected)"}

Prompt: ${prompt}`,
        maxTokens: proxyMaxTokens,
        lorebookIds: getStoryGenerationLorebookIds(activeStory),
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => commitGeneratedText(fieldKey, partial, (next) => updateStory(activeStory.id, { scenario: next })),
      });
      commitGeneratedText(fieldKey, out, (next) => updateStory(activeStory.id, { scenario: next }), true);
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
    const storyCharacterContext = getStoryCharacterContext(activeStory);
    const selectedRules = getStorySelectedSystemRules(activeStory);
    const fieldKey = `story-scenario:${activeStory.id}`;
    setGenError(null);
    setGenLoading(true);
    startGeneratedTextPage(fieldKey);
    try {
      const out = await callProxyChatCompletion({
        system: "Revise scenario text based on feedback while preserving continuity with cast context and selected system rules. Return only revised scenario.",
        user: `Character context:
${storyCharacterContext}

Selected system rules:
${selectedRules.length ? selectedRules.join("\n") : "(none selected)"}

Current scenario:
${activeStory.scenario}

Feedback:
${feedback}`,
        maxTokens: proxyMaxTokens,
        lorebookIds: getStoryGenerationLorebookIds(activeStory),
        stream: proxyStreamingEnabled,
        onStreamUpdate: (partial) => commitGeneratedText(fieldKey, partial, (next) => updateStory(activeStory.id, { scenario: next })),
      });
      commitGeneratedText(fieldKey, out, (next) => updateStory(activeStory.id, { scenario: next }), true);
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
    const storyCharacterContext = getStoryCharacterContext(activeStory);
    const relationshipContext = getStoryRelationshipContext(activeStory);
    const selectedRules = getStorySelectedSystemRules(activeStory);
    setGenError(null);
    setGenLoading(true);
    try {
      const out = await callProxyChatCompletion({
        system:
          "Expand plot points into more detailed entries, each max 30 words. Return JSON array of strings only.",
        user: `Character context:
${storyCharacterContext}

Selected system rules:
${selectedRules.length ? selectedRules.join("\n") : "(none selected)"}

Relationships:
${relationshipContext}

Current plot points:
${activeStory.plotPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
        maxTokens: proxyMaxTokens,
        lorebookIds: getStoryGenerationLorebookIds(activeStory),
        stream: proxyStreamingEnabled,
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
    const storyCharacterContext = getStoryCharacterContext(activeStory);
    const relationshipContext = getStoryRelationshipContext(activeStory);
    const selectedRules = getStorySelectedSystemRules(activeStory);
    setGenError(null);
    setGenLoading(true);
    try {
      const out = await callProxyChatCompletion({
        system: "Revise plot point list with each entry max 30 words. Return JSON array of strings only.",
        user: `Character context:
${storyCharacterContext}

Selected system rules:
${selectedRules.length ? selectedRules.join("\n") : "(none selected)"}

Relationships:
${relationshipContext}

Current points:
${activeStory.plotPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Feedback:
${feedback}`,
        maxTokens: proxyMaxTokens,
        lorebookIds: getStoryGenerationLorebookIds(activeStory),
        stream: proxyStreamingEnabled,
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

  function renderLoreEntryFields(
    entry: LorebookEntry,
    onPatch: (patch: Partial<LorebookEntry>) => void,
    options?: {
      nameLabel?: string;
      contentLabel?: string;
      contentRows?: number;
      forceCategory?: LorebookEntry["category"];
    }
  ) {
    const nameLabel = options?.nameLabel || "Entry name";
    const contentLabel = options?.contentLabel || "Content";
    const contentRows = options?.contentRows ?? 10;
    const forceCategory = options?.forceCategory;
    const fieldKey = activeLorebook ? `lore-entry:${activeLorebook.id}:${entry.id}` : `lore-entry:${entry.id}`;
    return (
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-sm">{nameLabel}</div>
          <Input value={entry.name} onChange={(e) => onPatch({ name: e.target.value })} />
        </div>
        <div>
          <div className="mb-1 text-sm">Tags (comma-separated)</div>
          <Input value={entry.tagsRaw} onChange={(e) => onPatch({ tagsRaw: e.target.value })} />
        </div>
        <div>
          <div className="mb-1 text-sm">{contentLabel}</div>
          {renderGeneratedTextarea({
            fieldKey,
            value: entry.content,
            onChange: (next) => onPatch({ content: next }),
            rows: contentRows,
          })}
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 space-y-2">
          <div className="text-sm font-medium">Prompt</div>
          <Textarea
            value={loreEntryPrompts[entry.id] || ""}
            onChange={(e) => setLoreEntryPrompts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => applyLoreEntryPrompt(entry, loreEntryPrompts[entry.id] || "", onPatch, contentLabel)}
              disabled={genLoading}
            >
              <Sparkles className="h-4 w-4" /> Improve with prompt
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.45] p-4 space-y-3">
          <div className="text-sm font-semibold">Technical settings</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm">Primary keys (comma-separated)</div>
              <Input value={entry.keysRaw} onChange={(e) => onPatch({ keysRaw: e.target.value })} />
            </div>
            <div>
              <div className="mb-1 text-sm">Secondary keys (comma-separated)</div>
              <Input value={entry.keysecondaryRaw} onChange={(e) => onPatch({ keysecondaryRaw: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm">Order (1-100)</div>
              <Input type="number" value={String(entry.order)} onChange={(e) => onPatch({ order: Number(e.target.value) || 1 })} />
            </div>
            <div>
              <div className="mb-1 text-sm">Position (0-100)</div>
              <Input type="number" value={String(entry.position)} onChange={(e) => onPatch({ position: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm">Activation setting</div>
            <Select
              value={entry.activationSetting}
              onChange={(e) => {
                const value = e.target.value as LorebookEntry["activationSetting"];
                onPatch({
                  activationSetting: value,
                  constant: value === "always_active",
                  selective: value === "selective",
                  disable: value === "disabled",
                  enabled: value !== "disabled",
                });
              }}
            >
              <option value="any_key">Any Key</option>
              <option value="selective">Selective</option>
              <option value="always_active">Always Active</option>
              <option value="disabled">Disabled</option>
            </Select>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={entry.enabled} onChange={(e) => onPatch({ enabled: e.target.checked, disable: !e.target.checked })} /> Enabled</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={entry.caseSensitive} onChange={(e) => onPatch({ caseSensitive: e.target.checked })} /> Case sensitive</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={entry.matchWholeWords} onChange={(e) => onPatch({ matchWholeWords: e.target.checked })} /> Match whole words</label>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="mb-1 text-sm">Priority</div>
              <Input type="number" value={String(entry.priority)} onChange={(e) => onPatch({ priority: Number(e.target.value) || 1 })} />
            </div>
            <div>
              <div className="mb-1 text-sm">Category</div>
              <Select value={entry.category} onChange={(e) => onPatch({ category: (forceCategory || e.target.value) as LorebookEntry["category"] })} disabled={!!forceCategory}>
                <option value="world">World</option>
                <option value="location">Location</option>
                <option value="faction">Faction</option>
                <option value="rule">Rule</option>
                <option value="item">Item</option>
                <option value="special">Special</option>
                <option value="character">Character</option>
              </Select>
            </div>
            <div>
              <div className="mb-1 text-sm">Key match mode</div>
              <Select value={entry.keyMatchMode} onChange={(e) => onPatch({ keyMatchMode: e.target.value as LorebookEntry["keyMatchMode"] })}>
                <option value="partial">Partial</option>
                <option value="exact">Exact</option>
              </Select>
            </div>
          </div>
          <div>
            <div className="mb-1 text-sm">Comment</div>
            <Input value={entry.comment} onChange={(e) => onPatch({ comment: e.target.value })} />
          </div>
        </div>
      </div>
    );
  }


  const draft = getDraftCharacter();

  const tabs: Array<{ id: CreateTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "personality", label: "Personality & Traits" },
    { id: "behavior", label: "Behavior" },
    { id: "definition", label: "Backstory" },
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

      <div className="mx-auto max-w-7xl pt-28 md:pt-32">
        {storageError ? (
          <div className="mt-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm">
            <div className="font-semibold">Storage issue</div>
            <div className="mt-1 text-[hsl(var(--muted-foreground))]">{storageError}</div>
          </div>
        ) : null}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))/0.95] backdrop-blur">
          <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
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
            <div ref={navMenusRef} className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Button variant="secondary" onClick={() => setNavMenuOpen((v) => (v === "characters" ? null : "characters"))}>Characters</Button>
                {navMenuOpen === "characters" ? (
                  <div className="anim-dropdown-down absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl">
                    <Button className="w-full justify-start" variant="secondary" onClick={() => { setNavMenuOpen(null); resetForm(); navigateTo("create"); setTab("overview"); }}><Plus className="h-4 w-4" /> Create new character</Button>
                    <Button className="mt-2 w-full justify-start" variant="secondary" onClick={() => { setNavMenuOpen(null); navigateTo("characters"); }}><Library className="h-4 w-4" /> View character gallery</Button>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <Button variant="secondary" onClick={() => setNavMenuOpen((v) => (v === "stories" ? null : "stories"))}>Stories</Button>
                {navMenuOpen === "stories" ? (
                  <div className="anim-dropdown-down absolute right-0 z-50 mt-2 w-52 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl">
                    <Button className="w-full justify-start" variant="secondary" onClick={() => { setNavMenuOpen(null); navigateTo("storywriting"); }}><Plus className="h-4 w-4" /> Create new story</Button>
                    <Button className="mt-2 w-full justify-start" variant="secondary" onClick={() => { setNavMenuOpen(null); navigateTo("my_stories"); }}><Library className="h-4 w-4" /> View stories</Button>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <Button variant="secondary" onClick={() => setNavMenuOpen((v) => (v === "lorebooks" ? null : "lorebooks"))}>Lorebooks</Button>
                {navMenuOpen === "lorebooks" ? (
                  <div className="anim-dropdown-down absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl">
                    <Button className="w-full justify-start" variant="secondary" onClick={() => { setNavMenuOpen(null); createLorebook(); }}><Plus className="h-4 w-4" /> Create new lorebook</Button>
                    <Button className="mt-2 w-full justify-start" variant="secondary" onClick={() => { setNavMenuOpen(null); navigateTo("lorebooks"); }}><BookOpen className="h-4 w-4" /> View lorebooks</Button>
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <Button variant="secondary" onClick={() => setNavMenuOpen((v) => (v === "settings" ? null : "settings"))}><Settings className="h-4 w-4" /> Settings</Button>
                {navMenuOpen === "settings" ? (
                  <div className="anim-dropdown-down absolute right-0 z-50 mt-2 w-48 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl">
                    <Button className="w-full justify-start" variant="secondary" onClick={() => { setNavMenuOpen(null); setProxyOpen(true); }}><SlidersHorizontal className="h-4 w-4" /> Proxy</Button>
                    <Button className="mt-2 w-full justify-start" variant="secondary" onClick={() => { setNavMenuOpen(null); setTheme((t) => (t === "light" ? "dark" : "light")); }}>
                      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {theme === "light" ? "Dark" : "Light"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
            <Button variant="secondary" onClick={() => { setNavMenuOpen(null); setPersonaOpen(true); }}>
              <UserRound className="h-4 w-4" /> Persona
            </Button>
            <Button variant="secondary" onClick={() => { setNavMenuOpen(null); navigateTo("chat"); }}>
              <MessageCircle className="h-4 w-4" /> Chats
            </Button>
          </div>
          </div>
        </header>

        {page === "chat" ? (
          <div className="anim-page mt-6 grid gap-4 lg:grid-cols-3">
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
          <div className="anim-page relative mt-6 space-y-4" ref={storywritingDndRef}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xl font-semibold">Storywriting</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">Build a cast by dragging characters into the story field.</div>
              </div>
              <Button variant="secondary" onClick={() => navigateTo("library")}>
                <ArrowLeft className="h-4 w-4" /> Dashboard
              </Button>
            </div>

            {isMobile ? (
              <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <div className="text-sm font-semibold">Select cast members</div>
                <div className="space-y-2">
                  {characters.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={storyDraftMobileSelection.includes(c.id)}
                        onChange={(e) => {
                          setStoryDraftMobileSelection((prev) => e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id));
                        }}
                      />
                      <span>{c.name}</span>
                    </label>
                  ))}
                  {!characters.length ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No characters available.</div> : null}
                </div>
                <Button
                  variant="primary"
                  onClick={() => {
                    const ids = Array.from(new Set([...storyDraftCharacterIds, ...storyDraftMobileSelection]));
                    setStoryDraftCharacterIds(ids);
                    setStoryDraftMobileSelection([]);
                  }}
                  disabled={!storyDraftMobileSelection.length}
                >
                  Confirm add to cast
                </Button>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Current cast: {storyDraftCharacterIds.length}</div>
              </div>
            ) : (
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
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          beginStorywritingCardDrag(c.id, e);
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
                ref={storywritingFieldRef}
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
            )}

            <div className="fixed bottom-4 right-4">
              <Button variant="primary" className="rounded-full px-6 py-3" onClick={proceedStoryDraft}>
                Proceed
              </Button>
            </div>

            {storywritingDragPreview ? (() => {
              const c = characters.find((x) => x.id === storywritingDragPreview.id);
              if (!c) return null;
              return (
                <div className="pointer-events-none absolute z-40 w-44 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-2xl" style={{ left: storywritingDragPreview.x, top: storywritingDragPreview.y }}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                    {c.imageDataUrl ? <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" /> : <div className="absolute inset-0 bg-[hsl(var(--muted))]" />}
                    <div className="absolute inset-x-0 top-0 bg-black/45 px-2 py-1 text-xs font-semibold text-white">{c.name}</div>
                  </div>
                </div>
              );
            })() : null}
          </div>
        ) : page === "my_stories" ? (
          <div className="anim-page mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xl font-semibold">Stories</div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => navigateTo("storywriting")}>
                  <Plus className="h-4 w-4" /> Create
                </Button>
                <Button variant="secondary" onClick={() => navigateTo("library")}>
                  <ArrowLeft className="h-4 w-4" /> Dashboard
                </Button>
              </div>
            </div>
            <div className="anim-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((s) => (
                <div key={s.id} className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                  <div className="relative aspect-[4/3] border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                    {s.imageDataUrl ? <img src={s.imageDataUrl} alt={s.title} className="absolute inset-0 h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-3">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(s.updatedAt).toLocaleString()}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => { setActiveStoryId(s.id); navigateTo("story_editor"); }}>Open</Button>
                      <Button variant="secondary" onClick={() => exportStoryTxt(s)}><Download className="h-4 w-4" /> TXT</Button>
                      <Button variant="danger" onClick={() => { if (window.confirm(`Delete ${s.title}?`)) deleteStory(s.id); }}><Trash2 className="h-4 w-4" /> Delete</Button>
                    </div>
                  </div>
                </div>
              ))}
              {stories.length === 0 ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No stories yet.</div> : null}
            </div>
          </div>
        ) : page === "lorebooks" ? (
          <div className="anim-page mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xl font-semibold">Lorebooks</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">Create and manage world lorebooks.</div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" onClick={createLorebook}>
                  <Plus className="h-4 w-4" /> Create
                </Button>
                <Button variant="secondary" onClick={() => navigateTo("library")}>
                  <ArrowLeft className="h-4 w-4" /> Dashboard
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lorebooks.map((book) => (
                <div key={book.id} className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                  <button type="button" className="w-full text-left" onClick={() => { setActiveLorebookId(book.id); navigateTo("lorebook_create"); }}>
                    <div className="relative aspect-[4/3] border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                      {book.coverImageDataUrl ? <img src={book.coverImageDataUrl} alt={book.name} className="absolute inset-0 h-full w-full object-cover" /> : null}
                    </div>
                    <div className="p-3">
                      <div className="font-medium">{book.name}</div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">{new Date(book.updatedAt).toLocaleString()}</div>
                    </div>
                  </button>
                  <div className="flex gap-2 border-t border-[hsl(var(--border))] p-3">
                    <Button variant="secondary" className="w-full" onClick={() => exportLorebookAsEntries(book)}>
                      <Download className="h-4 w-4" /> Export
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={() => setLorebooks((prev) => prev.filter((x) => x.id !== book.id))}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
              {lorebooks.length === 0 ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No lorebooks yet.</div> : null}
            </div>
          </div>
        ) : page === "lorebook_create" ? (
          <div className="anim-page mt-6 space-y-4">
            {!activeLorebook ? (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-sm text-[hsl(var(--muted-foreground))]">Pick a lorebook from the lorebooks menu first.</div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-lg font-semibold">{activeLorebook.name || "Lorebook"}</div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => exportLorebookAsEntries(activeLorebook)}>
                      <Download className="h-4 w-4" /> Export JSON
                    </Button>
                    <Button variant="secondary" onClick={() => navigateTo("lorebooks")}>
                      <ArrowLeft className="h-4 w-4" /> Lorebooks Menu
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {([
                    ["overview", "Overview"],
                    ["world", "World"],
                    ["locations", "Locations"],
                    ["factions", "Factions"],
                    ["rules", "Rules"],
                    ["items", "Items"],
                    ["specials", "Specials"],
                  ] as Array<[LorebookTab, string]>).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLorebookTab(id)}
                      className={cn(
                        "clickable rounded-xl border px-3 py-2 text-sm",
                        lorebookTab === id
                          ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))] text-[hsl(var(--hover-accent-foreground))]"
                          : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div key={lorebookTab} className="anim-tab-switch">
                {lorebookTab === "overview" ? (
                  <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <div>
                      <div className="mb-1 text-sm">Upload your lorebook cover (4:3)</div>
                      <input
                        ref={lorebookCoverFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePickLorebookCover(f);
                          e.currentTarget.value = "";
                        }}
                      />
                      <Button variant="secondary" onClick={() => lorebookCoverFileRef.current?.click()}>
                        <Upload className="h-4 w-4" /> Upload cover
                      </Button>
                      {activeLorebook.coverImageDataUrl ? (
                        <div className="mt-3 max-w-md overflow-hidden rounded-xl border border-[hsl(var(--border))]">
                          <div className="aspect-[4/3] bg-[hsl(var(--muted))]">
                            <img src={activeLorebook.coverImageDataUrl} alt={activeLorebook.name} className="h-full w-full object-cover" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 text-sm">Lorebook name</div>
                        <Input value={activeLorebook.name} onChange={(e) => updateLorebook(activeLorebook.id, { name: e.target.value })} />
                      </div>
                      <div>
                        <div className="mb-1 text-sm">Author</div>
                        <Input value={activeLorebook.author} onChange={(e) => updateLorebook(activeLorebook.id, { author: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 text-sm">Lorebook description</div>
                      <Textarea value={activeLorebook.description} onChange={(e) => updateLorebook(activeLorebook.id, { description: e.target.value })} rows={4} />
                    </div>
                    <div>
                      <div className="mb-1 text-sm">Lorebook tags (comma-separated)</div>
                      <Input value={activeLorebook.metaTagsRaw} onChange={(e) => updateLorebook(activeLorebook.id, { metaTagsRaw: e.target.value })} />
                    </div>
                  </div>
                ) : null}

                {lorebookTab === "world" ? (
                  <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    {renderLoreEntryFields(
                      activeLorebook.worldEntry,
                      (patch) => updateLorebook(activeLorebook.id, { worldEntry: { ...activeLorebook.worldEntry, ...patch, category: "world" } }),
                      { nameLabel: "World name", contentLabel: "World description", contentRows: 12, forceCategory: "world" }
                    )}
                    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="mb-1 text-sm">Generation prompt</div>
                        <Input value={lorebookWorldPrompt} onChange={(e) => setLorebookWorldPrompt(e.target.value)} />
                      </div>
                      <div className="flex items-end">
                        <Button variant="secondary" onClick={generateLorebookWorld} disabled={genLoading}><Sparkles className="h-4 w-4" /> Generate</Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {lorebookTab === "locations" ? (
                  <div className="space-y-3">
                    <div className="flex justify-end"><Button variant="primary" onClick={() => addLorebookEntry("locationEntries", "Location")}><Plus className="h-4 w-4" /> Add location entry</Button></div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="space-y-2 lg:col-span-1">
                        {activeLorebook.locationEntries.map((entry) => <button key={entry.id} type="button" onClick={() => setActiveLocationEntryId(entry.id)} className={cn("w-full rounded-xl border p-3 text-left", activeLocationEntryId === entry.id ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))]")}>{entry.name || "Untitled"}</button>)}
                      </div>
                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 lg:col-span-2">
                        {(() => {
                          const entry = activeLorebook.locationEntries.find((x) => x.id === activeLocationEntryId) || activeLorebook.locationEntries[0];
                          if (!entry) return <div className="text-sm text-[hsl(var(--muted-foreground))]">No location entries yet.</div>;
                          return <div className="space-y-3">{renderLoreEntryFields(entry, (patch) => updateLorebookEntry("locationEntries", entry.id, { ...patch, category: "location" }), { nameLabel: "Location name", contentLabel: "Location description", contentRows: 10, forceCategory: "location" })}<div><Button variant="secondary" onClick={() => removeLorebookEntry("locationEntries", entry.id)}><Trash2 className="h-4 w-4" /> Remove entry</Button></div></div>;
                        })()}
                      </div>
                    </div>
                  </div>
                ) : null}

                {lorebookTab === "factions" ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      <button type="button" onClick={() => openFactionEditor()} className="clickable flex aspect-square flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))]"><Plus className="h-6 w-6" /></div>
                        <div className="text-sm font-medium">Create new faction</div>
                      </button>
                      {activeLorebook.factions.map((f) => (
                        <button key={f.id} type="button" onClick={() => openFactionEditor(f)} className="overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left">
                          <div className="relative aspect-square border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                            {f.imageDataUrl ? <img src={f.imageDataUrl} alt={f.name} className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="p-3">
                            <div className="font-semibold">{f.name}</div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{f.factionType} • {f.factionSize}</div>
                          </div>
                        </button>
                      ))}
                    </div>

                    {factionEditorOpen ? (
                      <div className="fixed right-0 top-0 z-50 h-screen w-full max-w-[34vw] min-w-[320px] overflow-y-auto border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-2xl anim-slide-in-right">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-lg font-semibold">{editingFactionId ? "Edit faction" : "Create faction"}</div>
                          <Button variant="secondary" onClick={() => setFactionEditorOpen(false)}><X className="h-4 w-4" /></Button>
                        </div>
                        <div className="space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div><div className="mb-1 text-sm">Faction name</div><Input value={factionNameInput} onChange={(e) => setFactionNameInput(e.target.value)} /></div>
                            <div><div className="mb-1 text-sm">Tags</div><Input value={factionTagsInput} onChange={(e) => setFactionTagsInput(e.target.value)} /></div>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div><div className="mb-1 text-sm">Type</div><Select value={factionTypeInput} onChange={(e) => setFactionTypeInput(e.target.value as any)}><option value="passive">Passive</option><option value="hostile">Hostile</option></Select></div>
                            <div><div className="mb-1 text-sm">Size</div><Select value={factionSizeInput} onChange={(e) => setFactionSizeInput(e.target.value as any)}><option value="micro">&lt;100 (micro)</option><option value="small">101-500 (small)</option><option value="medium">501-1000 (medium)</option><option value="large">1001-5000 (large)</option><option value="massive">5001-10000 (massive)</option><option value="colossal">10001-100000 (colossal)</option><option value="mega-faction">&gt;100000 (mega-faction)</option></Select></div>
                          </div>
                          <div>
                            <div className="mb-1 text-sm">Faction image (1:1)</div>
                            <input ref={factionImageFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePickFactionImage(f); e.currentTarget.value = ""; }} />
                            <Button variant="secondary" onClick={() => factionImageFileRef.current?.click()}><Upload className="h-4 w-4" /> Upload image</Button>
                          </div>
                          {renderLoreEntryFields(
                            {
                              ...factionEntryDraft,
                              name: factionNameInput || factionEntryDraft.name,
                              comment: factionCommentInput,
                              content: factionDetailsInput,
                              keysRaw: factionKeysInput,
                              priority: factionPriorityInput,
                              enabled: factionEnabledInput,
                              tagsRaw: factionTagsInput || "faction",
                              category: "faction",
                            },
                            (patch) => {
                              setFactionEntryDraft((prev) => ({ ...prev, ...patch, category: "faction" }));
                              if (patch.name !== undefined) setFactionNameInput(patch.name);
                              if (patch.comment !== undefined) setFactionCommentInput(patch.comment);
                              if (patch.content !== undefined) setFactionDetailsInput(patch.content);
                              if (patch.keysRaw !== undefined) setFactionKeysInput(patch.keysRaw);
                              if (patch.priority !== undefined) setFactionPriorityInput(patch.priority);
                              if (patch.enabled !== undefined) setFactionEnabledInput(patch.enabled);
                              if (patch.tagsRaw !== undefined) setFactionTagsInput(patch.tagsRaw);
                            },
                            { nameLabel: "Faction name", contentLabel: "Description", contentRows: 8, forceCategory: "faction" }
                          )}
                          <div className="flex gap-2">
                            <Button variant="primary" onClick={saveFactionEditor}>Done</Button>
                            {editingFactionId ? <Button variant="secondary" onClick={() => { if (!activeLorebook || !editingFactionId) return; updateLorebook(activeLorebook.id, { factions: activeLorebook.factions.filter((f) => f.id !== editingFactionId) }); setFactionEditorOpen(false); }}><Trash2 className="h-4 w-4" /> Delete</Button> : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {lorebookTab === "rules" ? (
                  <div className="space-y-3">
                    <div className="flex justify-end"><Button variant="primary" onClick={() => addLorebookEntry("rulesEntries", "Rule")}><Plus className="h-4 w-4" /> Add rule entry</Button></div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="space-y-2 lg:col-span-1">
                        {activeLorebook.rulesEntries.map((entry) => <button key={entry.id} type="button" onClick={() => setActiveRuleEntryId(entry.id)} className={cn("w-full rounded-xl border p-3 text-left", activeRuleEntryId === entry.id ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))]")}>{entry.name || "Untitled"}</button>)}
                      </div>
                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 lg:col-span-2">
                        {(() => {
                          const entry = activeLorebook.rulesEntries.find((x) => x.id === activeRuleEntryId) || activeLorebook.rulesEntries[0];
                          if (!entry) return <div className="text-sm text-[hsl(var(--muted-foreground))]">No rule entries yet.</div>;
                          return <div className="space-y-3">{renderLoreEntryFields(entry, (patch) => updateLorebookEntry("rulesEntries", entry.id, { ...patch, category: "rule" }), { nameLabel: "Rule name", contentLabel: "Rule description", contentRows: 10, forceCategory: "rule" })}<div><Button variant="secondary" onClick={() => removeLorebookEntry("rulesEntries", entry.id)}><Trash2 className="h-4 w-4" /> Remove entry</Button></div></div>;
                        })()}
                      </div>
                    </div>
                  </div>
                ) : null}

                {lorebookTab === "items" ? (
                  <div className="space-y-3">
                    <div className="flex justify-end"><Button variant="primary" onClick={() => addLorebookEntry("itemEntries", "Item")}><Plus className="h-4 w-4" /> Add item entry</Button></div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="space-y-2 lg:col-span-1">
                        {activeLorebook.itemEntries.map((entry) => <button key={entry.id} type="button" onClick={() => setActiveItemEntryId(entry.id)} className={cn("w-full rounded-xl border p-3 text-left", activeItemEntryId === entry.id ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))]")}>{entry.name || "Untitled"}</button>)}
                      </div>
                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 lg:col-span-2">
                        {(() => {
                          const entry = activeLorebook.itemEntries.find((x) => x.id === activeItemEntryId) || activeLorebook.itemEntries[0];
                          if (!entry) return <div className="text-sm text-[hsl(var(--muted-foreground))]">No item entries yet.</div>;
                          return <div className="space-y-3">{renderLoreEntryFields(entry, (patch) => updateLorebookEntry("itemEntries", entry.id, { ...patch, category: "item" }), { nameLabel: "Item name", contentLabel: "Item description", contentRows: 10, forceCategory: "item" })}<div><Button variant="secondary" onClick={() => removeLorebookEntry("itemEntries", entry.id)}><Trash2 className="h-4 w-4" /> Remove entry</Button></div></div>;
                        })()}
                      </div>
                    </div>
                  </div>
                ) : null}

                {lorebookTab === "specials" ? (
                  <div className="space-y-3">
                    <div className="flex justify-end"><Button variant="primary" onClick={() => addLorebookEntry("specialsEntries", "Special")}><Plus className="h-4 w-4" /> Add special entry</Button></div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="space-y-2 lg:col-span-1">
                        {activeLorebook.specialsEntries.map((entry) => <button key={entry.id} type="button" onClick={() => setActiveSpecialEntryId(entry.id)} className={cn("w-full rounded-xl border p-3 text-left", activeSpecialEntryId === entry.id ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))]")}>{entry.name || "Untitled"}</button>)}
                      </div>
                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 lg:col-span-2">
                        {(() => {
                          const entry = activeLorebook.specialsEntries.find((x) => x.id === activeSpecialEntryId) || activeLorebook.specialsEntries[0];
                          if (!entry) return <div className="text-sm text-[hsl(var(--muted-foreground))]">No special entries yet.</div>;
                          return <div className="space-y-3">{renderLoreEntryFields(entry, (patch) => updateLorebookEntry("specialsEntries", entry.id, { ...patch, category: "special" }), { nameLabel: "Special name", contentLabel: "Special description", contentRows: 10, forceCategory: "special" })}<div><Button variant="secondary" onClick={() => removeLorebookEntry("specialsEntries", entry.id)}><Trash2 className="h-4 w-4" /> Remove entry</Button></div></div>;
                        })()}
                      </div>
                    </div>
                  </div>
                ) : null}
                </div>
              </>
            )}
          </div>
        ) : page === "story_editor" ? (
          <div className="anim-page mt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xl font-semibold">{activeStory?.title || "Story Editor"}</div>
                <div className="text-sm text-[hsl(var(--muted-foreground))]">Scenario • Relationships • Plot Points</div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => navigateTo("my_stories")}>Stories</Button>
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
                ["first_message", "First Message"],
                ["system_rules", "System Rules"],
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

            <div key={storyTab} className="anim-tab-switch">
            {!activeStory ? (
              <div className="text-sm text-[hsl(var(--muted-foreground))]">Select a story first.</div>
            ) : storyTab === "scenario" ? (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                <div className="grid gap-4 md:grid-cols-[220px,1fr,220px]">
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
                  {renderGeneratedTextarea({
                    fieldKey: `story-scenario:${activeStory.id}`,
                    value: activeStory.scenario,
                    onChange: (next) => updateStory(activeStory.id, { scenario: next }),
                    rows: 10,
                    placeholder: "Scenario...",
                  })}
                  <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 space-y-2">
                    <div className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Assigned Lorebooks</div>
                    <button
                      type="button"
                      onClick={() => setStoryLorebookPickerOpen(true)}
                      className="clickable flex aspect-[3/4] w-full flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.6]"
                    >
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))]"><Plus className="h-5 w-5" /></div>
                      <div className="text-xs font-medium">Assign lorebook</div>
                    </button>
                    {activeStory.assignedLorebookIds.length ? (
                      <div className="flex flex-wrap gap-1">
                        {activeStory.assignedLorebookIds.map((id) => {
                          const b = lorebooks.find((x) => x.id === id);
                          return b ? <Badge key={id}>{b.name}</Badge> : null;
                        })}
                      </div>
                    ) : <div className="text-xs text-[hsl(var(--muted-foreground))]">None assigned.</div>}
                  </div>
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
            ) : storyTab === "first_message" ? (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">First Message</div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">Create multiple first-message versions and switch between them.</div>
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => {
                      if (!activeStory) return;
                      const versions = activeStory.firstMessageVersions?.length ? [...activeStory.firstMessageVersions] : [activeStory.firstMessage || ""];
                      const idx = versions.length;
                      const next = [...versions, ""];
                      updateStory(activeStory.id, { firstMessageVersions: next, selectedFirstMessageIndex: idx, firstMessage: "" });
                      setStoryFirstMessageInput("");
                      setStoryFirstMessageHistories((prev) => {
                        const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
                        base.push([""]);
                        return base;
                      });
                      setStoryFirstMessageHistoryIndices((prev) => {
                        const base = prev.length ? [...prev] : [0];
                        base.push(0);
                        return base;
                      });
                    }}
                  >
                    <Plus className="h-4 w-4" /> New
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={(activeStory.selectedFirstMessageIndex || 0) <= 0}
                    onClick={() => {
                      if (!activeStory) return;
                      const versions = activeStory.firstMessageVersions?.length ? activeStory.firstMessageVersions : [activeStory.firstMessage || ""];
                      const idx = clampIndex((activeStory.selectedFirstMessageIndex || 0) - 1, versions.length);
                      updateStory(activeStory.id, { selectedFirstMessageIndex: idx, firstMessage: versions[idx] || "" });
                      setStoryFirstMessageInput(versions[idx] || "");
                      setStoryFirstMessageRevisionPrompt(`Current first message context:\n${versions[idx] || "(empty)"}\n\nRevision instructions:\n`);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev message
                  </Button>
                  <div className="text-sm">
                    Message <span className="font-semibold">{(activeStory.selectedFirstMessageIndex || 0) + 1}</span> / {Math.max(1, activeStory.firstMessageVersions?.length || 1)}
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={(activeStory.selectedFirstMessageIndex || 0) >= Math.max(1, activeStory.firstMessageVersions?.length || 1) - 1}
                    onClick={() => {
                      if (!activeStory) return;
                      const versions = activeStory.firstMessageVersions?.length ? activeStory.firstMessageVersions : [activeStory.firstMessage || ""];
                      const idx = clampIndex((activeStory.selectedFirstMessageIndex || 0) + 1, versions.length);
                      updateStory(activeStory.id, { selectedFirstMessageIndex: idx, firstMessage: versions[idx] || "" });
                      setStoryFirstMessageInput(versions[idx] || "");
                      setStoryFirstMessageRevisionPrompt(`Current first message context:\n${versions[idx] || "(empty)"}\n\nRevision instructions:\n`);
                    }}
                  >
                    Next message <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={(() => {
                      const i = clampIndex(activeStory.selectedFirstMessageIndex || 0, Math.max(1, activeStory.firstMessageVersions?.length || 1));
                      const history = storyFirstMessageHistories[i] || [storyFirstMessageInput || ""];
                      const current = clampIndex(storyFirstMessageHistoryIndices[i] || 0, history.length);
                      return current <= 0;
                    })()}
                    onClick={() => {
                      const i = clampIndex(activeStory.selectedFirstMessageIndex || 0, Math.max(1, activeStory.firstMessageVersions?.length || 1));
                      const history = storyFirstMessageHistories[i] || [storyFirstMessageInput || ""];
                      const current = clampIndex(storyFirstMessageHistoryIndices[i] || 0, history.length);
                      const nextIdx = clampIndex(current - 1, history.length);
                      const nextText = history[nextIdx] || "";
                      setStoryFirstMessageHistoryIndices((prev) => {
                        const base = prev.length ? [...prev] : [0];
                        while (base.length <= i) base.push(0);
                        base[i] = nextIdx;
                        return base;
                      });
                      setStoryFirstMessageInput(nextText);
                      const versions = activeStory.firstMessageVersions?.length ? [...activeStory.firstMessageVersions] : [activeStory.firstMessage || ""];
                      versions[i] = nextText;
                      updateStory(activeStory.id, { firstMessage: nextText, firstMessageVersions: versions, selectedFirstMessageIndex: i });
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" /> Roll back
                  </Button>
                  <div className="text-sm text-[hsl(var(--muted-foreground))]">
                    Iteration {(storyFirstMessageHistoryIndices[clampIndex(activeStory.selectedFirstMessageIndex || 0, Math.max(1, activeStory.firstMessageVersions?.length || 1))] || 0) + 1} / {Math.max(1, storyFirstMessageHistories[clampIndex(activeStory.selectedFirstMessageIndex || 0, Math.max(1, activeStory.firstMessageVersions?.length || 1))]?.length || 1)}
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    disabled={(() => {
                      const i = clampIndex(activeStory.selectedFirstMessageIndex || 0, Math.max(1, activeStory.firstMessageVersions?.length || 1));
                      const history = storyFirstMessageHistories[i] || [storyFirstMessageInput || ""];
                      const current = clampIndex(storyFirstMessageHistoryIndices[i] || 0, history.length);
                      return current >= history.length - 1;
                    })()}
                    onClick={() => {
                      const i = clampIndex(activeStory.selectedFirstMessageIndex || 0, Math.max(1, activeStory.firstMessageVersions?.length || 1));
                      const history = storyFirstMessageHistories[i] || [storyFirstMessageInput || ""];
                      const current = clampIndex(storyFirstMessageHistoryIndices[i] || 0, history.length);
                      const nextIdx = clampIndex(current + 1, history.length);
                      const nextText = history[nextIdx] || "";
                      setStoryFirstMessageHistoryIndices((prev) => {
                        const base = prev.length ? [...prev] : [0];
                        while (base.length <= i) base.push(0);
                        base[i] = nextIdx;
                        return base;
                      });
                      setStoryFirstMessageInput(nextText);
                      const versions = activeStory.firstMessageVersions?.length ? [...activeStory.firstMessageVersions] : [activeStory.firstMessage || ""];
                      versions[i] = nextText;
                      updateStory(activeStory.id, { firstMessage: nextText, firstMessageVersions: versions, selectedFirstMessageIndex: i });
                    }}
                  >
                    Roll forward <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-sm font-medium">Style preset</div>
                    <Select value={storyFirstMessageStyle} onChange={(e) => setStoryFirstMessageStyle(e.target.value as any)}>
                      <option value="realistic">Realistic</option>
                      <option value="dramatic">Dramatic</option>
                      <option value="melancholic">Melancholic</option>
                    </Select>
                  </div>
                  <div>
                    <div className="mb-1 text-sm font-medium">Prompt</div>
                    <Input value={storyFirstMessagePrompt} onChange={(e) => setStoryFirstMessagePrompt(e.target.value)} placeholder="Guide first message" />
                  </div>
                </div>
                <Button variant="secondary" onClick={generateStoryFirstMessage} disabled={genLoading}><Sparkles className="h-4 w-4" /> Generate first message</Button>

                <Textarea
                  value={storyFirstMessageInput}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStoryFirstMessageInput(next);
                    if (!activeStory) return;
                    const versions = activeStory.firstMessageVersions?.length ? [...activeStory.firstMessageVersions] : [activeStory.firstMessage || ""];
                    const idx = clampIndex(activeStory.selectedFirstMessageIndex || 0, versions.length);
                    versions[idx] = next;
                    setStoryFirstMessageHistories((prev) => {
                      const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
                      while (base.length <= idx) base.push([""]);
                      const history = base[idx];
                      const iterIdx = clampIndex(storyFirstMessageHistoryIndices[idx] || 0, history.length);
                      history[iterIdx] = next;
                      return base;
                    });
                    updateStory(activeStory.id, { firstMessage: next, firstMessageStyle: storyFirstMessageStyle, firstMessageVersions: versions, selectedFirstMessageIndex: idx });
                  }}
                  rows={10}
                />

                <div className="space-y-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                  <div className="text-sm font-medium">Revise selected first message</div>
                  <Textarea
                    value={storyFirstMessageRevisionPrompt}
                    onChange={(e) => setStoryFirstMessageRevisionPrompt(e.target.value)}
                    rows={6}
                    placeholder="Revision prompt for this first message..."
                  />
                  <Button variant="secondary" onClick={reviseStoryFirstMessage} disabled={genLoading || !collapseWhitespace(storyFirstMessageRevisionPrompt)}>
                    <Sparkles className="h-4 w-4" /> Revise first message
                  </Button>
                </div>
              </div>
            ) : storyTab === "system_rules" ? (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-4">
                <div className="text-sm font-medium">System rules</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {STORY_SYSTEM_RULE_CARDS.map((rule) => {
                    const selected = !!activeStory.selectedSystemRuleIds?.includes(rule.id);
                    return (
                      <button
                        key={rule.id}
                        type="button"
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left text-sm transition-colors",
                          selected
                            ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                        )}
                        onClick={() => {
                          if (!activeStory) return;
                          const selectedSet = new Set(activeStory.selectedSystemRuleIds || []);
                          if (selectedSet.has(rule.id)) selectedSet.delete(rule.id);
                          else selectedSet.add(rule.id);
                          updateStory(activeStory.id, { selectedSystemRuleIds: Array.from(selectedSet) });
                        }}
                      >
                        <div className="font-medium">{rule.label}</div>
                        <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{rule.text}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
                  <div className="text-sm font-medium">Selected rule list</div>
                  {(activeStory.selectedSystemRuleIds || []).length ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {STORY_SYSTEM_RULE_CARDS.filter((rule) => activeStory.selectedSystemRuleIds.includes(rule.id)).map((rule) => (
                        <li key={rule.id}>{rule.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">No rule cards selected yet.</div>
                  )}
                </div>

                <div>
                  <div className="mb-1 text-xs font-medium text-[hsl(var(--muted-foreground))]">Additional custom system rules</div>
                  <Textarea value={storySystemRulesInput} onChange={(e) => { setStorySystemRulesInput(e.target.value); if (activeStory) updateStory(activeStory.id, { systemRules: e.target.value }); }} rows={8} />
                </div>
              </div>
            ) : storyTab === "relationships" ? (
              <div className="space-y-3">
                {!isMobile ? (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <div className="mb-3 text-sm text-[hsl(var(--muted-foreground))]">Build relationship links on the full relationship board.</div>
                    <Button variant="secondary" onClick={() => navigateTo("story_relationship_board")}>Open Relationship Builder</Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <div className="mb-3 text-sm text-[hsl(var(--muted-foreground))]">Mobile mode: create relationships directly from cards using the editor below.</div>
                    <Button variant="secondary" onClick={() => { setSelectedRelationshipId(null); setStoryRelFromId(activeStory.characterIds[0] || ""); setStoryRelToId(activeStory.characterIds[1] || ""); setStoryRelAlignment("Neutral"); setStoryRelType("Platonic"); setStoryRelDetails(""); setStoryRelationshipEditorOpen(true); }}>Create new relationship</Button>
                  </div>
                )}
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
                            <div className="font-medium">{a} ↔ {b}</div>
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
                <div className="fixed right-0 top-0 z-40 h-full w-[min(92vw,360px)] border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 anim-slide-in-right">
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
                    <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 space-y-2">
                      <div className="text-xs font-medium">Details prompt</div>
                      <Textarea value={relationshipDetailsPrompt} onChange={(e) => setRelationshipDetailsPrompt(e.target.value)} rows={3} placeholder="Generate or revise relationship details..." />
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => improveSelectedRelationshipDetails("generate")} disabled={genLoading || !selectedRelationshipId}><Sparkles className="h-4 w-4" /> Generate</Button>
                        <Button variant="secondary" onClick={() => improveSelectedRelationshipDetails("revise")} disabled={genLoading || !selectedRelationshipId}><Sparkles className="h-4 w-4" /> Revise</Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" onClick={saveRelationshipEdge}>Save relation</Button>
                      {selectedRelationshipId ? <Button variant="secondary" onClick={deleteSelectedRelationship}><Trash2 className="h-4 w-4" /> Delete</Button> : null}
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
          </div>
        ) : page === "story_relationship_board" ? (
          !activeStory ? (
            <div className="anim-page mt-6 text-sm text-[hsl(var(--muted-foreground))]">Select a story first.</div>
          ) : (
            <div className="fixed inset-0 z-[70] bg-[hsl(var(--background))] p-3 md:p-6">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm text-[hsl(var(--muted-foreground))]">Drag picture cards and connect top dots to create two-way links</div>
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
                      const snapPoint = getBoardNodeCenter(snapTargetId);
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
                  <div className="absolute left-3 top-3 z-30 w-72 max-h-[70vh] overflow-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/95 p-2 backdrop-blur">
                    <div className="mb-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">Formed relationships</div>
                    <div className="space-y-2">
                      {activeStory.relationships.map((r) => {
                        const fromName = r.fromCharacterId === USER_NODE_ID ? "USER" : (characters.find((c) => c.id === r.fromCharacterId)?.name || "?");
                        const toName = r.toCharacterId === USER_NODE_ID ? "USER" : (characters.find((c) => c.id === r.toCharacterId)?.name || "?");
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-2 py-2 text-xs",
                              selectedRelationshipId === r.id ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.12]" : "border-[hsl(var(--border))] bg-[hsl(var(--background))]"
                            )}
                          >
                            <button type="button" onClick={() => selectExistingRelationship(r)} className="flex-1 text-left">
                              <div className="font-medium">{fromName} ↔ {toName}</div>
                              <div className="text-[hsl(var(--muted-foreground))]">{r.relationType} · {r.alignment}</div>
                            </button>
                            <button
                              type="button"
                              className="rounded border border-[hsl(var(--border))] p-1"
                              onClick={() => {
                                updateStory(activeStory.id, { relationships: activeStory.relationships.filter((x) => x.id !== r.id) });
                                if (selectedRelationshipId === r.id) {
                                  setSelectedRelationshipId(null);
                                  setStoryRelationshipEditorOpen(false);
                                  setPendingRelationshipEdge(null);
                                }
                              }}
                              aria-label="Delete relationship"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {!activeStory.relationships.length ? <div className="text-xs text-[hsl(var(--muted-foreground))]">No relationships yet.</div> : null}
                    </div>
                  </div>
                  <div className="absolute inset-0" style={{ transform: `translate(${boardPan.x}px, ${boardPan.y}px)` }}>
                  {[...activeStory.boardNodes, ...(activeStory.boardNodes.some((bn) => bn.characterId === USER_NODE_ID) ? [] : [{ characterId: USER_NODE_ID, x: 40, y: 120 }])].map((n) => {
                    const c = n.characterId === USER_NODE_ID ? ({ id: USER_NODE_ID, name: "USER", imageDataUrl: "" } as any) : characters.find((x) => x.id === n.characterId);
                    if (!c) return null;
                    return (
                      <div
                        key={n.characterId}
                        data-board-item="1"
                        onMouseDown={(e) => {
                          if (dotPointerDownRef.current || e.button !== 0) return;
                          beginRelationshipCardDrag(n.characterId, "board", e, n.x, n.y);
                        }}
                        className={cn(
                          "absolute z-10 w-64 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 text-sm shadow transition-all duration-200",
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
                              "absolute left-1/2 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-[hsl(var(--ring))] transition-all",
                              connectionSnapTargetId === n.characterId && "ring-2 ring-[hsl(var(--hover-accent))]"
                            )}
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
                            aria-label="from-dot"
                          />
                          <div className="absolute inset-x-0 top-6 bg-black/45 px-1 py-0.5 text-center text-[11px] font-semibold text-white">{c.name}</div>
                        </div>
                      </div>
                    );
                  })}
                  <svg className="pointer-events-none absolute left-[-6000px] top-[-6000px] z-20 h-[12000px] w-[12000px]" style={{ overflow: "visible" }}>
                    {activeStory.relationships.map((r) => {
                      const from = getBoardNodeCenter(r.fromCharacterId);
                      const to = getBoardNodeCenter(r.toCharacterId);
                      if (!from || !to) return null;
                      const selected = selectedRelationshipId === r.id;
                      const shiftedFrom = { x: from.x + 6000, y: from.y + 6000 };
                      const shiftedTo = { x: to.x + 6000, y: to.y + 6000 };
                      return (
                        <path
                          key={r.id}
                          d={getFlowPath(shiftedFrom, shiftedTo)}
                          stroke={selected ? "hsl(var(--hover-accent))" : "hsl(var(--muted-foreground))"}
                          strokeWidth={selected ? 4 : 2}
                          fill="none"
                          strokeLinecap="round"

                        />
                      );
                    })}
                    {pendingRelationshipEdge ? (() => {
                      const from = getBoardNodeCenter(pendingRelationshipEdge.fromCharacterId);
                      const to = getBoardNodeCenter(pendingRelationshipEdge.toCharacterId);
                      if (!from || !to) return null;
                      return (
                        <path
                          d={getFlowPath({ x: from.x + 6000, y: from.y + 6000 }, { x: to.x + 6000, y: to.y + 6000 })}
                          stroke="hsl(var(--hover-accent))"
                          strokeWidth={3}
                          fill="none"
                          strokeDasharray="8 5"
                        />
                      );
                    })() : null}
                    {connectingFromId && connectingPointer ? (() => {
                      const from = getBoardNodeCenter(connectingFromId);
                      if (!from) return null;
                      return (
                        <path
                          d={getFlowPath({ x: from.x + 6000, y: from.y + 6000 }, { x: connectingPointer.x + 6000, y: connectingPointer.y + 6000 })}
                          stroke="hsl(var(--hover-accent))"
                          strokeWidth={2}
                          fill="none"
                          strokeDasharray="6 4"
                        />
                      );
                    })() : null}
                  </svg>
                  {relationshipDrag ? (() => {
                    const c = characters.find((x) => x.id === relationshipDrag.id);
                    if (!c) return null;
                    return (
                      <div
                        className="pointer-events-none absolute z-20 w-64 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 text-sm shadow-2xl"
                        style={{ left: relationshipDrag.x, top: relationshipDrag.y }}
                      >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-[hsl(var(--border))]">
                          {c.imageDataUrl ? (
                            <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" />
                          ) : (
                            <div className="absolute inset-0 bg-[hsl(var(--muted))]" />
                          )}
                          <div className="absolute inset-x-0 top-6 bg-black/45 px-1 py-0.5 text-center text-[11px] font-semibold text-white">{c.name}</div>
                        </div>
                      </div>
                    );
                  })() : null}
                  </div>
                </div>

                <div
                  ref={relationshipDeckRef}
                  className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-72 rounded-t-3xl border border-b-0 border-[hsl(var(--border))] bg-[hsl(var(--card))/0.58] transition-colors duration-200",
                    deckDropHover && "bg-[hsl(var(--hover-accent))/0.22]"
                  )}
                >
                  <div className="absolute inset-x-0 bottom-3 text-center text-xs font-medium text-[hsl(var(--foreground))/0.88]">
                    Drop here to return card to deck
                  </div>
                </div>

                <div className="absolute inset-x-6 bottom-3 z-20">
                  <div className="overflow-x-auto pb-2">
                    <div className="flex items-end gap-2 pt-6">
                    {[USER_NODE_ID, ...activeStory.characterIds]
                      .filter((id) => !activeStory.boardNodes.some((n) => n.characterId === id))
                      .map((id) => {
                        const c = id === USER_NODE_ID ? ({ id: USER_NODE_ID, name: "USER", imageDataUrl: "" } as any) : characters.find((x) => x.id === id);
                        if (!c) return null;
                        return (
                          <div
                            key={id}
                            onMouseDown={(e) => {
                              if (e.button !== 0) return;
                              beginRelationshipCardDrag(id, "deck", e);
                            }}
                            className="relative z-10 shrink-0 w-44 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1 transition-transform duration-200 hover:-translate-y-3"
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
                </div>

                {storyRelationshipEditorOpen ? (
                  <div className="fixed right-0 top-0 z-40 h-full w-[min(92vw,360px)] border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 anim-slide-in-right">
                    <div className="text-sm font-semibold">Relationship Editor</div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-xs">From</div>
                        <Select value={storyRelFromId} onChange={(e) => setStoryRelFromId(e.target.value)}>
                          <option value="">Select character…</option>
                          {[USER_NODE_ID, ...activeStory.characterIds].map((id) => {
                            if (id === USER_NODE_ID) return <option key={id} value={id}>USER</option>;
                            const c = characters.find((x) => x.id === id);
                            return c ? <option key={id} value={id}>{c.name}</option> : null;
                          })}
                        </Select>
                      </div>
                      <div>
                        <div className="text-xs">To</div>
                        <Select value={storyRelToId} onChange={(e) => setStoryRelToId(e.target.value)}>
                          <option value="">Select character…</option>
                          {[USER_NODE_ID, ...activeStory.characterIds].map((id) => {
                            if (id === USER_NODE_ID) return <option key={id} value={id}>USER</option>;
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
                      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3 space-y-2">
                        <div className="text-xs font-medium">Details prompt</div>
                        <Textarea value={relationshipDetailsPrompt} onChange={(e) => setRelationshipDetailsPrompt(e.target.value)} rows={3} placeholder="Generate or revise relationship details..." />
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => improveSelectedRelationshipDetails("generate")} disabled={genLoading || !selectedRelationshipId}><Sparkles className="h-4 w-4" /> Generate</Button>
                          <Button variant="secondary" onClick={() => improveSelectedRelationshipDetails("revise")} disabled={genLoading || !selectedRelationshipId}><Sparkles className="h-4 w-4" /> Revise</Button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" onClick={saveRelationshipEdge}>Save relation</Button>
                        {selectedRelationshipId ? <Button variant="secondary" onClick={deleteSelectedRelationship}><Trash2 className="h-4 w-4" /> Delete</Button> : null}
                        <Button variant="secondary" onClick={closeRelationshipEditor}>Close</Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )
        ) : page === "library" ? (
            <div className="anim-page mt-6 space-y-6">
            <div className="anim-stagger grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <div className="mb-3 text-sm font-semibold">Characters</div>
                <Button variant="primary" className="w-full justify-center py-3" onClick={() => { resetForm(); navigateTo("create"); setTab("overview"); }}>
                  <Plus className="h-4 w-4" /> Create new character
                </Button>
                <Button variant="secondary" className="mt-3 w-full" onClick={() => navigateTo("characters")}>
                  <Library className="h-4 w-4" /> View character gallery
                </Button>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <div className="mb-3 text-sm font-semibold">Stories</div>
                <Button variant="primary" className="w-full justify-center py-3" onClick={() => navigateTo("storywriting")}>
                  <Plus className="h-4 w-4" /> Create new story
                </Button>
                <Button variant="secondary" className="mt-3 w-full" onClick={() => navigateTo("my_stories")}>
                  <Library className="h-4 w-4" /> View stories
                </Button>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                <div className="mb-3 text-sm font-semibold">Lorebooks</div>
                <Button variant="primary" className="w-full justify-center py-3" onClick={createLorebook}>
                  <Plus className="h-4 w-4" /> Create new lorebook
                </Button>
                <Button variant="secondary" className="mt-3 w-full" onClick={() => navigateTo("lorebooks")}>
                  <BookOpen className="h-4 w-4" /> View lorebooks
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Your latest character</div>
              <button
                type="button"
                onClick={() => latestCharacter && setPreviewId(latestCharacter.id)}
                className="group relative grid h-64 w-full grid-cols-[180px,1fr] overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left"
              >
                <div className="relative border-r border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                  {latestCharacter?.imageDataUrl ? <img src={latestCharacter.imageDataUrl} alt={latestCharacter.name} className="absolute inset-0 h-full w-full object-cover object-top" /> : null}
                </div>
                <div className="relative z-10 p-5">
                  <div className="text-xl font-semibold">{latestCharacter?.name || "No character yet"}</div>
                  <div className="text-sm text-[hsl(var(--foreground))/0.8]">Continue your last character</div>
                </div>
                <div className="absolute inset-y-0 right-0 w-24 translate-x-full bg-white transition-transform duration-300 group-hover:translate-x-0">
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/90">
                      <ArrowLeft className="h-4 w-4 rotate-180 text-black opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:animate-[spin_0.2s_linear_1]" />
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
                className="group relative grid h-64 w-full grid-cols-[180px,1fr] overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-left"
              >
                <div className="relative border-r border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                  {latestStory?.imageDataUrl ? <img src={latestStory.imageDataUrl} alt={latestStory.title} className="absolute inset-0 h-full w-full object-cover object-top" /> : null}
                </div>
                <div className="relative z-10 p-5">
                  <div className="text-xl font-semibold">{latestStory?.title || "No story yet"}</div>
                  <div className="text-sm text-[hsl(var(--foreground))/0.8]">Continue your last story</div>
                </div>
                <div className="absolute inset-y-0 right-0 w-24 translate-x-full bg-white transition-transform duration-300 group-hover:translate-x-0">
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white/90">
                      <ArrowLeft className="h-4 w-4 rotate-180 text-black opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:animate-[spin_0.2s_linear_1]" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : page === "characters" ? (
          <div className="anim-page mt-6 space-y-4">
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
                <Button variant="primary" onClick={() => { resetForm(); navigateTo("create"); setTab("overview"); }}>
                  <Plus className="h-4 w-4" /> Create
                </Button>
              </div>
            </div>
            {filteredCharacters.length === 0 ? (
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-sm text-[hsl(var(--muted-foreground))]">
                {characters.length === 0 ? "No characters yet. Click Create to make your first one." : "No matches for your search."}
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
                        <img src={c.imageDataUrl} alt={c.name} className="absolute inset-0 h-full w-full object-cover object-top" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          <span className="text-sm">No image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(var(--card))]" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-[hsl(var(--foreground))]">{c.name}</div>
                            <div className={cn("text-sm", genderColorClass(c.gender))}>{c.gender || "—"}</div>
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
          <div className="anim-page mt-6 space-y-4">
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

            <div key={tab} className="anim-tab-switch grid gap-6 lg:grid-cols-5">
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm lg:col-span-3">
                <div className="space-y-6 p-5 md:p-6">
                  {tab === "overview" ? (
                    <div className="space-y-4">
                      <div className="text-lg font-semibold">Overview</div>
                      <div className="grid gap-4 md:grid-cols-[160px,1fr]">
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Character image</div>
                          <div className="flex gap-2">
                            <Button variant="secondary" type="button" onClick={() => imageFileRef.current?.click()}>Upload</Button>
                            <Button variant="secondary" type="button" onClick={() => { setImageDataUrl(""); setImageError(null); }} disabled={!imageDataUrl}>Remove</Button>
                          </div>
                          <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePickImage(f); e.currentTarget.value = ""; }} />
                          {imageDataUrl ? <div className="relative w-full overflow-hidden rounded-xl border border-[hsl(var(--border))] aspect-[3/4]"><img src={imageDataUrl} alt="Character" className="absolute inset-0 h-full w-full object-cover object-top" /></div> : <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-xs text-[hsl(var(--muted-foreground))]">No image</div>}
                          {imageError ? <div className="text-xs text-[hsl(0_75%_55%)]">{imageError}</div> : null}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div><div className="mb-1 text-sm font-medium">Name</div><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                          <div><div className="mb-1 text-sm font-medium">Gender</div><Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}><option value="">—</option><option value="Male">Male</option><option value="Female">Female</option></Select></div>
                          <div><div className="mb-1 text-sm font-medium">Age</div><Input value={age} onChange={(e) => { const v = e.target.value; if (v === "") return setAge(""); const n = Number(v); if (Number.isFinite(n)) setAge(n); }} inputMode="numeric" /></div>
                          <div><div className="mb-1 text-sm font-medium">Height</div><Input value={height} onChange={(e) => setHeight(e.target.value)} /></div>
                          <div className="md:col-span-2"><div className="mb-1 text-sm font-medium">Character description</div><Textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} rows={8} /></div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "personality" ? (
                    <div className="space-y-4">
                      <div className="text-lg font-semibold">Personality & Unique Traits</div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Personality (premade tags)</div>
                        <Input value={personalitySearch} onChange={(e) => setPersonalitySearch(e.target.value)} placeholder="Search tags" />
                        <div className="max-h-64 overflow-auto rounded-xl border border-[hsl(var(--border))] p-2 grid gap-2 sm:grid-cols-2">
                          {PERSONALITIES.filter((x) => x.toLowerCase().includes(personalitySearch.toLowerCase())).map((x) => {
                            const active = personalities.includes(x);
                            return <button key={x} type="button" className={cn("rounded-lg border px-2 py-1 text-left text-xs", active ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]" : "border-[hsl(var(--border))]")} onClick={() => setPersonalities((prev) => active ? prev.filter((p) => p !== x) : [...prev, x])}>{x}</button>;
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Unique traits (free entry)</div>
                        <div className="flex gap-2"><Input value={traitInput} onChange={(e) => setTraitInput(e.target.value)} onKeyDown={(e) => onEnterAdd(e, addTrait)} /><Button variant="secondary" type="button" onClick={addTrait}>Add</Button></div>
                        <div className="flex flex-wrap gap-2">{traits.map((t) => <button key={t} type="button" className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs" onClick={() => removeFromList(t, setTraits)}>{t} ×</button>)}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Physical appearance (free tags)</div>
                        <div className="flex gap-2"><Input value={appearanceInput} onChange={(e) => setAppearanceInput(e.target.value)} onKeyDown={(e) => onEnterAdd(e, () => addToList(appearanceInput, physicalAppearance, setPhysicalAppearance, () => setAppearanceInput("")))} /><Button variant="secondary" type="button" onClick={() => addToList(appearanceInput, physicalAppearance, setPhysicalAppearance, () => setAppearanceInput(""))}>Add</Button></div>
                        <div className="flex flex-wrap gap-2">{physicalAppearance.map((t) => <button key={t} type="button" className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs" onClick={() => removeFromList(t, setPhysicalAppearance)}>{t} ×</button>)}</div>
                      </div>
                    </div>
                  ) : null}

                  {tab === "behavior" ? (
                    <div className="space-y-4">
                      <div className="text-lg font-semibold">Behavior</div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Respond to problems (12 presets)</div>
                        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                          {RESPONSE_TO_PROBLEMS_PRESETS.map((x) => {
                            const active = problemBehavior.includes(x);
                            return <button key={x} type="button" className={cn("rounded-lg border px-2 py-1 text-left text-xs", active ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]" : "border-[hsl(var(--border))]")} onClick={() => setProblemBehavior((prev) => active ? prev.filter((p) => p !== x) : [...prev, x])}>{x}</button>;
                          })}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Sexual behavior (entry list)</div>
                        <div className="flex gap-2"><Input value={sexualBehaviorInput} onChange={(e) => setSexualBehaviorInput(e.target.value)} onKeyDown={(e) => onEnterAdd(e, () => addToList(sexualBehaviorInput, sexualBehavior, setSexualBehavior, () => setSexualBehaviorInput("")))} /><Button variant="secondary" type="button" onClick={() => addToList(sexualBehaviorInput, sexualBehavior, setSexualBehavior, () => setSexualBehaviorInput(""))}>Add</Button></div>
                        <div className="flex flex-wrap gap-2">{sexualBehavior.map((t) => <button key={t} type="button" className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-xs" onClick={() => removeFromList(t, setSexualBehavior)}>{t} ×</button>)}</div>
                        <input ref={sexualBehaviorImportRef} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importSexualBehaviorJSON(f); e.currentTarget.value = ""; }} />
                        <div className="flex gap-2"><Button variant="secondary" type="button" onClick={exportSexualBehaviorJSON}>Export JSON</Button><Button variant="secondary" type="button" onClick={() => sexualBehaviorImportRef.current?.click()}>Import JSON</Button></div>
                      </div>
                    </div>
                  ) : null}

{tab === "definition" ? (
                    <div className="space-y-4">
                      <div className="text-lg font-semibold">Backstory</div>
                      {renderGeneratedTextarea({
                        fieldKey: "character:backstory",
                        value: backstoryText,
                        onChange: setBackstoryText,
                        rows: 14,
                        placeholder: "Write backstory here...",
                      })}
                      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 space-y-2">
                        <div className="text-sm font-medium">Prompt to revise/add/change backstory</div>
                        <Textarea value={backstoryPrompt} onChange={(e) => setBackstoryPrompt(e.target.value)} rows={3} placeholder="e.g. Make this darker and add childhood trauma details" />
                        <Button variant="secondary" type="button" onClick={reviseBackstoryTextWithPrompt} disabled={genLoading}><Sparkles className="h-4 w-4" /> Apply prompt</Button>
                        {genError ? <div className="text-sm text-[hsl(0_75%_55%)]">{genError}</div> : null}
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
                        <Button variant="primary" type="button" onClick={addNewIntro}>
                          <Plus className="h-4 w-4" /> Create
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
                          <ChevronLeft className="h-4 w-4" /> Prev intro
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
                          Next intro <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            const i = clampIndex(introIndex, Math.max(1, introMessages.length));
                            const history = introVersionHistories[i] || [introMessages[i] || ""];
                            const current = clampIndex(introVersionIndices[i] || 0, history.length);
                            const nextIdx = clampIndex(current - 1, history.length);
                            setIntroVersionIndices((prev) => {
                              const base = prev.length ? [...prev] : [0];
                              while (base.length <= i) base.push(0);
                              base[i] = nextIdx;
                              return base;
                            });
                            setIntroMessages((prev) => {
                              const base = prev.length ? [...prev] : [""];
                              base[i] = history[nextIdx] || "";
                              return base;
                            });
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" /> Roll back
                        </Button>
                        <div className="text-sm text-[hsl(var(--muted-foreground))]">
                          Version {(introVersionIndices[clampIndex(introIndex, Math.max(1, introMessages.length))] || 0) + 1} / {Math.max(1, introVersionHistories[clampIndex(introIndex, Math.max(1, introMessages.length))]?.length || 1)}
                        </div>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => {
                            const i = clampIndex(introIndex, Math.max(1, introMessages.length));
                            const history = introVersionHistories[i] || [introMessages[i] || ""];
                            const current = clampIndex(introVersionIndices[i] || 0, history.length);
                            const nextIdx = clampIndex(current + 1, history.length);
                            setIntroVersionIndices((prev) => {
                              const base = prev.length ? [...prev] : [0];
                              while (base.length <= i) base.push(0);
                              base[i] = nextIdx;
                              return base;
                            });
                            setIntroMessages((prev) => {
                              const base = prev.length ? [...prev] : [""];
                              base[i] = history[nextIdx] || "";
                              return base;
                            });
                          }}
                        >
                          Roll forward <ChevronRight className="h-4 w-4" />
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
                          setIntroVersionHistories((prev) => {
                            const base = prev.length ? prev.map((h) => (Array.isArray(h) && h.length ? [...h] : [""])) : [[""]];
                            const i = clampIndex(introIndex, Math.max(1, base.length));
                            while (base.length <= i) base.push([""]);
                            const history = base[i];
                            const versionIdx = clampIndex(introVersionIndices[i] || 0, history.length);
                            history[versionIdx] = v;
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
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Revise selected intro</div>
                          <Textarea
                            value={introRevisionPrompt}
                            onChange={(e) => setIntroRevisionPrompt(e.target.value)}
                            rows={6}
                            placeholder="Revision prompt for this intro..."
                          />
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={reviseSelectedIntro}
                            disabled={!collapseWhitespace(introRevisionPrompt) || genLoading}
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
                      {renderGeneratedTextarea({
                        fieldKey: "character:synopsis",
                        value: synopsis,
                        onChange: setSynopsis,
                        rows: 10,
                        placeholder: "Synopsis…",
                      })}
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
                      <div className="space-y-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                        <div className="text-sm font-medium">Assigned lorebooks</div>
                        <button
                          type="button"
                          onClick={() => setCharacterLorebookPickerOpen(true)}
                          className="clickable flex aspect-[3/4] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))/0.6]"
                        >
                          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--border))]"><Plus className="h-5 w-5" /></div>
                          <div className="text-xs font-medium">Assign lorebook</div>
                        </button>
                        {characterAssignedLorebookIds.length ? (
                          <div className="flex flex-wrap gap-2">
                            {characterAssignedLorebookIds.map((id) => {
                              const book = lorebooks.find((x) => x.id === id);
                              return book ? <Badge key={id}>{book.name}</Badge> : null;
                            })}
                          </div>
                        ) : <div className="text-xs text-[hsl(var(--muted-foreground))]">No lorebooks assigned.</div>}
                      </div>
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


        <Modal open={characterLorebookPickerOpen} onClose={() => setCharacterLorebookPickerOpen(false)} title="Assign Lorebooks to Character" widthClass="max-w-4xl">
            <div className="anim-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lorebooks.map((book) => {
              const selected = previewChar ? (previewChar.assignedLorebookIds || []).includes(book.id) : characterAssignedLorebookIds.includes(book.id);
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => previewChar ? togglePreviewCharacterLorebookAssignment(previewChar.id, book.id) : toggleCharacterLorebookAssignment(book.id)}
                  className={cn(
                    "overflow-hidden rounded-2xl border text-left",
                    selected ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                  )}
                >
                  <div className="relative aspect-[4/3] border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                    {book.coverImageDataUrl ? <img src={book.coverImageDataUrl} alt={book.name} className="absolute inset-0 h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-3">
                    <div className="font-medium">{book.name}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{selected ? "Assigned" : "Not assigned"}</div>
                  </div>
                </button>
              );
            })}
            {!lorebooks.length ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No lorebooks available yet.</div> : null}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={() => setCharacterLorebookPickerOpen(false)}>Done</Button>
          </div>
        </Modal>

        <Modal open={storyLorebookPickerOpen} onClose={() => setStoryLorebookPickerOpen(false)} title="Assign Lorebooks to Story" widthClass="max-w-4xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lorebooks.map((book) => {
              const selected = !!activeStory?.assignedLorebookIds.includes(book.id);
              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => toggleStoryLorebookAssignment(book.id)}
                  className={cn(
                    "overflow-hidden rounded-2xl border text-left",
                    selected ? "border-[hsl(var(--hover-accent))] bg-[hsl(var(--hover-accent))/0.15]" : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                  )}
                >
                  <div className="relative aspect-[4/3] border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                    {book.coverImageDataUrl ? <img src={book.coverImageDataUrl} alt={book.name} className="absolute inset-0 h-full w-full object-cover" /> : null}
                  </div>
                  <div className="p-3">
                    <div className="font-medium">{book.name}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{selected ? "Assigned" : "Not assigned"}</div>
                  </div>
                </button>
              );
            })}
            {!lorebooks.length ? <div className="text-sm text-[hsl(var(--muted-foreground))]">No lorebooks available yet.</div> : null}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="primary" onClick={() => setStoryLorebookPickerOpen(false)}>Done</Button>
          </div>
        </Modal>

        <Modal open={proxyOpen} onClose={() => setProxyOpen(false)} title="Proxy" widthClass="max-w-xl">
          <div className="max-h-[80vh] space-y-4 overflow-y-auto pr-1">
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
              <div className="text-sm font-medium">Custom behavior prompt</div>
              <Textarea
                value={proxyCustomPrompt}
                onChange={(e) => setProxyCustomPrompt(e.target.value)}
                rows={4}
                placeholder="Optional global instructions for the model (e.g., writing style, tone, pacing, formatting rules)."
              />
            </div>
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
              <label className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>Enable text streaming</span>
                <input
                  type="checkbox"
                  checked={proxyStreamingEnabled}
                  onChange={(e) => setProxyStreamingEnabled(e.target.checked)}
                />
              </label>
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                When enabled, all LLM-generated fields stream text in real time.
              </div>
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
              <div className="grid grid-cols-8 text-[11px] text-[hsl(var(--muted-foreground))]">
                {[16, 32, 48, 64, 80, 96, 112, 128].map((k) => (
                  <span key={k} className="text-center">{k}k</span>
                ))}
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
