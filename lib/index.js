var ipc = require('ipc');
ipc.on('coverUrl', function(url) {
  document.getElementById('background').src = url;
  document.getElementById('cover').src = url;
});
ipc.on('songName', function(songname) {
  document.getElementById('songname').innerHTML = songname;
});
ipc.on('songArtist', function(artist) {
  document.getElementById('artist').innerHTML = artist;
});
ipc.on('addedBy', function(name) {
  document.getElementById('addedby').innerHTML = name;
});
ipc.on('loadingText', function(text) {
  document.getElementById('loading').innerHTML = text;
});
document.onkeydown = function(e) {
  e = e || window.event;
  if (e.keyCode == 27) {
    require('remote').getCurrentWindow().close();
  }
};