import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Upload, 
  Users, 
  Building2, 
  Kanban, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Inbox, 
  AlertTriangle,
  FileText,
  Check,
  Sparkles,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { parseCSV, CSVParseResult } from '../utils/csvParser';
import chatwootAPI from '../api/chatwoot';
import { useInboxes } from '../hooks/useAccount';
import { useMenuToggle } from '../contexts/MenuContext';

type ImportType = 'contacts' | 'companies' | 'leads';

interface FieldMapping {
  targetField: string;
  label: string;
  required: boolean;
  csvHeader: string; // The header from the CSV mapped to this field
}

interface LogEntry {
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: string;
}

const KANBAN_STAGES = [
  { id: 'novo-lead', title: 'Novo Lead' },
  { id: 'qualificacao', title: 'Qualificação IA' },
  { id: 'proposta', title: 'Proposta Enviada' },
  { id: 'negociacao', title: 'Negociação' },
];

const CONTACT_FIELDS: Omit<FieldMapping, 'csvHeader'>[] = [
  { targetField: 'name', label: 'Nome do Contato', required: true },
  { targetField: 'email', label: 'E-mail', required: false },
  { targetField: 'phone_number', label: 'Telefone', required: false },
  { targetField: 'identifier', label: 'Identificador Externo', required: false },
];

const COMPANY_FIELDS: Omit<FieldMapping, 'csvHeader'>[] = [
  { targetField: 'name', label: 'Nome da Empresa', required: true },
  { targetField: 'description', label: 'Descrição', required: false },
  { targetField: 'website', label: 'Website', required: false },
  { targetField: 'phone_number', label: 'Telefone Corporativo', required: false },
];

const LEAD_FIELDS: Omit<FieldMapping, 'csvHeader'>[] = [
  { targetField: 'name', label: 'Nome do Lead', required: true },
  { targetField: 'email', label: 'E-mail', required: false },
  { targetField: 'phone_number', label: 'Telefone', required: false },
  { targetField: 'deal_value', label: 'Valor do Negócio (R$)', required: false },
  { targetField: 'company_name', label: 'Nome da Empresa (B2B)', required: false },
];

