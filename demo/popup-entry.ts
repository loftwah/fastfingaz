/**
 * Dev-only entry for the popup harness. The harness stubs the extension APIs
 * before this module runs, so the real popup renderer can be inspected without
 * loading the extension into Chrome.
 */
import '../entrypoints/popup/main';
