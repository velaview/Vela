/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORE MODULE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Clean architecture for Vela streaming platform.
 * 
 * Main modules:
 * - streaming/  - All streaming, providers, subtitles, sessions
 * - player/     - Client-side player utilities
 * - recommendations/ - Personalization engine
 */

// Main streaming functionality
export * from './streaming';

// Note: player/ and recommendations/ are imported directly where needed
// to avoid circular dependencies and keep bundle size small
