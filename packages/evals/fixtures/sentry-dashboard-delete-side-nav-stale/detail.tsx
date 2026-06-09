// Source excerpt from getsentry/sentry static/app/views/dashboards/detail.tsx@14170bd6ae28abe4d4f0b5807185b116f777a1a0.
// Unrelated context omitted; captured around the fix diff for 86872f4f1491c4392a25f4d3fcba31a12726fa63.

  WidgetViewerQueryField,
} from 'sentry/components/modals/widgetViewerModal/utils';
import NoProjectMessage from 'sentry/components/noProjectMessage';
import PageFiltersContainer from 'sentry/components/pageFilters/container';
import SentryDocumentTitle from 'sentry/components/sentryDocumentTitle';
import {USING_CUSTOMER_DOMAIN} from 'sentry/constants';
import {t} from 'sentry/locale';
import {space} from 'sentry/styles/space';
import type {InjectedRouter} from 'sentry/types/legacyReactRouter';
import type {Organization} from 'sentry/types/organization';
import type {Project} from 'sentry/types/project';
import {defined} from 'sentry/utils';
import {trackAnalytics} from 'sentry/utils/analytics';
import {browserHistory} from 'sentry/utils/browserHistory';
import EventView from 'sentry/utils/discover/eventView';
import {MetricsCardinalityProvider} from 'sentry/utils/performance/contexts/metricsCardinality';
import {MetricsResultsMetaProvider} from 'sentry/utils/performance/contexts/metricsEnhancedPerformanceDataContext';
import {MEPSettingProvider} from 'sentry/utils/performance/contexts/metricsEnhancedSetting';
import {OnDemandControlProvider} from 'sentry/utils/performance/contexts/onDemandControl';
import {decodeBoolean} from 'sentry/utils/queryString';
import {OnRouteLeave} from 'sentry/utils/reactRouter6Compat/onRouteLeave';
import {scheduleMicroTask} from 'sentry/utils/scheduleMicroTask';
import normalizeUrl from 'sentry/utils/url/normalizeUrl';
import useApi from 'sentry/utils/useApi';
import {useChartInterval} from 'sentry/utils/useChartInterval';
import {useLocation} from 'sentry/utils/useLocation';
import type {ReactRouter3Navigate} from 'sentry/utils/useNavigate';
import {useNavigate} from 'sentry/utils/useNavigate';
import useOrganization from 'sentry/utils/useOrganization';
import {useParams} from 'sentry/utils/useParams';
import useProjects from 'sentry/utils/useProjects';
import useRouter from 'sentry/utils/useRouter';
import {
  cloneDashboard,
  getCurrentPageFilters,
  getDashboardFiltersFromURL,
  hasUnsavedFilterChanges,

// ... source context omitted ...

};

type RouteParams = {
  dashboardId?: string;
  templateId?: string;
  widgetId?: string;
  widgetIndex?: string;
};

type Props = {
  api: Client;
  dashboard: DashboardDetails;
  dashboards: DashboardListItem[];
  initialState: DashboardState;
  location: Location;
  navigate: ReactRouter3Navigate;
  organization: Organization;
  params: RouteParams;
  projects: Project[];
  router: InjectedRouter;
  theme: Theme;
  children?: React.ReactNode;
  onDashboardUpdate?: (updatedDashboard: DashboardDetails) => void;
  storageNamespace?: string;
  useTimeseriesVisualization?: boolean;
  widgetInterval?: string;
};

type State = {
  dashboardState: DashboardState;
  isCommittingChanges: boolean;
  isSavingDashboardFilters: boolean;
  isWidgetBuilderOpen: boolean;
  modifiedDashboard: DashboardDetails | null;
  widgetLegendState: WidgetLegendSelectionState;
  widgetLimitReached: boolean;
  newlyAddedWidget?: Widget;

// ... source context omitted ...

        ]
      );
    }

    return widgetBuilderRoutes.includes(path ?? location.pathname);
  };

  onEdit = () => {
    const {dashboard, organization} = this.props;
    trackAnalytics('dashboards2.edit.start', {organization});

    this.setState({
      dashboardState: DashboardState.EDIT,
      modifiedDashboard: cloneDashboard(dashboard),
    });
  };

  onDelete = (dashboard: State['modifiedDashboard']) => () => {
    const {api, organization, location} = this.props;
    if (!dashboard?.id) {
      return;
    }

    const previousDashboardState = this.state.dashboardState;

    this.setState({dashboardState: DashboardState.PENDING_DELETE}, () => {
      deleteDashboard(api, organization.slug, dashboard.id)
        .then(() => {
          addSuccessMessage(t('Dashboard deleted'));
          trackAnalytics('dashboards2.delete', {organization});
          browserHistory.replace({
            pathname: `/organizations/${organization.slug}/dashboards/`,
            query: location.query,
          });
        })
        .catch(() => {
          this.setState({
            dashboardState: previousDashboardState,
          });
        });
    });
  };

  onCancel = () => {
    const {organization, dashboard, location, params} = this.props;

// ... source context omitted ...

  margin-bottom: ${space(2)};

  @media (min-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: minmax(0, 1fr) max-content;
    grid-column-gap: ${space(2)};
    height: 40px;
  }
`;

interface DashboardDetailWithInjectedPropsProps extends Omit<
  Props,
  | 'theme'
  | 'navigate'
  | 'api'
  | 'organization'
  | 'projects'
  | 'location'
  | 'params'
  | 'router'
> {}

export default function DashboardDetailWithInjectedProps(
  props: DashboardDetailWithInjectedPropsProps
) {
  const theme = useTheme();
  const navigate = useNavigate();
  const api = useApi();
  const organization = useOrganization();
  const {projects} = useProjects();
  const location = useLocation();
  const params = useParams<RouteParams>();
  const router = useRouter();
  const [chartInterval] = useChartInterval();

  // Always use the validated chart interval so the UI dropdown and widget
  // requests stay in sync. chartInterval is validated against the current page
  // filter period (e.g. won't return 1m for a 30d range) and always has a value.
  const widgetInterval = organization.features.includes('dashboards-interval-selection')
    ? chartInterval
    : undefined;

  return (
    <DashboardDetail
      {...props}
      theme={theme}
      navigate={navigate}
      api={api}
      organization={organization}
      projects={projects}
      location={location}
      params={params}
      router={router}
      widgetInterval={widgetInterval}
    />
  );
}
