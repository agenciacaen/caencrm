// ============================================
// Client HTTP para a API REST do Chatwoot
// ============================================

import type {
  ChatwootContact,
  ChatwootConversation,
  ChatwootMessage,
  ChatwootAgent,
  ChatwootInbox,
  ChatwootLabel,
  ChatwootAccountSummary,
  ChatwootCompany,
  ChatwootAuthResponse,
  ContactsResponse,
  MessagesResponse,
  ConversationFilters,
  ContactFilters,
  CompaniesResponse,
  CompanyFilters,
} from '../types/chatwoot';

// --- Configuração ---
const isDev = import.meta.env.DEV;
const BASE_URL = import.meta.env.VITE_CHATWOOT_URL || '';
const FALLBACK_TOKEN = import.meta.env.VITE_CHATWOOT_TOKEN || '';
const FALLBACK_ACCOUNT_ID = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID || '1';

// Em desenvolvimento, usamos o proxy local configurado no vite.config.ts
// Em produção, usamos a URL direta da variável de ambiente
const PROXY_PREFIX_V1 = '/chatwoot-api-v1';
const PROXY_PREFIX_V2 = '/chatwoot-api-v2';
const PROXY_PREFIX_AUTH = '/chatwoot-auth';

const AUTH_PREFIX = isDev ? PROXY_PREFIX_AUTH : `${BASE_URL}/auth`;
const API_PREFIX_V1 = isDev ? PROXY_PREFIX_V1 : `${BASE_URL}/api/v1`;
const API_PREFIX_V2 = isDev ? PROXY_PREFIX_V2 : `${BASE_URL}/api/v2`;

// --- Helpers de sessão ---
function getAuthToken(): string {
  try {
    const stored = localStorage.getItem('caen_crm_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.token) return parsed.token;
    }
  } catch {}
  return FALLBACK_TOKEN;
}

function getAccountId(): string {
  try {
    const stored = localStorage.getItem('caen_crm_account');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.id) return String(parsed.id);
    }
  } catch {}
  return FALLBACK_ACCOUNT_ID;
}

// --- Helper de fetch ---
async function chatwootFetch<T>(endpoint: string, options?: RequestInit, version: 'v1' | 'v2' = 'v1'): Promise<T> {
  const base = version === 'v2' ? API_PREFIX_V2 : API_PREFIX_V1;
  const accountId = getAccountId();
  const url = `${base}/accounts/${accountId}${endpoint}`;
  const token = getAuthToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'api_access_token': token } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Chatwoot API Error [${response.status}]: ${errorBody}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ============================================
// AUTENTICAÇÃO
// ============================================

export async function getProfile(): Promise<{ pubsub_token?: string } & Record<string, any>> {
  const base = isDev ? PROXY_PREFIX_V1 : `${BASE_URL}/api/v1`;
  const token = getAuthToken();

  const response = await fetch(`${base}/profile`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'api_access_token': token } : {}),
    },
  });

  if (!response.ok) throw new Error('Failed to fetch profile');
  return response.json();
}

export async function loginUser(email: string, password: string): Promise<ChatwootAuthResponse> {
  const url = `${AUTH_PREFIX}/sign_in`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || 'Credenciais inválidas');
  }

  return response.json();
}

// ============================================
// CONTATOS
// ============================================

export async function getContacts(filters?: ContactFilters): Promise<ContactsResponse> {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.q) params.set('q', filters.q);
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.order_by) params.set('order_by', filters.order_by);

  const query = params.toString() ? `?${params.toString()}` : '';
  return chatwootFetch<ContactsResponse>(`/contacts${query}`);
}

export async function getContact(contactId: number): Promise<ChatwootContact> {
  return chatwootFetch<ChatwootContact>(`/contacts/${contactId}`);
}

export async function createContact(data: {
  name: string;
  email?: string;
  phone_number?: string;
  identifier?: string;
  custom_attributes?: Record<string, unknown>;
}): Promise<ChatwootContact> {
  return chatwootFetch<ChatwootContact>('/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function searchContacts(query: string): Promise<ContactsResponse> {
  return chatwootFetch<ContactsResponse>(`/search?q=${encodeURIComponent(query)}&page=1`);
}

export async function deleteContact(contactId: number): Promise<any> {
  return chatwootFetch<any>(`/contacts/${contactId}`, {
    method: 'DELETE',
  });
}

export async function updateContact(
  contactId: number,
  data: {
    name?: string;
    email?: string;
    phone_number?: string;
    identifier?: string;
    custom_attributes?: Record<string, unknown>;
  }
): Promise<ChatwootContact> {
  return chatwootFetch<ChatwootContact>(`/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============================================
// CONVERSAS
// ============================================

export async function getConversations(filters?: ConversationFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.assignee_type) params.set('assignee_type', filters.assignee_type);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.inbox_id) params.set('inbox_id', String(filters.inbox_id));

  const query = params.toString() ? `?${params.toString()}` : '';
  return chatwootFetch<{ data: { meta: Record<string, number>; payload: ChatwootConversation[] } }>(`/conversations${query}`);
}

export async function getConversation(conversationId: number): Promise<ChatwootConversation> {
  return chatwootFetch<ChatwootConversation>(`/conversations/${conversationId}`);
}

export async function createConversation(data: {
  source_id?: string;
  inbox_id: number;
  contact_id: number;
  status?: string;
  message?: { content: string };
  custom_attributes?: Record<string, any>;
}): Promise<ChatwootConversation> {
  return chatwootFetch<ChatwootConversation>('/conversations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function addLabelsToConversation(
  conversationId: number,
  labels: string[]
): Promise<any> {
  return chatwootFetch<any>(`/conversations/${conversationId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels }),
  });
}

