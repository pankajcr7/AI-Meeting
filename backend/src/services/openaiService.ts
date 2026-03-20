import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { config } from '../config/env';

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export interface ActionItemData {
  title: string;
  description: string;
  assignee: string;
  deadline: string | null;
  priority: 'high' | 'medium' | 'low';
}

function splitAudioFile(filePath: string): string[] {
  const tmpDir = path.join(path.dirname(filePath), 'tmp_chunks');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const outputPattern = path.join(tmpDir, `${baseName}_%03d${ext}`);

  execSync(
    `ffmpeg -i "${filePath}" -f segment -segment_time 600 -c copy "${outputPattern}" -y 2>/dev/null`,
    { stdio: 'pipe' }
  );

  const chunks = fs
    .readdirSync(tmpDir)
    .filter((f) => f.startsWith(baseName))
    .sort()
    .map((f) => path.join(tmpDir, f));

  return chunks;
}

function cleanupChunks(chunks: string[]): void {
  for (const chunk of chunks) {
    try {
      if (fs.existsSync(chunk)) fs.unlinkSync(chunk);
    } catch {}
  }
  if (chunks.length > 0) {
    const dir = path.dirname(chunks[0]);
    try {
      const remaining = fs.readdirSync(dir);
      if (remaining.length === 0) fs.rmdirSync(dir);
    } catch {}
  }
}

export async function transcribeAudio(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) {
    throw new Error('Audio file not found on disk');
  }

  const stat = fs.statSync(filePath);

  if (stat.size <= MAX_FILE_SIZE) {
    const file = fs.createReadStream(filePath);
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    if (!transcription.text || transcription.text.trim().length === 0) {
      throw new Error(
        'Could not transcribe audio — file may be corrupted or silent'
      );
    }

    return transcription.text;
  }

  const chunks = splitAudioFile(filePath);
  try {
    const transcripts: string[] = [];
    for (const chunk of chunks) {
      const file = fs.createReadStream(chunk);
      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });
      transcripts.push(transcription.text);
    }

    const fullText = transcripts.join(' ');
    if (!fullText || fullText.trim().length === 0) {
      throw new Error(
        'Could not transcribe audio — file may be corrupted or silent'
      );
    }

    return fullText;
  } finally {
    cleanupChunks(chunks);
  }
}

export async function summarizeMeeting(transcript: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an AI meeting assistant. Analyze the following meeting transcript and provide a comprehensive summary.

Structure your summary as follows:
## Meeting Overview
Brief 2-3 sentence overview of the meeting.

## Key Topics Discussed
- Topic 1: Brief description
- Topic 2: Brief description

## Decisions Made
- Decision 1
- Decision 2

## Important Points
- Point 1
- Point 2`,
      },
      {
        role: 'user',
        content: `Transcript:\n${transcript}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || 'No summary generated.';
}

export async function extractActionItems(
  transcript: string,
  summary: string
): Promise<ActionItemData[]> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: `You are an AI meeting assistant. Extract all action items from the following meeting transcript and summary.

For each action item, provide:
- title: A clear, concise title for the task
- description: Detailed description of what needs to be done
- assignee: The person's name responsible (use "Unassigned" if unclear)
- deadline: The deadline if mentioned (ISO date string or null)
- priority: "high", "medium", or "low" based on urgency discussed

Return a JSON array of action items. Only return the JSON array, no other text.`,
      },
      {
        role: 'user',
        content: `Transcript:\n${transcript}\n\nSummary:\n${summary}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content || '[]';
  return parseActionItems(content);
}

function parseActionItems(content: string, retried = false): ActionItemData[] {
  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const items = JSON.parse(jsonStr);

    if (!Array.isArray(items)) return [];

    return items.map((item: any) => ({
      title: item.title || 'Untitled Action Item',
      description: item.description || '',
      assignee: item.assignee || 'Unassigned',
      deadline: item.deadline || null,
      priority: ['high', 'medium', 'low'].includes(item.priority)
        ? item.priority
        : 'medium',
    }));
  } catch {
    if (!retried) {
      console.warn('Failed to parse action items JSON, returning empty array');
    }
    return [];
  }
}
