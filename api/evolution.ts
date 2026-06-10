// ============================================
// Client HTTP para a Evolution API
// Centraliza todas as chamadas para a Evolution API na VPS
// ============================================

const BASE_URL = import.meta.env.VITE_EVOLUTION_URL || '';
const API_KEY = import.meta.env.VITE_EVOLUTION_APIKEY || '';

// Dados do Chatwoot para a integração nativa
const CHATWOOT_URL = import.meta.env.VITE_CHATWOOT_URL || '';
const CHATWOOT_TOKEN = import.meta.env.VITE_CHATWOOT_TOKEN || '';
const CHATWOOT_ACCOUNT_ID = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1';

// Interface genérica de resposta
interface EvolutionResponse<T = any> {
  instance?: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting' | 'disconnecting' | 'refused';
    [key: string]: any;
  };
  hash?: {
    apikey: string;
  };
  qrcode?: {
    code: string;
    base64: string;
  };
  [key: string]: any;
}

// Helper genérico para chamadas fetch da Evolution API
async function evolutionFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Evolution API Error [${response.status}]: ${errorBody}`);
  }

  // Se for uma requisição de deleção, às vezes não retorna corpo
  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

/**
 * Cria uma nova instância na Evolution API.
 */
export async function createInstance(instanceName: string): Promise<any> {
  // Limpar espaços e caracteres especiais do nome da instância
  const sanitizedName = instanceName.trim().replace(/\s+/g, '-');
  
  return evolutionFetch<any>('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName: sanitizedName,
      token: '',
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });
}

/**
 * Vincula a instância da Evolution API com o Chatwoot.
 * Ativa a auto-criação da Inbox e sincronização nativa.
 */
export async function setChatwootIntegration(instanceName: string): Promise<any> {
  const sanitizedName = instanceName.trim().replace(/\s+/g, '-');
  
  return evolutionFetch<any>(`/chatwoot/set/${sanitizedName}`, {
    method: 'POST',
    body: JSON.stringify({
      enabled: true,
      accountId: CHATWOOT_ACCOUNT_ID,
      token: CHATWOOT_TOKEN,
      url: CHATWOOT_URL,
      signMsg: true,
      reopenConversation: true,
      conversationPending: false,
      nameInbox: instanceName, // Nome legível para a Inbox criada no Chatwoot
      autoCreate: true,
    }),
  });
}

/**
 * Busca o QR Code gerado da instância.
 * Retorna uma string contendo o base64 (e o código de pareamento).
 */
export async function getQRCode(instanceName: string): Promise<{ code?: string; base64?: string; qrcode?: { code?: string; base64?: string } }> {
  const sanitizedName = instanceName.trim().replace(/\s+/g, '-');
  return evolutionFetch<{ code?: string; base64?: string; qrcode?: { code?: string; base64?: string } }>(`/instance/connect/${sanitizedName}`);
}

/**
 * Verifica o status atual da conexão do WhatsApp (ex: 'open', 'close', 'connecting').
 */
export async function getConnectionState(instanceName: string): Promise<{ instance: { state: string } }> {
  const sanitizedName = instanceName.trim().replace(/\s+/g, '-');
  return evolutionFetch<{ instance: { state: string } }>(`/instance/connectionState/${sanitizedName}`);
}

/**
 * Exclui fisicamente uma instância da Evolution API.
 */
export async function deleteInstance(instanceName: string): Promise<any> {
  const sanitizedName = instanceName.trim().replace(/\s+/g, '-');
  return evolutionFetch<any>(`/instance/delete/${sanitizedName}`, {
    method: 'DELETE',
  });
}

const evolutionAPI = {
  createInstance,
  setChatwootIntegration,
  getQRCode,
  getConnectionState,
  deleteInstance,
};

export default evolutionAPI;
