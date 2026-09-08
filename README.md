# ddpgame
- Angular 18
- Ionic 8
- p5js 1.9.6

## Runtime server configuration

The app reads its Supabase server address from `src/assets/config/app-config.json`
before Angular starts. Update `serverUrl` in that source file for each deployment,
or edit the deployed `assets/config/app-config.json` directly to change the server
without rebuilding the Angular application. The address is no longer compiled into
the application environment files.
