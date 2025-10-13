import React, { useEffect, useMemo, useState } from "react";
import Field from "./components/Field";
import { postJSON } from "./lib/api";

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

export default function App() {
  const [inputs, setInputs] = useState<GMInputs>(() => {
    const saved = localStorage.getItem("dndbug_inputs");
    return saved ? JSON.parse(saved) : defaultInputs;
  });
  const [loading, setLoading] = useState(false);
  const [skeleton, setSkeleton] = useState<any>(null);
  const [scene, setScene] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("dndbug_inputs", JSON.stringify(inputs));
  }, [inputs]);

  const disabled = useMemo(() => loading, [loading]);

  async function buildSkeleton() {
    try {
      setError(null); setLoading(true);
      const { data } = await postJSON<{ ok: boolean; data: any }>("/api/story", {
        mode: "skeleton",
        payload: inputs,
      });
      setSkeleton(data); setScene(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function expandScene1() {
    if (!skeleton) return;
    try {
      setError(null); setLoading(true);
      const { data } = await postJSON<{ ok: boolean; data: any }>("/api/story", {
        mode: "scene1",
        payload: { inputs, skeleton },
      });
      setScene(data);
    } catch (e: any) { setError(e.message); }
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
            <button onClick={buildSkeleton} disabled={disabled} className="rounded-2xl px-4 py-2 bg-black text-white disabled:opacity-50">
              1) Story Skeleton oluştur
            </button>
            <button onClick={expandScene1} disabled={disabled || !skeleton} className="rounded-2xl px-4 py-2 bg-zinc-900 text-white disabled:opacity-50">
              2) Scene 1 detaylandır
            </button>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}

          <Card title="Story Skeleton (Phase 2)">
            <pre className="text-xs whitespace-pre-wrap">{skeleton ? JSON.stringify(skeleton, null, 2) : "Henüz oluşturulmadı"}</pre>
          </Card>

          <Card title="Scene 1 (Detay)">
            <pre className="text-xs whitespace-pre-wrap">{scene ? JSON.stringify(scene, null, 2) : "Henüz oluşturulmadı"}</pre>
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
