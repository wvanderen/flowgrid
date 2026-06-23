// Vitest dom-project setup: register @testing-library/jest-dom matchers so tests
// can use `expect(el).toBeInTheDocument()` etc. Lives in its own file so the
// node project (tests/simulation, tests/persistence) does not import DOM-only
// typings.

import '@testing-library/jest-dom/vitest';
