# Current task
- Add an Azure adapter stub under `src/features/cloud/providers/` that implements the shared provider contract.
- Registry scaffolding now exists in `src/features/cloud/providers/registry.ts` and `index.ts`; the next step is to plug the first non-GCP adapter into that contract without changing higher-level controller behavior yet.

# End goal with specs
- The hosted control plane in `../superturtle-web` has a provider-neutral registry under `src/features/cloud/providers/`.
- Azure and AWS adapter stubs exist and implement the shared provider contract surface already defined by the app.
- `managed-runtime.ts` or the equivalent cloud control-plane entrypoint depends only on the provider registry and shared contracts, not direct Azure/AWS SDK imports.
- Returned payloads used by teleport remain provider-neutral and focused on fields like SSH target, remote root, readiness, and lease state.
- Changes include targeted tests or validation covering registry selection and both adapter stubs.

# Roadmap (Completed)
- Confirmed the worker should focus on the next concrete step in `../superturtle-web`: provider registry plus Azure/AWS adapter stubs.
- Confirmed this is intended to run as a Codex SubTurtle (`yolo-codex`) with a scoped state file in `.subturtles/teleport-provider-registry/`.

# Roadmap (Upcoming)
- Inspect the existing `../superturtle-web/src/features/cloud/` layout, especially `managed-runtime.ts` and any `contracts.ts`.
- Add a provider registry module that is the only import surface used by higher-level control-plane code.
- Add Azure and AWS adapter stubs under `src/features/cloud/providers/` that satisfy the shared contract.
- Refactor the relevant control-plane entrypoint to resolve providers through the registry rather than implicit single-provider assumptions.
- Add or update tests so both adapters are exercised by the contract/registry layer.

# Backlog
- [x] Capture the requested scope and worker boundary for the hosted control-plane abstraction step.
- [x] Inspect `../superturtle-web` cloud provider files and identify the current contract plus direct provider assumptions.
- [x] Add the provider registry module under `src/features/cloud/providers/` with provider-neutral lookup helpers.
- [ ] Add Azure adapter stub implementing the shared provider contract. <- current
- [ ] Add AWS adapter stub implementing the shared provider contract.
- [ ] Refactor the control-plane cloud entrypoint to consume the provider registry instead of direct provider assumptions.
- [ ] Add or update tests covering registry resolution and both provider adapters.
