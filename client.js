angular.module('SVGApp', []).directive('snap', function() {
    return {
	    restrict: "EAC",
	    transclude: true,
	    template: "<div tabindex=1><svg style='width:630px;height:891px'></svg></div>",
	    scope: {},
	    link: function( scope, element, attrs) {
	        var s = Snap($(element).find("svg")[0]);
	        var scale = 3.0;
	        var matrix = new Snap.Matrix();
	        matrix.scale(scale, scale);
	        var lineHeight = 7;
	        var elem = s.text(25,25+lineHeight,'').attr({'font-size':6});
	        //console.log(elem.attr('font-size'));
	        
			scope.document = { size:{ width:210, height: 297}, margins: {left:20, top:25, right: 20, bottom:25}};
			scope.pages = [ { lines:[{y1:25, y2:(25+lineHeight), indent:0, fragments:[{x:20, elem:elem}], stops:[scope.document.margins.left,  scope.document.size.width-scope.document.margins.right]}], objects:[{ type:'img', src: 'http://postmania.org/wp-content/uploads/2010/05/3662229028_b0543d4d9b.jpg', x1:115*1/scale, y1:150*1/scale, x2:515*1/scale, y2:414*1/scale }]}];
			scope.status = {group: s.g().transform(matrix).add(elem), page:scope.pages[0], line:scope.pages[0].lines[0], fragment: scope.pages[0].lines[0].fragments[0], cursor:{page: scope.pages[0], line: scope.pages[0].lines[0], fragment: scope.pages[0].lines[0].fragments[0], pos:0, show:false}, ghostfrag: s.text(0,0,'').attr({fill:'rgba(255,255,255,0)'})};
	        
	        var cursor = s.line(scope.status.fragment.x, scope.status.line.y1, scope.status.fragment.x, scope.status.line.y2).attr({'strokeWidth':0.5});
	        scope.status.group.add(cursor);
	        
	        // Not much to say about this 
	        scope.redrawCursor = function() {
	        	var fragment = scope.status.cursor.fragment;
				var text = fragment.elem.attr('text').slice(0, scope.status.cursor.pos);
				scope.status.ghostfrag.attr({x: fragment.x,'font-size':fragment.elem.attr('font-size'), text:text});
	        	var x=scope.status.cursor.pos ? scope.status.ghostfrag.getBBox().x2 : scope.status.cursor.fragment.x;
				//console.log('--->Cursor text='+text+' ghx='+scope.status.ghostfrag.getBBox().x2+' frx='+scope.status.cursor.fragment.x+' textClW='+scope.status.ghostfrag.node.clientWidth);
				cursor.attr({x1:x, y1: scope.status.cursor.line.y1, x2: x, y2: scope.status.cursor.line.y2});
	        };
	        
	        // Checks for intersection between line and floating objects on the page
	        scope.updateStops = function(line) {
				line.stops = [scope.document.margins.left+line.indent,  scope.document.size.width-scope.document.margins.right];
				scope.status.page.objects.forEach(function(object) {
					if( line.y1 < object.y2 && line.y2 > object.y1 ) { // check overlap
						for( i=0;i<line.stops.length;i +=2 ) {
							if( object.x1<line.stops[i] && object.x2>line.stops[i] ) {
								if( object.x2 < line.stops[i+1] ) { // partial overlap
									line.stops[i]=object.x2;
									break;
								} else { // full overlap
									line.stops.splice(i,2);
								}
								line.stops[i]=object.x1;
								line.stops[i+1]=object.x2;
								break;
							} else if( object.x1 >= line.stops[i] && object.x1<line.stops[i+1] ) {
								if( object.x2 < line.stops[i+1] ) { // full overlap
									line.stops.splice(i+1, 0, object.x1, object.x2);
								} else { // partial overlap
									line.stops[i+1]=object.x1;
								}
								break;
							}
						}
					}
				});
	        };
	        
			
			/* 	wrapper takes care of wrapping text in all fragments. It starts by trying to fit text
				in fragment. If it's not possible, it tries a shorter string until it fits then adds the
				remaining text to the next fragment and starts over until all text fits correctly
			*/
				
			scope.wrapper = function(page, line, fragment, text) {
				var stops = line.stops;
				var endX = 0;
				//console.log('current stops:'+stops+' current frag x:'+fragment.x);
				fragment.x = Math.max(fragment.x, stops[0]);
				fragment.elem.attr({x: Math.max(fragment.x, stops[0])});
				for( k=0;k<stops.length;k+=2 ) {
					if( fragment.x>=stops[k] && fragment.x<stops[k+1]) {
						endX=stops[k+1];
						break;
					}
				}
				//console.log('endX='+endX);
				//console.log(scope.status.cursor.pos);
				//console.log('before='+fragment.elem.attr('text'));
				//console.log(text);
				var proposedLength = text.length;
				var ghostfrag = scope.status.ghostfrag;
				ghostfrag.attr({x: fragment.x,'font-size':fragment.elem.attr('font-size')});
				while( proposedLength ) {
					var proposedText = text.substring(0, proposedLength);
					ghostfrag.attr({ text:proposedText});
					if( ghostfrag.getBBox().x2 <= endX ) { // more space in fragment
						fragment.elem.attr({text:proposedText});
						break;
					}
					proposedLength--;
				}
				if( proposedLength == text.length ) { return {page: page, line: line, fragment: fragment}; } // no more fragments to modify
				//console.log('*** ENTERING NEW FRAGMENT***');
				//console.log('proposL='+proposedLength);
				var remainingText = text.substring(proposedLength, text.length);
				//console.log(remainingText);
				var nextLine = line, nextFrag = null;
				
				if( (k+2)<stops.length ) { // 1 more possible fragment
					//console.log('1 or more fragments');
					if( (k+2)*0.5 >= line.fragments.length ) {
						//console.log('create new fragment... ');
						nextFrag = {x:stops[k+2], elem:s.text(stops[k+2], line.y2,'').attr({'font-size':ghostfrag.attr('font-size')})};
						scope.status.group.add(nextFrag.elem);
						line.fragments.push(nextFrag);
					} else {
						//console.log('fetch fragment already present...');
						nextFrag  = line.fragments[(k+2)*0.5];
					}
				} else { // new line
					//console.log('look for new line');
					var indexOfLine = page.lines.indexOf(line);
					//console.log(indexOfLine+' index line out of '+page.lines.length);
					if( indexOfLine == -1 ) { console.log('error: line unreferenced'); return;}
					if( indexOfLine < (page.lines.length-1) ) {
						nextLine = page.lines[indexOfLine+1];
						//console.log(nextLine);
						nextFrag = nextLine.fragments[0];
					} else {
						//console.log('should create new line');
						var nextY = line.y2+(line.y2-line.y1);
						nextLine = {y1:nextY-(line.y2-line.y1), y2:nextY, indent:line.indent, fragments:[], stops:[scope.document.margins.left,  scope.document.size.width-scope.document.margins.right]};
						scope.updateStops(nextLine);
						nextFrag = {x:nextLine.stops[0], elem:s.text(nextLine.stops[0], nextY,'').attr({'font-size':ghostfrag.attr('font-size')})};
						scope.status.group.add(nextFrag.elem);
						nextLine.fragments.push(nextFrag);
						page.lines.push(nextLine);
					}
				}
				var status = scope.wrapper(page, nextLine, nextFrag, remainingText+nextFrag.elem.attr('text'));
				return status;
			};
			
			scope.moveCursorRight = function() {
				var cursor = scope.status.cursor;
				cursor.pos++;
				while(1) {
					if( cursor.pos<=cursor.fragment.elem.attr('text').length ) { 
						//console.log('@ MCR currentFrag');
						scope.redrawCursor();	
						break;
					}        	
					
					//console.log('@next frag');
					var fragIndex = cursor.line.fragments.indexOf(cursor.fragment);
					if( fragIndex < (cursor.line.fragments.length-1)) {
						cursor.fragment = cursor.line.fragments[fragIndex+1];
						cursor.pos = 1;
						continue;
					}
					//console.log('@next line');
					var lineIndex = cursor.page.lines.indexOf(cursor.line);
					if( lineIndex  < (cursor.page.lines.length-1)) {
						cursor.line = cursor.page.lines[lineIndex+1];
						cursor.fragment = cursor.line.fragments[0];
						cursor.pos=1;
						continue;
					} 
					var pageIndex = scope.pages.indexOf(cursor.page);
					if( pageIndex < (scope.pages.length-1) ) {
						cursor.page = scope.pages[pageIndex+1];
						cursor.line = cursor.page.lines[0];
						cursor.fragment = cursor.line.fragments[0];
						cursor.pos=1;
					} else {
						cursor.pos--;
						break;
					}
				}
			};
			scope.moveCursorLeft = function() {
				var cursor = scope.status.cursor;
				cursor.pos--;
				while(1) {
					if( cursor.pos>=0 ) { 
						//console.log('@ MCL currentFrag');
						scope.redrawCursor();
						break;
					}	        	
					//console.log('@prev frag');
					var fragIndex = cursor.line.fragments.indexOf(cursor.fragment);
					if( fragIndex ) {
						//console.log('@ same line');
						cursor.fragment = cursor.line.fragments[fragIndex-1];
						cursor.pos = cursor.fragment.elem.attr('text').length;
						continue;
					}
					var lineIndex = cursor.page.lines.indexOf(cursor.line);
					if( lineIndex ) {
						//console.log('@prev line');
						cursor.line = cursor.page.lines[lineIndex-1];
						cursor.fragment = cursor.line.fragments[ cursor.line.fragments.length-1 ];
						cursor.pos = cursor.fragment.elem.attr('text').length;
						continue;
					}
					
					var pageIndex = scope.document.pages.indexOf(cursor.page);
					if( pageIndex ) {
						cursor.page = scope.document.pages[pageIndex-1];
						cursor.line = cursor.page.lines[cursor.page.lines.length-1];
						cursor.fragment = cursor.line.fragments[cursor.line.fragments.length-1];
						cursor.pos = cursor.fragment.elem.attr('text').length;
					} else {
						cursor.pos++;
						break;
					}
				}
			};
			
			element.bind('keypress', function(e) {
				var line = scope.status.cursor.line;
				var fragment = scope.status.cursor.fragment;
				var text = fragment.elem.attr('text').slice(0, scope.status.cursor.pos)+ String.fromCharCode(e.keyCode) + fragment.elem.attr('text').slice( scope.status.cursor.pos );
				scope.wrapper(scope.status.cursor.page, line, fragment, text);
				//console.log(status);
				scope.moveCursorRight();
			});
			
			element.bind('keydown', function(e) {
				switch( e.keyCode ) {
					case 32: // space
						e.preventDefault();
						var line = scope.status.cursor.line;
						var fragment = scope.status.cursor.fragment;
						var text = fragment.elem.attr('text').slice(0, scope.status.cursor.pos)+' ' + fragment.elem.attr('text').slice( scope.status.cursor.pos );
						scope.wrapper(scope.status.cursor.page, line, fragment, text);
						//console.log(status);
						scope.moveCursorRight();
						break;
					case 37: // left arrow
						e.preventDefault();
						e.stopPropagation();
						scope.moveCursorLeft();
						break;
					case 39: // right arrow
						e.preventDefault();
						e.stopPropagation();
						scope.moveCursorRight();
						break;
					case 38: // up arrow
					case 40: // down arrow
						e.preventDefault();
						e.stopPropagation();
						/* do nothing */
						redrawCursor();	        	
						break;
				}
			});
			
			var init = function() {
			
		        var testText = "Mount Batur (Gunung Batur) is an active volcano located at the center of two concentric calderas north west of Mount Agung, Bali, Indonesia. The south east side of the larger 10×13 km caldera contains a caldera lake. The inner 7.5-kilometer-wide caldera, which was formed during emplacement of the Bali (or Ubud) ignimbrite, has been dated at about 23,670 and 28,500 years ago. The southeast wall of the inner caldera lies beneath Lake Batur; Batur cone has been constructed within the inner caldera to a height above the outer caldera rim. The Batur stratovolcano has produced vents over much of the inner caldera, but a NE-SW fissure system has localized the Batur I, II, and III craters along the summit ridge. Historical eruptions have been characterized by mild-to-moderate explosive activity sometimes accompanied by lava emission. Basaltic lava flows from both summit and flank vents have reached the caldera floor and the shores of Lake Batur in historical time. The caldera contains an active, 700-metre-tall stratovolcano rising above the surface of Lake Batur. The first historically documented eruption of Batur was in 1804, and it has been frequently active since then. The substantial lava field from the 1968 eruption is visible today when viewed from Kintamani, a town that stradles the southwest ridge of the greater caldera.";
			
		        scope.status.page.lines.forEach(function(line) {scope.updateStops(line);});
		        
		        scope.status.page.objects.forEach( function(c) {
			       var image=s.image(c.src, c.x1, c.y1, (c.x2-c.x1), (c.y2-c.y1)).attr({'fill':'rgba(255,0,0,0.5)'}); 
			       scope.status.group.add(image);
		        });
		        
		        window.setInterval(function() {
		        	scope.status.cursor.show = !scope.status.cursor.show; 
		        	cursor.attr({stroke:(scope.status.cursor.show ? 'rgba(0,0,0,1.0)' : 'rgba(0,0,0,0.0)')});
		        }, 600);
				scope.wrapper(scope.status.cursor.page, scope.status.cursor.line, scope.status.cursor.fragment, testText);
	        }
	        
	        init();
		}
	}
});