const BulkImport: React.FC = () => {
  const { toggleSidebar } = useMenuToggle();
  const [step, setStep] = useState(1);
  const [importType, setImportType] = useState<ImportType>('contacts');
  
  // CSV State
  const [fileName, setFileName] = useState('');
  const [csvData, setCsvData] = useState<CSVParseResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Destination Setup for Leads
  const { data: inboxData, loading: loadingInboxes } = useInboxes();
  const inboxes = inboxData?.payload || [];
  const [selectedInboxId, setSelectedInboxId] = useState<number | null>(null);
  const [selectedStage, setSelectedStage] = useState('novo-lead');

  // Mappings
  const [mappings, setMappings] = useState<FieldMapping[]>([]);

  // Execution State
  const [isImporting, setIsImporting] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failureCount, setFailureCount] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Cleanup State
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupTargets, setCleanupTargets] = useState({
    contacts: false,
    companies: false,
    leads: false,
  });
  const [confirmText, setConfirmText] = useState('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState({
    processed: 0,
    total: 0,
    success: 0,
    failure: 0,
  });
  const [cleanupLogs, setCleanupLogs] = useState<LogEntry[]>([]);

  // Set default inbox on load
  useEffect(() => {
    if (inboxes.length > 0 && !selectedInboxId) {
      setSelectedInboxId(inboxes[0].id);
    }
  }, [inboxes, selectedInboxId]);

  // Set default mappings when importType or csvData changes
  useEffect(() => {
    if (!csvData) return;
    
    let baseFields: Omit<FieldMapping, 'csvHeader'>[] = [];
    if (importType === 'contacts') baseFields = CONTACT_FIELDS;
    else if (importType === 'companies') baseFields = COMPANY_FIELDS;
    else if (importType === 'leads') baseFields = LEAD_FIELDS;

    // Intelligent auto-mapping: try to match headers with labels or target fields
    const initialMappings = baseFields.map(field => {
      const match = csvData.headers.find(header => {
        const h = header.toLowerCase().replace(/[\s-_]/g, '');
        const f = field.targetField.toLowerCase();
        const l = field.label.toLowerCase().replace(/[\s-_]/g, '');
        return (
          h === f || 
          h === l || 
          h.includes(f) || 
          (h.includes('nome') && f === 'name') || 
          (h.includes('email') && f === 'email') || 
          (h.includes('fone') && f === 'phone_number') || 
          (h.includes('tel') && f === 'phone_number') || 
          (h.includes('valor') && f === 'deal_value') ||
          ((h.includes('empresa') || h.includes('company') || h.includes('corporativo')) && f === 'company_name')
        );
      });

      return {
        ...field,
        csvHeader: match || ''
      };
    });

    setMappings(initialMappings);
  }, [importType, csvData]);

  // Scroll to bottom of logs when they update
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Por favor, envie apenas arquivos com extensão .csv.');
      return;
    }
    setErrorMsg('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.headers.length === 0) {
          throw new Error('Nenhuma coluna identificada no arquivo CSV.');
        }
        setCsvData(parsed);
        setStep(2);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Falha ao ler o arquivo CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Stepper Controls
  const handleNext = () => {
    if (step === 2) {
      if (importType === 'leads' && !selectedInboxId) {
        alert('Por favor, selecione uma Caixa de Entrada para vincular os leads.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Validate required fields
      const missingRequired = mappings.find(m => m.required && !m.csvHeader);
      if (missingRequired) {
        alert(`O campo obrigatório "${missingRequired.label}" precisa ser mapeado para uma coluna do CSV.`);
        return;
      }
      setStep(4);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
  };

  const resetImport = () => {
    setFileName('');
    setCsvData(null);
    setMappings([]);
    setStep(1);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);
    setLogs([]);
    setIsImporting(false);
  };

  // Mapping Handlers
  const handleMapChange = (targetField: string, csvHeader: string) => {
    setMappings(prev => prev.map(m => m.targetField === targetField ? { ...m, csvHeader } : m));
  };

  // Helper value sanitizers
  const cleanPhone = (phone: string): string => {
    if (!phone) return '';
    // Strip non-digits except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Simple Brazil local format helper: if no country code, prepend +55
    if (cleaned.length === 11 && !cleaned.startsWith('+')) {
      cleaned = '+55' + cleaned;
    } else if (cleaned.length === 9 && !cleaned.startsWith('+')) {
      cleaned = '+5511' + cleaned; // default region mockup
    }
    return cleaned;
  };

  const cleanDealValue = (value: string): string => {
    if (!value) return '';
    // Strip Currency formats like "R$ 1.500,00" -> "1500"
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
    return cleaned;
  };

  // API Execution Runner
  const runImport = async () => {
    if (!csvData) return;
    setIsImporting(true);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailureCount(0);
    setLogs([{
      type: 'info',
      message: `Iniciando importação de ${csvData.rows.length} registros...`,
      timestamp: new Date().toLocaleTimeString()
    }]);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const companyCache = new Map<string, number>(); // Cache local para evitar requisições duplicadas de empresas no mesmo lote

    for (let index = 0; index < csvData.rows.length; index++) {
      const row = csvData.rows[index];
      const rowNum = index + 1;

      // Extract values from mapped headers
      const getVal = (targetField: string) => {
        const mapping = mappings.find(m => m.targetField === targetField);
        return mapping && mapping.csvHeader ? row[mapping.csvHeader] || '' : '';
      };

      const name = getVal('name');
      const email = getVal('email');
      const rawPhone = getVal('phone_number');
      const phone_number = cleanPhone(rawPhone);

      try {
        if (importType === 'contacts') {
          const identifier = getVal('identifier');
          let contact: any = null;

          // 1. Tentar deduplicar buscando contato existente por e-mail ou telefone
          if (email || phone_number) {
            try {
              const searchVal = email || phone_number;
              const searchRes = await chatwootAPI.contacts.search(searchVal);
              if (searchRes.payload && searchRes.payload.length > 0) {
                contact = searchRes.payload.find(
                  (c: any) => 
                    (email && c.email?.toLowerCase() === email.toLowerCase()) ||
                    (phone_number && c.phone_number === phone_number)
                );
              }
            } catch (searchErr) {
              console.error("Erro na busca de deduplicação de contato:", searchErr);
            }
          }

          if (contact) {
            setLogs(prev => [...prev, {
              type: 'info',
              message: `Linha ${rowNum}: Contato "${name}" já cadastrado no Chatwoot. Registro existente reutilizado.`,
              timestamp: new Date().toLocaleTimeString()
            }]);
          } else {
            // 2. Criar com resiliência e fallback caso dê erro de validação (ex: telefone inválido)
            try {
              contact = await chatwootAPI.contacts.create({
                name,
                email: email || undefined,
                phone_number: phone_number || undefined,
                identifier: identifier || undefined
              });
            } catch (createErr) {
              if (phone_number) {
                try {
                  contact = await chatwootAPI.contacts.create({
                    name,
                    email: email || undefined,
                    identifier: identifier || undefined
                  });
                  setLogs(prev => [...prev, {
                    type: 'info',
                    message: `Linha ${rowNum}: Telefone de "${name}" foi rejeitado. Contato criado omitindo o telefone.`,
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                } catch (createErr2) {
                  contact = await chatwootAPI.contacts.create({ name });
                  setLogs(prev => [...prev, {
                    type: 'info',
                    message: `Linha ${rowNum}: Dados de "${name}" foram rejeitados. Contato criado apenas com o Nome.`,
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                }
              } else {
                contact = await chatwootAPI.contacts.create({ name });
                setLogs(prev => [...prev, {
                  type: 'info',
                  message: `Linha ${rowNum}: Dados de "${name}" foram rejeitados. Contato criado apenas com o Nome.`,
                  timestamp: new Date().toLocaleTimeString()
                }]);
              }
            }
          }

          setSuccessCount(prev => prev + 1);
          setLogs(prev => [...prev, {
            type: 'success',
            message: `Linha ${rowNum}: Contato "${name}" processado com sucesso.`,
            timestamp: new Date().toLocaleTimeString()
          }]);

        } else if (importType === 'companies') {
          const description = getVal('description');
          const website = getVal('website');

          await chatwootAPI.companies.create({
            name,
            description: description || undefined,
            website: website || undefined,
            phone_number: phone_number || undefined
          });

          setSuccessCount(prev => prev + 1);
          setLogs(prev => [...prev, {
            type: 'success',
            message: `Linha ${rowNum}: Empresa "${name}" importada com sucesso.`,
            timestamp: new Date().toLocaleTimeString()
          }]);

        } else if (importType === 'leads') {
          const rawDealVal = getVal('deal_value');
          const deal_value = cleanDealValue(rawDealVal);
          const companyName = getVal('company_name').trim();
          let companyId: number | null = null;

          // 1. Processamento da Empresa (B2B)
          if (companyName) {
            const cacheKey = companyName.toLowerCase();
            if (companyCache.has(cacheKey)) {
              companyId = companyCache.get(cacheKey)!;
            } else {
              try {
                // Tenta buscar se a empresa já existe no Chatwoot para evitar duplicar
                const searchRes = await chatwootAPI.companies.get({ q: companyName });
                const existingCompany = searchRes.payload?.find(
                  (c: any) => c.name.toLowerCase() === cacheKey
                );

                if (existingCompany) {
                  companyId = existingCompany.id;
                  companyCache.set(cacheKey, companyId);
                  setLogs(prev => [...prev, {
                    type: 'info',
                    message: `Linha ${rowNum}: Empresa "${companyName}" já cadastrada no Chatwoot. Reutilizando.`,
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                } else {
                  // Cria uma nova empresa
                  const company = await chatwootAPI.companies.create({ name: companyName });
                  companyId = company.id;
                  companyCache.set(cacheKey, companyId);
                  setLogs(prev => [...prev, {
                    type: 'success',
                    message: `Linha ${rowNum}: Empresa "${companyName}" criada no módulo Empresas.`,
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                }
              } catch (compErr) {
                // Em caso de erro na API de Empresas, não interrompe a importação do contato, apenas loga e prossegue
                setLogs(prev => [...prev, {
                  type: 'error',
                  message: `Linha ${rowNum}: Não foi possível associar a empresa "${companyName}". Detalhes: ${
                    compErr instanceof Error ? compErr.message : 'Erro desconhecido'
                  }`,
                  timestamp: new Date().toLocaleTimeString()
                }]);
              }
            }
          }

          // 2. Criar ou Obter o Contato com Deduplicação e Fallback
          let contact: any = null;

          if (email || phone_number) {
            try {
              const searchVal = email || phone_number;
              const searchRes = await chatwootAPI.contacts.search(searchVal);
              if (searchRes.payload && searchRes.payload.length > 0) {
                contact = searchRes.payload.find(
                  (c: any) => 
                    (email && c.email?.toLowerCase() === email.toLowerCase()) ||
                    (phone_number && c.phone_number === phone_number)
                );
              }
            } catch (searchErr) {
              console.error("Erro na busca de deduplicação de contato:", searchErr);
            }
          }

          if (contact) {
            setLogs(prev => [...prev, {
              type: 'info',
              message: `Linha ${rowNum}: Contato "${name}" já cadastrado no Chatwoot. Reutilizando.`,
              timestamp: new Date().toLocaleTimeString()
            }]);
          } else {
            try {
              // Tenta criar normalmente
              contact = await chatwootAPI.contacts.create({
                name,
                email: email || undefined,
                phone_number: phone_number || undefined
              });
            } catch (createErr) {
              // Fallback se o telefone ou outro dado falhar (ex: rejeitado pela validação do Chatwoot)
              if (phone_number) {
                try {
                  contact = await chatwootAPI.contacts.create({
                    name,
                    email: email || undefined
                  });
                  setLogs(prev => [...prev, {
                    type: 'info',
                    message: `Linha ${rowNum}: Telefone de "${name}" rejeitado. Criando contato sem telefone.`,
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                } catch (createErr2) {
                  contact = await chatwootAPI.contacts.create({ name });
                  setLogs(prev => [...prev, {
                    type: 'info',
                    message: `Linha ${rowNum}: Dados de "${name}" rejeitados. Criando contato apenas com Nome.`,
                    timestamp: new Date().toLocaleTimeString()
                  }]);
                }
              } else {
                contact = await chatwootAPI.contacts.create({ name });
                setLogs(prev => [...prev, {
                  type: 'info',
                  message: `Linha ${rowNum}: Dados de "${name}" rejeitados. Criando contato apenas com Nome.`,
                  timestamp: new Date().toLocaleTimeString()
                }]);
              }
            }
          }

          // 3. Vincular Contato à Empresa se B2B resolvido
          if (companyId) {
            try {
              await chatwootAPI.companies.addContact(companyId, contact.id);
            } catch (linkErr) {
              setLogs(prev => [...prev, {
                type: 'error',
                message: `Linha ${rowNum}: Falha ao relacionar o contato à empresa (ID: ${companyId}). Detalhes: ${
                  linkErr instanceof Error ? linkErr.message : 'Erro desconhecido'
                }`,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }
          }

          // 4. Criar Conversa na Inbox Selecionada
          const conversation = await chatwootAPI.conversations.create({
            inbox_id: selectedInboxId!,
            contact_id: contact.id,
            custom_attributes: deal_value ? { deal_value } : undefined
          });

          // 5. Aplicar Label do Estágio do Funil
          await chatwootAPI.conversations.addLabels(conversation.id, [selectedStage]);

          setSuccessCount(prev => prev + 1);
          setLogs(prev => [...prev, {
            type: 'success',
            message: companyName
              ? `Linha ${rowNum}: Lead B2B "${name}" (Empresa: "${companyName}", R$ ${deal_value || '--'}) importado com sucesso.`
              : `Linha ${rowNum}: Lead "${name}" (R$ ${deal_value || '--'}) importado com sucesso.`,
            timestamp: new Date().toLocaleTimeString()
          }]);
        }

      } catch (err) {
        setFailureCount(prev => prev + 1);
        const errMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        setLogs(prev => [...prev, {
          type: 'error',
          message: `Linha ${rowNum} (${name || 'Sem nome'}): Falha na importação. API: ${errMsg}`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }

      setProcessedCount(rowNum);

      // Proteção de rate limit: delay de 250ms entre chamadas
      await delay(250);
    }

    setIsImporting(false);
    setLogs(prev => [...prev, {
      type: 'info',
      message: `Processo concluído! Sucessos: ${successCount + (csvData.rows.length - failureCount - successCount)}, Falhas: ${failureCount}`,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runCleanup = async () => {
    if (confirmText !== 'EXCLUIR') {
      alert("Por favor, digite a palavra EXCLUIR para confirmar.");
      return;
    }

    setIsCleaningUp(true);
    setCleanupLogs([{
      type: 'info',
      message: 'Iniciando processo de exclusão em massa...',
      timestamp: new Date().toLocaleTimeString()
    }]);

    setCleanupProgress({ processed: 0, total: 0, success: 0, failure: 0 });

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      // 1. Excluir Oportunidades (Conversas)
      if (cleanupTargets.leads) {
        setCleanupLogs(prev => [...prev, {
          type: 'info',
          message: 'Buscando conversas no Chatwoot para exclusão...',
          timestamp: new Date().toLocaleTimeString()
        }]);

        const res = await chatwootAPI.conversations.get({ page: 1 });
        const conversations = res.data?.payload || [];

        if (conversations.length === 0) {
          setCleanupLogs(prev => [...prev, {
            type: 'info',
            message: 'Nenhuma conversa encontrada para exclusão.',
            timestamp: new Date().toLocaleTimeString()
          }]);
        } else {
          setCleanupProgress(prev => ({ ...prev, total: prev.total + conversations.length }));
          
          for (let i = 0; i < conversations.length; i++) {
            const conv = conversations[i];
            try {
              await chatwootAPI.conversations.delete(conv.id);
              setCleanupProgress(prev => ({ ...prev, processed: prev.processed + 1, success: prev.success + 1 }));
              setCleanupLogs(prev => [...prev, {
                type: 'success',
                message: `Conversa #${conv.id} excluída com sucesso.`,
                timestamp: new Date().toLocaleTimeString()
              }]);
            } catch (err) {
              setCleanupProgress(prev => ({ ...prev, processed: prev.processed + 1, failure: prev.failure + 1 }));
              setCleanupLogs(prev => [...prev, {
                type: 'error',
                message: `Falha ao excluir conversa #${conv.id}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }
            await delay(150);
          }
        }
      }

      // 2. Excluir Contatos
      if (cleanupTargets.contacts) {
        setCleanupLogs(prev => [...prev, {
          type: 'info',
          message: 'Buscando contatos no Chatwoot para exclusão...',
          timestamp: new Date().toLocaleTimeString()
        }]);

        const res = await chatwootAPI.contacts.get({ page: 1 });
        const contacts = res.payload || [];

        if (contacts.length === 0) {
          setCleanupLogs(prev => [...prev, {
            type: 'info',
            message: 'Nenhum contato encontrado para exclusão.',
            timestamp: new Date().toLocaleTimeString()
          }]);
        } else {
          setCleanupProgress(prev => ({ ...prev, total: prev.total + contacts.length }));

          for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            try {
              await chatwootAPI.contacts.delete(contact.id);
              setCleanupProgress(prev => ({ ...prev, processed: prev.processed + 1, success: prev.success + 1 }));
              setCleanupLogs(prev => [...prev, {
                type: 'success',
                message: `Contato "${contact.name}" (ID: ${contact.id}) excluído com sucesso.`,
                timestamp: new Date().toLocaleTimeString()
              }]);
            } catch (err) {
              setCleanupProgress(prev => ({ ...prev, processed: prev.processed + 1, failure: prev.failure + 1 }));
              setCleanupLogs(prev => [...prev, {
                type: 'error',
                message: `Falha ao excluir contato "${contact.name}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }
            await delay(150);
          }
        }
      }

      // 3. Excluir Empresas
      if (cleanupTargets.companies) {
        setCleanupLogs(prev => [...prev, {
          type: 'info',
          message: 'Buscando empresas no Chatwoot para exclusão...',
          timestamp: new Date().toLocaleTimeString()
        }]);

        const res = await chatwootAPI.companies.get({ page: 1 });
        const companies = res.payload || [];

        if (companies.length === 0) {
          setCleanupLogs(prev => [...prev, {
            type: 'info',
            message: 'Nenhuma empresa encontrada para exclusão.',
            timestamp: new Date().toLocaleTimeString()
          }]);
        } else {
          setCleanupProgress(prev => ({ ...prev, total: prev.total + companies.length }));

          for (let i = 0; i < companies.length; i++) {
            const company = companies[i];
            try {
              await chatwootAPI.companies.delete(company.id);
              setCleanupProgress(prev => ({ ...prev, processed: prev.processed + 1, success: prev.success + 1 }));
              setCleanupLogs(prev => [...prev, {
                type: 'success',
                message: `Empresa "${company.name}" (ID: ${company.id}) excluída com sucesso.`,
                timestamp: new Date().toLocaleTimeString()
              }]);
            } catch (err) {
              setCleanupProgress(prev => ({ ...prev, processed: prev.processed + 1, failure: prev.failure + 1 }));
              setCleanupLogs(prev => [...prev, {
                type: 'error',
                message: `Falha ao excluir empresa "${company.name}": ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
                timestamp: new Date().toLocaleTimeString()
              }]);
            }
            await delay(150);
          }
        }
      }

      setCleanupLogs(prev => [...prev, {
        type: 'info',
        message: 'Processo de limpeza em massa finalizado!',
        timestamp: new Date().toLocaleTimeString()
      }]);

    } catch (globalErr) {
      setCleanupLogs(prev => [...prev, {
        type: 'error',
        message: `Falha geral durante o processo de limpeza: ${globalErr instanceof Error ? globalErr.message : 'Erro desconhecido'}`,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Preview generated from the first row mapped
  const getPreviewObj = () => {
    if (!csvData || csvData.rows.length === 0) return null;
    const firstRow = csvData.rows[0];
    const preview: Record<string, string> = {};
    mappings.forEach(m => {
      preview[m.label] = m.csvHeader ? firstRow[m.csvHeader] || '(em branco)' : '(não mapeado)';
    });
    return preview;
  };

  const previewObject = getPreviewObj();

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="lg:hidden p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
            <Menu size={20} />
          </button>
          <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
            <Upload size={24} className="text-brand-500" />
            Central de Importação
          </h1>
        </div>
        <button 
          onClick={() => setShowCleanupModal(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-black transition-all uppercase tracking-widest shadow-sm shrink-0"
        >
          <Trash2 size={16} />
          Limpeza em Massa
        </button>
      </header>

      {/* Steps Indicator */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-8 shrink-0 flex items-center justify-center gap-12 sm:gap-24 overflow-x-auto no-scrollbar">
        {[
          { label: 'CSV & Destino', stepNum: 1 },
          { label: 'Ajuste do Funil', stepNum: 2 },
          { label: 'Mapeamento', stepNum: 3 },
          { label: 'Processamento', stepNum: 4 }
        ].map(s => {
          const isActive = step === s.stepNum;
          const isDone = step > s.stepNum;
          return (
            <div key={s.stepNum} className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all ${
                isDone 
                  ? 'bg-emerald-500 text-white' 
                  : isActive 
                    ? 'bg-brand-500 text-slate-950 shadow-md shadow-brand-500/20' 
                    : 'bg-slate-100 text-slate-400'
              }`}>
                {isDone ? <Check size={14} /> : s.stepNum}
              </span>
              <span className={`text-[10px] uppercase tracking-widest font-extrabold whitespace-nowrap transition-all ${
                isActive || isDone ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
              }`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8 no-scrollbar">
        <div className="max-w-4xl mx-auto">
          
          {/* STEP 1: UPLOAD AND SELECT IMPORT TYPE */}
          {step === 1 && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">1. Selecione o Tipo de Importação</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { id: 'contacts', title: 'Contatos', desc: 'Sincronizar a base de clientes do Chatwoot', icon: <Users size={24} /> },
                    { id: 'companies', title: 'Empresas', desc: 'Criar organizações e associar dados', icon: <Building2 size={24} /> },
                    { id: 'leads', title: 'Oportunidades (CRM)', desc: 'Gerar contatos, conversas e cards de vendas', icon: <Kanban size={24} /> }
                  ].map(option => {
                    const isSelected = importType === option.id as ImportType;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setImportType(option.id as ImportType)}
                        className={`p-6 rounded-2xl border text-left flex flex-col gap-4 transition-all duration-300 ${
                          isSelected 
                            ? 'bg-brand-500/10 border-brand-500 ring-2 ring-brand-500/10 shadow-lg shadow-brand-500/5' 
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                          isSelected ? 'bg-brand-500 text-slate-950' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                        }`}>
                          {option.icon}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 tracking-tight uppercase">{option.title}</h4>
                          <p className="text-[10px] text-slate-400 font-bold leading-normal mt-1">{option.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">2. Envie o Arquivo de Contatos</h3>
                
                {errorMsg && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-500 dark:text-red-400">
                    <AlertCircle size={18} className="shrink-0" />
                    <p className="text-xs font-bold">{errorMsg}</p>
                  </div>
                )}

                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-500 rounded-3xl p-12 text-center bg-slate-50/50 dark:bg-slate-800/50 hover:bg-brand-50/10 dark:hover:bg-brand-900/10 transition-all cursor-pointer relative group"
                >
                  <input 
                    type="file" 
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-md mx-auto mb-4 text-slate-400 group-hover:text-brand-500 transition-all">
                    <Upload size={24} />
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest">Arraste seu arquivo CSV</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-2">ou clique para navegar no computador (máximo 5MB)</p>
                </div>
                <div className="flex items-center gap-2 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl border border-brand-100/50 dark:border-brand-800">
                  <Sparkles size={16} className="text-brand-600" />
                  <p className="text-[10px] text-brand-900 dark:text-brand-300 font-bold leading-relaxed">
                    Dica: Exporte sua planilha do Excel ou Google Sheets no formato **Valores Separados por Vírgulas (.csv)** antes de subir.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: FUNNEL / INBOX DESTINATION FOR LEADS */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">2. Destino no Chatwoot</h3>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">Configurações para criação de instâncias de conversas</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-brand-500/10 text-brand-800 px-3 py-1 rounded-lg">
                    {importType === 'leads' ? 'Oportunidades (CRM)' : importType === 'companies' ? 'Empresas' : 'Contatos'}
                  </span>
                </div>

                {importType === 'leads' ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Caixa de Entrada (Inbox) Alvo</label>
                        <p className="text-[9px] text-slate-400 font-bold mb-2">Os leads importados gerarão conversas dentro deste canal no Chatwoot.</p>
                        {loadingInboxes ? (
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium py-3">
                            <Loader2 className="animate-spin text-brand-500" size={16} />
                            Carregando canais ativos...
                          </div>
                        ) : inboxes.length === 0 ? (
                          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-100 text-xs font-bold">
                            Nenhum canal ativo encontrado. Crie uma Inbox no Chatwoot primeiro.
                          </div>
                        ) : (
                          <select 
                            value={selectedInboxId || ''} 
                            onChange={(e) => setSelectedInboxId(Number(e.target.value))}
                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/10 outline-none cursor-pointer"
                          >
                            {inboxes.map(inbox => (
                              <option key={inbox.id} value={inbox.id}>
                                {inbox.name} ({inbox.channel_type.replace('Channel::', '')})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Estágio Inicial do Funil (Kanban)</label>
                        <p className="text-[9px] text-slate-400 font-bold mb-2">Selecione em qual coluna do quadro de vendas os leads serão criados.</p>
                        <select 
                          value={selectedStage} 
                          onChange={(e) => setSelectedStage(e.target.value)}
                          className="w-full p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/10 outline-none cursor-pointer"
                        >
                          {KANBAN_STAGES.map(stage => (
                            <option key={stage.id} value={stage.id}>
                              {stage.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-5 bg-brand-50 dark:bg-brand-900/20 rounded-2xl border border-brand-100 dark:border-brand-800 flex items-start gap-4">
                      <AlertTriangle size={18} className="text-brand-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold text-[10px] text-brand-900 uppercase tracking-widest mb-1">Mapeamento Inteligente</h4>
                        <p className="text-[10px] text-brand-800 font-bold leading-relaxed">
                          Criaremos automaticamente o Contato, em seguida abriremos uma Conversa vinculada a ele no canal escolhido e, por fim, marcaremos com a label correspondente para alimentar o seu Funil Kanban Caen.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-500 space-y-4">
                    <FileText size={48} className="mx-auto text-slate-300 opacity-50" />
                    <p className="text-xs font-bold leading-relaxed max-w-sm mx-auto">
                      Arquivo **"{fileName}"** carregado com **{csvData?.rows.length}** linhas de dados identificadas.
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Clique em avançar para definir as colunas de dados para importação.
                    </p>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-100 pt-6">
                  <button 
                    onClick={handlePrev} 
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                  >
                    Mapear Campos
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COLUMN MAPPING */}
          {step === 3 && csvData && (
            <div className="grid lg:grid-cols-3 gap-8 animate-fadeIn">
              
              {/* Mapping Setup */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">3. Mapear Cabeçalhos do CSV</h3>
                  <p className="text-[10px] text-slate-400 font-bold leading-normal mt-1">Conecte os dados da sua planilha às colunas oficiais do CaenCRM.</p>
                </div>

                <div className="space-y-4">
                  {mappings.map(mapping => (
                    <div key={mapping.targetField} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">{mapping.label}</span>
                          {mapping.required && (
                            <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase">Obrigatório</span>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">Chave técnica: {mapping.targetField}</span>
                      </div>
                      
                      <select
                        value={mapping.csvHeader}
                        onChange={(e) => handleMapChange(mapping.targetField, e.target.value)}
                        className={`p-3 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/10 outline-none cursor-pointer w-full sm:w-56 transition-all ${
                          mapping.required && !mapping.csvHeader 
                            ? 'border-red-300 text-red-500' 
                            : mapping.csvHeader 
                              ? 'border-emerald-300 text-emerald-600 ring-2 ring-emerald-500/5' 
                              : 'border-slate-200 text-slate-400'
                        }`}
                      >
                        <option value="">-- Não mapear --</option>
                        {csvData.headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-6">
                  <button 
                    onClick={handlePrev} 
                    className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </button>
                  <button 
                    onClick={handleNext} 
                    className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                  >
                    Iniciar Importação
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-950 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl"></div>
                  <div className="relative space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
                      <Sparkles size={16} className="text-brand-500" />
                      <h4 className="font-extrabold text-[10px] uppercase tracking-widest text-brand-500">Live Preview: Linha 1</h4>
                    </div>

                    <div className="space-y-4">
                      {previewObject ? (
                        Object.entries(previewObject).map(([label, val]) => (
                          <div key={label} className="space-y-1">
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">{label}</span>
                            <p className="text-xs font-bold text-slate-200 truncate">{val}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 font-medium italic">Selecione mapeamentos para gerar a pré-visualização.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PROCESSING & REAL-TIME LOGGING */}
          {step === 4 && csvData && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8 animate-fadeIn">
              <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-100 pb-6 gap-4">
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">4. Executando Fila de Sincronização</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Conectando em tempo real com as APIs do Chatwoot</p>
                </div>
                {!isImporting && processedCount === 0 && (
                  <button 
                    onClick={runImport}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 text-slate-950 rounded-xl text-xs font-black shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all uppercase tracking-widest"
                  >
                    Começar Agora
                    <ArrowRight size={16} />
                  </button>
                )}
                {processedCount > 0 && !isImporting && (
                  <button 
                    onClick={resetImport}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-extrabold transition-all"
                  >
                    <RefreshCw size={14} />
                    Nova Importação
                  </button>
                )}
              </div>

              {/* Progress Counters & Circular Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 text-center relative overflow-hidden">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total de Linhas</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{csvData.rows.length}</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 text-center relative overflow-hidden">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Processados</span>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{processedCount}</p>
                  {isImporting && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-brand-500 rounded-full animate-ping"></span>
                  )}
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 text-center relative">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Sucessos</span>
                  <p className="text-2xl font-black text-emerald-700">{successCount}</p>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-2xl border border-red-100 dark:border-red-800 text-center relative">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-1">Falhas</span>
                  <p className="text-2xl font-black text-red-600">{failureCount}</p>
                </div>
              </div>

              {/* Linear Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <span>Progresso Global</span>
                  <span>{Math.round((processedCount / csvData.rows.length) * 100) || 0}%</span>
                </div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 p-0.5">
                  <div 
                    className="h-full bg-brand-500 rounded-full transition-all duration-300 flex items-center justify-end px-2"
                    style={{ width: `${(processedCount / csvData.rows.length) * 100}%` }}
                  >
                    {isImporting && (
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable Logs box */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Relatório Técnico em Tempo Real</label>
                <div 
                  ref={logsContainerRef}
                  className="h-64 bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-2.5 shadow-inner"
                >
                  {logs.length === 0 ? (
                    <p className="text-slate-500 italic">Console aguardando o início do processamento...</p>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="text-slate-500 shrink-0 font-bold">[{log.timestamp}]</span>
                        {log.type === 'success' && (
                          <span className="text-emerald-500 font-bold uppercase shrink-0">[SUCESSO]</span>
                        )}
                        {log.type === 'error' && (
                          <span className="text-red-500 font-bold uppercase shrink-0">[ERRO]</span>
                        )}
                        {log.type === 'info' && (
                          <span className="text-brand-400 font-bold uppercase shrink-0">[INFO]</span>
                        )}
                        <p className={log.type === 'error' ? 'text-red-300 font-semibold' : log.type === 'success' ? 'text-slate-200' : 'text-brand-200 font-medium'}>
                          {log.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Completion Banner */}
              {processedCount === csvData.rows.length && !isImporting && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4 animate-scaleUp">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-wider">Processamento Concluído!</h4>
                      <p className="text-[10px] text-emerald-800 font-bold leading-normal mt-0.5">
                        Todos os {csvData.rows.length} registros foram analisados e encaminhados à API do Chatwoot.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={resetImport}
                      className="px-4 py-2 bg-white hover:bg-slate-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                    >
                      Reiniciar Módulo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Modal de Limpeza em Massa */}
      {showCleanupModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-rose-50/50 dark:bg-rose-900/10">
              <div className="flex items-center gap-3">
                <Trash2 size={20} className="text-rose-600 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 dark:text-slate-200">Limpeza em Massa (Testes)</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Exclusão permanente de dados do Chatwoot</p>
                </div>
              </div>
              {!isCleaningUp && (
                <button 
                  onClick={() => {
                    setShowCleanupModal(false);
                    setConfirmText('');
                    setCleanupTargets({ contacts: false, companies: false, leads: false });
                    setCleanupProgress({ processed: 0, total: 0, success: 0, failure: 0 });
                    setCleanupLogs([]);
                  }} 
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all text-xs font-bold"
                >
                  Fechar
                </button>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {!isCleaningUp && cleanupProgress.processed === 0 ? (
                <>
                  <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-[10px] text-rose-900 uppercase tracking-widest mb-1">Zona de Perigo</h4>
                      <p className="text-[10px] text-rose-800 font-bold leading-relaxed">
                        Esta operação irá excluir permanentemente os dados selecionados na sua conta conectada do Chatwoot. Ideal para limpar dados após rodar planilhas de teste.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Selecione o que deseja apagar:</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'leads', label: 'Leads (CRM)', desc: 'Conversas' },
                        { id: 'contacts', label: 'Contatos', desc: 'Pessoas' },
                        { id: 'companies', label: 'Empresas', desc: 'Organizações' }
                      ].map(target => {
                        const isChecked = cleanupTargets[target.id as keyof typeof cleanupTargets];
                        return (
                          <button
                            key={target.id}
                            type="button"
                            onClick={() => setCleanupTargets(prev => ({ ...prev, [target.id]: !isChecked }))}
                            className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                              isChecked 
                                ? 'bg-rose-500/10 border-rose-500 shadow-md animate-scaleUp' 
                                : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className={`text-[10px] font-black uppercase tracking-wider ${isChecked ? 'text-rose-700' : 'text-slate-700'}`}>
                              {target.label}
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold uppercase">{target.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Confirmação de Segurança</label>
                    <p className="text-[9px] text-slate-400 font-bold">Digite a palavra <span className="text-rose-600 font-black">EXCLUIR</span> em maiúsculas para habilitar a operação:</p>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="EXCLUIR"
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all text-center placeholder:font-normal placeholder:tracking-normal text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  {/* Progress Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl text-center border border-slate-100 dark:border-slate-700">
                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Registros</span>
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">{cleanupProgress.processed} / {cleanupProgress.total}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center border border-emerald-100 dark:border-emerald-800">
                      <span className="text-[8px] font-black text-emerald-600 block mb-1">Excluídos</span>
                      <p className="text-lg font-black text-emerald-700">{cleanupProgress.success}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-center border border-red-100 dark:border-red-800">
                      <span className="text-[8px] font-black text-red-500 block mb-1">Falhas</span>
                      <p className="text-lg font-black text-red-700">{cleanupProgress.failure}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {cleanupProgress.total > 0 && (
                    <div className="space-y-1.5">
                      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 p-0.5">
                        <div 
                          className="h-full bg-rose-500 rounded-full transition-all duration-300"
                          style={{ width: `${(cleanupProgress.processed / cleanupProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Live Console */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Console de Limpeza</label>
                    <div className="h-44 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-[9px] text-slate-300 space-y-2 no-scrollbar">
                      {cleanupLogs.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2 leading-relaxed">
                          <span className="text-slate-600 font-bold shrink-0">[{log.timestamp}]</span>
                          {log.type === 'success' && <span className="text-rose-500 font-bold shrink-0">[EXCLUÍDO]</span>}
                          {log.type === 'error' && <span className="text-red-500 font-bold shrink-0">[ERRO]</span>}
                          {log.type === 'info' && <span className="text-blue-400 font-bold shrink-0">[INFO]</span>}
                          <p className={log.type === 'error' ? 'text-red-300' : log.type === 'success' ? 'text-rose-200' : 'text-slate-300'}>
                            {log.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
              {!isCleaningUp && cleanupProgress.processed === 0 ? (
                <>
                  <button
                    onClick={() => {
                      setShowCleanupModal(false);
                      setConfirmText('');
                      setCleanupTargets({ contacts: false, companies: false, leads: false });
                    }}
                    className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={runCleanup}
                    disabled={confirmText !== 'EXCLUIR' || (!cleanupTargets.contacts && !cleanupTargets.companies && !cleanupTargets.leads)}
                    className="px-6 py-2.5 bg-rose-600 disabled:bg-slate-200 text-white disabled:text-slate-400 hover:bg-rose-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-600/10"
                  >
                    Iniciar Exclusão
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowCleanupModal(false);
                    setConfirmText('');
                    setCleanupTargets({ contacts: false, companies: false, leads: false });
                    setCleanupProgress({ processed: 0, total: 0, success: 0, failure: 0 });
                    setCleanupLogs([]);
                  }}
                  disabled={isCleaningUp}
                  className="w-full py-3 bg-slate-900 disabled:bg-slate-200 hover:bg-slate-800 text-white disabled:text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Concluir Limpeza
                </button>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImport;
