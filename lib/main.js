'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

/* Load the HTTP library */
var http = require("http");

/* Create an HTTP server to handle responses */
http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end();
}).listen(8888);

var SpotifyWebApi = require('spotify-web-api-node');

// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId : '60d6c604c8ca486483bf36be3d0e7b6d',
  clientSecret : '80af44a32feb4aa9b2279f4b1e536611'
});

spotifyApi.clientCredentialsGrant()
  .then(function(data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
  }, function(err) {
        console.log('Something went wrong when retrieving an access token', err);
  });

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1366, height: 790});

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html');
  mainWindow.setFullScreen(false);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
process.on('uncaughtException', function (error) {
  console.log(error);
});

const https = require('https');

const SERVER_PORT = 5000;
const UPDATE_INTERVAL = 1000;
const DEFAULT_RETURN_ON = ['login', 'logout', 'play', 'pause', 'error', 'ap'];
const DEFAULT_HTTPS_CONFIG = {
  host: '',
  port: 4370,
  path: '',
  headers: {'Origin': 'https://open.spotify.com'}
};

let config;
let version;
version = {};
version.running = false;
let csrf;
let oauth;
let albumId;
let coverUrl;

function copyConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_HTTPS_CONFIG));
}

function generateLocalHostname() {
  /*return randomstring.generate({
    length: 10,
    charset: 'abcdefghijklmnopqrstuvwxyz'
  }) + '.spotilocal.com';*/
  return '127.0.0.1';
}

function getUrl(path) {
  generateLocalHostname() + '/' + path;
}

function getJson(config, callback) {
  https.get(config, function(res) {
    var body = '';
    res.on('data', function (d) {
      body += d;
    });
    res.on('end', function () {
      callback(JSON.parse(body));
    });
  });
}

function getStatus() {
  config = copyConfig();
  config.host = generateLocalHostname();
  config.path = '/remote/status.json?oauth=' + oauth + '&csrf=' + csrf + '&returnafter=1&returnon=' + DEFAULT_RETURN_ON.join();
}

function getCurrentAlbumId() {
  config = copyConfig();
  config.host = generateLocalHostname();
  config.path = '/remote/status.json?oauth=' + oauth + '&csrf=' + csrf + '&returnafter=1&returnon=' + DEFAULT_RETURN_ON.join();
  getJson(config, function(data) {
    try {
      if (data.track.album_resource.uri.split(':')[2] !== albumId) {
        albumId = data.track.album_resource.uri.split(':')[2];
        getAlbumCover(albumId);
      }
    }
    catch(ex) {
      console.log(ex);
    }
  });
}

function getCurrentSong() {
  config = copyConfig();
  config.host = generateLocalHostname();
  config.path = '/remote/status.json?oauth=' + oauth + '&csrf=' + csrf + '&returnafter=1&returnon=' + DEFAULT_RETURN_ON.join();
  getJson(config, function(data) {
    try {
      var songID = data.track.track_resource.uri.split(':')[2];
      var songName = data.track.track_resource.name;
      var artist = data.track.artist_resource.name;
      mainWindow.webContents.send('songName', songName);
      mainWindow.webContents.send('songArtist', artist);

      spotifyApi.getPlaylist('iamandrewd', '4NOIVhPSgdPPvIaT1LE5at')
        .then(function(data) {
          for (var i = 0; i < data.body.tracks.items.length; i++) {
            var trackid = data.body.tracks.items[i].track.id;
            if (trackid == songID) {
              var addedby = data.body.tracks.items[i].added_by.id;

              spotifyApi.getUser(addedby)
              .then(function(data) {
                var user = data.body.display_name;
                if (user == null) {
                  user = addedby;
                }
                mainWindow.webContents.send('addedBy', user);
              }, function(err) {
                console.log('Something went wrong!', err);
              });

            }
          }
        }, function(err) {
          console.log('Something went wrong!', err);
          spotifyApi.clientCredentialsGrant()
            .then(function(data) {
              console.log('The access token expires in ' + data.body['expires_in']);
              console.log('The access token is ' + data.body['access_token']);

              // Save the access token so that it's used in future calls
              spotifyApi.setAccessToken(data.body['access_token']);
            }, function(err) {
                  console.log('Something went wrong when retrieving an access token', err);
            });
        });


    }
    catch(ex) {
      console.log(ex);
    }
  });
}

function getAlbumCover(id) {
  config = copyConfig();
  config.host = 'api.spotify.com';
  config.path = '/v1/albums/' + id;
  config.port = 443;
  getJson(config, function(data) {
    coverUrl = data.images[0].url;
    if (mainWindow !== null) {
      mainWindow.webContents.send('coverUrl', coverUrl);
    }
  });
}

function grabTokens() {
  if (mainWindow !== null) {
    mainWindow.webContents.send('loadingText', 'Connecting to Spotify...');
  }
  config.host = generateLocalHostname();
  config.path = '/simplecsrf/token.json';
  getJson(config, function(data) { csrf = data.token; });
  config.host = 'open.spotify.com';
  config.path = '/token';
  config.port = 443;
  getJson(config, function(data) { oauth = data.t; });
  let updateTrackCover;
  let updateSongDetails;
  let waitForRequest = setInterval(function() {
    if (typeof version !== 'undefined' && typeof csrf !== 'undefined' && typeof oauth !== 'undefined') {
      clearInterval(waitForRequest);

      updateTrackCover = setInterval(getCurrentAlbumId, UPDATE_INTERVAL);
      updateSongDetails = setInterval(getCurrentSong, UPDATE_INTERVAL);
    }
    else {
      console.log('waiting for authentication...');
    }
  }, 500);
}

let waitForSpotify = setInterval(function() {
  if (typeof version !== 'undefined' && version.running) {
    clearInterval(waitForSpotify);
    grabTokens();
  }
  else {
    config = copyConfig();
    config.host = generateLocalHostname();
    config.path = '/service/version.json?service=remote';
    getJson(config, function(data) {
      if (!('running' in data)) {
        data.running = true;
      }
      version = data;
    });
    console.log('waiting for spotify...');
  }
}, 500);