export async function updateConversation(
  conversationId: number,
  data: { status?: string; assignee_id?: number; team_id?: number }
): Promise<ChatwootConversation> {
  return chatwootFetch<ChatwootConversation>(`/conversations/${conversationId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteConversation(conversationId: number): Promise<any> {
  return chatwootFetch<any>(`/conversations/${conversationId}`, {
    method: 'DELETE',
  });
}

// ============================================
// MENSAGENS
// ============================================

export async function getMessages(conversationId: number): Promise<MessagesResponse> {
  return chatwootFetch<MessagesResponse>(`/conversations/${conversationId}/messages`);
}

export async function sendMessage(
  conversationId: number,
  content: string,
  isPrivate: boolean = false
): Promise<ChatwootMessage> {
  return chatwootFetch<ChatwootMessage>(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      message_type: 'outgoing',
      private: isPrivate,
    }),
  });
}

// ============================================
// AGENTES
// ============================================

export async function getAgents(): Promise<ChatwootAgent[]> {
  return chatwootFetch<ChatwootAgent[]>('/agents');
}

export async function updateAgent(
  agentId: number,
  data: { name?: string; email?: string; role?: string; availability?: string }
): Promise<ChatwootAgent> {
  return chatwootFetch<ChatwootAgent>(`/agents/${agentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================
// INBOXES
// ============================================

export async function getInboxes(): Promise<{ payload: ChatwootInbox[] }> {
  return chatwootFetch<{ payload: ChatwootInbox[] }>('/inboxes');
}

export async function deleteInbox(inboxId: number): Promise<any> {
  return chatwootFetch<any>(`/inboxes/${inboxId}`, {
    method: 'DELETE',
  });
}

// ============================================
// LABELS
// ============================================

export async function getLabels(): Promise<{ payload: ChatwootLabel[] }> {
  return chatwootFetch<{ payload: ChatwootLabel[] }>('/labels');
}

// ============================================
// REPORTS
// ============================================

export async function getAccountSummary(params?: {
  since?: string;
  until?: string;
  type?: string;
}): Promise<ChatwootAccountSummary> {
  const searchParams = new URLSearchParams();
  if (params?.since) searchParams.set('since', params.since);
  if (params?.until) searchParams.set('until', params.until);
  searchParams.set('type', params?.type || 'account');

  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
  return chatwootFetch<ChatwootAccountSummary>(`/reports/summary${query}`, undefined, 'v2');
}

// ============================================
// EMPRESAS (COMPANIES)
// ============================================

export async function getCompanies(filters?: CompanyFilters): Promise<CompaniesResponse> {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.q) params.set('q', filters.q);

  const query = params.toString() ? `?${params.toString()}` : '';
  return chatwootFetch<CompaniesResponse>(`/companies${query}`);
}

export async function getCompany(companyId: number): Promise<ChatwootCompany> {
  return chatwootFetch<ChatwootCompany>(`/companies/${companyId}`);
}

export async function createCompany(data: {
  name: string;
  description?: string;
  website?: string;
  phone_number?: string;
  custom_attributes?: Record<string, unknown>;
}): Promise<ChatwootCompany> {
  return chatwootFetch<ChatwootCompany>('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCompany(
  companyId: number,
  data: {
    name?: string;
    description?: string;
    website?: string;
    phone_number?: string;
    custom_attributes?: Record<string, unknown>;
  }
): Promise<ChatwootCompany> {
  return chatwootFetch<ChatwootCompany>(`/companies/${companyId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(companyId: number): Promise<any> {
  return chatwootFetch<any>(`/companies/${companyId}`, {
    method: 'DELETE',
  });
}

export async function addContactToCompany(companyId: number, contactId: number): Promise<any> {
  return chatwootFetch<any>(`/companies/${companyId}/contacts`, {
    method: 'POST',
    body: JSON.stringify({ contact_ids: [contactId] }),
  });
}

// ============================================
// EXPORT DO CLIENT COMPLETO
// ============================================

const chatwootAPI = {
  contacts: {
    get: getContacts,
    getOne: getContact,
    create: createContact,
    update: updateContact,
    search: searchContacts,
    delete: deleteContact,
  },
  conversations: {
    get: getConversations,
    getOne: getConversation,
    create: createConversation,
    update: updateConversation,
    addLabels: addLabelsToConversation,
    delete: deleteConversation,
  },
  messages: { get: getMessages, send: sendMessage },
  agents: { get: getAgents, update: updateAgent },
  inboxes: { get: getInboxes, delete: deleteInbox },
  labels: { get: getLabels },
  reports: { summary: getAccountSummary },
  companies: {
    get: getCompanies,
    getOne: getCompany,
    create: createCompany,
    update: updateCompany,
    delete: deleteCompany,
    addContact: addContactToCompany,
  },
};

export default chatwootAPI;
