// Source excerpt from getsentry/sentry static/app/actionCreators/dashboards.tsx@14170bd6ae28abe4d4f0b5807185b116f777a1a0.
// Unrelated context omitted; captured around the fix diff for 86872f4f1491c4392a25f4d3fcba31a12726fa63.

  const {title, widgets, projects, environment, period, start, end, filters, utc} =
    dashboard;
  const data = {
    title,
    widgets: widgets.map(widget => omit(widget, ['tempId'])).map(_enforceWidgetLimit),
    projects,
    environment,
    period,
    start,
    end,
    filters,
    utc,
  };

  const promise: Promise<DashboardDetails> = api.requestPromise(
    `/organizations/${orgId}/dashboards/${dashboard.id}/`,
    {
      method: 'PUT',
      data,
      query: {
        project: projects,
        environment,
      },
    }
  );

  // We let the callers of `updateDashboard` handle adding a success message, so
  // that it can be more specific than just "Dashboard updated," but do the
  // error-handling here, since it doesn't depend on the caller's context
  promise.catch(response => {
    const errorResponse = response?.responseJSON ?? null;

    if (errorResponse) {
      const errors = flattenErrors(errorResponse, {});
      addErrorMessage(errors[Object.keys(errors)[0]!] as string);
    } else {
      addErrorMessage(t('Unable to update dashboard'));
    }
  });

  return promise;
}

export function deleteDashboard(
  api: Client,
  orgId: string,
  dashboardId: string
): Promise<undefined> {
  const promise: Promise<undefined> = api.requestPromise(
    `/organizations/${orgId}/dashboards/${dashboardId}/`,
    {
      method: 'DELETE',
    }
  );

  promise.catch(response => {
    const errorResponse = response?.responseJSON ?? null;

    if (errorResponse) {
      const errors = flattenErrors(errorResponse, {});
      addErrorMessage(errors[Object.keys(errors)[0]!] as string);
    } else {
      addErrorMessage(t('Unable to delete dashboard'));
    }
  });

  return promise;
}

export function validateWidgetRequest(
  orgId: string,
  widget: Widget,
  selection: PageFilters
) {
  return [
    getApiUrl('/organizations/$organizationIdOrSlug/dashboards/widgets/', {
      path: {organizationIdOrSlug: orgId},
    }),
    {
      method: 'POST',
      data: widget,
      query: {
        // TODO: This should be replaced in the future with projects
        // when we save Dashboard page filters. This is being sent to
        // bypass validation when creating or updating dashboards
        project: [ALL_ACCESS_PROJECTS],
        environment: selection.environments,
      },
    },
  ] as const;
}

export function updateDashboardPermissions(
  api: Client,
  orgId: string,
  dashboard: DashboardDetails | DashboardListItem
): Promise<DashboardDetails> {
  const {permissions} = dashboard;
  const data = {
    permissions,