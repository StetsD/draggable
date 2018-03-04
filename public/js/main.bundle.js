(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _storage = {
    navigation: {
        up: [38],
        right: [39],
        down: [40],
        left: [37],
        step: 10
    },
    defineDevice: 'ontouchstart' in window || navigator.MaxTouchPoints > 0 || navigator.msMaxTouchPoints > 0,
    keyCombo: function keyCombo(key, keySuccess, keyFail) {
        var map = {},
            mapLength = Object.keys(key).length,
            check = {};

        key.map(function (key) {
            map[key] = false;
        });

        $(window).on('keydown', function (e) {
            if (e.keyCode in map) {
                map[e.keyCode] = true;
                var state = 1;

                for (var _key in map) {
                    if (map[_key]) {
                        check[_key] = map[_key];
                    } else {
                        break;
                    }
                }
                for (var _key2 in check) {
                    if (check[_key2] && mapLength === state) {
                        if (keySuccess) {
                            keySuccess();
                        }
                        check = {};
                        state = 0;
                    }
                    state++;
                }
            }
        });

        $(window).on('keyup', function (e) {
            if (e.keyCode in map) {
                map[e.keyCode] = false;
                if (keyFail) {
                    keyFail();
                }
            }
        });
    },
    dragStart: function dragStart(e) {
        _storage.that.eventsAdapter('drag:start', e, $(e.target));
        $(document).on(_storage.that.eventDragMove, _storage.dragMove);
    },
    dragMove: function dragMove(e) {
        _storage.that.eventsAdapter('drag:move', e);
    },
    dragEnd: function dragEnd(e) {
        $(document).off(_storage.that.eventDragMove, _storage.dragMove);
        _storage.that.eventsAdapter('drag:end', e, $(e.target));
    },
    binding: function binding(flag, handler, event) {
        var THIS = _storage.that;
        if (THIS.elemSelector) {
            if (flag == 'bind') {
                THIS.$body.on(event, THIS.elemSelector, handler);
            } else if (flag == 'unbind') {
                THIS.$body.off(event, THIS.elemSelector, handler);
            }
        }
    },
    parseArr: function parseArr(arrA, arrB, strategy) {
        var crossA = {};
        var crossB = {};
        var result = [];

        if (strategy == 'original') {
            arrA.forEach(function (elem, i) {
                crossA[elem.replace(/\s/g, '')] = true;
            });

            arrB.forEach(function (elem, i) {
                if (!crossA[elem.replace(/\s/g, '')]) {
                    result.push(elem);
                }
            });
        }

        if (strategy == 'difference') {
            arrB.forEach(function (elem, i) {
                crossB[elem.replace(/\s/g, '')] = true;
            });
            arrA.forEach(function (elem, i) {
                if (!crossB[elem.replace(/\s/g, '')]) {
                    result.push(elem);
                }
            });
        }

        if (result[0]) {
            return result;
        } else {
            return false;
        }
    }
};

var Draggable = function () {
    function Draggable(config) {
        _classCallCheck(this, Draggable);

        this.$body = $('body');
        this.$elem = $(config.$elem);
        this.elemSelector = config.$elem;
        this.$borderElem = config.$borderElem ? $(config.$borderElem) : false;

        this.clsDragElem = typeof config.clsDragElem === 'string' ? config.clsDragElem : 'adw-drag';
        this.clsDragStart = typeof config.clsDragStart === 'string' ? config.clsDragStart : 'adw-drag_start';
        this.clsDragMove = typeof config.clsDragMove === 'string' ? config.clsDragMove : 'adw-drag_move';
        this.clsDragEnd = typeof config.clsDragEnd === 'string' ? config.clsDragEnd : 'adw-drag_end';
        this.clsDragDest = typeof config.clsDragDest === 'string' ? config.clsDragDest : 'adw-drag_on-dest';

        this.destination = _typeof(config.destination) === 'object' ? config.destination : false;
        this.navigation = config.navigation || false;
        this.imposition = typeof config.imposition === 'string' ? config.imposition : false;

        this.dragEndTimeout = isFinite(config.dragEndTimeout) ? config.dragEndTimeout : false;

        this.backAgain = typeof config.backAgain === 'boolean' ? config.backAgain : false;
        this.clone = typeof config.clone === 'boolean' ? config.clone : false;
        this.cloneKey = isFinite(config.cloneKey) || _typeof(config.cloneKey) === 'object' ? config.cloneKey : false;
        this.clearGarbage = typeof config.clearGarbage === 'boolean' ? config.clearGarbage : false;

        this.callOnTarget = typeof config.callOnTarget === 'function' ? config.callOnTarget : false;
        this.callOutTarget = typeof config.callOutTarget === 'function' ? config.callOutTarget : false;

        this.isTouch = _storage.defineDevice;
        this.eventDragStart = _storage.defineDevice ? 'touchstart' : 'mousedown';
        this.eventDragMove = _storage.defineDevice ? 'touchmove' : 'mousemove';
        this.eventDragEnd = _storage.defineDevice ? 'touchend' : 'mouseup';

        this.lastPoint = {
            x: 0,
            y: 0
        };

        this.elemOffset = {
            left: 0,
            top: 0
        };

        this.onCloneKey = false;
    }

    _createClass(Draggable, [{
        key: 'dragAnalyse',
        value: function dragAnalyse(e, mod) {
            //Provide initial values
            var _elemOffset = this.elemOffset,
                top = _elemOffset.top,
                left = _elemOffset.left;
            var _elemSize = this.elemSize,
                width = _elemSize.width,
                height = _elemSize.height;

            var dragTop = void 0,
                dragLeft = void 0;

            //Define event
            var event = !mod ? 'drag' : 'navigation';
            var eventTop = event == 'drag' ? e.pageY || e.originalEvent.touches[0].pageY : mod.top,
                eventLeft = event == 'drag' ? e.pageX || e.originalEvent.touches[0].pageX : mod.left;

            //Calc standard
            if (event == 'drag') {
                var _elemPos = this.elemPos,
                    coordsX = _elemPos.coordsX,
                    coordsY = _elemPos.coordsY;

                var shiftL = coordsX - left;
                var shiftT = coordsY - top;
                dragTop = eventTop - shiftT;
                dragLeft = eventLeft - shiftL;
            } else {
                dragTop = eventTop;
                dragLeft = eventLeft;
            }

            this.lastPoint = {
                x: eventLeft,
                y: eventTop
            };

            //Calc with borders
            if (this.$borderElem) {
                var _borders = this.borders,
                    bTop = _borders.top,
                    bRight = _borders.right,
                    bBottom = _borders.bottom,
                    bLeft = _borders.left;


                if (dragTop < bTop) {
                    dragTop = bTop;
                }
                if (dragLeft < bLeft) {
                    dragLeft = bLeft;
                }
                if (dragLeft + width > bRight) {
                    dragLeft = bRight - width;
                }
                if (dragTop + height > bBottom) {
                    dragTop = bBottom - height;
                }
            }

            //Calc width destination
            if (this.destination) {
                outer: for (var i = 0; i < this.bordersDestination.length; i++) {
                    var _bordersDestination$i = this.bordersDestination[i],
                        bdTop = _bordersDestination$i.top,
                        bdRight = _bordersDestination$i.right,
                        bdBottom = _bordersDestination$i.bottom,
                        bdLeft = _bordersDestination$i.left,
                        dragBottom = dragTop + height,
                        dragRight = dragLeft + width;

                    if (dragBottom > bdTop && dragRight > bdLeft && dragLeft < bdRight && dragTop < bdBottom) {

                        if (!this.destination.strict) {
                            this.clsEvents('drag:onDest');
                            this.onTarget = this.bordersDestination[i].elem[0];
                        } else {
                            if (bdTop <= dragTop && bdBottom >= dragBottom && bdLeft <= dragLeft && bdRight >= dragRight) {
                                this.clsEvents('drag:onDest');
                                this.onTarget = this.bordersDestination[i].elem[0];
                            } else {
                                this.clsEvents('drag:outDest');
                            }
                        }
                        break outer;
                    } else {
                        this.onTarget = false;
                        this.clsEvents('drag:outDest');
                    }
                }
            }

            //Calc width imposition
            if (this.imposition) {

                var cssTop = parseInt(this.dragCurrentElem.css('top')),
                    cssLeft = parseInt(this.dragCurrentElem.css('left'));

                outer: for (var i = 0; i < this.bordersImposition.length; i++) {
                    var _bordersImposition$i = this.bordersImposition[i],
                        bdTop = _bordersImposition$i.top,
                        bdRight = _bordersImposition$i.right,
                        bdBottom = _bordersImposition$i.bottom,
                        bdLeft = _bordersImposition$i.left,
                        cssBottom = cssTop + height,
                        cssRight = cssLeft + width,
                        dragBottom = dragTop + height,
                        dragRight = dragLeft + width;


                    if (dragBottom >= bdTop && dragRight >= bdLeft && dragLeft <= bdRight && dragTop <= bdBottom) {

                        if (cssBottom >= bdTop) {
                            dragTop = cssTop;
                        }

                        if (cssTop <= bdBottom) {
                            dragTop = cssTop;
                        }

                        if (cssRight >= bdLeft) {
                            dragLeft = cssLeft;
                        }

                        if (dragLeft <= bdRight) {
                            dragLeft = cssLeft;
                        }
                    }
                }
            }

            //Set summary value
            this.setCoordsToElem({ top: dragTop, left: dragLeft });
        }
    }, {
        key: 'getSizesElem',
        value: function getSizesElem(elem) {
            var element = typeof elem == 'string' ? $(elem) : elem;
            return {
                width: element.innerWidth(),
                height: element.innerHeight()
            };
        }
    }, {
        key: 'getOffsetElem',
        value: function getOffsetElem(elem) {
            var element = typeof elem == 'string' ? $(elem) : elem;
            return {
                top: element.offset().top,
                left: element.offset().left
            };
        }
    }, {
        key: 'getStartPos',
        value: function getStartPos(e) {
            return {
                coordsX: e.pageX || e.originalEvent.touches[0].pageX,
                coordsY: e.pageY || e.originalEvent.touches[0].pageY
            };
        }
    }, {
        key: 'setCoordsToElem',
        value: function setCoordsToElem(coords, elem) {
            var element = elem || this.dragCurrentElem;
            element.css({
                'top': coords.top,
                'left': coords.left
            });
        }
    }, {
        key: 'clearElem',
        value: function clearElem(elem) {
            elem.remove();
        }
    }, {
        key: 'appendInRoot',
        value: function appendInRoot(elem) {
            $('body').append(elem);
        }
    }, {
        key: 'setBorders',
        value: function setBorders(elem, name) {
            var that = this;
            if (elem.length) {
                if (name == 'borders') {
                    setB(elem, name, 'object');
                } else {
                    $.each(elem, function (i, el) {
                        setB($(el), name, 'array');
                    });
                }
            }
            function setB(elem, name, flag) {
                var _that$getOffsetElem = that.getOffsetElem(elem),
                    top = _that$getOffsetElem.top,
                    left = _that$getOffsetElem.left,
                    _that$getSizesElem = that.getSizesElem(elem),
                    height = _that$getSizesElem.height,
                    width = _that$getSizesElem.width,
                    pack = {
                    right: width + left,
                    bottom: height + top,
                    top: top, left: left, elem: elem
                };

                if (flag == 'object') {
                    that[name] = pack;
                } else {
                    if (!that[name]) {
                        that[name] = [];
                    }
                    that[name].push(pack);
                }

                return that[name];
            }
        }
    }, {
        key: 'clsEvents',
        value: function clsEvents(_case) {
            var that = this;

            if (!that.dragCurrentElem) {
                return false;
            }
            var elem = that.dragCurrentElem,
                classList = elem[0].classList;

            switch (_case) {
                case 'drag:move':
                    {
                        if (!classList.contains(that.clsDragMove)) {
                            elem.addClass(that.clsDragMove);
                        }

                        if (classList.contains(that.clsDragStart)) {
                            elem.removeClass(that.clsDragStart);
                        }

                        break;
                    }

                case 'drag:end':
                    {
                        elem.removeClass(that.clsDragMove + ' ' + that.clsDragStart + ' ' + that.clsDragDest);

                        if (!classList.contains(that.clsDragEnd)) {
                            elem.addClass(that.clsDragEnd);
                        }

                        if (that.dragEndTimeout) {
                            setTimeout(function () {
                                elem.removeClass(that.clsDragEnd);
                            }, that.dragEndTimeout);
                        }

                        break;
                    }

                case 'drag:start':
                    {
                        elem.removeClass(that.clsDragEnd);
                        elem.addClass(that.clsDragStart);

                        break;
                    }

                case 'drag:onDest':
                    {
                        if (!classList.contains(that.clsDragDest)) {
                            elem.addClass(that.clsDragDest);
                        }

                        break;
                    }

                case 'drag:outDest':
                    {
                        if (classList.contains(that.clsDragDest)) {
                            elem.removeClass(that.clsDragDest);
                        }

                        break;
                    }

                default:
                    break;
            }
        }
    }, {
        key: 'eventsAdapter',
        value: function eventsAdapter(_case, e, elem) {
            var that = this;

            switch (_case) {
                case 'drag:move':
                    {
                        that.clsEvents(_case);
                        that.dragAnalyse(e);

                        break;
                    }

                case 'drag:end':
                    {
                        var pageX = e.pageX,
                            pageY = e.pageY;

                        that.dragLastElem = that.dragCurrentElem;

                        if (that.lastPoint.x == pageX && that.lastPoint.y == pageY) {
                            that.clsEvents(_case);
                            if (that.onTarget) {
                                this.eventsAdapter('drag:onDest', e, elem);
                            } else {
                                this.eventsAdapter('drag:outDest', e, elem);
                            }
                            if (that.backAgain && !that.clone) {
                                that.setCoordsToElem(that.elemOffset);
                            }
                            if (this.clearGarbage && this.clone) {
                                if (!this.cloneKey) {
                                    this.clearElem(that.dragLastElem);
                                    that.dragCurrentElem = null;
                                }
                            }
                        }
                        break;
                    }

                case 'drag:start':
                    {
                        var _middleAction = function _middleAction(condition) {
                            if (condition == 'success') {
                                that.dragLastElem = elem;
                                that.dragCurrentElem = elem.clone(true);
                                that.dragCurrentElem.cloned = true;
                            } else if (condition == 'fail') {
                                that.dragCurrentElem = elem;
                            }
                        };

                        var _runActionElem = function _runActionElem(current) {
                            that.clsEvents(_case);
                            that.appendInRoot(current);
                            that.setCoordsToElem(lastOffset);
                            that.elemOffset = that.getOffsetElem(current);
                            that.elemSize = that.getSizesElem(current);
                            that.elemPos = that.getStartPos(e);
                            that.globals = true;

                            that.dragAnalyse(e);
                        };

                        this.lastStartTarget = elem;
                        var lastOffset = elem.offset();

                        if (that.cloneKey) {
                            if (that.onCloneKey) {
                                _middleAction('success');
                                _runActionElem(that.dragCurrentElem);
                            } else {
                                _middleAction('fail');
                                _runActionElem(that.dragCurrentElem);
                            }
                        } else {
                            if (that.clone) {
                                _middleAction('success');
                                _runActionElem(that.dragCurrentElem);
                            } else {
                                _middleAction('fail');
                                _runActionElem(that.dragCurrentElem);
                            }
                        }

                        break;
                    }

                case 'drag:onDest':
                    {
                        this.callOnTarget && this.callOnTarget(that.onTarget, that.dragCurrentElem, that.lastStartTarget, that.lastPoint);
                        if (this.clearGarbage) {
                            this.clone ? this.clearElem(that.dragLastElem) : this.clearElem(that.dragCurrentElem);
                        }
                        break;
                    }

                case 'drag:outDest':
                    {
                        this.callOutTarget && this.callOutTarget(that.dragCurrentElem, that.lastStartTarget, that.lastPoint);
                        break;
                    }

                case 'key:up':
                    {
                        navigationHandler(_case, that);
                        break;
                    }

                case 'key:right':
                    {
                        navigationHandler(_case, that);
                        break;
                    }

                case 'key:down':
                    {
                        navigationHandler(_case, that);
                        break;
                    }

                case 'key:left':
                    {
                        navigationHandler(_case, that);
                        break;
                    }

                default:
                    break;
            }

            function navigationHandler(command, that) {
                if (!that.dragCurrentElem) {
                    that.dragCurrentElem = that.$elem.eq(0);
                }
                var elem = that.dragCurrentElem;
                var step = that.navigation.step || _storage.navigation.step;

                if (!that.dragCurrentElem.cloned) {
                    that.dragCurrentElem = elem.clone(true);
                    that.dragCurrentElem.cloned = true;
                    that.appendInRoot(that.dragCurrentElem);
                    elem.remove();
                }

                if (!that.globals) {
                    that.appendInRoot(that.dragCurrentElem);
                    that.dragCurrentElem.css({
                        'left': 0,
                        'top': 0
                    });
                    that.globals = true;
                }

                that.elemOffset = that.getOffsetElem(that.dragCurrentElem);
                that.elemSize = that.getSizesElem(that.dragCurrentElem);

                var _that$elemOffset = that.elemOffset,
                    top = _that$elemOffset.top,
                    left = _that$elemOffset.left,
                    modTop = void 0,
                    modLeft = void 0;

                if (command == 'key:up') {
                    modTop = top - step;
                    modLeft = left;
                }
                if (command == 'key:down') {
                    modTop = top + step;
                    modLeft = left;
                }
                if (command == 'key:left') {
                    modLeft = left - step;
                    modTop = top;
                }
                if (command == 'key:right') {
                    modLeft = left + step;
                    modTop = top;
                }

                if (modTop == $(window).innerHeight()) {
                    modTop = 0;
                }

                that.dragAnalyse(null, { top: modTop, left: modLeft });
            }
        }
    }, {
        key: 'controller',
        value: function controller() {
            var that = this;

            this.$elem.addClass(that.clsDragElem);

            _storage.binding('bind', _storage.dragStart, that.eventDragStart);

            _storage.binding('bind', _storage.dragEnd, that.eventDragEnd);

            this.$body.on('dragstart', this.elemSelector, function () {
                return false;
            });

            if (that.cloneKey) {
                _storage.keyCombo(that.cloneKey, function () {
                    that.onCloneKey = true;
                }, function () {
                    that.onCloneKey = false;
                });
            }

            if (that.navigation) {
                var _that$navigation = that.navigation,
                    up = _that$navigation.up,
                    right = _that$navigation.right,
                    down = _that$navigation.down,
                    left = _that$navigation.left,
                    _storage$navigation = _storage.navigation,
                    _storageUp = _storage$navigation._storageUp,
                    _storageRight = _storage$navigation._storageRight,
                    _storageDown = _storage$navigation._storageDown,
                    _storageLeft = _storage$navigation._storageLeft;


                var keyUp = up || _storageUp,
                    keyRight = right || _storageRight,
                    keyDown = down || _storageDown,
                    keyLeft = left || _storageLeft;

                setTimeout(function () {
                    _storage.keyCombo(keyUp, function () {
                        that.eventsAdapter('key:up');
                    });
                }, 0);

                setTimeout(function () {
                    _storage.keyCombo(keyRight, function () {
                        that.eventsAdapter('key:right');
                    });
                }, 0);

                _storage.keyCombo(keyDown, function () {
                    that.eventsAdapter('key:down');
                });
                _storage.keyCombo(keyLeft, function () {
                    that.eventsAdapter('key:left');
                });
            }

            return this;
        }
    }, {
        key: 'bind',
        value: function bind(elem) {
            var oldSelectors = this.elemSelector.split(','),
                newSelectors = elem.split(',');

            if (!oldSelectors[0]) {
                oldSelectors.splice(0, 1);
            }

            var completeSelectors = _storage.parseArr(oldSelectors, newSelectors, 'original');

            if (completeSelectors) {
                completeSelectors.forEach(function (elem) {
                    oldSelectors.push(elem);
                });

                this.elemSelector = oldSelectors.join(',');
                _storage.binding('bind', _storage.dragStart, this.eventDragStart);

                this.controller();
            }
        }
    }, {
        key: 'unbind',
        value: function unbind(elem) {
            var oldSelectors = this.elemSelector.split(','),
                newSelectors = elem.split(',');

            var completeSelectors = _storage.parseArr(oldSelectors, newSelectors, 'difference');

            if (completeSelectors) {
                _storage.binding('unbind', _storage.dragStart, this.eventDragStart);
                this.elemSelector = completeSelectors.join(',');
            } else {
                _storage.binding('unbind', _storage.dragStart, this.eventDragStart);
                this.elemSelector = '';
            }

            this.controller();
        }
    }, {
        key: 'set',
        value: function set(params) {
            for (var key in params) {
                if (this.hasOwnProperty(key)) {
                    this[key] = params[key];
                } else {
                    throw new TypeError('Option ' + i + ' does not exist');
                }
            }

            this.init();
            return this;
        }
    }, {
        key: 'init',
        value: function init() {
            var that = this;
            _storage.that = this;

            that.$elem = $(that.$elem);

            if (that.$borderElem) {
                that.setBorders(that.$borderElem, 'borders');
            }
            if (that.destination) {
                that.setBorders($(that.destination.target), 'bordersDestination');
            }
            if (that.imposition) {
                that.setBorders($(that.imposition), 'bordersImposition');
            }

            that.controller();

            return this;
        }
    }]);

    return Draggable;
}();

exports.default = Draggable;

},{}],3:[function(require,module,exports){
'use strict';

//import Rx from 'rxjs/Rx';

var _dragndrop = require('./modules/dragndrop');

var _dragndrop2 = _interopRequireDefault(_dragndrop);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

document.addEventListener('DOMContentLoaded', function () {

    // var arr = [2,3,4,29,88];
    //
    // document.querySelector('button').addEventListener('click', function(){
    //     arr.push(33)
    // }, false);
    //
    //
    // const observer = {
    //     next: function nextCallback(data){
    //         console.log(data);
    //     },
    //
    //     complete: function completeCallback(){
    //         console.log('done');
    //     },
    //
    //     error: function errorCallback(err){
    //         console.log(err);
    //     }
    // };
    //
    //
    // function mapFn(transformationFn){
    //     const inputObservable = this;
    //     const outputObservable = createObservable(function subscribe(obs){
    //         inputObservable.subscribe({
    //             next: (x) => obs.next(transformationFn(x)),
    //             complete: () => obs.complete(),
    //             error: (err) => obs.error(err)
    //         })
    //     });
    //
    //     return outputObservable;
    // }
    //
    //
    // function filterFn(conditionFn){
    //     const inputObservable = this;
    //     const outputObservable = createObservable(function subscribe(obs){
    //         inputObservable.subscribe({
    //             next: (x) => conditionFn(x) && obs.next(x),
    //             complete: () => obs.complete(),
    //             error: (err) => obs.error()
    //         })
    //     });
    //     return outputObservable;
    // }
    //
    //
    // function createObservable(subscribeFn){
    //     return {
    //         filter: filterFn,
    //         map: mapFn,
    //         subscribe: subscribeFn
    //     }
    // }
    //
    // const arrayObservable = createObservable(function subscribe(obs){
    //     console.log(obs);
    //     arr.forEach(obs.next);
    //     obs.complete();
    // });
    //
    //
    // arrayObservable
    //     .filter(x => x % 2)
    //     .map(x => x * 10)
    //     .subscribe(observer);
    //
    //
    //
    //
    //
    // const $search = $('#search');
    // const $$list = $('#list');
    //
    // const input$ = Rx.Observable.fromEvent($search, 'input');
    //
    // input$
    //     .map((e) => e.target.value)
    //     .filter(text=>text.length > 2)
    //     .debounceTime(200)
    //     .switchMap(getUsers)
    //     .pluck('items')
    //     .subscribe(data=>console.log(data));
    //
    //
    // function getUsers(text){
    //     const response = fetch('https://api.github.com/search/users?q=' + text)
    //         .then(resp => resp.json());
    //
    //     return Rx.Observable.fromPromise(response);
    // }


    // const {fromEvent} = Rx.Observable;
    // const target = document.querySelector('.box');
    // const wrap = document.querySelector('.wrap');
    //
    // const mouseup = Rx.Observable.fromEvent(target, 'mouseup');
    // const mousemove = Rx.Observable.fromEvent(wrap, 'mousemove');
    // const mousedown = Rx.Observable.fromEvent(target, 'mousedown');
    //
    // const mousedrag = mousedown.flatMap(md => {
    //
    //     const startX = md.clientX + window.scrollX,
    //         startY = md.clientY + window.scrollY,
    //         startLeft = parseInt(md.target.style.left, 10) || 0,
    //         startTop = parseInt(md.target.style.top, 10) || 0;
    //
    //     return mousemove.map(mm => {
    //         mm.preventDefault();
    //
    //         return {
    //             left: startLeft + mm.clientX - startX,
    //             top: startTop + mm.clientY - startY
    //         };
    //     }).takeUntil(mouseup);
    // });
    //
    // const subsctiption = mousedrag.subscribe(pos=>{
    //     target.style.top = pos.top + 'px';
    //     target.style.left = pos.left + 'px';
    // });


    var drag = new _dragndrop2.default({
        $elem: '.box, .boxa',
        $borderElem: '.wrap',
        dragEndTimeout: 100,

        //backAgain: false,
        //clearGarbage: false,

        //clone: true,
        //cloneKey: [17, 18],
        callOnTarget: function callOnTarget(target, elem, _callOnTarget, lastPoint) {
            console.log(target);
            console.log(elem);
            console.log(_callOnTarget);
            console.log(lastPoint);
        },
        callOutTarget: function callOutTarget(elem, callOnTarget, lastPoint) {
            console.log(elem);
            console.log(callOnTarget);
            console.log(lastPoint);
        },
        //destination:{
        //    target: '.dest',
        //    strict: true
        //},
        //imposition: '.wall,.walla',

        navigation: {
            up: [38],
            right: [39],
            down: [40],
            left: [37],
            speed: 100,
            step: 10
        }
    }).init();

    window.draga = drag;
    console.log(drag);

    $('.input').on('change', function () {
        var val = $(this).val(),
            param = $(this).attr('name');

        if (param.indexOf('method:') !== -1) {
            var clearMethod = param.slice(7);

            if (clearMethod == 'bind') {
                drag.bind(val);
            }
            if (clearMethod == 'unbind') {
                drag.unbind(val);
            }
        } else {
            if (val == 'true' || val == 'false') {
                val = val == 'true' ? true : false;
            }
            if (param == 'cloneKey') {
                var valClear = val.split(',');
                val = [];
                valClear.forEach(function (elem) {
                    val.push(parseInt(elem.replace(/\[|\]/g, '')));
                });
            }
            if (param == 'destination') {
                val = { target: val, strict: false };
            }
            if (param == 'strict') {
                var _valClear = val == 'true' ? true : false;
                val = { target: '.dest', strict: val };
                param = 'destination';
            }
            drag.set(_defineProperty({}, param, val));
        }

        $(this).val('');
        console.log(param, val);
    });
});

},{"./modules/dragndrop":2,"events":1}]},{},[3])

//# sourceMappingURL=rx.bundle.js.map
