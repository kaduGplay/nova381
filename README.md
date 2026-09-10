# Nova 381 — reconstrução em TypeScript

Reconstrução do frontend de https://pedagioeletronico.nova381.com/inicio com **TypeScript estrito e Vite**, sem depender do JavaScript compilado do Angular. As imagens e fontes já recuperadas foram reaproveitadas. O conteúdo renderizado do portal foi convertido em templates HTML separados e formatados, com estilos recuperados e interações reimplementadas em TypeScript.

## Executar

Requer Node.js 22.12+ ou 24.

```sh
npm ci
npm run dev
```

Abra http://localhost:5173/inicio.

```sh
npm run build     # Valida TypeScript e gera dist/
npm run preview   # Serve a versão de produção
npm test          # Testes de navegador e comparação visual
```

Para testes em outra máquina, instale o navegador com `npx playwright install chromium`. As referências visuais foram capturadas no Chromium/macOS; a renderização de fontes pode variar em outros sistemas.

## O que funciona

- Página inicial com imagens, fontes, medidas e comportamento responsivo recuperados do original.
- Formulário com normalização da placa, padrões brasileiro antigo/Mercosul, placa estrangeira e aceite obrigatório dos termos; funciona também com Enter.
- No modo padrão, consulta encaminhada à tela acadêmica local: três passagens fictícias de R$ 16,20, totalizando R$ 48,60, identificadas como demonstração e sem pagamento.
- Login e cadastro abrem o aplicativo web original, como no site de referência.
- Menu móvel, navegação e histórico do navegador.
- Página de dúvidas com todas as perguntas e respostas recuperadas, expansão por clique e teclado.
- Links de contestação, lojas de aplicativos, redes sociais e emissão de NFS-e.
- Página informativa de isenção e download local do documento; o formulário autenticado abre no portal original.

## Limite da reconstrução e integração

**O backend, banco de débitos, credenciais e processamento de pagamentos não estão nos arquivos recuperados.** Esta entrega não recria esses serviços nem inventa resultados, cobranças ou confirmações de pagamento.

No modo padrão (`VITE_SEARCH_MODE=demo`), após a validação, a consulta abre a segunda tela local com a placa informada. Os três registros são sempre fictícios: não existe consulta de débitos, vencimento, multa nem geração de pagamento. O modo `official`, selecionado explicitamente na configuração, encaminha a consulta ao portal original. Cadastro/login, isenções autenticadas, ativação de conta e pagamento continuam nos serviços originais. Portanto, o frontend está reconstruído, mas a operação financeira não é independente do portal existente.

Há um adaptador TypeScript para o endpoint de consulta identificado no JavaScript público. Para executar a consulta dentro da aplicação local:

1. Copie `.env.example` para `.env.local`.
2. Configure `VITE_SEARCH_MODE=api`.
3. Configure `VITE_API_URL` e uma `VITE_RECAPTCHA_SITE_KEY` válida para o domínio local/de produção.
4. Autorize a origem no CORS do backend e reinicie o servidor.

O adaptador implementa reCAPTCHA, limite de tempo, cancelamento, tratamento de erro e validação da resposta. Os testes desse adaptador usam respostas interceptadas; **a integração real não foi homologada**, pois não foi fornecido acesso à configuração dos serviços. No modo API, o pagamento ainda é encaminhado ao portal original. Não há formulário local de cartão nem criação local de Pix.

O endereço de NFS-e foi preservado tal como fornecido pelo site original, inclusive protocolo e porta.

## Onde editar

| Arquivo/pasta                     | Responsabilidade                                                   |
| --------------------------------- | ------------------------------------------------------------------ |
| `src/main.ts`                     | Navegação, eventos, menu, formulário, FAQ e consulta               |
| `src/demo-tickets.ts` | Segunda tela acadêmica com passagens fictícias e sem pagamento |
| `src/plate.ts`                    | Normalização e validação de placas                                 |
| `src/config.ts`                   | Endereços e configurações públicas                                 |
| `src/services/tickets.ts`         | Adaptador da API de consulta e reCAPTCHA                           |
| `src/templates/`                  | HTML editável de cada seção e página                               |
| `src/templates.ts`                | Composição das páginas                                             |
| `src/styles/recovered.css`        | Estilos recuperados do site, com nomes legíveis de escopo          |
| `src/styles/app.css`              | Ajustes de comportamento e acessibilidade                          |
| `public/assets/`, `public/media/` | Imagens, fontes e documento de isenção                             |
| `clone/`                          | Arquivos anteriores preservados; não são usados pela aplicação     |
| `reference/`                      | Capturas do original, versão local e relatório de diferenças       |
| `tests/`                          | Testes de interface, integração interceptada e referências visuais |

