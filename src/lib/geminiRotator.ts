/**
 * Gemini API Dual-Axis Rotator for PRAXIS
 * Inspirado en la arquitectura de rotación de claves y modelos de LibreChat-WAPPY
 * 
 * - Eje 1 (Horizontal): Rotación de claves API ante 429 (Cuota/Rate-limit) y 403 (Clave expirada/leaked).
 * - Eje 2 (Vertical): Fallback de modelos ante 503 (Overloaded), 404 (Model Not Found) o Service Unavailable.
 * 
 * Configuración de modelos sincronizada con LibreChat-WAPPY (.env y librechat.yaml) y Google AI Studio.
 */

export const LIBRECHAT_WAPPY_MODELS: string[] = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-live-preview',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.5-flash-native-audio-preview-09-2025',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
];

/**
 * Obtiene la lista de modelos ordenada según GOOGLE_MODELS del entorno o los predeterminados de LibreChat.
 */
export function getLibreChatModels(): string[] {
  const envModels = (process.env.GOOGLE_MODELS || '')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  if (envModels.length > 0) {
    return Array.from(new Set([...envModels, ...LIBRECHAT_WAPPY_MODELS]));
  }

  return LIBRECHAT_WAPPY_MODELS;
}

export const DEFAULT_GEMINI_MODELS = LIBRECHAT_WAPPY_MODELS;

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
 * Ejecuta una llamada a la API REST de Google Gemini con rotación automática dual-axis
 * (Claves horizontales ante 429/403 y Modelos verticales ante 503/404).
 */
export async function callGeminiWithRotation(params: GeminiCallParams): Promise<GeminiCallResult> {
  const keys = extractKeyPool(params.customKeys);

  if (keys.length === 0) {
    throw new Error(
      'No se encontró ninguna clave API de Google Gemini configurada. Agrega al menos una clave en el menú de Perfil o en las variables de entorno (GEMINI_API_KEYS).'
    );
  }

  const availableModels = getLibreChatModels();
  const primaryModel = params.preferredModel || availableModels[0];
  const modelList = [
    primaryModel,
    ...availableModels.filter((m) => m !== primaryModel),
  ];

  let rotationsCount = 0;
  let lastError: any = null;

  // Ciclo exterior: Model Fallbacks (503 / 404 / Overloaded)
  for (let modelIdx = 0; modelIdx < modelList.length; modelIdx++) {
    const currentModel = modelList[modelIdx];

    // Ciclo interior: Key Rotation (429 / 403 / Quota)
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

        // Caso 1: Éxito
        if (response.ok && resJson && !resJson.error) {
          globalKeyIndex = activeKeyIndex; // Mantiene la clave exitosa como punto de partida
          return {
            success: true,
            data: resJson,
            modelUsed: currentModel,
            keyIndexUsed: activeKeyIndex,
            totalKeys: keys.length,
            rotationsPerformed: rotationsCount,
          };
        }

        // Caso 2: Error retornado por la API
        const status = response.status;
        const errMsg = resJson?.error?.message || response.statusText || 'Error desconocido';
        const errStatus = resJson?.error?.status || '';

        console.warn(
          `[Gemini Rotator] Clave #${activeKeyIndex + 1}/${keys.length} falló con modelo "${currentModel}" [Status ${status} / ${errStatus}]: ${errMsg}`
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
          console.warn(`[Gemini Rotator] Rotando a la siguiente clave API del pool...`);
          continue; // Intenta con la siguiente clave
        }

        // Fallback de Modelo (503: Service Unavailable / Overloaded, 404: Not Found, o modelo no soportado)
        const isModelFallbackNeeded =
          status === 503 ||
          status === 404 ||
          errStatus === 'UNAVAILABLE' ||
          errStatus === 'NOT_FOUND' ||
          errMsg.toLowerCase().includes('overloaded') ||
          errMsg.toLowerCase().includes('not found') ||
          errMsg.toLowerCase().includes('not supported') ||
          errMsg.toLowerCase().includes('temporarily unavailable');

        if (isModelFallbackNeeded) {
          rotationsCount++;
          console.warn(`[Gemini Rotator] Modelo "${currentModel}" no disponible o sobrecargado [Status ${status}]. Probando siguiente modelo de LibreChat...`);
          break; // Rompe el ciclo de claves y pasa al siguiente modelo
        }

        // Otros errores (por ejemplo 400 bad request de validación)
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
    `Todas las claves API y modelos de contingencia fueron probados sin éxito. Último error: ${lastError?.message || 'Servicio no disponible'}`
  );
}
