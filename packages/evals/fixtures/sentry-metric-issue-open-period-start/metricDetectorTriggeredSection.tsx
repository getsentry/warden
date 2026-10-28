// Source excerpt from getsentry/sentry static/app/views/issueDetails/streamline/sidebar/metricDetectorTriggeredSection.tsx@d0819fa643ba398b0a0ed9f55555a87239631ec5.
// Unrelated context omitted; captured around the fix diff for 44801511e3636356c7733ad1b33c8733d691c067.

    return false;
  }

  const dataSource = evidenceData.dataSources[0];

  return 'type' in dataSource && dataSource.type === 'snuba_query_subscription';
}

interface RelatedIssuesProps {
  aggregate: string;
  end: string;
  eventDateCreated: string | undefined;
  projectId: string | number;
  query: string;
  start: string;
}

function calculateStartOfInterval({
  eventDateCreated,
  timeWindow,
}: {
  eventDateCreated: string;
  timeWindow: number;
}) {
  const eventTimestamp = new Date(eventDateCreated).getTime();
  const startOfInterval = new Date(
    eventTimestamp -
      // Subtract the time window (which is in seconds)
      timeWindow * 1000 -
      // Subtract one extra minute to account for delay in processing
      60 * 1000
  );
  // Start from the beginning of the minute
  startOfInterval.setSeconds(0, 0);

  return startOfInterval;
}

function getFormattedEvaluatedValue({
  aggregate,
  detectionType,
  value,
}: {

// ... source context omitted ...


      navigate(
        {
          pathname: normalizeUrl(
            `/organizations/${organization.slug}/issues/${params.groupId}/events/${eventId}/`
          ),
          query,
        },
        {replace: true}
      );
    }
  });

  useEffect(() => {
    zoomTimeRangeToOpenPeriod();
  }, [openPeriodStart, openPeriodEnd, intervalSeconds]);
}

function ZoomToOpenPeriod({
  eventId,
  intervalSeconds,
  openPeriodStart,
  openPeriodEnd,
}: {
  eventId: string;
  intervalSeconds: number | undefined;
  openPeriodEnd: string;
  openPeriodStart: string;
}) {
  useZoomTimeRangeToOpenPeriod({
    eventId,
    openPeriodStart,
    openPeriodEnd,
    intervalSeconds,
  });

  return null;
}

/**
 * Issues list does not support AND/OR in the query, but Discover does.
 */
function BooleanLogicError({discoverUrl}: {discoverUrl: LocationDescriptor}) {
  return (
    <Alert.Container>
      <Alert
        variant="info"
        trailingItems={
          <Feature features="discover-basic">
            <LinkButton priority="default" size="xs" to={discoverUrl}>
              {t('Open in Discover')}
            </LinkButton>
          </Feature>

// ... source context omitted ...

    eventId,
  });
  const endDate = openPeriod?.end ?? fallbackEndDate;

  if (!triggeredCondition || !snubaQuery || !eventDateCreated) {
    return null;
  }

  const detectorDataset = getDetectorDataset(snubaQuery.dataset, snubaQuery.eventTypes);
  const datasetConfig = getDatasetConfig(detectorDataset);
  const isErrorsDataset = detectorDataset === DetectorDataset.ERRORS;
  const issueSearchQuery = datasetConfig.toSnubaQueryString?.(snubaQuery) ?? '';
  const formattedEvaluatedValue = getFormattedEvaluatedValue({
    value: defined(value) && typeof value === 'object' ? value.value : value,
    aggregate: snubaQuery.aggregate,
    detectionType,
  });
  const startDate = calculateStartOfInterval({
    eventDateCreated,
    timeWindow: snubaQuery.timeWindow,
  }).toISOString();

  return (
    <Fragment>
      <ZoomToOpenPeriod
        eventId={eventId}
        intervalSeconds={snubaQuery?.timeWindow}
        openPeriodStart={startDate}
        openPeriodEnd={endDate}
      />
      <InterimSection
        title="Triggered Condition"
        type="triggered_condition"
        actions={
          isOpenPeriodLoading ? null : (
            <OpenInDestinationButton
              snubaQuery={snubaQuery}
              projectId={projectId}
              start={startDate}
              end={endDate}
            />
          )
        }
      >
        <KeyValueList
          shouldSort={false}
          data={[
            {