// Source excerpt from getsentry/sentry static/app/views/dashboards/widgetCard/visualizationWidget.tsx@f945e1ccefd3349392bbc6b7fc4aa9da4d3decc8.
// Unrelated context omitted; captured around the fix diff for de65182e8c3491930779dd88522ea04ee9633314.

}: VisualizationWidgetContentProps) {
  const theme = useTheme();
  const organization = useOrganization();
  const location = useLocation();
  const {selection} = usePageFilters();

  const firstWidgetQuery = widget.queries[0];
  const aggregates = firstWidgetQuery?.aggregates ?? []; // All widget queries have the same aggregates
  const columns = firstWidgetQuery?.columns ?? []; // All widget queries have the same columns

  const timeSeriesWithPlottable: Array<[TimeSeries, Plottable]> = timeseriesResults
    .map(series => {
      const seriesName = series.seriesName ?? aggregates[0] ?? '';
      const splitSeriesName = seriesName.split(SERIES_NAME_PART_DELIMITER);

      const yAxis =
        aggregates.find(aggregate => splitSeriesName.includes(aggregate)) ??
        aggregates[0];

      const alias =
        widget?.queries.find(({name}) => name && splitSeriesName.includes(name))?.name ||
        undefined;

      const timeSeries = transformLegacySeriesToTimeSeries(
        series,
        timeseriesResultsTypes,
        timeseriesResultsUnits,
        columns,
        yAxis,
        alias
      );

      if (!timeSeries) {
        return null;
      }

      const labelParts = [alias, formatTimeSeriesLabel(timeSeries)];
      // If there are multiple aggregates and columns, add the yAxis to the label for uniqueness
      if (aggregates.length > 1 && columns.length > 1) {
        labelParts.push(timeSeries.yAxis);
      }
      const plottable = createPlottableFromTimeSeries(
        timeSeries,
        widget,
        labelParts.filter(defined).join(SERIES_NAME_PART_DELIMITER),
        seriesName
      );
      if (!plottable) {
        return null;
      }
      return [timeSeries, plottable] satisfies [TimeSeries, Plottable];
    })
    .filter(defined);

  const errorDisplay =
    renderErrorMessage && errorMessage ? renderErrorMessage(errorMessage) : null;

  const plottableWithNeedsColor = timeSeriesWithPlottable.filter(
    ([_, plottable]) => plottable.needsColor
  ).length;

  const colorPalette =
    plottableWithNeedsColor > 0
      ? theme.chart.getColorPalette(plottableWithNeedsColor - 1)
      : [];

  const showBreakdownData =
    widget.legendType === 'breakdown' &&
    usesTimeSeriesData(widget.displayType) &&
    tableResults &&
    tableResults.length > 0;

  const tableDataRows = tableResults?.[0]?.data;

  // We only support one column for legend breakdown right now
  const firstColumn = columns[0];
  const linkedDashboard = findLinkedDashboardForField(firstWidgetQuery, firstColumn);

  const footerTable = showBreakdownData ? (
    <WidgetFooterTable>
      {timeSeriesWithPlottable.map(([timeSeries, plottable], index) => {
        if (timeSeries.meta.isOther) {
          return null;
        }

        let value: number | null = null;
        const yAxis = timeSeries.yAxis;
        const firstColumnGroupByValue = timeSeries.groupBy?.find(
          groupBy => groupBy.key === firstColumn
        )?.value;
