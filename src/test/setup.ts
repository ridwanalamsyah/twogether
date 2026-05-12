// Vitest setup: polyfills + global mocks shared across the test suite.
//
//  - `fake-indexeddb/auto` shims `indexedDB` + `IDBKeyRange` into the
//    happy-dom environment so Dexie can open databases under test.
//  - `@testing-library/jest-dom` extends `expect` with DOM matchers in
//    case we add component tests later.

import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
