let _storage = {
	defineDevice: (('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0))
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

		this.dragEndTimeout = (isFinite(config.dragEndTimeout)) ? config.dragEndTimeout : false;

		this.backAgain = (typeof config.backAgain === 'boolean') ? config.backAgain : false;
		this.clone = (typeof config.clone === 'boolean') ? config.clone : false;
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
	}

	dragAnalyse(e){
		//Provide initial values
		let {coordsX, coordsY} = this.elemPos;
		let {top, left} = this.elemOffset;
		let {width, height} = this.elemSize;

		//Calc standart
		let shiftL = (coordsX - left);
		let shiftT = (coordsY - top);
		let dragTop = (e.pageY || e.originalEvent.touches[0].pageY) - shiftT;
		let dragLeft = (e.pageX || e.originalEvent.touches[0].pageX) - shiftL;

		this.lastPoint = {
			x: e.pageX || e.originalEvent.touches[0].pageX,
			y: e.pageY || e.originalEvent.touches[0].pageY
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
		}
	}

	getStartPos(e){
		return {
			coordsX:e.pageX || e.originalEvent.touches[0].pageX,
			coordsY:e.pageY || e.originalEvent.touches[0].pageY
		}
	}

	setCoordsToElem(coords){
		this.dragCurrentElem.css({
			'top': coords.top,
			'left': coords.left
		});
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
						this.clearElem(that.dragLastElem);
					}
				}
				break;
			}

			case 'drag:start':{
				this.lastStartTarget = elem;
				var lastOffset = elem.offset();

				if(that.clone){
					that.dragLastElem = elem;
					that.dragCurrentElem = elem.clone(true);
					runActionElem(that.dragCurrentElem)
				}else{
					that.dragCurrentElem = elem;
					runActionElem(that.dragCurrentElem)
				}

				function runActionElem(current){
					that.clsEvents(_case);
					that.appendInRoot(current);
					that.setCoordsToElem(lastOffset);
					that.elemOffset = that.getOffsetElem(current);
					that.elemSize = that.getSizesElem(current);
					that.elemPos = that.getStartPos(e);

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

			default:
				break;
		}
	}

	controller(){
		var that = this;

		this.$elem.addClass(that.clsDragElem);

		let dragMove = function dragMove(e){
			that.eventsAdapter('drag:move', e);
		};

		this.$body.on(that.eventDragStart, that.elemSelector, function(e){
			that.eventsAdapter('drag:start', e, $(this));
			$(document).on(that.eventDragMove, dragMove);
		});

		this.$body.on(that.eventDragEnd, function(e){
			$(document).off(that.eventDragMove, dragMove);
			that.eventsAdapter('drag:end', e, $(this));
		});

		this.$elem.on('dragstart', function(){
			return false;
		});

		return this;
	}

	init(){
		var that = this;

		if(that.$borderElem){that.setBorders(that.$borderElem,'borders')}
		if(that.destination){that.setBorders($(that.destination.target), 'bordersDestination')}

		that.controller();

		return this;
	}
}
