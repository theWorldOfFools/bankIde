import { z } from 'zod';
import { config } from '../config.js';
import { selectCurated } from './curatedIdeas.js';

const generatedIdeaSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(800),
  potential_score: z.coerce.number().int().min(1).max(100),
});

function parseAiContent(content) {
  const cleaned = String(content ?? '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Respons AI bukan JSON yang valid.');
    }
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

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

export async function generateRecommendations({
  category,
  count = 4,
  context = '',
}) {
  if (!config.aiEnabled) {
    return curatedResult(category, count);
  }

  const systemPrompt = [
    'Anda adalah product strategist untuk pasar Indonesia.',
    'Hasilkan ide produk digital yang spesifik, realistis, dan dapat divalidasi.',
    'Prioritaskan masalah nyata, model monetisasi yang jelas, dan MVP yang dapat dibangun dalam 8 minggu.',
    'Jangan mengarang statistik atau menyebut data pasar yang tidak dapat diverifikasi.',
    'Balas hanya dengan JSON valid tanpa markdown.',
  ].join(' ');

  const userPrompt = [
    `Kategori: ${category}`,
    `Jumlah ide: ${count}`,
    `Konteks tambahan: ${context || 'tidak ada'}`,
    'Format JSON: {"ideas":[{"title":"...","description":"...","potential_score":85}]}',
    'potential_score berupa angka 1-100.',
  ].join('\n');

  try {
    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(config.ai.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`AI provider mengembalikan HTTP ${response.status}.`);
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
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
