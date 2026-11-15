# Amazon Fire Calendar — guia da equipe

**Desafio:** Harmonization of MODIS and VIIRS Hot Spots · NASA Space Apps Challenge 2026  
**Estudo de caso:** Região Metropolitana de Manaus e Amazônia Central  
**Missão:** construir um calendário interativo com uma série temporal consistente de focos de calor ativos, integrando MODIS e VIIRS.

## Como abrir e apresentar

Abra `index.html` no navegador. O arquivo já inclui as observações da NASA da Amazônia Central; não é preciso instalar Python para visitar a aplicação. Uma conexão à internet pode ser necessária para os mapas-base e serviços de imagens externos. O mapa usa uma visualização alternativa quando o mapa-base não está disponível.

### Demonstração recomendada (2–3 minutos)

1. **Problema (20 s):** na primeira tela, explique que os sensores MODIS e VIIRS têm resoluções e sensibilidades diferentes; por isso, suas contagens brutas não são comparáveis diretamente.
2. **Harmonização (50 s):** abra o laboratório. Use o ano de 2023 e alterne “Dados originais” / “Dados ajustados”. Mostre o fator de 3,23× na região de Manaus e os 8,0% de erro anual médio na validação deixando um ano de fora.
3. **Calendário (40 s):** mostre os padrões por dia ou mês. Selecione 2010 e 2023 na comparação e comente que os números usam a mesma escala harmonizada. No mapa, alterne a área selecionada e clique em um mês.
4. **Resposta a uma pergunta (30 s):** selecione um período nas datas, destaque os focos desse período no mapa e baixe o CSV de detecções ou a série diária. Abra a metodologia detalhada se perguntarem sobre os testes.
5. **Limitações (20 s):** explique que focos ativos não medem área queimada, que nuvens podem ocultar fogo e que a série mais antiga (somente Terra) tem maior incerteza.

## Requisitos do desafio e onde estão

| Exigência do enunciado | Implementação nesta versão |
|---|---|
| Harmonizar MODIS e VIIRS | Grade comum de 0,01°, filtro de qualidade, razões de conversão mensais e continuidade NOAA-20 |
| Comparar padrões e anomalias históricos | Calendário diário e mensal, mediana de anos completos, faixa habitual e comparador de dois anos |
| Selecionar região | Regiões na Amazônia Central, desenho de retângulo no mapa, lat/lon e raio, importação de novos arquivos FIRMS |
| Selecionar período | Datas inicial/final para mapa, detecções e exportação diária; seleção de dia/mês no calendário |
| Fazer download de dados e visualizações | CSV de focos, série diária, série mensal, fatores mensais de calibração e SVG do gráfico MODIS × VIIRS |
| Documentar confiança e validação | Testes deixando um ano de fora, tabelas de razões, erros e limitações explícitas |

**Importante:** o filtro de datas atua no mapa, no CSV de focos e no CSV diário. O calendário plurianual e a série mensal continuam representando o histórico completo para permitir comparações de longo prazo. Essa escolha é explicada ao lado do filtro.

## O que mostram estes CSVs

Os três ZIPs recebidos nesta etapa são os mesmos arquivos FIRMS já presentes na versão original. Não representam novos países. Seus dados abrangem aproximadamente **longitude -62 a -57,5 e latitude -5 a -1,5**, na Amazônia Central. Foram lidas **365.885 detecções**:

- MODIS C6.1, Terra/Aqua: **70.137 registros**.
- VIIRS Suomi NPP C2: **182.131 registros**.
- VIIRS NOAA-20 C2: **113.617 registros**.

Para o recorte de Manaus utilizado na calibração, 151.618 registros permaneceram após os filtros de qualidade e área. O fator geral MODIS → Suomi NPP foi **3,234×**, com **erro anual médio de 8,0%** no teste deixando um ano de fora (2013–2025). A continuidade NOAA-20 → Suomi NPP apresentou razão **0,985×** e erro médio de **5,7%** (2019–2025). A correção especial do período somente Terra apresentou erro **41,0%** e deve ser apresentada como estimativa de confiança menor.

