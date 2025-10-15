import React, { useEffect, useMemo, useState } from "react";
import Field from "./components/Field";
import { postJSON } from "./lib/api";

// Simple spinner component
function Spinner() {
  return (
    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
  );
}

type GMInputs = {
  theme: string;
  core_idea: string;
  tone: string;
  game_type: string;
  players: string;
  atmosphere: string;
  notes?: string;
};

const defaultInputs: GMInputs = {
  theme: "gizem, macera, hafif korku",
  core_idea: "Terk edilmiş maden ve kaybolan köylüler",
  tone: "kasvetli ama merak uyandırıcı",
  game_type: "tek oturum",
  players: "3 kişi, seviye 1",
  atmosphere: "yavaş başlangıç, hızlı doruk",
  notes: "Oyuncular dışarıdan gezginler; köy halkı rüyalarla ipucu veriyor",
};

type SkeletonScene = {
  scene_title: string;
  scene_objective: string;
  branch_hint?: string;
  improv_note?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function toSkeletonScene(raw: unknown): SkeletonScene {
  if (!isRecord(raw)) {
    return { scene_title: "", scene_objective: "" };
  }
  const sceneTitle =
    toOptionalString(raw.scene_title) ?? toOptionalString(raw.title) ?? "";
  const sceneObjective =
    toOptionalString(raw.scene_objective) ??
    toOptionalString(raw.objective) ??
    "";
  return {
    scene_title: sceneTitle,
    scene_objective: sceneObjective,
    branch_hint: toOptionalString(raw.branch_hint),
    improv_note: toOptionalString(raw.improv_note),
  };
}

function normalizeSkeletonView(raw: unknown): { main_objective?: string; scenes: SkeletonScene[] } | null {
  if (!isRecord(raw) || !Array.isArray(raw.scenes)) return null;
  const scenes = raw.scenes as unknown[];
  return {
    main_objective: toOptionalString(raw.main_objective),
    scenes: scenes.map(toSkeletonScene),
  };
}

function normalizeSceneDetail(raw: unknown): SkeletonScene | null {
  if (!raw) return null;
  return toSkeletonScene(raw);
}

export default function App() {
  const [inputs, setInputs] = useState<GMInputs>(() => {
    const saved = localStorage.getItem("dndbug_inputs");
    return saved ? JSON.parse(saved) : defaultInputs;
  });
  const [loading, setLoading] = useState(false);
  const [skeleton, setSkeleton] = useState<unknown>(null);
  const [scene, setScene] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("dndbug_inputs", JSON.stringify(inputs));
  }, [inputs]);

  const disabled = useMemo(() => loading, [loading]);
  const skeletonView = useMemo(() => normalizeSkeletonView(skeleton), [skeleton]);
  const sceneDetail = useMemo(() => normalizeSceneDetail(scene), [scene]);

  async function buildSkeleton() {
    try {
      setError(null); setLoading(true);
      const { data } = await postJSON<{ ok: boolean; data: unknown }>("/api/story", {
        mode: "skeleton",
        payload: inputs,
      });
      setSkeleton(data); setScene(null);
    } catch (error: unknown) { setError(error instanceof Error ? error.message : "Bilinmeyen hata"); }
    finally { setLoading(false); }
  }

  async function expandScene1() {
    if (!skeleton) return;
    try {
      setError(null); setLoading(true);
      const { data } = await postJSON<{ ok: boolean; data: unknown }>("/api/story", {
        mode: "scene1",
        payload: { inputs, skeleton },
      });
      setScene(data);
    } catch (error: unknown) { setError(error instanceof Error ? error.message : "Bilinmeyen hata"); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">DnDBug — Story Agent MVP</h1>
        <div className="text-sm text-zinc-500">Vercel API + OpenAI</div>
      </header>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Field label="Tema" value={inputs.theme} onChange={(e) => setInputs(v => ({ ...v, theme: e.target.value }))} />
          <Field label="Ana fikir" value={inputs.core_idea} onChange={(e) => setInputs(v => ({ ...v, core_idea: e.target.value }))} />
          <Field label="Ton" value={inputs.tone} onChange={(e) => setInputs(v => ({ ...v, tone: e.target.value }))} />
          <Field label="Oyun tipi" value={inputs.game_type} onChange={(e) => setInputs(v => ({ ...v, game_type: e.target.value }))} />
          <Field label="Oyuncu sayısı ve seviye" value={inputs.players} onChange={(e) => setInputs(v => ({ ...v, players: e.target.value }))} />
          <Field label="Atmosfer / pacing" value={inputs.atmosphere} onChange={(e) => setInputs(v => ({ ...v, atmosphere: e.target.value }))} />
          <Field label="Ek notlar" rows={4} value={inputs.notes} onChange={(e) => setInputs(v => ({ ...v, notes: e.target.value }))} />
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <button onClick={buildSkeleton} disabled={disabled} className="rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-50 flex items-center gap-2">
              {loading && <Spinner />}
              1) Story Skeleton oluştur
            </button>
            <button onClick={expandScene1} disabled={disabled || !skeleton} className="rounded-2xl px-4 py-2 bg-zinc-900 text-white disabled:opacity-50 flex items-center gap-2">
              {loading && <Spinner />}
              2) Scene 1 detaylandır
            </button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <Card title="Story Skeleton (Phase 2)">
            {skeletonView ? (
              <div className="space-y-3 text-sm">
                {skeletonView.main_objective && (
                  <p>
                    <span className="font-semibold">Main Objective:</span> {skeletonView.main_objective}
                  </p>
                )}
                <div className="space-y-2">
                  {skeletonView.scenes.map((s, idx) => (
                    <div key={idx} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 space-y-1">
                      <div className="text-xs uppercase tracking-wide text-zinc-500">Scene {idx + 1}</div>
                      <div><span className="font-semibold">Scene Title:</span> {s.scene_title || "—"}</div>
                      <div><span className="font-semibold">Scene Objective:</span> {s.scene_objective || "—"}</div>
                      {s.branch_hint && (
                        <div><span className="font-semibold">Branch Hint:</span> {s.branch_hint}</div>
                      )}
                      {s.improv_note && (
                        <div><span className="font-semibold">Improv Note:</span> {s.improv_note}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <pre className="text-xs whitespace-pre-wrap mt-4">{skeleton ? JSON.stringify(skeleton, null, 2) : "Henüz oluşturulmadı"}</pre>
          </Card>

          <Card title="Scene 1 (Detay)">
            {sceneDetail ? (
              <div className="space-y-2 text-sm">
                <div><span className="font-semibold">Scene Title:</span> {sceneDetail.scene_title || "—"}</div>
                <div><span className="font-semibold">Scene Objective:</span> {sceneDetail.scene_objective || "—"}</div>
              </div>
            ) : null}
            <pre className="text-xs whitespace-pre-wrap mt-4">{scene ? JSON.stringify(scene, null, 2) : "Henüz oluşturulmadı"}</pre>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <div className="mb-2 text-sm font-medium text-zinc-700">{title}</div>
      {children}
    </div>
  );
}