Os atributos `data-s-*` dos templates mantêm o isolamento dos estilos recuperados. Classes `mat-*` preservam a apresentação original, mas não requerem Angular ou Angular Material em execução.

## Verificação visual

A captura da página inicial original foi comparada pixel a pixel com a versão local em:

- Desktop: viewport 1440 × 1000, captura completa 1440 × 4219.
- Celular: viewport 390 × 844, captura completa 390 × 4969.

Resultado: **zero pixels diferentes nas duas capturas**, no mesmo navegador/ambiente, para o estado inicial da página. O relatório está em `reference/visual-comparison.json`. Isso não comprova identidade de todos os estados, outras resoluções ou serviços de backend.

## Publicação

Publique o conteúdo de `dist/` em hospedagem estática e configure fallback das rotas para `/index.html`. As variáveis `VITE_*` são públicas e incorporadas no build; nunca coloque senhas ou segredos nelas. Há exemplos de fallback em `public/_redirects` e `vercel.json`. Nenhuma publicação foi realizada.

## Dados do veículo pela placa

A tela de passagens consulta `GET /api/vehicles/:plate` e mostra marca, modelo,
ano de fabricação/modelo e cor acima das passagens. São informações cadastrais;
os três exemplos de pedágio continuam fictícios e não são derivados dessa consulta.

O adaptador usa a [Falcon Data Hub](https://datahub.falcon-server.com.br/docs),
cuja documentação informa plano gratuito de 10 requisições por hora. É necessário
[cadastrar uma conta gratuita](https://datahub.falcon-server.com.br/register) e
obter o token. A disponibilidade real e a cobertura de placas precisam ser
validadas com essa conta; a integração foi testada com respostas controladas.
A referência técnica lista `/private/v1/vehicles/{placa}/search` sob
`https://beta.falcon-server.com.br/data-hub`; esse é o endereço usado pelo adaptador.

Configure somente no arquivo `.env.local` na raiz:

```dotenv
VEHICLE_API_TOKEN=seu_token_da_falcon
```

Reinicie `npm run dev`. A API de veículos roda junto com o Vite: não é necessário
iniciar o backend de pagamentos para essa consulta. O `npm run preview` também
inclui essa API local. Nunca use `VITE_VEHICLE_API_TOKEN`: tokens não podem ir para
o navegador. Sem token, a tela informa que a consulta ainda não foi configurada.
Não são usados dados inventados como resultado da API.

O servidor filtra o retorno para os campos exibidos, confirma a placa retornada,
limita a dez chamadas por hora por processo, compartilha consultas simultâneas e
mantém resultados por uma hora em memória para economizar a cota gratuita.
Erros também consomem o limite local; não há troca automática para plano pago.
O limite total da conta continua sendo aplicado pelo provedor. CPF, proprietário,
chassi e outros campos não são encaminhados ao frontend.

Em uma publicação, é necessário um servidor Node para essa rota (ou backend
compatível); publicar apenas `dist/` em hospedagem estática não disponibiliza a
API. O servidor `npm start` já inclui a rota. Para servir também os arquivos de
`dist`, configure `SERVE_DIST=true`; o processo escuta localmente na porta 3001
(`API_PORT`), para uso atrás de um proxy. Requer Node.js 24+.

Validação: `npm run test:server` e `npx playwright test tests/vehicles.spec.ts`.

### Publicar a consulta na Vercel

A função `api/vehicles/[plate].js` atende `/api/vehicles/:plate` na Vercel,
reutilizando o mesmo adaptador do desenvolvimento local. Use o preset **Vite**,
com build `npm run build` e saída `dist`.

Em **Settings → Environment Variables**, adicione `VEHICLE_API_TOKEN` com o token
Falcon, habilitado para **Production** (e **Preview**, se necessário). A chave
local em `.env.local` não é enviada pelo Git e não configura a Vercel. Depois de
salvar a variável, faça **Redeploy**. Um HTTP 503 com `NOT_CONFIGURED` indica que
ela não está disponível naquele deployment; um 404 indica que a função não foi
publicada. A rota com `/api/vehicles/INVALID` deve retornar HTTP 400, sem consumir
uma consulta no provedor.

O cache e o limite local são por instância da função, não globais entre instâncias
serverless. O provedor continua responsável pela cota total da conta.

O campo da placa solicita teclado de texto com capitalização e aceita números;
o sistema operacional determina a disposição das teclas. O vídeo institucional
inicia sem som e dentro da página; se o navegador bloquear autoplay (por exemplo,
por economia de energia), há um botão para iniciar a reprodução.
