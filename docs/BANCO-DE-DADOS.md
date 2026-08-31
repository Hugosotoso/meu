# Banco de dados do Portal N2

O projeto utiliza Supabase/PostgreSQL. A aplicação web acessa a Data API com a chave pública configurada na Vercel.

## Sessão e RLS

- `portal_iniciar_sessao(cpf)` localiza exatamente um servidor e emite um token aleatório válido por 8 horas.
- `portal_sessoes` guarda apenas o SHA-256 do token e não possui acesso direto pela Data API.
- O cliente envia o token no cabeçalho `x-portal-session`.
- Servidores comuns consultam somente os registros da própria matrícula.
- O perfil `DIAMANTE` consulta e movimenta os fluxos administrativos globais.
- Matrícula, nome e autoria são regravados no banco por gatilho; parâmetros de rota não concedem permissão.
- Nenhuma política permite `delete`, e `servidores` não pode ser consultada diretamente pelo papel `anon`.

## Relacionamentos

- `servidores.matricula` identifica o usuário nas telas funcionais.
- `contracheques.matricula` relaciona os contracheques ao servidor.
- `solicitacoes_almoxarifado.matricula` relaciona pedidos ao servidor.
- `solicitacoes_frota.matricula` relaciona solicitações de veículos ao servidor.
- `chamados_patrimonio.matricula` relaciona chamados ao servidor.
- `oficios` mantém o fluxo independente do módulo Gabinete.

## Tabelas e campos consumidos

### `servidores`

`id`, `cpf`, `nome`, `cargo`, `uorg_id`, `matricula`, `nivel_acesso`

### `contracheques`

`id`, `matricula`, `mes_referencia`, `bruto`, `descontos`, `liquido`, `rendimentos`, `lista_descontos`

Os campos `rendimentos` e `lista_descontos` são listas JSON.

### `solicitacoes_almoxarifado`

`id`, `created_at`, `matricula`, `nome_servidor`, `uorg`, `itens`, `status`

### `solicitacoes_frota`

`id`, `created_at`, `matricula`, `nome_servidor`, `destino`, `data_ida`, `motivo`, `status`, `lat_partida`, `lng_partida`

### `chamados_patrimonio`

`id`, `created_at`, `matricula`, `nome_servidor`, `uorg`, `tombamento`, `tipo_chamado`, `descricao`, `status`

### `oficios`

`id`, `created_at`, `numero`, `orgao`, `orgaoNome`, `assunto`, `vencimento`, `responsavel`, `tipo`, `status`

### `portal_sessoes`

`id`, `token_hash`, `matricula`, `cpf`, `nome`, `cargo`, `uorg_id`, `nivel_acesso`, `criado_em`, `expira_em`, `ultimo_uso_em`

O valor aberto do token nunca é gravado nessa tabela.

## Níveis de acesso

- `DIAMANTE`: consulta e operações de criação/edição no Gabinete.
- `OURO`: consulta dos módulos permitidos.

O CPF não é gravado nas tabelas operacionais. Depois do login, os registros são relacionados pela matrícula.
