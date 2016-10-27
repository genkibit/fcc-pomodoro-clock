(function() {

'use strict';

  // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
  // requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
  // MIT license
  (function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
      window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
      window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
      window[vendors[x]+'CancelRequestAnimationFrame'];
    }
    
    if (!window.requestAnimationFrame)
      window.requestAnimationFrame = function(callback, element) {
        var currTime = new Date().getTime();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
        lastTime = currTime + timeToCall;
        return id;
      };

    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = function(id) {
        clearTimeout(id);
      };
  }());


  // Canvas stuff
  var canvas = document.createElement('canvas');
  var canvasBox = document.getElementById('canvas-box');
  var ctx = canvas.getContext('2d');
  canvasBox.appendChild(canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var W = canvas.width;
  var H = canvas.height;

  // Ensures graphics are within viewport dimensions
  var baseSize;

  if (W > H) {
    baseSize = H;
  } else {
    baseSize = W;
  }

  // For timer calculations
  var startTime = null;
  var lastTime = 0;
  var min = null;
  var sessions = 0;

  // For graphics and animation
  var color = '#cf9';
  var index = 0;
  var colors = ['#cf9', '#fcc'];
  var degrees = 0;
  var clockStart = false;
  var animate = false;
  var fps = 30;
  var font = 'Helvetica Neue';

  // For pause feature
  var paused = false;
  var pauseStartTime = 0;
  var pauseDuration = 0;

  // For button handlers
  var runBtn = document.getElementById('btn-run');
  var resetBtn = document.getElementById('btn-reset');

  // For setting minutes
  var limits = [];
  var sessionData = document.getElementById('input-session');
  var sessionPlus = document.querySelector('#session .btn-plus');
  var sessionMinus = document.querySelector('#session .btn-minus');
  var breakData = document.getElementById('input-break');
  var breakPlus = document.querySelector('#break .btn-plus');
  var breakMinus = document.querySelector('#break .btn-minus');

  // For sound effect
  var sfx = document.getElementById('sound-effect');
  var sfxSrc = 'https://dl.dropboxusercontent.com/u/3810405/freecodecamp/pomodoro-clock/sfx_alien-chirp';

  // For error message
  var errorNode = document.getElementById('error-msg');

  // For switching to minimalist view
  var panelNode = document.getElementById('panel');
  var footerNodes = document.getElementsByTagName('footer');
  var twitterNode = document.getElementById('tweet-link');
  var simpleView = false;

  // For switching between timer styles
  var modeBtn = document.getElementById('btn-mode');
  var mode = 'a';

  // For opening and closing the panel in mobile view
  var menuNode = document.getElementById('menu');
  var openMenu = true;


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


  // Renders the timer progress bar for mode B
  // 1. Rate should be proportional to the specified time limit
  // 2. radians = angle in degrees * PI / 180
  // 3. Starting and ending angle adjusted to start at the top of the circle
  function render_progress_bar(curSec) {
    var rate = 360 / (60 * min); // 1
    var radians = null;

    degrees = curSec * rate;
    radians = degrees * Math.PI / 180; // 2

    ctx.strokeStyle = color;
    ctx.lineWidth = baseSize * 0.05;
    ctx.beginPath();
    ctx.arc(W/2, H/2, (baseSize/2 - baseSize * 0.15), 270 * Math.PI/180, radians + 270 * Math.PI/180, false);	// 3
    ctx.stroke();
    ctx.closePath();
  }

  // Renders background color shift for mode A
  function render_bg_animation(curSec) {

    // Used to calculate rate of color change
    var rate = parseFloat(curSec) / parseFloat(min * 60);
    var r, g, b, bgColor;

    // 1. Using the vales for teal rgb(0, 153, 153) and dark-red rgb(153, 0, 0)
    // 2. Take the difference of each rgb value and adjust the difference with the above calculated rate
    // 3. Subtract that difference from the teal values for the gradual color shift to light-red
    if (index === 0) {
      r = Math.floor(153 * rate);
      g = Math.floor(153 - 153 * rate);
      b = Math.floor(153 - 153 * rate);

      bgColor = 'rgb(' + r + ',' + g + ',' + b + ')';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);
    }
    else {
      ctx.fillStyle='#900';
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Converts total seconds to x:00:00 format and renders result
  // curSec: current time in seconds
  function render_timer(curSec) {
    curSec = curSec || 0;
    var fontSize;
    var txtWidth = '';
    var txtPos = '';
    var time = '';
    var timeHr = '';
    var timeMin = Math.floor(((60 * min) - curSec) / 60);
    var timeSec = '00' + ((60 * min) - curSec) % 60;

    if (mode === 'a') {
      fontSize = Math.floor(baseSize * 0.15);
    }
    else {
      fontSize = Math.floor(baseSize * 0.12);
    }

    if (timeMin >= 60) {
      timeHr = Math.floor(timeMin / 60);
      timeMin = timeMin % 60;
      time = timeHr + ':';
    }

    timeMin = ('00' + timeMin).substr(-2);
    timeSec = timeSec.substr(-2);
    time = '' + time + timeMin + ':' + timeSec;

    ctx.fillStyle = color;
    ctx.font = fontSize + 'px ' + font;
    ctx.textAlign = 'start';
    ctx.textBaseline = 'middle';
    txtWidth = ctx.measureText(time).width + '';
    txtPos = (W/2 - txtWidth/2);
    ctx.fillText(time, txtPos, H * 0.50);
    
    fontSize = Math.floor(baseSize * 0.07);
    ctx.font = fontSize + 'px ' + font;
    txtWidth = ctx.measureText(sessions).width + '';
    txtPos = (W/2 - txtWidth/2);
    ctx.fillText(sessions, txtPos, H * 0.64);
  }

  // Support function for play_track, this determines which audio format is best for your browser
  function get_format_extension() {
    var audio = sfx;
    var extension;

    if (audio.canPlayType('audio/mp3') !== '') {
      extension = '.mp3';
    }
    else if (audio.canPlayType('audio/ogg') !== '') {
      extension = '.ogg';
    }
    else {
      errorNode.innerHTML = 'Unsupported audio format';
      errorNode.style.display = 'block';
    }
    return extension;
  }

  // Plays the chirp sound when the timer completes an interval
  function play_track() {

    if (sfxSrc) {
      sfx.src = sfxSrc + get_format_extension();
      sfx.load();
      sfx.play();
    }
    else {
      errorNode.innerHTML = 'Unable to load audio';
      errorNode.style.display = 'block';
    }
  }


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


  // Callback for switching between timer styles
  function toggle_mode() {
    if (mode === 'a') {
      mode = 'b';
      modeBtn.innerHTML = 'mode B';
    }
    else {
      mode = 'a';
      modeBtn.innerHTML = 'mode A';
    }
  }

  // Callback for initial timer and mode setting
  function select_mode() {
    min = sessionData.value;
    limits[0] = min;
    limits[1] = breakData.value;

    if (mode === 'a') {
      ctx.fillStyle = '#099';
    }
    else {
      ctx.fillStyle = '#033';
    }

    ctx.fillRect(0,0,W,H);
    render_timer();
  }

  // Callback for opening and closing of panel in mobile view
  function toggle_panel() {
    if (openMenu === false) {
      panelNode.className = panelNode.className.replace(' slide-up', '');
      openMenu = true;
    }
    else {
      panelNode.className = panelNode.className + ' slide-up';
      openMenu = false;
    }
  }

  // Callback for starting and pausing the timer
  function start_pause() {
    if (clockStart === true) {
      paused = !paused;
      runBtn.innerHTML = 'start';

      var now = new Date();

      if (animate === true) {
        pauseStartTime = now;
        animate = false;
      }
      else {
        runBtn.innerHTML = 'pause';
        pauseDuration += now - pauseStartTime;
        animate = true;
        main();
      }
    }
    else {
      start();
    }
  }

  // Callback for switching to minimalist view
  function toggle_view() {
    if (simpleView === false) {

      // Since we keep header hidden, need to disable this code
      // header[0].className = 'effect-01b';
      menuNode.className = 'effect-01b';
      footerNodes[0].className = 'effect-01b';
      twitterNode.className = 'effect-01b';
      panelNode.className = ' effect-01b';
      simpleView = true;
    }
    else {

      // header[0].className = 'effect-01a';
      menuNode.className = 'effect-01a';
      footerNodes[0].className = 'effect-01a';
      twitterNode.className = 'effect-01a';
      panelNode.className = panelNode.className.replace('effect-01b', 'effect-01a');
      simpleView = false;
    }
  }


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


  // Updates all the timer components, alternating between the
  // session and break data when the timer completes an interval
  function update(now) {
    var currentTime = (now - startTime - pauseDuration) / 1000;

    if ((min * 60) - currentTime <= 0) {
      play_track();

      if (index === 0) {
        index = 1;
      }
      else {
        sessions++;
        index = 0;
      }

      min = limits[index];
      color = colors[index];
      soft_reset();
    }

    if (mode === 'b') {
      ctx.fillStyle = '#033';
      ctx.fillRect(0, 0, W, H);
      render_progress_bar(currentTime);
    }
    else {
      ctx.clearRect(0, 0, W, H);
      render_bg_animation(currentTime);
    }
    render_timer(parseInt(currentTime));
  }

  // Continually calls itself until `animation === false`
  function main() {
    var now = Date.now();

    update(now);
    lastTime = now;

    if (animate) {
      window.setTimeout(function() { window.requestAnimationFrame(main); }, fps);
    }
  }

  // Starts the timer
  function start() {
    if (min && clockStart === false) {
      var node = window.getComputedStyle(menuNode, null);
      var prop = node.getPropertyValue('display');

      if (prop === 'block' && openMenu === true) {
        toggle_panel();
      }

      startTime = new Date().getTime();
      animate = true;
      clockStart = true;
      runBtn.innerHTML = 'pause';
      sessionPlus.disabled = true;
      sessionMinus.disabled = true;
      breakPlus.disabled = true;
      breakMinus.disabled = true;
      main();
    }
  }

  // Resets the timer for the next time interval
  function soft_reset() {
    startTime = new Date().getTime();
    degrees = 0;
    lastTime = 0;
    pauseDuration = 0;
  }

  // Resets the timer completely, restoring the default timer values
  function hard_reset() {
    animate = false;
    clockStart = false;
    openMenu = true;
    index = 0;
    startTime = new Date().getTime();
    min = null;
    runBtn.innerHTML = 'start';
    degrees = 0;
    lastTime = 0;
    sessions = 0;
    paused = false;
    pauseStartTime = 0;
    pauseDuration = 0;
    color =  colors[0];
    panelNode.className = 'panel effect-01a';
    mode = mode || 'a';

    if (mode === 'a') {
      modeBtn.innerHTML = 'mode A';
    }
    else {
      modeBtn.innerHTML = 'mode B';
    }

    if (limits.length) {
      sessionData.value = limits[0];
      breakData.value = limits[1];
    }

    sessionPlus.disabled = false;
    sessionMinus.disabled = false;
    breakPlus.disabled = false;
    breakMinus.disabled = false;
    select_mode();
  }

  function init() {
    hard_reset();
  }


/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


  // Event handlers
  runBtn.onclick = start_pause;
  resetBtn.onclick = hard_reset;
  sessionPlus.onclick = function(e) { sessionData.value++; select_mode(); };
  sessionMinus.onclick = function(e) { if (sessionData.value > 1) { sessionData.value--; select_mode(); } };
  breakPlus.onclick = function(e) { breakData.value++; select_mode(); };
  breakMinus.onclick = function(e) { if (breakData.value > 1) { breakData.value--; select_mode(); } };
  menuNode.onclick = toggle_panel;

  modeBtn.onclick = function(e) {
    toggle_mode();

    if (clockStart === false) {
      select_mode();
    }
  };

  window.onkeydown = function(e) {
    if (e.keyCode === 83) {
      toggle_view();
    }
  };

  window.onload = init;

})();
