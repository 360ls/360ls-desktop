import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { exec } from 'child_process';
import fs from 'fs';
import { v4 } from 'uuid';
import path from 'path';
import {
   RECORD,
   STOP,
   REQUEST_FILE,
   RECEIVE_FILE,
   STOPPED_PROC,
   START_PREVIEW,
   STOP_PREVIEW,
   START_STREAM,
   STOP_STREAM,
 } from './services/ipcDispatcher';
import {
  spawnProc,
  killProc,
  connect,
  getStreamArgs,
  getStitcherArgsForPreview,
  getStitcherArgsForStream,
  getStitcherArgsForRecording,
  getStitcherCmd,
  getFFmpegCmd,
  getConversionCmd,
} from './utils/proc';
import {
  getRecordingLocation,
  getStitcherLocation,
  getCameraIndex,
  getIndex,
  getStreamUrl,
  getVideoPath,
} from './utils/arg';

let mainWindow = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support'); // eslint-disable-line
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development') {
  require('electron-debug')(); // eslint-disable-line global-require
  const path = require('path'); // eslint-disable-line
  const p = path.join(__dirname, '..', 'app', 'node_modules'); // eslint-disable-line
  require('module').globalPaths.push(p); // eslint-disable-line
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


const installExtensions = async () => {
  if (process.env.NODE_ENV === 'development') {
    const installer = require('electron-devtools-installer'); // eslint-disable-line global-require

    const extensions = [
      'REACT_DEVELOPER_TOOLS',
      'REDUX_DEVTOOLS'
    ];
    const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
    for (const name of extensions) {
      try {
        await installer.default(installer[name], forceDownload);
      } catch (e) {} // eslint-disable-line
    }
  }
};

app.on('ready', async () => {
  await installExtensions();

  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.openDevTools();
    mainWindow.webContents.on('context-menu', (e, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([{
        label: 'Inspect element',
        click() {
          mainWindow.inspectElement(x, y);
        }
      }]).popup(mainWindow);
    });
  }
});

let streamProc = null;
let previewProc = null;
let stitcherProc = null;
let ffmpegProc = null;
let id;
let outPath;
let convertedPath;

ipcMain.on(RECORD, (event, arg) => {
  const recordLocation = getRecordingLocation(arg);
  const stitcherLocation = getStitcherLocation(arg);
  const destDir = path.join(getHomeDirectory(), recordLocation);
  const streamUrl = getStreamUrl(arg);

  id = v4();
  const ext = '.avi';
  const convertedExt = '.mp4';
  outPath = path.join(destDir, id + ext);
  convertedPath = path.join(destDir, id + convertedExt);
  const index = getCameraIndex(arg);
  const width = 640;
  const height = 480;

  streamProc = spawnProc(
    getStitcherCmd(stitcherLocation),
    getStitcherArgsForRecording(width, height, index, outPath));
  ffmpegProc = spawnProc(getFFmpegCmd(), getStreamArgs(streamUrl));

  connect(streamProc, ffmpegProc);
});

ipcMain.on(STOP, (event, arg) => {
  killProc(streamProc);
  killProc(ffmpegProc);
  setTimeout(() => {
    const child = exec(getConversionCmd(outPath, convertedPath));
    child.stdout.pipe(process.stdout);
    child.on('exit', () => {
      event.sender.send(STOPPED_PROC, {
        id,
        outPath: convertedPath,
      });
    });
  }, 500);
});

ipcMain.on(REQUEST_FILE, (event, arg) => {
  setTimeout(() => {
    const videoPath = getVideoPath(arg);
    fs.readFile(videoPath, (err, data) => {
      if (err) throw err;
      event.sender.send(RECEIVE_FILE, {
        path: videoPath,
        data
      });
    });
  }, 1000);
});

ipcMain.on(START_PREVIEW, (event, arg) => {
  const stitcherLocation = getStitcherLocation(arg);
  const index = getIndex(arg);

  previewProc = spawnProc(
    getStitcherCmd(stitcherLocation), getStitcherArgsForPreview(index));
});

ipcMain.on(STOP_PREVIEW, (event, arg) => {
  killProc(previewProc);
});

ipcMain.on(START_STREAM, (event, arg) => {
  const stitcherLocation = getStitcherLocation(arg);
  const index = getIndex(arg);
  const streamUrl = getStreamUrl(arg);

  stitcherProc = spawnProc(
    getStitcherCmd(stitcherLocation), getStitcherArgsForStream(index));
  ffmpegProc = spawnProc(getFFmpegCmd(), getStreamArgs(streamUrl));

  connect(stitcherProc, ffmpegProc);
});

ipcMain.on(STOP_STREAM, (event, arg) => {
  killProc(stitcherProc);
  killProc(ffmpegProc);
});

const getHomeDirectory = () => {
  return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
};
