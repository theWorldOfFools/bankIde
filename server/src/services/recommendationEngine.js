import { z } from 'zod';
import { getAiConfig } from './aiConfig.js';
import { selectCurated } from './curatedIdeas.js';

const generatedIdeaSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(800),
  v1_features: z.string().trim().min(10).max(4000),
  solution: z.string().trim().min(10).max(4000),
  agency_prompt: z.string().trim().min(20).max(6000),
  potential_score: z.coerce.number().int().min(1).max(100),
});

const enrichedIdeaSchema = z.object({
  v1_features: z.string().trim().min(10).max(4000),
  solution: z.string().trim().min(10).max(4000),
  agency_prompt: z.string().trim().min(20).max(6000),
});

export function parseJsonContent(content) {
  const cleaned = String(content ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Respons AI bukan JSON yang valid.');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function parseAiContent(content) {
  const parsed = parseJsonContent(content);
  const list = Array.isArray(parsed) ? parsed : parsed.ideas;
  return z.array(generatedIdeaSchema).min(1).max(8).parse(list);
}

function curatedResult(category, count, warning = null) {
  return {
    ideas: selectCurated(category, count),
    source: 'curated',
    warning,
  };
}

export async function callAi(messages, temperature = 0.8, aiConfig = null) {
  const ai = aiConfig || await getAiConfig();
  const response = await fetch(`${ai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ai.apiKey}`,
    },
    body: JSON.stringify({
      model: ai.model,
      temperature,
      messages,
    }),
    signal: AbortSignal.timeout(ai.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`AI provider mengembalikan HTTP ${response.status}.`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content;
}

export async function generateRecommendations({
  category,
  count = 4,
  context = '',
}) {
  const ai = await getAiConfig();

  if (!ai.enabled) {
    return curatedResult(category, count);
  }

  const systemPrompt = [
    'Anda adalah product strategist untuk pasar Indonesia.',
    'Hasilkan ide produk digital yang spesifik, realistis, dan dapat divalidasi.',
    'Prioritaskan masalah nyata, model monetisasi yang jelas, dan MVP yang dapat dibangun dalam 8 minggu.',
    'Jangan mengarang statistik atau menyebut data pasar yang tidak dapat diverifikasi.',
    'Untuk setiap ide isi v1_features dengan daftar fitur MVP yang dipisah karakter newline, solution dengan masalah yang diselesaikan beserta pendekatan solusinya, dan agency_prompt dengan prompt siap pakai untuk agency pelaksana yang mencakup tujuan, lingkup MVP, stack yang disarankan, dan kriteria selesai.',
    'Semua field berupa string; jangan gunakan array atau markdown.',
    'Balas hanya dengan JSON valid tanpa markdown.',
  ].join(' ');

  const userPrompt = [
    `Kategori: ${category}`,
    `Jumlah ide: ${count}`,
    `Konteks tambahan: ${context || 'tidak ada'}`,
    'Format JSON: {"ideas":[{"title":"...","description":"...","v1_features":"- fitur 1\\n- fitur 2","solution":"...","agency_prompt":"...","potential_score":85}]}',
    'potential_score berupa angka 1-100.',
  ].join('\n');

  try {
    const content = await callAi([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], 0.8, ai);
    const ideas = parseAiContent(content).slice(0, count);

    return {
      ideas,
      source: 'ai',
      warning: null,
    };
  } catch (error) {
    console.warn('[recommendations] AI gagal, memakai kurasi lokal:', error.message);
    return curatedResult(
      category,
      count,
      'AI tidak tersedia; rekomendasi berasal dari kurasi lokal.'
    );
  }
}

export async function enrichIdeaFields({ title, category, description }) {
  const ai = await getAiConfig();
  if (!ai.enabled) return null;

  const systemPrompt = [
    'Anda adalah product strategist untuk pasar Indonesia.',
    'Lengkapi satu ide produk digital berikut dengan rencana eksekusi yang spesifik dan realistis.',
    'Jangan mengarang statistik atau menyebut data pasar yang tidak dapat diverifikasi.',
    'Isi v1_features dengan daftar fitur MVP yang dipisah karakter newline, solution dengan masalah yang diselesaikan beserta pendekatan solusinya, dan agency_prompt dengan prompt siap pakai untuk agency pelaksana yang mencakup tujuan, lingkup MVP, stack yang disarankan, dan kriteria selesai.',
    'Semua field berupa string; jangan gunakan array atau markdown.',
    'Balas hanya dengan JSON valid tanpa markdown.',
  ].join(' ');

  const userPrompt = [
    `Judul: ${title}`,
    `Kategori: ${category}`,
    `Deskripsi: ${description}`,
    'Format JSON: {"v1_features":"- fitur 1\\n- fitur 2","solution":"...","agency_prompt":"..."}',
  ].join('\n');

  try {
    const content = await callAi(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      0.4,
      ai
    );

    return enrichedIdeaSchema.parse(parseJsonContent(content));
  } catch (error) {
    console.warn('[recommendations] gagal melengkapi field ide:', error.message);
    return null;
  }
}
