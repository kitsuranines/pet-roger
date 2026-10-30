const { app, BrowserWindow, ipcMain, Menu, screen, Tray, nativeImage } = require('electron');
let tray, lastWalking = true, lastPlaying = false;
const ICON = path => require('path').join(__dirname, 'build', path);
const fs = require('fs'), path = require('path');
let win;
const saveFile = () => path.join(app.getPath('userData'), 'roger-save.json');
function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;
  // One transparent overlay covering the whole work area. Roger, the ball etc. move inside it
  // with CSS, so no per-frame window moving (which was unreliable on Windows with DPI scaling).
  win = new BrowserWindow({
    x: wa.x, y: wa.y, width: wa.width, height: wa.height,
    icon: ICON(process.platform === 'win32' ? 'icon.ico' : 'icon.png'), title: 'Roger',
    transparent: true, frame: false, resizable: false, movable: false, skipTaskbar: false,
    hasShadow: false, backgroundColor: '#00000000', alwaysOnTop: true, fullscreenable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');
}
ipcMain.handle('load', () => { try { return JSON.parse(fs.readFileSync(saveFile(), 'utf8')); } catch { return null; } });
ipcMain.on('save', (e, d) => { try { fs.writeFileSync(saveFile(), JSON.stringify(d)); } catch {} });
let ignoring = true;
ipcMain.on('capture', (e, on) => { if (ignoring === !on) return; ignoring = !on; win.setIgnoreMouseEvents(!on, { forward: true }); if (on) win.focus(); });
function buildMenu(walking, playing) {
  const a = (act) => () => { console.log('[menu]', act); win.webContents.send('action', act); };
  return Menu.buildFromTemplate([
    { label: 'Feed', submenu: [
      { label: 'Cheese', click: a('feed:cheese') },
      { label: 'Steak', click: a('feed:steak') },
      { label: 'Candy corn', click: a('feed:candy') },
      { label: 'Mysterious heart', click: a('feed:heart') } ] },
    { label: 'Pet (hand)', click: a('pet') }, { label: playing ? 'Play: ON (click to stop)' : 'Play: OFF (get the ball out)', type: 'checkbox', checked: !!playing, click: a('play') },
    { label: 'Clean (brush)', click: a('clean') }, { label: 'Sleep / Wake', click: a('sleep') },
    { type: 'separator' },
    { label: 'Sit (stay put)', type: 'radio', checked: !walking, click: a('sit') },
    { label: 'Wander (walk around)', type: 'radio', checked: !!walking, click: a('wander') }, { label: 'Show stats', click: a('stats') },
    { type: 'separator' }, { label: 'Quit', click: () => app.quit() }
  ]);
}
ipcMain.on('menu', (e, walking, playing) => { lastWalking = walking; lastPlaying = !!playing; buildMenu(walking, playing).popup({ window: win }); });
if (process.platform === 'win32') app.setAppUserModelId('com.nines.rogerpet');
app.whenReady().then(() => {
  createWindow();
  tray = new Tray(nativeImage.createFromPath(ICON('icon.png')).resize({ width: 32, height: 32 }));
  tray.setToolTip('Roger (judging you)');
  const pop = () => tray.popUpContextMenu(buildMenu(lastWalking, lastPlaying));
  tray.on('click', pop); tray.on('right-click', pop);
});
app.on('window-all-closed', () => app.quit());
// test hook: ROGER_TEST="play,clean" ROGER_SHOT=dir  -> fires actions and captures screenshots
if (process.env.ROGER_TEST) app.whenReady().then(() => {
  const acts = process.env.ROGER_TEST.split('|'); let i = 0;
  win.webContents.on('did-finish-load', () => setTimeout(function step() {
    if (i < acts.length) { const act = acts[i++];
      if (act.startsWith('js:')) win.webContents.executeJavaScript(act.slice(3)); else win.webContents.send('action', act);
      setTimeout(async () => { const img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(process.env.ROGER_SHOT, `t${i}.png`), img.toPNG()); step(); }, +(process.env.ROGER_WAIT||1500)); }
    else win.webContents.executeJavaScript('JSON.stringify(window.__log)').then(l => { console.log('LOG', l); app.quit(); });
  }, 2500));
});
