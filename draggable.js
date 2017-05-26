let _storage = {
	navigation: {
		up: [38],
		right: [39],
		down: [40],
		left: [37],
		speed: 100,
		step: 10
	},
	defineDevice: (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)),
	keyCombo: function(key, keySuccess, keyFail){
		var map = {},
			mapLength = Object.keys(key).length,
			check = {};

		key.map(function(key){
			map[key] = false;
		});

		$(window).on('keydown', function(e){
			if(e.keyCode in map){
				map[e.keyCode] = true;
				let state = 1;

				for(let key in map){
					if(map[key]){
						check[key] = map[key];
					}else{
						break;
					}
				}
				for(let key in check){
					if(check[key] && mapLength === state){
						if(keySuccess){keySuccess()}
						check = {};
						state = 0;
					}
					state++;
				}
			}
		});

		$(window).on('keyup', function(e){
			if(e.keyCode in map){
				map[e.keyCode] = false;
				if(keyFail){keyFail()}
			}
		});
	},
	dragStart: function dragStart(e){
		_storage.that.eventsAdapter('drag:start', e, $(e.target));
		$(document).on(_storage.that.eventDragMove, _storage.dragMove);
	},
	dragMove: function dragMove(e){
		_storage.that.eventsAdapter('drag:move', e);
	},
	dragEnd: function (e) {
		$(document).off(_storage.that.eventDragMove, _storage.dragMove);
		_storage.that.eventsAdapter('drag:end', e, $(e.target));
	},
	binding: function(flag, handler, event){
		const THIS = _storage.that;
		if(flag == 'bind'){
			THIS.$body.on(event, THIS.elemSelector, handler);
		}else if(flag == 'unbind'){
			THIS.$body.off(event, THIS.elemSelector, handler);
		}
	}
};

