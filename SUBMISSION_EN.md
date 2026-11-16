# Amazonia Fire

**NASA Space Apps Challenge 2026 · Harmonization of MODIS and VIIRS Hot Spots**

## The problem

More than two decades of satellite-detected active fire hotspots form a valuable record, but MODIS and VIIRS have different spatial resolutions, sensitivity and observation schedules. Comparing their raw counts creates misleading discontinuities.

## Our solution

Amazonia Fire is an interactive website that constructs a harmonized active-fire time series from NASA FIRMS detections and presents it as a calendar, a map and historical comparison charts. A viewer can select or draw an area of interest, enter coordinates, choose dates, inspect hotspots and export raw detections and harmonized summaries. Manaus and Central Amazon are the initial case study; users can import FIRMS CSVs for other regions.

The harmonization lab offers a direct before/after comparison of raw MODIS and VIIRS counts versus MODIS counts calibrated to the VIIRS reference scale. Diagnostics report area-specific calibration ratios and leave-one-year-out validation.

## Method and evidence

- Keep reliable active fire detections and mask persistent fixed heat sources identified in archival records.
- Map detections to a common **0.01-degree** geographic grid and count unique active-fire cell-days by sensor.
- Estimate a monthly MODIS → VIIRS Suomi NPP conversion using overlapping observations, with shrinkage toward the overall ratio; account separately for the early Terra-only period and NOAA-20 continuity.
- Reproduce a historical median from complete 2003–2025 years, compare monthly activity to the same months in previous years, and indicate anomalous conditions.
- Validate by withholding an entire year, recalibrating on the rest, and predicting the withheld year.

**Manaus case study (bbox W -60.95, S -3.95, E -58.9, N -2.55):** MODIS-to-Suomi NPP overlap ratio **3.234×**; leave-one-year-out mean annual percentage error **8.0%** for 2013–2025. The NOAA-20 continuation has a **0.985×** ratio and **5.7%** annual error for 2019–2025. The early Terra-only period is much less certain, with a **41.0%** validation error, and is explicitly flagged.

## What visitors can do

- Explore daily, monthly or circular fire calendars since the early 2000s.
- Switch among study areas, draw a box or enter coordinates to select an area.
- Examine spatial detections and satellite imagery, and restrict map/exports by date range.
- Compare years on a single harmonized scale and inspect anomalies relative to a historical median.
- Download hotspot CSV, daily time series, full historical monthly time series, monthly calibration ratios and a self-contained SVG chart.
- Inspect detailed sensor hand-offs, model validation and caveats; switch the interface between Portuguese and English.

## Boundaries and uncertainty

The packaged observations currently cover **Central Amazon only**. A user-upload workflow supports additional areas, but the site does not automatically provide global historical coverage. Imported CSVs require valid MODIS and VIIRS observations and sufficient overlap for meaningful calibration. The spatial region tool uses bounding boxes, not municipal administrative boundaries. Active fire hotspots are **not burned-area measurements**. Clouds, smoke, sensor overpass schedules, differences in detection sensitivity and the earliest Terra-only period limit comparability. Overlap-calibrated visual charts are descriptive; the separate withheld-year tests are the validation evidence.

## Provenance

NASA FIRMS MODIS Collection 6.1 and VIIRS C2 archive and NRT CSVs, plus imagery from NASA Worldview/GIBS. The original records and the Python/JavaScript code are supplied in the repository for reproducibility. This project is independent and is not endorsed by NASA.

**Team (Manaus, Brazil):** Leonor Joana Ramos Oliveira · Cleidiana Manoel Alves · Cristiana do Nascimento Pedrosa · Josué Rique Oliveira Roberto.

*Insert the published application URL, repository URL, demo video and any NASA Space Apps required attribution/disclosure before submission.*
