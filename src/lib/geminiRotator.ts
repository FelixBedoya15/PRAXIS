/**
 * Gemini API Key Rotator for PRAXIS
 * Modelo oficial exclusivo: gemini-3.5-flash-lite (LibreChat-WAPPY)
 * 
 * - Rotación horizontal de claves API ante 429 (Cuota/Rate-limit) y 403 (Clave expirada/leaked).
 * - Fallback inteligente de contingencia si el servicio está sobrecargado (503).
 */

export const LIBRECHAT_WAPPY_MODELS = ['gemini-3.5-flash-lite'];
export const TARGET_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const DEFAULT_GEMINI_MODELS = ['gemini-3.5-flash-lite'];

export function getLibreChatModels(): string[] {
  return ['gemini-3.5-flash-lite'];
}

export interface GeminiCallParams {
  contents: any[];
  systemInstruction?: string;
  tools?: any[];
  temperature?: number;
  customKeys?: string;
  preferredModel?: string;
}

export interface GeminiCallResult {
  success: boolean;
  data: any;
  modelUsed: string;
  keyIndexUsed: number;
  totalKeys: number;
  rotationsPerformed: number;
  error?: string;
}

/**
 * Obtiene y normaliza el pool de claves API desde variables de entorno y/o entrada de usuario.
 */
export function extractKeyPool(customKeys?: string): string[] {
  const sources: string[] = [];

  if (customKeys && typeof customKeys === 'string') {
    sources.push(customKeys);
  }

  if (process.env.GEMINI_API_KEYS) {
    sources.push(process.env.GEMINI_API_KEYS);
  }
  if (process.env.GOOGLE_KEY && process.env.GOOGLE_KEY !== 'user_provided') {
    sources.push(process.env.GOOGLE_KEY);
  }
  if (process.env.GEMINI_API_KEY) {
    sources.push(process.env.GEMINI_API_KEY);
  }
  if (process.env.GOOGLE_API_KEY) {
    sources.push(process.env.GOOGLE_API_KEY);
  }

  const rawJoined = sources.join(',');
  // Separa por comas, saltos de línea o punto y coma
  const keys = rawJoined
    .split(/[\n,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 10); // Claves válidas de Google AI Studio suelen tener 39 caracteres

  // Deduplicar manteniendo orden
  return Array.from(new Set(keys));
}

let globalKeyIndex = 0;

/**
 * Ejecuta una llamada a la API REST de Google Gemini enfocada exclusivamente en gemini-3.5-flash-lite
 * con rotación automática de claves del pool ante límites de cuota (429 / 403).
 */
export async function callGeminiWithRotation(params: GeminiCallParams): Promise<GeminiCallResult> {
  const keys = extractKeyPool(params.customKeys);

  if (keys.length === 0) {
    throw new Error(
      'No se encontró ninguna clave API de Google Gemini configurada. Agrega al menos una clave en el menú de Perfil o en las variables de entorno (GEMINI_API_KEYS).'
    );
  }

  // Modelo exclusivo solicitado: gemini-3.5-flash-lite
  const selectedModel = TARGET_GEMINI_MODEL;
  // Respaldos de contingencia si Google reporta que 3.5-flash-lite está temporalmente en mantenimiento o sobrecargado
  const modelList = [selectedModel, 'gemini-2.5-flash', 'gemini-2.0-flash'];

  let rotationsCount = 0;
  let lastError: any = null;

  for (let modelIdx = 0; modelIdx < modelList.length; modelIdx++) {
    const currentModel = modelList[modelIdx];

    // Rotación de Claves (Eje Horizontal LibreChat)
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const activeKeyIndex = (globalKeyIndex + attempt) % keys.length;
      const apiKey = keys[activeKeyIndex];

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;

        const payload: any = {
          contents: params.contents,
          generationConfig: {
            temperature: params.temperature ?? 0.2,
            maxOutputTokens: 2048,
          },
        };

        if (params.systemInstruction) {
          payload.systemInstruction = {
            parts: [{ text: params.systemInstruction }],
          };
        }

        if (params.tools && params.tools.length > 0) {
          payload.tools = params.tools;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const resJson = await response.json().catch(() => null);

        // Éxito
        if (response.ok && resJson && !resJson.error) {
          globalKeyIndex = activeKeyIndex;
          return {
            success: true,
            data: resJson,
            modelUsed: currentModel,
            keyIndexUsed: activeKeyIndex,
            totalKeys: keys.length,
            rotationsPerformed: rotationsCount,
          };
        }

        // Error retornado por Google Gemini API
        const status = response.status;
        const errMsg = resJson?.error?.message || response.statusText || 'Error desconocido';
        const errStatus = resJson?.error?.status || '';

        console.warn(
          `[Gemini Rotator] Clave #${activeKeyIndex + 1}/${keys.length} con "${currentModel}" [Status ${status} / ${errStatus}]: ${errMsg}`
        );

        lastError = new Error(`[${status}] ${errMsg}`);

        // Rotación de Clave (429: Cuota/Rate limit, 403: Forbidden/Leaked key)
        const isQuotaOrForbidden =
          status === 429 ||
          status === 403 ||
          errStatus === 'RESOURCE_EXHAUSTED' ||
          errStatus === 'PERMISSION_DENIED' ||
          errMsg.toLowerCase().includes('quota') ||
          errMsg.toLowerCase().includes('rate limit') ||
          errMsg.toLowerCase().includes('leaked') ||
          errMsg.toLowerCase().includes('api key not valid');

        if (isQuotaOrForbidden) {
          rotationsCount++;
          console.warn(`[Gemini Rotator] Rotando a la siguiente clave API del pool para ${currentModel}...`);
          continue;
        }

        // Si el modelo específico está temporalmente 503 (sobrecargado) o 404
        const isModelFallbackNeeded =
          status === 503 ||
          status === 404 ||
          errStatus === 'UNAVAILABLE' ||
          errStatus === 'NOT_FOUND' ||
          errMsg.toLowerCase().includes('overloaded') ||
          errMsg.toLowerCase().includes('not found') ||
          errMsg.toLowerCase().includes('temporarily unavailable');

        if (isModelFallbackNeeded) {
          rotationsCount++;
          console.warn(`[Gemini Rotator] Modelo "${currentModel}" no disponible [${status}]. Probando respaldo...`);
          break; // Rompe para el siguiente modelo de contingencia
        }

        continue;
      } catch (networkErr: any) {
        lastError = networkErr;
        rotationsCount++;
        console.warn(`[Gemini Rotator] Error de red en clave #${activeKeyIndex + 1}: ${networkErr.message}. Rotando clave...`);
        continue;
      }
    }
  }

  throw new Error(
    `Todas las claves API de Gemini (${keys.length} configuradas) fueron probadas para ${selectedModel} sin éxito. Último error: ${lastError?.message || 'Servicio no disponible'}`
  );
}