Esses números foram reproduzidos pelo `harmonizar.py` e são **específicos da região e dos arquivos enviados**, não fatores universais. Uma nova região pode exigir nova calibração.

## Como baixar arquivos para outro país

Na solicitação de download do NASA FIRMS:

1. **Selecione uma região ou país específico** para o teste; evite começar por *World*, que pode gerar volumes muito grandes.
2. Selecione **MODIS**, **VIIRS S-NPP** e **VIIRS NOAA-20**. A versão atual usa esses três grupos. NOAA-21 não está integrado ao motor de harmonização atual.
3. Escolha um intervalo histórico que inclua os anos de sobreposição entre MODIS e VIIRS. Quando for necessário cobrir o período mais recente, inclua também os arquivos NRT correspondentes.
4. **Escolha CSV**, não *Shapefile (.shp)*. A aplicação recebe CSVs FIRMS, não ZIPs SHP diretamente.
5. Mantenha os mesmos limites geográficos ao pedir cada sensor. Anote longitude oeste/leste, latitude sul/norte, datas e origem dos arquivos.
6. No site, selecione **Carregar outros arquivos do FIRMS**, escolha os arquivos CSV (extraídos dos ZIPs) e confira a nova área no mapa e o diagnóstico de calibração.

Para uma demonstração multi-regional, recomendamos adicionar uma região brasileira de outro bioma e depois uma região fora do Brasil. Use **dados reais**, com período suficiente para validar os ajustes. Dados de outra região não devem ser tratados como se estivessem cobertos pela base de Manaus.

## Próximas melhorias com maior impacto

1. Processamento em servidor e dados históricos por região ou blocos geográficos, para consulta mundial sem inserir centenas de milhões de linhas no HTML.
2. Pipeline de testes automatizados comparando os resultados do motor Python com os do navegador em diferentes áreas e sensores.
3. Indicadores de incerteza por mês/região, sensibilidade aos filtros, comparação por horários de passagem e testes adicionais de calibração.
4. Integração e avaliação explícita de NOAA-21, com regras de transição próprias, caso sejam incorporados arquivos desse sensor.
5. Documentação pública do método e exemplos replicáveis para mais de uma região com dados originais disponibilizados e citados.

## Publicar

O `index.html` é autossuficiente no que se refere aos registros incorporados e pode ser hospedado como site estático. Para GitHub Pages, envie a pasta do projeto para o repositório, deixe `index.html` na raiz e ative **Settings → Pages**. Faça a apresentação usando o endereço publicado e tenha uma cópia local de reserva.

Antes da submissão, confira a acessibilidade dos mapas-base no local da apresentação, revise as fontes das imagens, verifique eventuais regras de divulgação de uso de IA, confirme o link público do repositório e cheque os acontecimentos recentes mencionados no site e no README. Nenhum resultado é garantia de premiação.

## Verificação

Rode, na raiz do projeto:

```bash
pip install pandas numpy matplotlib playwright
python harmonizar.py --modis 'dados/*M-C61*.csv' --viirs 'dados/*SV-C2*.csv' 'dados/*J1V-C2*.csv' --bbox=-60.95,-3.95,-58.9,-2.55 --saida verificacao_manaus
```

O teste de navegação automatizado utilizado na revisão está em `tests/test_ui.py`, e a importação de outra região sintética está em `tests/test_import.py` (ambos precisam do Playwright e Chromium instalados). A base sintética é somente de teste e nunca deve ser apresentada como observação da NASA.

**Fonte:** NASA FIRMS, https://firms.modaps.eosdis.nasa.gov/  
**Créditos:** NASA Worldview/GIBS; dados NASA FIRMS; mapas conforme os créditos exibidos na aplicação. O projeto não representa nem é endossado pela NASA.
