// Source excerpt from getsentry/sentry static/app/views/detectors/components/details/metric/chart.tsx@4cab626b98ac3df88b0dd9c90161e43c806388b7.
// Unrelated context omitted; captured around the fix diff for b7d3f6c151fc77018e06d9205138a6234ab53f11.

function incidentMarklineTooltip(ctx: IncidentTooltipContext) {
  const time = defaultFormatAxisLabel(ctx.period.start, true, false, true, false);
  const color =
    ctx.period.priority === 'high' ? ctx.theme.colors.red400 : ctx.theme.colors.yellow400;
  const priorityLabel = ctx.period.priority === 'high' ? t('Critical') : t('Warning');
  const priorityDot = `<span style="display:inline-block;width:10px;height:8px;border-radius:100%;background:${color};margin-right:6px;vertical-align:middle;"></span>`;
  return [
    '<div class="tooltip-series">',
    `<div><span class="tooltip-label"><strong>${t('#%s Triggered', ctx.period.id)}</strong></span></div>`,
    `<div><span class="tooltip-label">${t('Started')}</span> ${time}</div>`,
    `<div><span class="tooltip-label">${t('Priority')}</span> ${priorityDot} ${priorityLabel}</div>`,
    '</div>',
    '<div class="tooltip-arrow arrow-top"></div>',
  ].join('');
}

interface MetricDetectorDetailsChartProps {
  detector: MetricDetector;
  // Passing snubaQuery separately to avoid checking null in all places
  snubaQuery: SnubaQuery;
}
const CHART_HEIGHT = 180;

interface UseMetricDetectorChartProps {
  detector: MetricDetector;
  openPeriods: GroupOpenPeriod[];
  /**
   * Relative time period (e.g., '7d'). Use either statsPeriod or absolute start/end.
   */
  end?: string | null;
  height?: number;
  /**
   * Display a persistent highlight area for the open period with the given ID.
   */
  highlightedOpenPeriodId?: string;
  start?: string | null;
  statsPeriod?: string | null;
}

function createTriggerIntervalMarkerData({
  period,
  intervalMs,
}: {
  intervalMs: number;
  period: GroupOpenPeriod;
}): IncidentPeriod {
  return {
    id: period.id,
    end: new Date(period.start).getTime(),
    priority: period.activities[0]?.value ?? 'high',
    start: new Date(period.start).getTime() - intervalMs,

// ... source context omitted ...

    name: t('Open Periods'),
    priority: segment.priority ?? 'high',
    start: segment.start,
  }));
}

type UseMetricDetectorChartResult =
  | {
      chartProps: AreaChartProps;
      error: null;
      isAnomalyThresholdCutOff: boolean;
      isLoading: false;
    }
  | {chartProps: null; error: null; isAnomalyThresholdCutOff: false; isLoading: true}
  | {
      chartProps: null;
      error: RequestError;
      isAnomalyThresholdCutOff: false;
      isLoading: false;
    };

export function useMetricDetectorChart({
  statsPeriod,
  start,
  end,
  detector,
  openPeriods,
  highlightedOpenPeriodId,
  height = CHART_HEIGHT,
}: UseMetricDetectorChartProps): UseMetricDetectorChartResult {
  const navigate = useNavigate();
  const location = useLocation();

  const detectionType = detector.config.detectionType;
  const comparisonDelta =
    detectionType === 'percent' ? detector.config.comparisonDelta : undefined;
  const snubaQuery = detector.dataSources[0].queryObj.snubaQuery;
  const dataset = getDetectorDataset(snubaQuery.dataset, snubaQuery.eventTypes);
  const datasetConfig = getDatasetConfig(dataset);
  const aggregate = datasetConfig.fromApiAggregate(snubaQuery.aggregate);
  const {series, comparisonSeries, isLoading, error} = useMetricDetectorSeries({
    detectorDataset: dataset,
    dataset: snubaQuery.dataset,
    extrapolationMode: snubaQuery.extrapolationMode,
    aggregate,
    interval: snubaQuery.timeWindow,
    query: datasetConfig.toSnubaQueryString(snubaQuery),
    environment: snubaQuery.environment,
    projectId: detector.projectId,
    eventTypes: snubaQuery.eventTypes,
    comparisonDelta,
    statsPeriod,
    start,
    end,
  });

  const metricTimestamps = useMetricTimestamps(series);

  const {maxValue: thresholdMaxValue, additionalSeries: thresholdAdditionalSeries} =
    useMetricDetectorThresholdSeries({
      aggregate,
      conditions: detector.conditionGroup?.conditions,
      detectionType,
      comparisonSeries,
    });

  const {anomalyThresholdSeries} = useMetricDetectorAnomalyThresholds({
    detectorId: detector.id,
    detectionType,
    startTimestamp: metricTimestamps.start,
    endTimestamp: metricTimestamps.end,
    series,
  });

  const filteredAnomalyThresholdSeries = useFilteredAnomalyThresholdSeries({
    anomalyThresholdSeries,
    detector,
  });
