# Amazon Fire

A harmonized fire calendar built from NASA FIRMS active fire detections (MODIS and VIIRS), November 2000 to 14 November 2026.

NASA Space Apps Challenge 2026, challenge **Harmonization of MODIS and VIIRS Hot Spots**.
Team Amazon Fire, Manaus, Brazil: Leonor Joana Ramos Oliveira, Cleidiana Manoel Alves, Cristiana do Nascimento Pedrosa and Josué Rique Oliveira Roberto.

**Live app:** [clei21.github.io/amazon-fire](https://clei21.github.io/amazon-fire/) · **Repository:** [github.com/Clei21/amazon-fire](https://github.com/Clei21/amazon-fire) · **Paper:** [AmazonFire_Article.pdf](docs/AmazonFire_Article.pdf)

## What it does

MODIS and VIIRS count fire very differently: VIIRS sees two to three times more fire in the same place and day, so a raw 26-year record jumps every time the sensor changes. Suomi NPP, the VIIRS reference, stopped sending data on 2 November 2026. Amazon Fire calibrates each satellite hand-off month by month, tests it on years the model never saw, and joins everything into one record.

With that record, anyone can pick an area (a ready-made region, a drawn rectangle or coordinates) and see:

- when the burning season usually starts, peaks and ends;
- where fire returns year after year (2D and 3D maps);
- how this year compares with a typical year (median 2003 to 2025);
- the test error of the harmonization for that area, with CSV downloads.

The app is one static web page (`index.html`), in Portuguese and English, with light and dark themes, usable on phones, by keyboard and with screen readers. It uses no external JavaScript libraries.

## Key results

**Manaus metropolitan area** (W −60.95, S −3.95, E −58.9, N −2.55)

- Typical season: 28 July to 2 December, peak on 24 October. In 2026 it started on 25 July.
- August to October 2026 was the 3rd most intense season since 2001 (2.87 times a typical year).
- 662 squares of about 4 km burned in 15 or more of the 26 years.
- Worst day of 2026: 9 October, with fire in 535 squares of 1 km.

**Brazil** (41.6 million detections)

- Typical national season: 27 July to 2 December, peak on 15 September.
- August to October 2026 was the quietest season since 2001 (0.51 times a typical year), while Manaus had its 3rd most intense. A national average hid a local crisis.

## Method

| Step | What happens |
|---|---|
| 1. Filter | MODIS confidence ≥ 30; VIIRS nominal or high; vegetation fires only (`type = 0`). Near real-time files have no `type`, so cells the archive marks as fixed heat sources (types 1 to 3, three or more times) and their neighbours are removed. |
| 2. Common unit | Each detection is placed on a 0.01° grid (about 1 km) and counted at most once per square, per day and per sensor. |
| 3. Calibrate | For each calendar month, ratio R_m = (ΣA_m + k·R) / (ΣB_m + k) over the months both sensors observed, with shrinkage toward the overall ratio R (k = 30). Three hand-offs: MODIS Terra only → Terra + Aqua; MODIS → VIIRS Suomi NPP; VIIRS NOAA-20 → Suomi NPP (applied after Suomi NPP stopped on 2 November 2026). |
| 4. Harmonize | Suomi NPP where it exists, NOAA-20 × ratio after it, MODIS × ratio before it. Unit: detections on the Suomi NPP scale. |
| 5. Validate | Leave-one-year-out: each year is removed from the calibration and predicted from the other sensor. |
| 6. Typical year | Median of 2003 to 2025 (complete years with both MODIS satellites). The month in progress is compared with the same days in earlier years. |

Validation (mean yearly error on held-out years):

| Hand-off | Manaus | Brazil |
|---|---|---|
| MODIS → VIIRS Suomi NPP | 8.0% (ratio 3.23) | 5.5% (ratio 2.39) |
| VIIRS NOAA-20 → Suomi NPP | 5.7% (ratio 0.98) | 2.1% (ratio 0.986) |
| MODIS Terra only → Terra + Aqua | 41% (lower confidence, flagged) | 7.7% |

## Repository contents

| Path | Purpose |
|---|---|
| `index.html` | The complete web app in one file, with the FIRMS data embedded. This is the file to publish. |
| `app/` | Source of the web app (`site.html`, `motor.js`, images, fonts). |
| `versao_slides/` | Visual layer of the published site (colors, fonts and the "Onde queimou" and "Brasil" sections) and the script that applies it. |
| `brazil/` | Processing of the Brazil-wide data and the embedded summary. |
| `harmonizar.py` | Harmonization engine in Python: monthly series, calibration ratios, validation and a calendar figure. |
| `construir_app.py` | Builds `index.html` from `app/` and embeds a set of FIRMS CSV files. |
| `baixar_firms.py` | Optional downloader for the FIRMS API (needs a free MAP_KEY). |
| `dados/` | NASA FIRMS files used (archive and near real-time; MODIS C6.1, VIIRS Suomi NPP, VIIRS NOAA-20). |
| `resultados_manaus/`, `resultados_area_total/` | Outputs of `harmonizar.py` for the Manaus metropolitan area and for the whole downloaded area. |
| `docs/` | Full article ([`AmazonFire_Article.pdf`](docs/AmazonFire_Article.pdf), 15 pages). |
| `dados_demo/` | Synthetic data in the FIRMS format, used to test the pipeline (`python3 harmonizar.py --demo dados_demo`). |

## How to run

Open `index.html` in a browser (Chrome, Edge or Firefox). No installation is needed.

To recompute the results:

```bash
pip install pandas numpy matplotlib

# whole downloaded area
python3 harmonizar.py --modis "dados/*M-C61*.csv" --viirs "dados/*SV-C2*.csv" "dados/*J1V-C2*.csv" --saida resultados_area_total --figura

# one area (note the "=" before negative numbers)
python3 harmonizar.py --modis "dados/*M-C61*.csv" --viirs "dados/*SV-C2*.csv" "dados/*J1V-C2*.csv" --bbox=-60.95,-3.95,-58.9,-2.55 --saida resultados_manaus --figura
```

To rebuild the web app: run `construir_app.py` with the data (see `python3 construir_app.py --help`), then `python3 versao_slides/aplicar_tema.py <project folder> <output folder>` to apply the visual layer. The Brazil section needs the raw FIRMS country files (about 3.4 GB, not included): `brazil/proc.py`, `brazil/aggregate.py`, `brazil/build_embed.py`.

Data for another area can be requested at https://firms.modaps.eosdis.nasa.gov/download/ (MODIS, VIIRS S-NPP and VIIRS NOAA-20, CSV) and loaded directly in the page.

**Publish:** upload the repository to GitHub and enable *Settings → Pages* (branch `main`, folder `/`). The `.nojekyll` file is already included.

## Data and credits

- NASA FIRMS, Fire Information for Resource Management System: https://firms.modaps.eosdis.nasa.gov/ (MODIS Collection 6.1; VIIRS 375 m from Suomi NPP and NOAA-20).
- Satellite images: NASA Worldview and GIBS (https://worldview.earthdata.nasa.gov/).
- Basemaps: Esri, HERE, Garmin, © OpenStreetMap contributors; satellite basemap: Esri, Maxar, Earthstar Geographics.
- Python libraries: pandas, NumPy, Matplotlib.

This project uses NASA open data but is not an official NASA product.

## Use of AI

The team used Claude (Anthropic) and ChatGPT (OpenAI) as assistants. They helped write and review the code of the application and of the data processing, produce the charts, and draft and revise the texts. The choice of the problem, the decisions about the method and about what goes into the system, the review of the code and the checking of every number against the data were done by the team, which takes responsibility for the content and the conclusions.

## Limitations

Active fire detections show fire at the moment a satellite passes; they are not burned area and do not measure smoke. Clouds and dense smoke can hide fires. Before August 2002 only the Terra satellite observed (morning pass), so those months carry high uncertainty and are flagged. In extreme drought years fires are larger and the VIIRS/MODIS ratio tends to be lower, so harmonized MODIS years may be slightly overestimated. Areas are rectangles, not municipal or state borders.

## Resumo em português

O Amazon Fire junta os focos de calor dos satélites MODIS e VIIRS do NASA FIRMS num registro único de 2000 a 2026. Cada troca de satélite é calibrada mês a mês e testada em anos que o modelo não viu (erro anual de 2% a 8% nas trocas MODIS e NOAA-20). Com esse registro, qualquer pessoa escolhe uma área do Brasil (região, desenho ou coordenadas) e vê quando a temporada de queimadas começa, chega ao pico e termina, onde o fogo volta todo ano e como este ano se compara com o passado. Em 2026, o Brasil teve a temporada mais fraca desde 2001, enquanto a região de Manaus teve a 3ª mais intensa. Para usar, abra o `index.html` no navegador.

## License

MIT, see `LICENSE`.
