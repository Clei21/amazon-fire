# Amazonia Fire — versão com a identidade dos slides

**Para ver o site:** abra o `index.html` da pasta principal no navegador (Chrome ou Edge). É ele que deve ser publicado.

## O que mudou em relação à versão anterior
- Visual com as cores e fontes dos slides (cacau, telha, laranja; League Spartan e Lato).
- Seções "Onde queimou" e "E no Brasil inteiro?" reorganizadas: mapa abre em 2D, ranking com marcadores numerados, gráfico mensal como seletor de mês, mini gráficos Brasil × Manaus, legendas com valores.
- "Focos detectados" (todos os satélites, 10.297 em out/2026) e "focos harmonizados" (quadrados de ~1 km por dia na escala do VIIRS, 2.474) agora aparecem rotulados.
- Mesma escala de "anos com fogo" no site todo.
- Os cálculos não mudaram; só a apresentação.

## Pasta `versao_slides/`
- `tema_slides.css` — cores, fontes e estilo geral.
- `brasil_fonte/` — seção "E no Brasil inteiro?" (HTML, CSS e script).
- `onde_queimou/` — seção "Onde queimou" (HTML, CSS, script e as trocas pontuais).
- `aplicar_tema.py` — gera o `index.html` novo a partir do projeto ORIGINAL (o zip antes destas mudanças):
  `python versao_slides/aplicar_tema.py <pasta_do_projeto_original> <pasta_de_saida>`

Os arquivos de `app/` e `brazil/` são os originais. Se o `index.html` for gerado de novo com `construir_app.py`, as mudanças visuais se perdem; rode depois o `aplicar_tema.py`.
