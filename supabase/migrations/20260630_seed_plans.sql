-- =====================================================
-- PREGADOR OS — Seed: Planos padrão
-- =====================================================
-- Idempotente: usa ON CONFLICT (slug) DO UPDATE
-- =====================================================

INSERT INTO public.plans (
  slug, nome, descricao, tier, preco_mensal, preco_anual, ativo, destaque, ordem,
  limite_sermoes, limite_estudos, limite_pesquisas_mes, limite_ia_mes,
  limite_exportacoes_mes, limite_compartilhamentos_mes, limite_dispositivos,
  limite_armazenamento_mb, limite_duracao_trial_dias,
  f_pulpit, f_assistente, f_biblioteca, f_exportacao, f_estudos,
  f_templates_premium, f_apresentacoes, f_compartilhamento, f_assistente_premium,
  f_backup, f_offline, f_sync
) VALUES
  (
    'gratuito', 'Gratuito', 'Para começar. Acesso essencial ao pregador OS.',
    'free', 0, 0, true, false, 1,
    5, 3, 20, 30, 1, 2, 1, 50, 7,
    true, true, true, false, true,
    false, false, false, false,
    false, true, false
  ),
  (
    'essencial', 'Essencial', 'Para pregadores que preparam toda semana.',
    'essencial', 29.90, 299.00, true, false, 2,
    50, 30, 200, 500, 20, 30, 2, 500, 14,
    true, true, true, true, true,
    false, true, true, false,
    true, true, false
  ),
  (
    'premium', 'Premium', 'IA ilimitada, exportação e backup em nuvem.',
    'premium', 59.90, 599.00, true, true, 3,
    999, 999, 9999, 9999, 999, 999, 5, 5000, 30,
    true, true, true, true, true,
    true, true, true, true,
    true, true, true
  ),
  (
    'pro', 'Pro', 'Para autores e conferencistas. Tudo ilimitado.',
    'pro', 119.90, 1199.00, true, false, 4,
    9999, 9999, 9999, 9999, 9999, 9999, 10, 50000, 30,
    true, true, true, true, true,
    true, true, true, true,
    true, true, true
  ),
  (
    'igreja', 'Igreja', 'Para igrejas com equipe pastoral completa.',
    'igreja', 199.90, 1999.00, true, false, 5,
    9999, 9999, 9999, 9999, 9999, 9999, 50, 100000, 30,
    true, true, true, true, true,
    true, true, true, true,
    true, true, true
  )
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  tier = EXCLUDED.tier,
  preco_mensal = EXCLUDED.preco_mensal,
  preco_anual = EXCLUDED.preco_anual,
  ativo = EXCLUDED.ativo,
  destaque = EXCLUDED.destaque,
  ordem = EXCLUDED.ordem,
  limite_sermoes = EXCLUDED.limite_sermoes,
  limite_estudos = EXCLUDED.limite_estudos,
  limite_pesquisas_mes = EXCLUDED.limite_pesquisas_mes,
  limite_ia_mes = EXCLUDED.limite_ia_mes,
  limite_exportacoes_mes = EXCLUDED.limite_exportacoes_mes,
  limite_compartilhamentos_mes = EXCLUDED.limite_compartilhamentos_mes,
  limite_dispositivos = EXCLUDED.limite_dispositivos,
  limite_armazenamento_mb = EXCLUDED.limite_armazenamento_mb,
  limite_duracao_trial_dias = EXCLUDED.limite_duracao_trial_dias,
  f_pulpit = EXCLUDED.f_pulpit,
  f_assistente = EXCLUDED.f_assistente,
  f_biblioteca = EXCLUDED.f_biblioteca,
  f_exportacao = EXCLUDED.f_exportacao,
  f_estudos = EXCLUDED.f_estudos,
  f_templates_premium = EXCLUDED.f_templates_premium,
  f_apresentacoes = EXCLUDED.f_apresentacoes,
  f_compartilhamento = EXCLUDED.f_compartilhamento,
  f_assistente_premium = EXCLUDED.f_assistente_premium,
  f_backup = EXCLUDED.f_backup,
  f_offline = EXCLUDED.f_offline,
  f_sync = EXCLUDED.f_sync;

-- Feature flags iniciais
INSERT INTO public.feature_flags (feature_key, nome, descricao, estado)
VALUES
  ('modo_pulpit', 'Modo Púlpito', 'Tela fullscreen para ministração', 'released'),
  ('assistente_ministerial', 'Assistente Ministerial IA', 'IA especializada em teologia', 'released'),
  ('biblioteca', 'Biblioteca', 'Mensagens e esboços', 'released'),
  ('templates_premium', 'Templates Premium', 'Galeria de 20+ templates', 'released'),
  ('exportacao_pdf', 'Exportação PDF', 'Exporta mensagens em PDF', 'premium'),
  ('exportacao_word', 'Exportação Word', 'Exporta mensagens em DOCX', 'premium'),
  ('exportacao_pptx', 'Exportação PowerPoint', 'Exporta apresentações', 'premium'),
  ('compartilhamento', 'Compartilhamento', 'Compartilha via WhatsApp/Telegram', 'premium'),
  ('sincronizacao_nuvem', 'Sincronização nuvem', 'Sync multi-device via Supabase', 'development'),
  ('multi_usuario_igreja', 'Multi-usuário igreja', 'Equipes com permissões', 'development'),
  ('series_mensagens', 'Séries', 'Planejamento de séries', 'released'),
  ('celulas', 'Estudos p/ Células', 'Material para pequenos grupos', 'released')
ON CONFLICT (feature_key) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  estado = EXCLUDED.estado;

NOTIFY pgrst, 'reload schema';