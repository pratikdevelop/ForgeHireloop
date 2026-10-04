import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify('AIzaSyA_LdK4DgIIQdWC1efYAPj1ltkbxwBEB0o'),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify('forgehireloop.firebaseapp.com'),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify('forgehireloop'),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify('forgehireloop.firebasestorage.app'),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify('633018706293'),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify('1:633018706293:web:444f08918b605385914b3c'),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify('G-2HG1W1QK71'),
      'import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID': JSON.stringify('(default)'),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
