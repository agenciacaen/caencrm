import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const TEST_TOKEN = 'test-token-123';
const TEST_ACCOUNT_ID = '42';

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
  localStorage.setItem('caen_crm_auth', JSON.stringify({ token: TEST_TOKEN, user: { id: 1 } }));
  localStorage.setItem('caen_crm_account', JSON.stringify({ id: Number(TEST_ACCOUNT_ID), name: 'Test Account' }));
});

async function loadApi() {
  return await import('../../api/chatwoot');
}

describe('chatwootFetch (via exported functions)', () => {
  it('should call fetch with proxy prefix in dev mode and include auth headers', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ payload: [], meta: { count: 0 } }), { status: 200 }));
    const api = await loadApi();
    await api.getContacts();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/chatwoot-api-v1/accounts/42/contacts');
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      'api_access_token': TEST_TOKEN,
    });
  });

  it('should build URL with query parameters from filters', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ payload: [], meta: { count: 0 } }), { status: 200 }));
    const api = await loadApi();
    await api.getContacts({ page: 2, q: 'joao', sort: 'name', order_by: 'asc' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('q=joao');
    expect(url).toContain('sort=name');
    expect(url).toContain('order_by=asc');
  });

  it('should throw error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Not Found', { status: 404, statusText: 'Not Found' }));
    const api = await loadApi();
    await expect(api.getContact(999)).rejects.toThrow('Chatwoot API Error [404]');
  });

  it('should return empty object on 204 no content', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = await loadApi();
    const result = await api.deleteContact(1);
    expect(result).toEqual({});
  });

  it('should use api_access_token header on every request', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));
    const api = await loadApi();
    await api.getAgents();

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers).toHaveProperty('api_access_token', TEST_TOKEN);
  });
});

describe('Contact functions', () => {
  it('getContacts should fetch with correct endpoint', async () => {
    const mockData = { payload: [{ id: 1, name: 'João' }], meta: { count: 1 } };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }));
    const api = await loadApi();
    const result = await api.getContacts();

    expect(result.payload).toHaveLength(1);
    expect(result.payload[0].name).toBe('João');
  });

  it('createContact should POST with correct body', async () => {
    const newContact = { id: 2, name: 'Maria' };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(newContact), { status: 200 }));
    const api = await loadApi();
    const result = await api.createContact({ name: 'Maria', email: 'maria@test.com' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toMatchObject({ name: 'Maria', email: 'maria@test.com' });
    expect(result.name).toBe('Maria');
  });

  it('updateContact should PUT with correct body', async () => {
    const updated = { id: 1, name: 'João Silva' };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(updated), { status: 200 }));
    const api = await loadApi();
    const result = await api.updateContact(1, { name: 'João Silva' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body as string)).toMatchObject({ name: 'João Silva' });
    expect(result.name).toBe('João Silva');
  });

  it('deleteContact should DELETE', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = await loadApi();
    await api.deleteContact(1);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('DELETE');
  });
});

describe('Company functions', () => {
  it('getCompanies should fetch with correct endpoint', async () => {
    const mockData = { payload: [{ id: 1, name: 'Empresa X' }] };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }));
    const api = await loadApi();
    const result = await api.getCompanies();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/companies');
    expect(result.payload[0].name).toBe('Empresa X');
  });

  it('createCompany should POST', async () => {
    const company = { id: 1, name: 'Nova Empresa' };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(company), { status: 200 }));
    const api = await loadApi();
    const result = await api.createCompany({ name: 'Nova Empresa', website: 'https://test.com' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toMatchObject({ name: 'Nova Empresa' });
    expect(result.name).toBe('Nova Empresa');
  });

  it('updateCompany should PUT', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1, name: 'Updated' }), { status: 200 }));
    const api = await loadApi();
    await api.updateCompany(1, { name: 'Updated' });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('PUT');
  });

  it('deleteCompany should DELETE', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = await loadApi();
    await api.deleteCompany(1);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('DELETE');
  });
});

describe('Conversation functions', () => {
  it('getConversations should fetch with filters', async () => {
    const mockData = { data: { meta: {}, payload: [] } };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }));
    const api = await loadApi();
    await api.getConversations({ status: 'open', assignee_type: 'me', page: 1 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/conversations');
    expect(url).toContain('status=open');
    expect(url).toContain('assignee_type=me');
  });

  it('createConversation should POST', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
    const api = await loadApi();
    await api.createConversation({ inbox_id: 1, contact_id: 1 });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body as string)).toMatchObject({ inbox_id: 1, contact_id: 1 });
  });
});

describe('Message functions', () => {
  it('getMessages should fetch messages for conversation', async () => {
    const mockData = { meta: {}, payload: [{ id: 1, content: 'Olá' }] };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }));
    const api = await loadApi();
    const result = await api.getMessages(5);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/conversations/5/messages');
    expect(result.payload[0].content).toBe('Olá');
  });

  it('sendMessage should POST with content and private flag', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ id: 10 }), { status: 200 }));
    const api = await loadApi();
    await api.sendMessage(5, 'Test message', true);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body as string);
    expect(body.content).toBe('Test message');
    expect(body.private).toBe(true);
    expect(body.message_type).toBe('outgoing');
  });
});

describe('Agent functions', () => {
  it('getAgents should fetch agents list', async () => {
    const agents = [{ id: 1, name: 'Agent A', email: 'agent@test.com' }];
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(agents), { status: 200 }));
    const api = await loadApi();
    const result = await api.getAgents();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/agents');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Agent A');
  });
});