export default class Draggable {
	constructor(config){
		this.$body = $('body');
		this.$elem = $(config.$elem);
		this.elemSelector = config.$elem;
		this.$borderElem = (config.$borderElem) ? $(config.$borderElem) : false;

		this.clsDragElem = (typeof config.clsDragElem === 'string') ? config.clsDragElem : 'adw-drag';
		this.clsDragStart = (typeof config.clsDragStart === 'string') ? config.clsDragStart : 'adw-drag_start';
		this.clsDragMove = (typeof config.clsDragMove === 'string') ? config.clsDragMove : 'adw-drag_move';
		this.clsDragEnd = (typeof config.clsDragEnd === 'string') ? config.clsDragEnd : 'adw-drag_end';
		this.clsDragDest = (typeof config.clsDragDest === 'string') ? config.clsDragDest : 'adw-drag_on-dest';

		this.destination = (typeof config.destination === 'object') ? config.destination : false;
		this.navigation = config.navigation || false;
		this.imposition = (typeof config.imposition === 'string') ? config.imposition : false;

		this.dragEndTimeout = (isFinite(config.dragEndTimeout)) ? config.dragEndTimeout : false;

		this.backAgain = (typeof config.backAgain === 'boolean') ? config.backAgain : false;
		this.clone = (typeof config.clone === 'boolean') ? config.clone : false;
		this.cloneKey = (isFinite(config.cloneKey) || typeof config.cloneKey === 'object') ? config.cloneKey : false;
		this.clearGarbage = (typeof config.clearGarbage === 'boolean') ? config.clearGarbage : false;

		this.callOnTarget = (typeof config.callOnTarget === 'function') ? config.callOnTarget : false;
		this.callOutTarget = (typeof config.callOutTarget === 'function') ? config.callOutTarget : false;

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

	dragAnalyse(e, mod){
		//Provide initial values
		let {top, left} = this.elemOffset;
		let {width, height} = this.elemSize;
		let dragTop,dragLeft;

		//Define event
		let event = !mod ? 'drag' : 'navigation';
		let eventTop = event == 'drag' ? (e.pageY || e.originalEvent.touches[0].pageY) : (mod.top),
			eventLeft = event == 'drag' ? (e.pageX || e.originalEvent.touches[0].pageX) : (mod.left);

		//Calc standard
		if(event == 'drag'){
			let {coordsX, coordsY} = this.elemPos;
			let shiftL = (coordsX - left);
			let shiftT = (coordsY - top);
			dragTop = eventTop - shiftT;
			dragLeft = eventLeft - shiftL;
		}else{
			dragTop = eventTop;
			dragLeft = eventLeft;
		}


		this.lastPoint = {
			x: eventLeft,
			y: eventTop
		};

		//Calc with borders
		if(this.$borderElem){
			let {top:bTop,right:bRight,bottom:bBottom,left:bLeft} = this.borders;

			if(dragTop < bTop){
				dragTop = bTop;
			}
			if(dragLeft < bLeft){
				dragLeft = bLeft;
			}
			if(dragLeft+width > bRight){
				dragLeft = bRight-width;
			}
			if(dragTop+height > bBottom){
				dragTop = bBottom-height;
			}
		}

		//Calc width destination
		if(this.destination){
			outer: for(var i = 0; i < this.bordersDestination.length; i++){
				let {top:bdTop,right:bdRight,bottom:bdBottom,left:bdLeft} = this.bordersDestination[i],
					dragBottom = dragTop+height,
					dragRight = dragLeft+width;
				if((dragBottom > bdTop && dragRight > bdLeft) && (dragLeft < bdRight && dragTop < bdBottom)){

					if(!this.destination.strict){
						this.clsEvents('drag:onDest');
						this.onTarget = this.bordersDestination[i].elem[0];
					}else{
						if(bdTop <= dragTop && bdBottom >= dragBottom && bdLeft <= dragLeft && bdRight >= dragRight){
							this.clsEvents('drag:onDest');
							this.onTarget = this.bordersDestination[i].elem[0];
						}else{
							this.clsEvents('drag:outDest');
						}
					}
					break outer;
				}else{
					this.onTarget = false;
					this.clsEvents('drag:outDest');
				}
			}
		}

		//Calc width imposition
		if(this.imposition){

			var cssTop = parseInt(this.dragCurrentElem.css('top')),
				cssLeft = parseInt(this.dragCurrentElem.css('left'));

			outer: for(var i = 0; i < this.bordersImposition.length; i++){
				let {top:bdTop,right:bdRight,bottom:bdBottom,left:bdLeft} = this.bordersImposition[i],
					cssBottom = cssTop+height,
					cssRight = cssLeft+width,
					dragBottom = dragTop+height,
					dragRight = dragLeft+width;

				if(dragBottom >= bdTop && dragRight >= bdLeft && dragLeft <= bdRight && dragTop <= bdBottom){

					if(cssBottom >= bdTop){
						dragTop = cssTop;
					}

					if(cssTop <= bdBottom){
						dragTop = cssTop;
					}

					if(cssRight >= bdLeft){
						dragLeft = cssLeft;
					}

					if(dragLeft <= bdRight){
						dragLeft = cssLeft;
					}
				}
			}
		}

		//Set summary value
		this.setCoordsToElem({top: dragTop, left: dragLeft});
	}

	getSizesElem(elem){
		return {
			width:elem.innerWidth(),
			height:elem.innerHeight()
		}
	}

	getOffsetElem(elem){
		return {
			top:elem.offset().top,
			left:elem.offset().left
		};
	}

	getStartPos(e){
		return {
			coordsX:e.pageX || e.originalEvent.touches[0].pageX,
			coordsY:e.pageY || e.originalEvent.touches[0].pageY
		}
	}

	setCoordsToElem(coords, elem){
		let element = elem || this.dragCurrentElem;
		if(coords.top){
			element.css({
				'top': coords.top
			});
		}
		if(coords.left){
			element.css({
				'left': coords.left
			});
		}
	}

	clearElem(elem){
		elem.remove();
	}

	appendInRoot(elem){
		$('body').append(elem);
	}

	setBorders(elem, name){
		let that = this;
		if(elem.length){
			if(name == 'borders'){
				setB(elem, name, 'object');
			}else{
				$.each(elem, function(i, el){
					setB($(el), name, 'array');
				})
			}
		}
		function setB(elem, name, flag){
			let {top, left} = that.getOffsetElem(elem),
				{height, width} = that.getSizesElem(elem),
				pack = {
					right: width + left,
					bottom: height + top,
					top,left,elem
				};

			if(flag == 'object'){
				that[name] = pack;
			}else{
				if(!that[name]){that[name] = []}
				that[name].push(pack)
			}

			return that[name];
		}
	}

	clsEvents(_case){
		let that = this;

		if(!that.dragCurrentElem){return false}
		let elem = that.dragCurrentElem,
			classList = elem[0].classList;

		switch(_case){
			case 'drag:move':{
				if(!classList.contains(that.clsDragMove)){
					elem.addClass(that.clsDragMove);
				}

				if(classList.contains(that.clsDragStart)){
					elem.removeClass(that.clsDragStart);
				}

				break;
			}

			case 'drag:end':{
				elem.removeClass(`${that.clsDragMove} ${that.clsDragStart} ${that.clsDragDest}`);

				if(!classList.contains(that.clsDragEnd)){
					elem.addClass(that.clsDragEnd);
				}

				if(that.dragEndTimeout){
					setTimeout(function(){
						elem.removeClass(that.clsDragEnd);
					}, that.dragEndTimeout);
				}

				break;
			}

			case 'drag:start':{
				elem.removeClass(that.clsDragEnd);
				elem.addClass(that.clsDragStart);

				break;
			}

			case 'drag:onDest':{
				if(!classList.contains(that.clsDragDest)){
					elem.addClass(that.clsDragDest);
				}

				break;
			}

			case 'drag:outDest':{
				if(classList.contains(that.clsDragDest)){
					elem.removeClass(that.clsDragDest);
				}

				break;
			}

			default:
				break;
		}
	}

	eventsAdapter(_case, e, elem){
		let that = this;

		switch(_case){
			case 'drag:move':{
				that.clsEvents(_case);
				that.dragAnalyse(e);

				break;
			}

			case 'drag:end':{
				let pageX = e.pageX,
					pageY = e.pageY;

				that.dragLastElem = that.dragCurrentElem;

				if(that.lastPoint.x == pageX && that.lastPoint.y == pageY){
					that.clsEvents(_case);
					if(that.onTarget){
						this.eventsAdapter('drag:onDest', e, elem);
					}else{
						this.eventsAdapter('drag:outDest', e, elem);
					}
					if(that.backAgain && !that.clone){
						that.setCoordsToElem(that.elemOffset);
					}
					if(this.clearGarbage && this.clone){
						if(!this.cloneKey){
							this.clearElem(that.dragLastElem);
							that.dragCurrentElem = null;
						}
					}
				}
				break;
			}

			case 'drag:start':{
				this.lastStartTarget = elem;
				var lastOffset = elem.offset();

				if(that.cloneKey){
					if(that.onCloneKey){
						middleAction('success');
						runActionElem(that.dragCurrentElem);
					}else{
						middleAction('fail');
						runActionElem(that.dragCurrentElem)
					}
				}else{
					if(that.clone){
						middleAction('success');
						runActionElem(that.dragCurrentElem);
					}else{
						middleAction('fail');
						runActionElem(that.dragCurrentElem)
					}
				}

				function middleAction(condition){
					if(condition == 'success'){
						that.dragLastElem = elem;
						that.dragCurrentElem = elem.clone(true);
						that.dragCurrentElem.cloned = true;
					}else if(condition == 'fail'){
						that.dragCurrentElem = elem;
					}
				}

				function runActionElem(current){
					that.clsEvents(_case);
					that.appendInRoot(current);
					that.setCoordsToElem(lastOffset);
					that.elemOffset = that.getOffsetElem(current);
					that.elemSize = that.getSizesElem(current);
					that.elemPos = that.getStartPos(e);
					that.globals = true;

					that.dragAnalyse(e);
				}

				break;
			}

			case 'drag:onDest':{
				this.callOnTarget && this.callOnTarget(that.onTarget, that.dragCurrentElem, that.lastStartTarget, that.lastPoint);
				if(this.clearGarbage){
					this.clone ? this.clearElem(that.dragLastElem) : this.clearElem(that.dragCurrentElem);
				}
				break;
			}

			case 'drag:outDest':{
				this.callOutTarget && this.callOutTarget(that.dragCurrentElem, that.lastStartTarget, that.lastPoint);
				break;
			}

			case 'key:up':{
				navigationHandler(_case, that);
				break;
			}

			case 'key:right':{
				navigationHandler(_case, that);
				break;
			}

			case 'key:down':{
				navigationHandler(_case, that);
				break;
			}

			case 'key:left':{
				navigationHandler(_case, that);
				break;
			}

			default:
				break;
		}

		function navigationHandler(command, that){
			if(!that.dragCurrentElem){that.dragCurrentElem = that.$elem.eq(0)}
			let elem = that.dragCurrentElem;
			let step = that.navigation.step || _storage.navigation.step;

			if(!that.dragCurrentElem.cloned){
				that.dragCurrentElem = elem.clone(true);
				that.dragCurrentElem.cloned = true;
				that.appendInRoot(that.dragCurrentElem);
				elem.remove();
			}

			if(!that.globals){
				that.appendInRoot(that.dragCurrentElem);
				that.dragCurrentElem.css({
					'left': 0,
					'top': 0
				});
				that.globals = true;
			}


			that.elemOffset = that.getOffsetElem(that.dragCurrentElem);
			that.elemSize = that.getSizesElem(that.dragCurrentElem);

			let {top, left} = that.elemOffset,
				modTop, modLeft;
			if(command == 'key:up'){
				modTop = top - step;
				modLeft = left;
			}
			if(command == 'key:down'){
				modTop = top + step;
				modLeft = left;
			}
			if(command == 'key:left'){
				modLeft = left - step;
				modTop = top;
			}
			if(command == 'key:right'){
				modLeft = left + step;
				modTop = top;
			}

			if(modTop == $(window).innerHeight()){
				modTop = 0;
			}

			that.dragAnalyse(null, {top: modTop, left: modLeft});
		}
	}

	controller(){
		var that = this;

		this.$elem.addClass(that.clsDragElem);

		_storage.binding('bind', _storage.dragStart, that.eventDragStart);

		_storage.binding('bind', _storage.dragEnd, that.eventDragEnd);

		this.$elem.on('dragstart', function(){
			return false;
		});

		if(that.cloneKey){
			_storage.keyCombo(that.cloneKey, ()=>{
				that.onCloneKey = true;
			}, ()=>{
				that.onCloneKey = false;
			});
		}

		if(that.navigation){
			let {up, right, down, left} = that.navigation,
				{_storageUp, _storageRight, _storageDown, _storageLeft} = _storage.navigation;

			let keyUp = up || _storageUp,
				keyRight = right || _storageRight,
				keyDown = down || _storageDown,
				keyLeft = left || _storageLeft;

			setTimeout(function(){
				_storage.keyCombo(keyUp, ()=>{
					that.eventsAdapter('key:up');
				});
			}, 0);

			setTimeout(function(){
				_storage.keyCombo(keyRight, ()=>{
					that.eventsAdapter('key:right');
				});
			}, 0);


			_storage.keyCombo(keyDown, ()=>{
				that.eventsAdapter('key:down');
			});
			_storage.keyCombo(keyLeft, ()=>{
				that.eventsAdapter('key:left');
			});
		}

		return this;
	}

	bind(elem){
		let oldSelectors;
		if(this.elemSelector.indexOf(',') !== -1){
			oldSelectors = this.elemSelector.split(',').push(elem);
		}else{
			oldSelectors = this.elemSelector.split();
		}
		oldSelectors.push(elem);

		this.elemSelector = oldSelectors.join(',');
		_storage.binding('bind', _storage.dragStart, this.eventDragStart);

		this.controller();
	}

	unbind(elem){
		var oldSelectors = this.elemSelector.split(','),
			newSelectors = [];
		oldSelectors.filter((el)=> {
			if(elem !== el.replace(/\s/g, '')){newSelectors.push(el)}
		});
		_storage.binding('unbind', _storage.dragStart, this.eventDragStart);
		this.elemSelector = newSelectors.join(',');

		this.controller();
	}

	init(){
		var that = this;
		_storage.that = this;

		if(that.$borderElem){that.setBorders(that.$borderElem,'borders')}
		if(that.destination){that.setBorders($(that.destination.target), 'bordersDestination')}
		if(that.imposition){that.setBorders($(that.imposition), 'bordersImposition')}

		that.controller();

		return this;
	}
}