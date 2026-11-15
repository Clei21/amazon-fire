# Expansão do Amazon Fire Calendar — roteiro para a equipe

## Decisão de produto

**Manaus é o estudo de caso principal, não o limite geográfico do método.** O site publicado inclui os dados históricos de uma caixa na Amazônia Central. O usuário pode selecionar subáreas, desenhar uma caixa, inserir coordenadas e carregar arquivos CSV adicionais da NASA FIRMS. Isso **não** significa que há dados globais embutidos ou que a plataforma fornece uma análise mundial automática.

## O que testar antes da competição

1. Manaus/Amazônia Central (já incluída): mostrar a climatologia, o calendário, anomalias de 2026, os dados no mapa e os erros de validação.
2. Outra região brasileira, por exemplo no Cerrado: obter arquivos **MODIS, VIIRS S-NPP e NOAA-20** para a mesma caixa geográfica e um intervalo histórico adequado. Comparar razões de calibração e validação com Manaus.
3. Uma terceira região com sazonalidade distinta, por exemplo Califórnia: repetir todo o processo e observar se o método continua útil ou precisa ser refinado. Não comparar apenas contagens brutas entre regiões de tamanhos diferentes.

## Como preparar outra região sem fingir que o site é global

- Obter no **NASA FIRMS Archive Download** os arquivos históricos (não apenas os registros quase em tempo real), filtrados para uma área delimitada, separando MODIS e VIIRS.
- Salvar os arquivos CSV em uma pasta separada por região, **sem misturar arquivos com coberturas diferentes ou períodos incompletos**.
- Rodar `harmonizar.py` com `--bbox=oeste,sul,leste,norte`, guardar série, calibração e validação.
- Abrir o site e usar **Carregar outros arquivos do FIRMS** com os três conjuntos de CSVs; ou gerar uma versão regional do HTML com o `construir_app.py`, informando `--cobertura=oeste,sul,leste,norte`.
- Conferir a cobertura temporal de cada sensor, a disponibilidade de anos completos e o significado de zeros versus ausência de dados.

Exemplo de comandos para uma caixa REGIONAL a substituir pelos limites reais da solicitação FIRMS:

```bash
python harmonizar.py --modis 'novos_dados/*MODIS*.csv' --viirs 'novos_dados/*VIIRS*.csv' \
  --bbox=-60.95,-3.95,-58.9,-2.55 --saida resultados_teste

python construir_app.py --modis 'novos_dados/*MODIS*.csv' --viirs 'novos_dados/*VIIRS*.csv' \
  --real --cobertura=-60.95,-3.95,-58.9,-2.55 --saida teste_regiao.html
```

**Atenção:** os nomes reais de arquivos FIRMS não seguem obrigatoriamente os padrões `*MODIS*` e `*VIIRS*`. Ajustar os padrões dos comandos aos arquivos baixados. `--bbox` e `--cobertura` são retângulos geográficos, **não** limites administrativos de municípios/países. Importar CSVs manualmente não prova cobertura total de uma área se o arquivo não informar os limites originais da consulta.

## Quando expandir de fato para todos os países

O `index.html` atual embute as detecções em um HTML autossuficiente (quase 10 MB apenas para a base incluída). **Não embutir o planeta inteiro no mesmo HTML.** Para uma versão mundial, separar:

- **Armazenamento:** arquivos históricos regionais ou banco espacial, com partições por região, sensor e ano.
- **Backend:** recorte espacial por caixa/polígono, filtro de datas, controle de acesso e cache. Para a referência histórica, estimar/calibrar MODIS ↔ VIIRS **na área selecionada**, identificando períodos sem sobreposição suficiente.
- **Frontend:** mapa mundial, busca por região/país, seleção livre de área e período; requerer ao servidor apenas os agregados mensais/dia e os pontos do período selecionado.
- **Precisão:** ao carregar um país, computar contagens e metadados da cobertura real, não reutilizar indiscriminadamente os fatores de calibração da Amazônia Central.
- **Reprodutibilidade:** testes automáticos Python/JavaScript, logs de versões FIRMS, metodologia escrita, análise de incertezas e distinção entre detecções de fogo e área queimada.

## Demonstração para os jurados

1. Mostre os **dados brutos MODIS e VIIRS** e o salto artificial entre sensores.
2. Ative a **série harmonizada** e apresente as razões mensais e o teste deixando um ano de fora.
3. Explore o **calendário**, escolha período, desenhe uma área e exporte CSV.
4. Abra a segunda região, já processada, para demonstrar transferibilidade da metodologia. Deixe claro que o protótipo atual depende dos CSVs carregados e não fornece cobertura mundial instantânea.

## Revisão de qualidade antes da submissão

- [ ] Conferir as referências a decretos e alterações de disponibilidade de satélites em fonte oficial.
- [ ] Conferir resultados do motor JavaScript contra o Python em mais de uma região.
- [ ] Explicar que as células em grade de 0,01° não são área efetivamente queimada.
- [ ] Medir acessibilidade, desempenho móvel e funcionamento das exportações.
- [ ] Publicar repositório, instruções de execução, fontes de dados e vídeo demonstrativo.
