// ============================================
// Tipos TypeScript para a API do Chatwoot
// Documentação: https://www.chatwoot.com/developers/api/
// ============================================

// --- Contatos ---
export interface ChatwootContact {
  id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
  thumbnail: string;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  identifier: string | null;
  created_at: number;
  last_activity_at: number | null;
  availability_status: 'online' | 'offline';
}

export interface ContactsResponse {
  meta: {
    count: number;
    current_page: number;
  };
  payload: ChatwootContact[];
}

// --- Conversas ---
export interface ChatwootConversation {
  id: number;
  account_id: number;
  inbox_id: number;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  assignee: ChatwootAgent | null;
  team: ChatwootTeam | null;
  contact: ChatwootContact;
  messages: ChatwootMessage[];
  unread_count: number;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  created_at: number;
  last_activity_at: number;
  labels: string[];
  meta: {
    sender: ChatwootContact;
    assignee: ChatwootAgent | null;
  };
}

export interface ConversationsResponse {
  data: {
    meta: {
      mine_count: number;
      unassigned_count: number;
      all_count: number;
    };
    payload: ChatwootConversation[];
  };
}

// --- Mensagens ---
export interface ChatwootMessage {
  id: number;
  content: string | null;
  content_type: 'text' | 'input_select' | 'cards' | 'form' | 'article';
  content_attributes: Record<string, unknown>;
  message_type: 0 | 1 | 2 | 3;
  created_at: number;
  private: boolean;
  sender: {
    id: number;
    name: string;
    type: 'contact' | 'user';
    thumbnail: string;
  } | null;
  attachments: ChatwootAttachment[];
  conversation_id: number;
}

export interface MessagesResponse {
  meta: {
    contact: ChatwootContact;
  };
  payload: ChatwootMessage[];
}

// --- Anexos ---
export interface ChatwootAttachment {
  id: number;
  message_id: number;
  file_type: 'image' | 'audio' | 'video' | 'file' | 'location' | 'fallback';
  account_id: number;
  data_url: string;
  thumb_url: string;
}

// --- Agentes ---
export interface ChatwootAgent {
  id: number;
  uid: string;
  name: string;
  email: string;
  available_name: string;
  type: 'user';
  availability_status: 'online' | 'offline' | 'busy';
  thumbnail: string;
  role: 'administrator' | 'agent';
}

// --- Times ---
export interface ChatwootTeam {
  id: number;
  name: string;
  description: string;
  allow_auto_assign: boolean;
  account_id: number;
}

// --- Inboxes ---
export interface ChatwootInbox {
  id: number;
  name: string;
  channel_type: string;
  avatar_url: string;
  greeting_enabled: boolean;
  greeting_message: string | null;
  working_hours_enabled: boolean;
  out_of_office_message: string | null;
}

// --- Labels ---
export interface ChatwootLabel {
  id: number;
  title: string;
  description: string;
  color: string;
  show_on_sidebar: boolean;
}

// --- Reports ---
export interface ChatwootAccountSummary {
  avg_first_response_time: string;
  avg_resolution_time: string;
  conversations_count: number;
  incoming_messages_count: number;
  outgoing_messages_count: number;
  resolutions_count: number;
  previous: {
    avg_first_response_time: string;
    avg_resolution_time: string;
    conversations_count: number;
    incoming_messages_count: number;
    outgoing_messages_count: number;
    resolutions_count: number;
  };
}

// --- Paginação e filtros ---
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export interface ConversationFilters extends PaginationParams {
  status?: 'open' | 'resolved' | 'pending' | 'snoozed';
  assignee_type?: 'me' | 'unassigned' | 'all';
  inbox_id?: number;
  team_id?: number;
  labels?: string[];
}

export interface ContactFilters extends PaginationParams {
  q?: string;
  sort?: 'name' | 'email' | 'phone_number' | 'last_activity_at' | 'created_at';
  order_by?: 'asc' | 'desc';
  include_contacts_with_conversation?: boolean;
}

// --- Empresas (Companies) ---
export interface ChatwootCompany {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  phone_number: string | null;
  industry?: string | null;
  additional_attributes?: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CompaniesResponse {
  payload: ChatwootCompany[];
  meta?: {
    count: number;
    current_page: number;
  };
}

export interface CompanyFilters extends PaginationParams {
  q?: string;
}

// ============================================
// AUTENTICAÇÃO
// ============================================

export interface ChatwootUserAccount {
  id: number;
  name: string;
  status: 'Active' | 'Inactive';
  locale: string;
}

export interface ChatwootAuthUser {
  id: number;
  email: string;
  name: string;
  available_name: string;
  avatar_url: string;
  type: 'standard' | 'super_admin' | 'administrator';
  accounts: ChatwootUserAccount[];
  pubsub_token?: string;
  access_token?: string;
}

export interface ChatwootAuthResponse {
  data: ChatwootAuthUser;
  token: string;
}
