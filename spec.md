# Specification

## Summary
**Goal:** Final polish phase for the OnlyUs couples app — adding UI refinements, performance improvements, better error handling, and project documentation.

**Planned changes:**
- Add an app logo mark and a splash/loading screen centered on a blush-white (#FFF0F5) background with the app name "OnlyUs" in a romantic serif font and a fade-in animation shown before auth state resolves
- Add CSS-based page transition animations (fade-in + subtle slide-up, 200–300ms) for all route/screen changes, respecting `prefers-reduced-motion`
- Add skeleton loading states and spinners across all data-fetching screens (ChatPage, GalleryPage, CallsPage, auth resolution) using rose/blush shimmer colors
- Audit and fix all screen layouts to be fully responsive from 320px to 430px+, with safe area insets on the bottom tab bar using `env(safe-area-inset-bottom)`
- Add empty state illustrations with text for ChatPage ("Say hello to your person 💕"), GalleryPage ("Your shared memories will appear here 🌸"), and CallsPage, shown only after data resolves to empty
- Implement lazy loading for gallery images using Intersection Observer or native `loading="lazy"`, with a blush-tinted placeholder
- Add client-side image compression in CameraPage (max 1280px, JPEG 0.82 quality via HTMLCanvasElement) before upload, with original vs. compressed size shown in preview
- Add pagination to Motoko `getMessages` (offset/limit, default 20) and frontend ChatPage infinite scroll upward with scroll position preservation
- Add pagination to Motoko `getGalleryMedia` (offset/limit, default 12) and a "Load more" button on GalleryPage
- Add comprehensive error handling: dismissible rose-styled toasts for network/actor errors, retry messaging for upload failures, call failure messages with auto-navigation, and dropped-call detection
- Generate a `TESTING_CHECKLIST.md` covering auth, chat, camera, gallery, voice call, video call, and two-browser testing steps
- Generate a `README.md` at the project root covering project overview, architecture, local setup, hot reload, mainnet deploy, environment variables, feature summary, and security notes

**User-visible outcome:** The app has a polished splash screen, smooth transitions, loading skeletons, empty states, responsive layouts, lazy-loaded gallery images, compressed uploads, paginated chat and gallery, robust error messages, and complete documentation for testing and setup.
