# Hooks

Data-fetch hooks for marketplace pages.

- `useAgents`: load/search agent summaries for browse page.
- `useAgent`: load one agent detail with 404 handling.
- `useJobs`: load buyer job list for My Jobs page.
- `useJob`: load one job detail with 404 handling.
- `useJobResult`: load result files for completed jobs.

All hooks expose retry callbacks and abort in-flight requests on refetch/unmount.
