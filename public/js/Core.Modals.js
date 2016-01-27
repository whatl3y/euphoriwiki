/*-----------------------------------------------------------------------------------------
|TITLE:		Core.Modals.js
|PURPOSE:	
|EXAMPLE CALLS:
|				new Core.Modals().alertPopup({loading:true});
|				$( '#loader' ).remove();
|
|AUTHOR:	Lance Whatley
|CALLABLE TAGS:
|ASSUMES:	jQuery
|REVISION HISTORY:	
|			*LJW 9/7/2014 - created
|			*LJW 12/1/2014 - added to Core namespace
-----------------------------------------------------------------------------------------*/
Core.Modals = function() {
	//Class for General HTML elements to add
}

/*-----------------------------------------------------------------------------------------
|NAME:			asyncLoader (PUBLIC)
|DESCRIPTION:	Returns jQuery object of an button, which is an <a> tag
|PARAMETERS:	1. params: parameters 
|SIDE EFFECTS:	None
|CALLED FROM:	Lots
|ASSUMES:		jQuery
|RETURNS:		A jQuery object that is the loading window
-----------------------------------------------------------------------------------------*/
Core.Modals.prototype.asyncLoader=function(params) {
	params=params || {};
	params= {
		message:	params.message || '',
		css:		params.css || {color:'green'},
		close:		params.close || false,
		closeTime:	params.closeTime || 2000
	};
	
	var ret=$(document.createElement('div')).appendTo($( 'body' ));
	var img=$(document.createElement('div')).html('<img width="25px" height="25px" src="/public/images/loader.gif" />').appendTo(ret);
	var message=$(document.createElement('div')).addClass('asyncloadermessage').css(params.css).html(params.message).appendTo(ret);
	
	if ($( '.asyncloader' ).length) {				//put another loader on bottom of the ones that exist on the screen already
		ret.css({bottom:parseFloat($( '.asyncloader' ).last().css('bottom'))+80});
	}
	
	if (params.close) {
		setTimeout(function(){ret.animate({opacity:0},function(){$( this ).remove();});},params.closeTime);
	}
	
	return ret.addClass('asyncloader');			//add class here since we're finding the previous asyncloader before this to calculate bottom CSS prop
}

/*-----------------------------------------------------------------------------------------
|NAME:			alertPopup (PUBLIC)
|DESCRIPTION:	Returns jQuery object of an button, which is an <a> tag
|PARAMETERS:	1. text(REQ): the text that will show up on the popup
|				2. time(OPT): The amount of time the popup will show
|				3. loading(OPT): Whether this popup should indicate something is loading
|							NOTE: this will override both the text and time parameters
|				4. loadWrapper(OPT): the wrapper where the loader will reside
|							DEFAULT: $( 'body' )
|SIDE EFFECTS:	None
|CALLED FROM:	Lots
|ASSUMES:		jQuery
|RETURNS:		A jQuery object that is the popup
-----------------------------------------------------------------------------------------*/
//GeneralHTML.prototype.alertPopup=function(text,time,loading,loadWrapper,clickClose) {
Core.Modals.prototype.alertPopup=function(params) {
	params={
				loading:		params.loading || false,						//if true, it will show a loading spinner
				time:			params.time || false,							//if provided, the time that the popup will remain open
				content:		params.content || '',							//if loading!=true, this will be the content in the popup
				loadWrapper:	params.loadWrapper || false,					//the wrapper that the popup will occupy, default is whole body if not defined
				attr:			params.attr || {id:'popup'},
				clickClose:		(params.clickClose!==true) ? false: true, 
				contentCSS:		params.contentCSS || {
									background: 'darkred',
									color: 'white',
									height: '100px',
									width: '400px'
								}
		};
		
	var bw={
			body	: params.loadWrapper || $( 'body' ),
			window	: (params.loadWrapper==$( 'body' )) ? $( window ) : (params.loadWrapper || $( window ))
		};
	params.contentCSS.left=(bw.window.width()/2)-(parseInt(params.contentCSS.width)/2);
	params.contentCSS.top= (bw.window.height()/2>parseInt(params.contentCSS.height)) ? ((bw.window.height()/2)-parseInt(params.contentCSS.height)) : '50px';

	var wrap=$(document.createElement('div')).attr(((!params.loading) ? params.attr : {id:'loader'})).css('z-index',99999);
	
	//If loadWrapper wasn't defined there's going to be a mask on entire screen so
	//we need the position of mask to be fixed so the screen doesn't show scroll bars
	//when it loads in the DOM
	var mask=this.pageMask(params.clickClose,wrap);
	if (bw.body[0]!==$( 'body' )[0]) {mask.css({position:'absolute'});}
	
	var content=$(document.createElement('div')).addClass('popupcontent');
	
	if (params.loading===true) {
		content.css({
				left: (bw.window.width()/2)-(50/2),
				top: (bw.window.height()/2)-50+$( window ).scrollTop(),
				background: 'black',
				padding: '10px',
				color: 'white',
				width: '50px',
				height: '50px',
				opacity: 0.6
			})
			.html('<img width="50px" height="50px" style="display:block;position:absolute;top:10px;left:10px" src="/public/images/loader.gif" />');
	} else {
		content.css(params.contentCSS).append(params.content);
			
		//after the amount of time specified remove the popup
		//also note this will only work if 'loading' is not equal to true
		if (params.time) {
			setTimeout(function() {
				wrap.animate({'opacity':0},function() {$( this ).remove()});
			}, params.time);
		}
	}
	
	bw.body.append(wrap.append(mask).append(content));
	return wrap;
}

/*-----------------------------------------------------------------------------------------
|NAME:			pageMask (PUBLIC)
|DESCRIPTION:	Returns an element that will darken the entire screen
|PARAMETERS:	1. close(OPT): whether to close the wrapper  we specify in param 2 when clicking anywhere on screen
|				2. wrapper(OPT): the wrapper that we're going to close out when clicking
|							If not included and close===true we'll just close the mask element 
|SIDE EFFECTS:	None
|CALLED FROM:	Many
|ASSUMES:		jQuery
|RETURNS:		A jQuery object that is the mask
-----------------------------------------------------------------------------------------*/
Core.Modals.prototype.pageMask=function(close,wrapper) {
	var el=$(document.createElement('div')).addClass('mask');
	
	if (close===true) {
		el.click(function () {
				wrapper=wrapper || $( this );
				wrapper.animate({'opacity':0},function() {wrapper.remove()});
			});
	}
	
	return el;
}

/*-----------------------------------------------------------------------------------------
|NAME:			center (PUBLIC)
|DESCRIPTION:	Takes an element that is positions either absolutely or relatively and
|				centers it in the middle of the page.
|PARAMETERS:	1. element(REQ): element to center in the middle of the page
|CALLED FROM:	this.build()
|SIDE EFFECTS:	Nothing
|ASSUMES:		element is in the DOM and positioned relatively or absolutely
|RETURNS:		Nothing
-----------------------------------------------------------------------------------------*/
Core.Modals.prototype.center = function(element) {
	var wrapT=($(window).height()-element.outerHeight(true))/2;
	var wrapW=($(window).width()-element.outerWidth(true))/2;
	element.css({
		top:	(wrapT<10) ? 10 : wrapT,
		left:	(wrapW<10) ? 10 : wrapW
	});
}