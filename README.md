# Roger, desktop pet
Run from source: `npm install && npm start`. Windows: unzip and run `RogerPet-win32-x64/RogerPet.exe`.
- Right-click Roger to open the menu: Feed (cheese/steak/candy corn/mysterious heart), Pet (hand), Play (ball), Clean (brush), Sleep/Wake, Sit / Wander (saved), Show stats, Quit.
- Play: drag-and-fling the ball, or just click it to toss it. Roger chases it anywhere on screen, pounces, and brings it back.
- Pet: stroke his head with the hand. Clean: brush his fur. Right-click or Esc stops either tool.
- Left-drag moves Roger.
- Always on top: toggle in the right-click menu (saved). Double-click gives a quick pat.
- Save file: %APPDATA%/roger-pet/roger-save.json

## Building for Mac

After packaging the Mac app, ad-hoc sign it before zipping (Apple Silicon Macs won't run unsigned apps):

```sh
scripts/sign-mac.sh RogerPet-darwin-arm64/RogerPet.app
scripts/sign-mac.sh RogerPet-darwin-x64/RogerPet.app
```

On a Mac this runs `codesign --force --deep --sign -`; on Linux it uses [rcodesign](https://github.com/indygreg/apple-platform-rs/releases). Zip with symlinks preserved (`zip -qry`).
