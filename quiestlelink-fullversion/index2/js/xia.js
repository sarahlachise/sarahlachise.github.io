//   This program is free software: you can redistribute it and/or modify
//   it under the terms of the GNU General Public License as published by
//   the Free Software Foundation, either version 3 of the License, or
//   (at your option) any later version.
//   This program is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   GNU General Public License for more details.
//   You should have received a copy of the GNU General Public License
//   along with this program.  If not, see <http://www.gnu.org/licenses/>
//
//
// @author : pascal.fautrero@ac-versailles.fr


/*
 *
 * @param {object} params
 * @constructor create image active object
 */
function IaObject(params) {
    "use strict";
    var that = this;
    this.path = [];
    this.title = [];
    this.kineticElement = [];
    this.backgroundImage = []
    this.finalBackground = null
    this.detail = [];
    this.backgroundImageOwnScaleX = [];
    this.backgroundImageOwnScaleY = [];
    this.persistent = [];
    this.originalX = [];
    this.originalY = [];
    this.options = [];
    this.stroke = [];
    this.strokeWidth = [];
    this.tween = [];
    this.agrandissement = 0;
    this.zoomActive = 0;
    this.minX = 10000;
    this.minY = 10000;
    this.maxX = -10000;
    this.maxY = -10000;
    this.tween_group = 0;
    this.group = 0;

    this.layer = params.layer;
    this.background_layer = params.background_layer;
    this.backgroundCache_layer = params.backgroundCache_layer;
    that.backgroundCache_layer.hide()
    that.backgroundCache_layer.draw()
    this.imageObj = params.imageObj;
    this.myhooks = params.myhooks;
    this.idText = params.idText;
    this.zoomLayer = params.zoomLayer;

    this.nbImages = 0
    this.nbImagesDone = 0
    this.allImagesLoaded = $.Deferred()
    this.allImagesLoaded.done(function(value){
      //params.iaScene.nbDetailsLoaded+=value
      params.iaScene.nbRootDetails++
      var dataUrl = that.cropCanvas.toDataURL()
      var cropedImage = new Image()

      cropedImage.onload = function() {
          that.finalBackground = this
          params.iaScene.nbCropedImage++
          if ((params.iaScene.nbDetails == params.iaScene.nbDetailsLoaded) &&
            (params.iaScene.nbRootDetails == params.iaScene.nbCropedImage)){
             params.iaScene.allDetailsLoaded.resolve()
          }
      }
      cropedImage.src = dataUrl
      that.myhooks.afterIaObjectConstructor(params.iaScene, params.idText, params.detail, that);

    })

    that.cropCanvas = document.createElement('canvas');

    if (typeof(params.detail.path) !== 'undefined') {
      that.definePathBoxSize(params.detail, that)
    }
    else if (typeof(params.detail.image) !== 'undefined') {
      that.defineImageBoxSize(params.detail, that)
    }
    else if (typeof(params.detail.group) !== 'undefined') {
        for (var i in params.detail.group) {
            if (typeof(params.detail.group[i].path) !== 'undefined') {
              that.definePathBoxSize(params.detail.group[i], that)
            }
            else if (typeof(params.detail.group[i].image) !== 'undefined') {
              that.defineImageBoxSize(params.detail.group[i], that)
            }
        }
    }

    that.cropCanvas.setAttribute('width', parseFloat(that.maxX) - parseFloat(that.minX));
    that.cropCanvas.setAttribute('height', parseFloat(that.maxY) - parseFloat(that.minY));

    // Create kineticElements and include them in a group

    that.group = new Kinetic.Group();
    that.layer.add(that.group);

    if (typeof(params.detail.path) !== 'undefined') {
        that.nbImages = 1
        that.includePath(
          params.detail,
          0,
          that,
          params.iaScene,
          params.baseImage,
          params.idText
        )
    }
    else if (typeof(params.detail.image) !== 'undefined') {
        that.nbImages = 1
        that.includeImage(
            params.detail,
            0,
            that,
            params.iaScene,
            params.baseImage,
            params.idText
        )
    }
    else if (typeof(params.detail.group) !== 'undefined') {
        for (var i in params.detail.group) {
            //if (typeof(params.detail.group[i].image) !== 'undefined') {
              that.nbImages++
            //}
        }
        for (var i in params.detail.group) {
            if (typeof(params.detail.group[i].path) !== 'undefined') {
                that.includePath(
                  params.detail.group[i],
                  i,
                  that,
                  params.iaScene,
                  params.baseImage,
                  params.idText
                )
            }
            else if (typeof(params.detail.group[i].image) !== 'undefined') {
                that.includeImage(
                  params.detail.group[i],
                  i,
                  that,
                  params.iaScene,
                  params.baseImage,
                  params.idText
                )
            }
        }
    }
    else {
        console.log(params.detail);
    }

    if (that.nbImages == 0) that.allImagesLoaded.resolve(0)
    this.defineTweens(this, params.iaScene);
}

/*
 *
 * @param {type} detail
 * @param {type} i KineticElement index
 * @returns {undefined}
 */
IaObject.prototype.includeImage = function(detail, i, that, iaScene, baseImage, idText) {
    //that.defineImageBoxSize(detail, that)
    var rasterObj = new Image()
    that.title[i] = detail.title
    that.backgroundImage[i] = rasterObj
    that.kineticElement[i] = new Kinetic.Image({
        name: detail.title,
        x: parseFloat(detail.x) * iaScene.coeff,
        y: parseFloat(detail.y) * iaScene.coeff + iaScene.y,
        width: detail.width,
        height: detail.height,
        scale: {x:iaScene.coeff,y:iaScene.coeff}
    });
    rasterObj.onload = function() {
        //var cropCtx = that.cropCanvas.getContext('2d')
        //console.log(rasterObj.src)
        //cropCtx.drawImage(that.imageObj,100,100)
        that.backgroundImageOwnScaleX[i] = iaScene.scale * detail.width / this.width;
        that.backgroundImageOwnScaleY[i] = iaScene.scale * detail.height / this.height;
        var zoomable = true;
        if ((typeof(detail.fill) !== 'undefined') &&
            (detail.fill == "#000000")) {
            zoomable = false;
        }
        if ((typeof(detail.options) !== 'undefined')) {
            that.options[i] = detail.options;
        }

        that.strokeWidth[i] = '0';
        that.stroke[i] = 'rgba(0, 0, 0, 0)';
        that.persistent[i] = "off-image";
        if ((typeof(detail.fill) !== 'undefined') &&
            (detail.fill == "#ffffff")) {
            that.persistent[i] = "onImage";
            that.kineticElement[i].fillPriority('pattern');
            that.kineticElement[i].fillPatternScaleX(that.backgroundImageOwnScaleX[i] * 1/iaScene.scale);
            that.kineticElement[i].fillPatternScaleY(that.backgroundImageOwnScaleY[i] * 1/iaScene.scale);
            that.kineticElement[i].fillPatternImage(that.backgroundImage[i]);
            zoomable = false;
        }

        that.group.add(that.kineticElement[i]);
        that.addEventsManagement(i,zoomable, that, iaScene, baseImage, idText);

        // define hit area excluding transparent pixels
        // =============================================================

        var cropX = Math.max(parseFloat(detail.minX), 0);
        var cropY = Math.max(parseFloat(detail.minY), 0);
        var cropWidth = (Math.abs(Math.min(parseFloat(detail.maxX) - parseFloat(detail.minX)), Math.floor(parseFloat(iaScene.originalWidth) * 1)));
        var cropHeight = (Math.abs(Math.min(parseFloat(detail.maxY) - parseFloat(detail.minY)), Math.floor(parseFloat(iaScene.originalHeight) * 1)));
        if (cropX + cropWidth > iaScene.originalWidth * 1) {
            cropWidth = Math.abs(iaScene.originalWidth * 1 - cropX * 1);
        }
        if (cropY * 1 + cropHeight > iaScene.originalHeight * 1) {
            cropHeight = Math.abs(iaScene.originalHeight * 1 - cropY * 1);
        }
	      var hitCanvas = that.layer.getHitCanvas();
        iaScene.completeImage = hitCanvas.getContext().getImageData(0,0,Math.floor(hitCanvas.width),Math.floor(hitCanvas.height));

        var canvas_source = document.createElement('canvas');
        canvas_source.setAttribute('width', Math.min(rasterObj.width, cropWidth * iaScene.coeff));
        canvas_source.setAttribute('height', Math.min(rasterObj.height, cropHeight * iaScene.coeff));
        var context_source = canvas_source.getContext('2d');

        context_source.drawImage(rasterObj,0,0, Math.min(rasterObj.width, cropWidth * iaScene.coeff), Math.min(rasterObj.height, cropHeight * iaScene.coeff));
        imageDataSource = context_source.getImageData(0, 0, cropWidth * iaScene.coeff, cropHeight * iaScene.coeff);
        len = imageDataSource.data.length;
        that.group.zoomActive = 0;

        (function(len, imageDataSource){
        that.kineticElement[i].hitFunc(function(context) {
            if (iaScene.zoomActive == 0) {

                var imageData = imageDataSource.data;
                var imageDest = iaScene.completeImage.data;
                var position1 = 0;
                var position2 = 0;
                var maxWidth = Math.floor(cropWidth * iaScene.coeff);
                var maxHeight = Math.floor(cropHeight * iaScene.coeff);
                var startY = Math.floor(cropY * iaScene.coeff);
                var startX = Math.floor(cropX * iaScene.coeff);
                var hitCanvasWidth = Math.floor(that.layer.getHitCanvas().width);
                var rgbColorKey = Kinetic.Util._hexToRgb(this.colorKey);
                for(var varx = 0; varx < maxWidth; varx +=1) {
                    for(var vary = 0; vary < maxHeight; vary +=1) {
                        position1 = 4 * (vary * maxWidth + varx);
                        position2 = 4 * ((vary + startY) * hitCanvasWidth + varx + startX);
                        if (imageData[position1 + 3] > 100) {
                           imageDest[position2 + 0] = rgbColorKey.r;
                           imageDest[position2 + 1] = rgbColorKey.g;
                           imageDest[position2 + 2] = rgbColorKey.b;
                           imageDest[position2 + 3] = 255;
                        }
                    }
                }
                context.putImageData(iaScene.completeImage, 0, 0)
            }
            else {
                context.beginPath()
                context.rect(0,0,this.width(),this.height())
                context.closePath()
                context.fillStrokeShape(this)
            }
        });
        })(len, imageDataSource)

        var cropCtx = that.cropCanvas.getContext('2d')

        var crop = {
          x : Math.max(parseFloat(detail.minX), 0),
          y : Math.max(parseFloat(detail.minY), 0),
          width : Math.min(
                  (parseFloat(detail.maxX) - Math.max(parseFloat(detail.minX), 0)) * iaScene.scale,
                  Math.floor(parseFloat(iaScene.originalWidth) * iaScene.scale)
                ),
          height : Math.min(
                  (parseFloat(detail.maxY) - Math.max(parseFloat(detail.minY), 0)) * iaScene.scale,
                  Math.floor(parseFloat(iaScene.originalHeight) * iaScene.scale)
                )
        }

        if (crop.x + crop.width > iaScene.originalWidth ) {
    	     crop.width = iaScene.originalWidth - crop.x
        }
        if (crop.y + crop.height > iaScene.originalHeight) {
    	     crop.height = iaScene.originalHeight - crop.y
        }
        var pos = {
          x : detail.minX - (that.minX / iaScene.coeff),
          y : detail.minY - (that.minY / iaScene.coeff)
        }

        if (parseFloat(detail.minX) < 0) pos.x = parseFloat(detail.minX) * (-1);
        if (parseFloat(detail.minY) < 0) pos.y = parseFloat(detail.minY) * (-1);
        // bad workaround to avoid null dimensions
        if (crop.width <= 0) crop.width = 1
        if (crop.height <= 0) crop.height = 1

        cropCtx.drawImage(
            rasterObj,
            0,
            0,
            crop.width / that.backgroundImageOwnScaleX[i],
            crop.height / that.backgroundImageOwnScaleY[i],
            pos.x,
            pos.y,
            crop.width,
            crop.height
        );





        that.group.draw()
        that.nbImagesDone++
        iaScene.nbDetailsLoaded++
        if (that.nbImages == that.nbImagesDone) that.allImagesLoaded.resolve(that.nbImages)


    }
    rasterObj.src = detail.image


}

/*
 *
 * @param {type} path
 * @param {type} i KineticElement index
 * @returns {undefined}
 */
IaObject.prototype.includePath = function(detail, i, that, iaScene, baseImage, idText) {
    that.path[i] = detail.path;
    that.detail[i] = {
      minX : detail.minX,
      minY : detail.minY,
      maxX : detail.maxX,
      maxY : detail.maxY,
    }
    that.title[i] = detail.title;
    // if detail is out of background, hack maxX and maxY
    if (parseFloat(detail.maxX) < 0) detail.maxX = 1;
    if (parseFloat(detail.maxY) < 0) detail.maxY = 1;

    that.kineticElement[i] = new Kinetic.Path({
        name: detail.title,
        data: detail.path,
        x: parseFloat(detail.x) * iaScene.coeff,
        y: parseFloat(detail.y) * iaScene.coeff + iaScene.y,
        //x : 0,
        //y : 0,
        scale: {x:iaScene.coeff,y:iaScene.coeff},
        fill: 'rgba(0, 0, 0, 0)'
    });
    that.group.add(that.kineticElement[i]);

    var cropCtx = that.cropCanvas.getContext('2d')
    var cropX = Math.max(parseFloat(detail.minX), 0);
    var cropY = Math.max(parseFloat(detail.minY), 0);
    var cropWidth = Math.min(
      (parseFloat(detail.maxX) - cropX) * iaScene.scale,
      Math.floor(parseFloat(iaScene.originalWidth) * iaScene.scale)
    )
    var cropHeight = Math.min(
      (parseFloat(detail.maxY) - cropY) * iaScene.scale,
      Math.floor(parseFloat(iaScene.originalHeight) * iaScene.scale)
    )
    if (cropX * iaScene.scale + cropWidth > iaScene.originalWidth * iaScene.scale) {
	     cropWidth = iaScene.originalWidth * iaScene.scale - cropX * iaScene.scale;
    }
    if (cropY * iaScene.scale + cropHeight > iaScene.originalHeight * iaScene.scale) {
	     cropHeight = iaScene.originalHeight * iaScene.scale - cropY * iaScene.scale;
    }
    var posX = detail.minX - that.minX
    var posY = detail.minY - that.minY
    if (parseFloat(detail.minX) < 0) posX = parseFloat(detail.minX) * (-1);
    if (parseFloat(detail.minY) < 0) posY = parseFloat(detail.minY) * (-1);
    // bad workaround to avoid null dimensions
    if (cropWidth <= 0) cropWidth = 1;
    if (cropHeight <= 0) cropHeight = 1;
    var path = new Path2D(detail.path)

    cropCtx.beginPath()
    cropCtx.save()
    cropCtx.translate((-1) * that.minX, (-1) * that.minY)
    cropCtx.clip(path)

    cropCtx.drawImage(
        that.imageObj,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        detail.minX,
        detail.minY,
        cropWidth,
        cropHeight

    )
    cropCtx.restore()
    that.kineticElement[i].fillPatternRepeat('no-repeat')
    //that.kineticElement[i].fillPatternX(detail.minX)
    //that.kineticElement[i].fillPatternY(detail.minY)


    var zoomable = true;
    if ((typeof(detail.fill) !== 'undefined') &&
        (detail.fill == "#000000")) {
        zoomable = false;
    }
    if ((typeof(detail.options) !== 'undefined')) {
        that.options[i] = detail.options;
    }

    that.strokeWidth[i] = '0';
    that.stroke[i] = 'rgba(0, 0, 0, 0)';
    that.persistent[i] = "off";
    if ((typeof(detail.fill) !== 'undefined') &&
        (detail.fill == "#ffffff")) {
        that.persistent[i] = "onPath";
        that.kineticElement[i].fill('rgba(' + iaScene.colorPersistent.red + ',' + iaScene.colorPersistent.green + ',' + iaScene.colorPersistent.blue + ',' + iaScene.colorPersistent.opacity + ')');
    }
    iaScene.nbDetailsLoaded++
    that.nbImagesDone++
    that.group.draw();
    that.addEventsManagement(i, zoomable, that, iaScene, baseImage, idText);
    if (that.nbImages == that.nbImagesDone) that.allImagesLoaded.resolve(that.nbImages)

};

/*
 *
 * @param {type} index
 * @returns {undefined}
 */
IaObject.prototype.defineImageBoxSize = function(detail, that) {
    "use strict";
    that.minX = Math.min(parseFloat(detail.minX), that.minX)
    that.maxX = Math.max(parseFloat(detail.minX) + parseFloat(detail.width), that.maxX)
    that.minY = Math.min(parseFloat(detail.minY), that.minY)
    that.maxY = Math.max(parseFloat(detail.minY) + parseFloat(detail.height), that.maxY)

}


/*
 *
 * @param {type} index
 * @returns {undefined}
 */
IaObject.prototype.definePathBoxSize = function(detail, that) {
    "use strict";
    if (  (typeof(detail.minX) !== 'undefined') &&
          (typeof(detail.minY) !== 'undefined') &&
          (typeof(detail.maxX) !== 'undefined') &&
          (typeof(detail.maxY) !== 'undefined')) {
        that.minX = Math.min(that.minX, parseFloat(detail.minX))
        that.minY = Math.min(that.minY, parseFloat(detail.minY))
        that.maxX = Math.max(that.maxX, parseFloat(detail.maxX))
        that.maxY = Math.max(that.maxY, parseFloat(detail.maxY))
    }
    else {
        console.log('definePathBoxSize failure');
    }

}



/*
 * Define zoom rate and define tween effect for each group
 * @returns {undefined}
 */
IaObject.prototype.defineTweens = function(that, iaScene) {

    that.minX = that.minX * iaScene.coeff;
    that.minY = that.minY * iaScene.coeff;
    that.maxX = that.maxX * iaScene.coeff;
    that.maxY = that.maxY * iaScene.coeff;

    var largeur = that.maxX - that.minX;
    var hauteur = that.maxY - that.minY;
    that.agrandissement1  = (iaScene.height - iaScene.y) / hauteur;   // beta
    that.agrandissement2  = iaScene.width / largeur;    // alpha

    if (hauteur * that.agrandissement2 > iaScene.height) {
        that.agrandissement = that.agrandissement1;
        that.tweenX = (0 - (that.minX)) * that.agrandissement + (iaScene.width - largeur * that.agrandissement) / 2;
        that.tweenY = (0 - iaScene.y - (that.minY)) * that.agrandissement + iaScene.y;
    }
    else {
        that.agrandissement = that.agrandissement2;
        that.tweenX = (0 - (that.minX)) * that.agrandissement;
        that.tweenY = 1 * ((0 - iaScene.y - (that.minY)) * that.agrandissement + iaScene.y + (iaScene.height - hauteur * that.agrandissement) / 2);
    }
};

/*
 * Define mouse events on the current KineticElement
 * @param {type} i KineticElement index
 * @returns {undefined}
 */

IaObject.prototype.addEventsManagement = function(i, zoomable, that, iaScene, baseImage, idText) {

    if (that.options[i].indexOf("disable-click") !== -1) return;
    /*
     * if mouse is over element, fill the element with semi-transparency
     */
    that.kineticElement[i].on('mouseover', function() {
        if (iaScene.cursorState.indexOf("ZoomOut.cur") !== -1) {

        }
        else if ((iaScene.cursorState.indexOf("ZoomIn.cur") !== -1) ||
           (iaScene.cursorState.indexOf("ZoomFocus.cur") !== -1)) {

        }
        else if (iaScene.cursorState.indexOf("HandPointer.cur") === -1) {

            document.body.style.cursor = "pointer";
            iaScene.cursorState = "url(img/HandPointer.cur),auto";
            for (var i in that.kineticElement) {
                if (that.persistent[i] == "off") {
                    that.kineticElement[i].fillPriority('color');
                    //that.kineticElement[i].fill(iaScene.overColor);
                    //that.kineticElement[i].scale(iaScene.coeff);
                    that.kineticElement[i].stroke(iaScene.overColorStroke);
                    that.kineticElement[i].strokeWidth(5);
                    that.kineticElement[i].dashEnabled()
                    that.kineticElement[i].dash([10,10]);

                }
                else if (that.persistent[i] == "onPath") {
                    that.kineticElement[i].fillPriority('color');
                    that.kineticElement[i].fill('rgba(' + iaScene.colorPersistent.red + ',' + iaScene.colorPersistent.green + ',' + iaScene.colorPersistent.blue + ',' + iaScene.colorPersistent.opacity + ')');
                }
                else if ((that.persistent[i] == "onImage") || (that.persistent[i] == "off-image")) {
                    that.kineticElement[i].fillPriority('pattern');
                    that.kineticElement[i].fillPatternScaleX(that.backgroundImageOwnScaleX[i] * 1/iaScene.scale);
                    that.kineticElement[i].fillPatternScaleY(that.backgroundImageOwnScaleY[i] * 1/iaScene.scale);
                    that.kineticElement[i].fillPatternImage(that.backgroundImage[i]);
                }
            }
            that.layer.batchDraw();

        }
    });
    /*
     * if we click in this element, manage zoom-in, zoom-out
     */
    if (that.options[i].indexOf("direct-link") !== -1) {
        that.kineticElement[i].on('click touchstart', function(e) {
            location.href = that.title[i];
        });
    }
    else {

        that.kineticElement[i].on('click touchstart', function() {
            // let's zoom
            var i = 0;
            iaScene.noPropagation = true;
            if ((iaScene.cursorState.indexOf("ZoomIn.cur") !== -1) &&
                (iaScene.element === that)) {

                iaScene.zoomActive = 1;

                document.body.style.cursor = "zoom-out";
                iaScene.cursorState = "url(img/ZoomOut.cur),auto";
                that.layer.moveToTop();
                this.moveToTop();
                that.group.moveToTop();
                that.group.zoomActive = 1;
                that.originalX[0] = that.group.x();
                that.originalY[0] = that.group.y();

                that.alpha = 0;
                that.step = 0.1;
                var personalTween = function(anim, thislayer) {
                    // linear
                    var tempX = that.originalX[0] + that.alpha.toFixed(2) * (that.tweenX - that.originalX[0]);
                    var tempY = that.originalY[0] + that.alpha.toFixed(2) * (that.tweenY - that.originalY[0]);
                    var tempScale = 1 + that.alpha.toFixed(2) * (that.agrandissement - 1);
                    var t = null;
                    if (that.alpha.toFixed(2) <= 1) {
                        that.alpha = that.alpha + that.step;
                        that.group.setPosition({x:tempX, y:tempY});
                        that.group.scale({x:tempScale,y:tempScale});
                    }
                    else {
                        that.zoomLayer.hitGraphEnabled(true);
                        anim.stop();
                    }
                };
                that.zoomLayer.moveToTop();
                that.group.moveTo(that.zoomLayer);
                that.layer.draw();
                var anim = new Kinetic.Animation(function(frame) {
                    personalTween(this, that.layer);
                }, that.zoomLayer);
                that.zoomLayer.hitGraphEnabled(false);
                anim.start();



            }
            // let's unzoom
            else if (iaScene.cursorState.indexOf("ZoomOut.cur") != -1) {

              var popupMaterialTopOrigin = ($("#popup_material_background").height() - $("#popup_material").height()) / 2
              var popupMaterialLeftOrigin = ($("#popup_material_background").width() - $("#popup_material").width()) / 2

              $("#popup_material").animate({
                "top": (popupMaterialTopOrigin * 2 + $("#popup_material").height()) + 'px',
                "left" : popupMaterialLeftOrigin + "px",
              },
              {queue : false});

              $("#popup_material_image_" + that.idText ).css({
                'transition' : '0s'
              })
              $("#popup_material_image_general").css({
                'transition' : '0s'
              })
              $(".popup_material_image").animate({
                "top": (popupMaterialTopOrigin * 2 + $("#popup_material").height()) + 'px',
                "left" : popupMaterialLeftOrigin + "px",
              },
              {queue : false});

              iaScene.zoomActive = 0;
              that.group.zoomActive = 0;
              that.group.scaleX(1);
              that.group.scaleY(1);
              that.group.x(that.originalX[0]);
              that.group.y(that.originalY[0]);

              that.backgroundCache_layer.moveToBottom();
              that.backgroundCache_layer.hide()
              document.body.style.cursor = "default";
              iaScene.cursorState = "default";

              $('#' + that.idText + " audio").each(function(){
                  $(this)[0].pause();
              });
              $('#' + that.idText + " video").each(function(){
                  $(this)[0].pause();
              });

              for (i in that.kineticElement) {
                  if (that.persistent[i] == "off") {
//                      that.kineticElement[i].fillPriority('color');
//                      that.kineticElement[i].fill('rgba(0, 0, 0, 0)');
                      that.kineticElement[i].stroke('rgba(0, 0, 0, 0)');
                      that.kineticElement[i].strokeWidth(0);

                  }
                  else if (that.persistent[i] == "onPath") {
                      that.kineticElement[i].fillPriority('color');
                      that.kineticElement[i].fill('rgba(' + iaScene.colorPersistent.red + ',' + iaScene.colorPersistent.green + ',' + iaScene.colorPersistent.blue + ',' + iaScene.colorPersistent.opacity + ')');
                  }
                  else if (that.persistent[i] == "onImage") {
                      that.kineticElement[i].fillPriority('pattern');
                      that.kineticElement[i].fillPatternScaleX(that.backgroundImageOwnScaleX[i] * 1/iaScene.scale);
                      that.kineticElement[i].fillPatternScaleY(that.backgroundImageOwnScaleY[i] * 1/iaScene.scale);
                      that.kineticElement[i].fillPatternImage(that.backgroundImage[i]);
                  }
              }
              //that.group.moveTo(that.layer);
              //that.zoomLayer.moveToBottom();
              //that.zoomLayer.draw();
              that.layer.draw();
              that.backgroundCache_layer.draw();

            }
            // let's focus
            else {
                if (iaScene.zoomActive === 0) {
                    if ((iaScene.element !== 0) &&
                        (typeof(iaScene.element) !== 'undefined')) {

                        for (i in iaScene.element.kineticElement) {
                            //iaScene.element.kineticElement[i].fillPriority('color');
                            //iaScene.element.kineticElement[i].fill('rgba(0,0,0,0)');
                            iaScene.element.kineticElement[i].stroke('rgba(0, 0, 0, 0)');
                            iaScene.element.kineticElement[i].strokeWidth(0);
                        }
                        if (iaScene.element.layer) iaScene.element.layer.draw();
                        $('#' + iaScene.element.idText + " audio").each(function(){
                            $(this)[0].pause();
                        });
                        $('#' + iaScene.element.idText + " video").each(function(){
                            $(this)[0].pause();
                        });
                    }

                    if (zoomable === true) {
                        //document.body.style.cursor = "zoom-in";
                        //iaScene.cursorState = 'url("img/ZoomIn.cur"),auto';
                        $("#popup_material_image_" + that.idText).data('zoomable', true)
                        $("#popup_material_image_" + that.idText).css('cursor', 'pointer')
                    }
                    else {
                        //iaScene.cursorState = 'url("img/ZoomFocus.cur"),auto';
                        $("#popup_material_image_" + that.idText).data('zoomable', false)
                        $("#popup_material_image_" + that.idText).css('cursor', 'default')
                    }

                    var rippleEffect = true
                    if (rippleEffect) {
                        var mouseXY = that.layer.getStage().getPointerPosition();
                        var div = document.createElement("div")
                        var newdiv = '<div class="ripple-effect" style="top:' + (mouseXY.y - 25) + 'px;left:'+ (mouseXY.x - 25) +'px;"></div>'
                        $("#ripple_background").append(newdiv)
                        window.setTimeout(function(){
                          $(".ripple-effect").remove();
                        }, 1100);
                    }

                    $("#popup_material_image_" + that.idText).css({
                      'position' : 'absolute',
                      'display' : 'block',
                      'top' : that.minY + 'px',
                      'left' : that.minX + 'px',
                      'height' : (that.maxY - that.minY) + 'px',
                      'width' : (that.maxX - that.minX) + 'px',
                      'transition' : '0s'
                    })
                    $("#popup_material").css({
                      "position": "absolute",
                      "transition" : "0s"
                    });
                    iaScene.zoomActive = 1;
                    document.body.style.cursor = "default";
                    iaScene.cursorState = "url(img/ZoomOut.cur),auto";
                    that.group.zoomActive = 1;

                    var cacheBackground = true;
                    for (i in that.kineticElement) {
                        if (that.persistent[i] === "onImage") cacheBackground = false
                    }
                    if (cacheBackground === true) {
                      that.backgroundCache_layer.moveToTop()
                      that.backgroundCache_layer.show()
                    }
                    that.layer.moveToTop();

                    for (i in that.kineticElement) {

                        if (that.persistent[i] == "off") {
                            //that.kineticElement[i].fillPriority('color');
                            //that.kineticElement[i].fill('rgba(0, 0, 0, 0)');
                            that.kineticElement[i].stroke('rgba(0, 0, 0, 0)');
                            that.kineticElement[i].strokeWidth(0);
                        }
                        else if (that.persistent[i] == "onPath") {
                            that.kineticElement[i].fillPriority('color');
                            that.kineticElement[i].fill('rgba(' + iaScene.colorPersistent.red + ',' + iaScene.colorPersistent.green + ',' + iaScene.colorPersistent.blue + ',' + iaScene.colorPersistent.opacity + ')');
                        }
                        else if (that.persistent[i] == "onImage") {
                            that.kineticElement[i].fillPriority('pattern');
                            that.kineticElement[i].fillPatternScaleX(that.backgroundImageOwnScaleX[i] * 1/iaScene.scale);
                            that.kineticElement[i].fillPatternScaleY(that.backgroundImageOwnScaleY[i] * 1/iaScene.scale);
                            that.kineticElement[i].fillPatternImage(that.backgroundImage[i]);
                        }
                    }

                    var popupMaterialTopOrigin = ($("#popup_material_background").height() - $("#popup_material").height()) / 2
                    var popupMaterialLeftOrigin = ($("#popup_material_background").width() - $("#popup_material").width()) / 2

                    var backgroundWidth = Math.min($("#popup_material_title").height(), $("#popup_material").width() / 2)
                    var backgroundHeight = $("#popup_material_title").height()
                    var imageWidth = (that.maxX - that.minX)
                    var imageHeight = (that.maxY - that.minY)
                    var a = Math.min(
                            backgroundWidth / imageWidth,
                            backgroundHeight / imageHeight)

                    var x = popupMaterialLeftOrigin
                    var y = ((backgroundHeight - a * imageHeight) / 2) + popupMaterialTopOrigin

                      $.easing.custom = function (x, t, b, c, d) {
                        return c*(t/=d)*t*t*t*t + b;
                      }
                      $("#popup_material_content").hide()
                      $("#content article").hide()
                      $("#popup_material").animate({
                        'top': (popupMaterialTopOrigin) + 'px',
                      },{
                        duration : 500,
                        easing : "custom",
                        queue : false,
                        complete : function(){
                          $("#" + that.idText).show()
                          $("#popup_material_content").fadeIn()
                        }
                      })

                      $("#popup_material_image_" + that.idText).animate({
                        'top' : y + 'px',
                        'left' : x + 'px',
                        'height' : (a * imageHeight) + 'px',
                        'width' : (a * imageWidth) + 'px',

                      },{
                        duration : 500,
                        easing : "custom",
                        queue : false
                      })

                      $("#popup_material_title_text").css({
                        "margin-left" : (a * imageWidth) + 'px'
                      })

                    that.layer.draw();
                    if (cacheBackground === true) that.backgroundCache_layer.draw()
                    iaScene.element = that;

                    that.myhooks.afterIaObjectFocus(iaScene, idText, that);
                }
            }
        });
    }
    /*
     * if we leave this element, just clear the scene
     */
    that.kineticElement[i].on('mouseleave', function() {
        if ((iaScene.cursorState.indexOf("ZoomOut.cur") !== -1) ||
         (iaScene.cursorState.indexOf("ZoomIn.cur") !== -1) ||
           (iaScene.cursorState.indexOf("ZoomFocus.cur") !== -1)) {

        }
        else {
            var mouseXY = that.layer.getStage().getPointerPosition();
            if (typeof(mouseXY) == "undefined") {
		        mouseXY = {x:0,y:0};
            }
            if ((that.layer.getStage().getIntersection(mouseXY) != this)) {
                that.backgroundCache_layer.moveToBottom();
                that.backgroundCache_layer.hide();
                for (var i in that.kineticElement) {
                    if ((that.persistent[i] == "off") || (that.persistent[i] == "off-image")) {
                        that.kineticElement[i].fillPriority('color');
                        that.kineticElement[i].fill('rgba(0, 0, 0, 0)');
                        that.kineticElement[i].stroke('rgba(0, 0, 0, 0)');
                        that.kineticElement[i].strokeWidth(0);
                    }
                    else if (that.persistent[i] == "onPath") {
                        that.kineticElement[i].fillPriority('color');
                        that.kineticElement[i].fill('rgba(' + iaScene.colorPersistent.red + ',' + iaScene.colorPersistent.green + ',' + iaScene.colorPersistent.blue + ',' + iaScene.colorPersistent.opacity + ')');
                    }
                    else if (that.persistent[i] == "onImage") {
                        that.kineticElement[i].fillPriority('pattern');
                        that.kineticElement[i].fillPatternScaleX(that.backgroundImageOwnScaleX[i] * 1/iaScene.scale);
                        that.kineticElement[i].fillPatternScaleY(that.backgroundImageOwnScaleY[i] * 1/iaScene.scale);
                        that.kineticElement[i].fillPatternImage(that.backgroundImage[i]);
                    }
                }
                document.body.style.cursor = "default";
                iaScene.cursorState = "default";
                that.layer.draw();
                that.backgroundCache_layer.draw();
            }
        }
    });
};

//   This program is free software: you can redistribute it and/or modify
//   it under the terms of the GNU General Public License as published by
//   the Free Software Foundation, either version 3 of the License, or
//   (at your option) any later version.
//   This program is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   GNU General Public License for more details.
//   You should have received a copy of the GNU General Public License
//   along with this program.  If not, see <http://www.gnu.org/licenses/>
//
//
// @author : pascal.fautrero@crdp.ac-versailles.fr

/**
 *
 * @param {type} originalWidth
 * @param {type} originalHeight
 * @constructor create image active scene
 */
function IaScene(originalWidth, originalHeight) {
    "use strict";
    var that = this;
    //  canvas width
    this.width = 1000;

    // canvas height
    this.height = 800;

    // default color used to fill shapes during mouseover
    var _colorOver = {red:66, green:133, blue:244, opacity:0.6};

    // default color used to fill stroke around shapes during mouseover
    var _colorOverStroke = {red:0, green:153, blue:204, opacity:1};

    // default color used to fill shapes if defined as cache
    this.colorPersistent = {red:124, green:154, blue:174, opacity:1};

    // Image ratio on the scene
    this.ratio = 1.00;

    // padding-top in the canvas
    this.y = 0;

    // color used over background image during focus
    var _colorCache = {red:0, green:0, blue:0, opacity:0.6};

    // internal
    this.fullScreen = "off";
    this.backgroundCacheColor = 'rgba(' + _colorCache.red + ',' + _colorCache.green + ',' + _colorCache.blue + ',' + _colorCache.opacity + ')';
    this.overColor = 'rgba(' + _colorOver.red + ',' + _colorOver.green + ',' + _colorOver.blue + ',' + _colorOver.opacity + ')';
    this.overColorStroke = 'rgba(' + _colorOverStroke.red + ',' + _colorOverStroke.green + ',' + _colorOverStroke.blue + ',' + _colorOverStroke.opacity + ')';
    this.scale = 1;
    this.zoomActive = 0;
    this.element = 0;
    this.originalWidth = originalWidth;
    this.originalHeight = originalHeight;
    this.coeff = (this.width * this.ratio) / parseFloat(originalWidth);
    this.cursorState="";
    this.noPropagation = false;
    this.nbDetails = 0
    this.nbRootDetails = 0
    this.nbCropedImage = 0
    this.nbDetailsAnalyzed = 0
    this.shapes = []
}

/*
 * Scale entire scene
 *
 */
IaScene.prototype.scaleScene = function(mainScene){
    "use strict";
    var viewportWidth = $(window).width();
    var viewportHeight = $(window).height();

    var coeff_width = (viewportWidth * mainScene.ratio) / parseFloat(mainScene.originalWidth);
    var coeff_height = (viewportHeight) / (parseFloat(mainScene.originalHeight) + $('#canvas').offset().top + $('#container').offset().top);

    var canvas_border_left = parseFloat($("#canvas").css("border-left-width").substr(0,$("#canvas").css("border-left-width").length - 2));
    var canvas_border_right = parseFloat($("#canvas").css("border-right-width").substr(0,$("#canvas").css("border-right-width").length - 2));
    var canvas_border_top = parseFloat($("#canvas").css("border-top-width").substr(0,$("#canvas").css("border-top-width").length - 2));
    var canvas_border_bottom = parseFloat($("#canvas").css("border-bottom-width").substr(0,$("#canvas").css("border-bottom-width").length - 2));

    if ((viewportWidth >= parseFloat(mainScene.originalWidth) * coeff_width) && (viewportHeight >= ((parseFloat(mainScene.originalHeight) + $('#canvas').offset().top) * coeff_width))) {
        mainScene.width = viewportWidth - canvas_border_left - canvas_border_right;
        mainScene.coeff = (mainScene.width * mainScene.ratio) / parseFloat(mainScene.originalWidth);
        mainScene.height = parseFloat(mainScene.originalHeight) * mainScene.coeff;
    }
    else if ((viewportWidth >= parseFloat(mainScene.originalWidth) * coeff_height) && (viewportHeight >= (parseFloat(mainScene.originalHeight) + $('#canvas').offset().top) * coeff_height)) {
        mainScene.height = viewportHeight - $('#container').offset().top - $('#canvas').offset().top - canvas_border_top - canvas_border_bottom - 2;
        mainScene.coeff = (mainScene.height) / parseFloat(mainScene.originalHeight);
        mainScene.width = parseFloat(mainScene.originalWidth) * mainScene.coeff;
    }


    $('#container').css({"width": (mainScene.width + canvas_border_left + canvas_border_right) + 'px'});
    $('#container').css({"height": (mainScene.height + $('#canvas').offset().top - $('#container').offset().top + canvas_border_top + canvas_border_bottom) + 'px'});
    $('#canvas').css({"height": (mainScene.height) + 'px'});
    $('#canvas').css({"width": mainScene.width + 'px'});
    $('#detect').css({"height": (mainScene.height) + 'px'});
    $('#detect').css({"top": ($('#canvas').offset().top) + 'px'});
};

//   This program is free software: you can redistribute it and/or modify
//   it under the terms of the GNU General Public License as published by
//   the Free Software Foundation, either version 3 of the License, or
//   (at your option) any later version.
//   This program is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   GNU General Public License for more details.
//   You should have received a copy of the GNU General Public License
//   along with this program.  If not, see <http://www.gnu.org/licenses/>
//   
//   
// @author : pascal.fautrero@ac-versailles.fr


// Script used to load youtube resource after main page
// otherwise, Chrome fails to start the page

$(".videoWrapper16_9").each(function(){
    var source = $(this).data("iframe");
    var iframe = document.createElement("iframe");
    iframe.src = source;
    $(this).append(iframe);    
});

$(".videoWrapper4_3").each(function(){
    var source = $(this).data("iframe");
    var iframe = document.createElement("iframe");
    iframe.src = source;
    $(this).append(iframe);    
});
$(".flickr_oembed").each(function(){
    var source = $(this).data("oembed");
    var that = $(this);
    $.ajax({
        url: "http://www.flickr.com/services/oembed/?format=json&callback=?&jsoncallback=xia&url=" + source,
        dataType: 'jsonp',
        jsonpCallback: 'xia',
        success: function (data) {
            var url = data.url;
            var newimg = document.createElement("img");
            newimg.src = url;
            that.append(newimg);
        }
    });
});
//   This program is free software: you can redistribute it and/or modify
//   it under the terms of the GNU General Public License as published by
//   the Free Software Foundation, either version 3 of the License, or
//   (at your option) any later version.
//   This program is distributed in the hope that it will be useful,
//   but WITHOUT ANY WARRANTY; without even the implied warranty of
//   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   GNU General Public License for more details.
//   You should have received a copy of the GNU General Public License
//   along with this program.  If not, see <http://www.gnu.org/licenses/>
//
//
// @author : pascal.fautrero@ac-versailles.fr

/*
 * Main
 * Initialization
 *
 */

function main(myhooks) {
    "use strict";
    var that=window
    that.canvas = document.getElementById("canvas")

    this.backgroundLoaded = $.Deferred()

    this.backgroundLoaded.done(function(value){
      var newImage = document.createElement('img')
      $("#popup_material_image_background").after(newImage)
      $(newImage).attr("id", "popup_material_image_general")
      $(newImage).addClass("popup_material_image")
      $(newImage).attr("src", scene.image).load(function(){
          $("#popup_material_image_general").css({
            'position' : 'absolute',
            'display' : 'block',
            //'top' : iaObject.minY + 'px',
            'top' : '2000px',
            'left' : '0px',
            'transition' : '0s',
            'cursor' : 'pointer'
          })
      })

      // Load background image

      that.imageObj = new Image()
      that.imageObj.src = scene.image
      that.imageObj.onload = function() {

          var mainScene = new IaScene(scene.width,scene.height);
          $(".meta-doc").on("click tap", function(){
            mainScene.cursorState = 'url("img/ZoomOut.cur"),auto'
            var popupMaterialTopOrigin = ($("#popup_material_background").height() - $("#popup_material").height()) / 2
            var popupMaterialLeftOrigin = ($("#popup_material_background").width() - $("#popup_material").width()) / 2

            var backgroundWidth = Math.min($("#popup_material_title").height(), $("#popup_material").width() / 2)
            var backgroundHeight = $("#popup_material_title").height()
            var imageWidth = scene.width
            var imageHeight = scene.height
            var a = Math.min(
                    backgroundWidth / imageWidth,
                    backgroundHeight / imageHeight)

            var x = popupMaterialLeftOrigin
            var y = ((backgroundHeight - a * imageHeight) / 2) + popupMaterialTopOrigin

            $.easing.custom = function (x, t, b, c, d) {
              return c*(t/=d)*t*t*t*t + b;
            }
            $("#popup_material_content").hide()
            $("#content article").hide()
            $("#popup_material").animate({
              'top': (popupMaterialTopOrigin) + 'px',
            },{
              duration : 500,
              easing : "custom",
              queue : false,
              complete : function(){
                $("#general").show()
                $("#popup_material_content").fadeIn()
              }
            })
            $("#popup_material_image_general").css({
              'transition' : '0s'
            })
            $("#popup_material_image_general").animate({
              'top' : y + 'px',
              'left' : x + 'px',
              'height' : (a * imageHeight) + 'px',
              'width' : (a * imageWidth) + 'px'

            },{
              duration : 500,
              easing : "custom",
              queue : false
            })

            $("#popup_material_title_text").css({
              "margin-left" : (a * imageWidth) + 'px'
            })
            $("#popup_material_title h1").html($("#general h1").html())
          })
          $("#popup_material_image_general").on("click tap", function(ev){
            // let's zoom the image
            if (mainScene.cursorState.indexOf("ZoomOut.cur") != -1) {
              mainScene.cursorState = 'url("img/ZoomImage.cur"),auto'
              var backgroundWidth = $("#popup_material_background").width()
              var backgroundHeight = $("#popup_material_background").height()
              var imageWidth = $("#popup_material_image_general").width()
              var imageHeight = $("#popup_material_image_general").height()
              var a = Math.min(
                      3,
                      backgroundWidth / imageWidth,
                      backgroundHeight / imageHeight)

              var x = (backgroundWidth - a * imageWidth) / 2
              var y = (backgroundHeight - a * imageHeight) / 2
              $("#popup_material_image_background").fadeIn()
              $(this).css({
                "position": "absolute",
                "top": y + 'px',
                "left" : x + "px",
                "height" : (a * imageHeight) + 'px',
                "width" : (a * imageWidth) + 'px',
                "transition" : "top 1s, left 1s, height 1s, width 1s"
              });
            }
            // let's unzoom the image
            else {
              mainScene.cursorState = 'url("img/ZoomOut.cur"),auto'
              var popupMaterialTopOrigin = ($("#popup_material_background").height() - $("#popup_material").height()) / 2
              var popupMaterialLeftOrigin = ($("#popup_material_background").width() - $("#popup_material").width()) / 2

              var backgroundWidth = Math.min($("#popup_material_title").height(), $("#popup_material").width() / 2)
              var backgroundHeight = $("#popup_material_title").height()
              var imageWidth = $(this).width()
              var imageHeight = $(this).height()
              var a = Math.min(
                      backgroundWidth / imageWidth,
                      backgroundHeight / imageHeight)

              var x = popupMaterialLeftOrigin
              var y = ((backgroundHeight - a * imageHeight) / 2) + popupMaterialTopOrigin

              $("#popup_material_image_background").fadeOut()
              $(this).css({
                'position' : 'absolute',
                'display' : 'block',
                'top' : y + 'px',
                'left' : x + 'px',
                'height' : (a * imageHeight) + 'px',
                'width' : (a * imageWidth) + 'px',
                'transition' : 'top 1s, left 1s, height 1s, width 1s'
              })
            }
          })

          mainScene.scale = 1;
          mainScene.scaleScene(mainScene);

          var stage = new Kinetic.Stage({
              container: 'canvas',
              width: mainScene.width,
              height: mainScene.height
          });

          // area containing image background
          var baseImage = new Kinetic.Image({
              x: 0,
              y: mainScene.y,
              width: scene.width,
              height: scene.height,
              scale: {x:mainScene.coeff,y:mainScene.coeff},
              image: that.imageObj
          });

          // cache used over background image
          var baseCache = new Kinetic.Rect({
              x: 0,
              y: mainScene.y,
              width: scene.width,
              height: scene.height,
              scale: {x:mainScene.coeff,y:mainScene.coeff},
              fill: mainScene.backgroundCacheColor
          });

          var layers = [];
          that.layers = layers;
          layers[0] = new Kinetic.FastLayer();
          layers[1] = new Kinetic.FastLayer();

          layers[3] = new Kinetic.Layer();
          layers[4] = new Kinetic.Layer();

          layers[0].add(baseCache);
          layers[1].add(baseImage);

          stage.add(layers[0]);
          stage.add(layers[1]);

          stage.add(layers[3]);
          stage.add(layers[4]);
          myhooks.beforeMainConstructor(mainScene, that.layers);
          mainScene.nbDetails = 0
          for (var i in details) {
            if (typeof(details[i].group) !== 'undefined') {
              mainScene.nbDetails+=details[i].group.length
            }
            else {
              mainScene.nbDetails++
            }
          }
          mainScene.nbDetailsLoaded = 0
          mainScene.allDetailsLoaded = $.Deferred()
          mainScene.allDetailsLoaded.done(function(value){
            myhooks.afterMainConstructor(mainScene, that.layers);
            $("#splash").fadeOut("slow", function(){
                    $("#loader").hide();
            });
          })
          if (details.length == 0) mainScene.allDetailsLoaded.resolve(0)
          for (var i in details) {
              var iaObj = new IaObject({
                  imageObj: that.imageObj,
                  detail: details[i],
                  layer: layers[4],
                  idText: "article-" + i,
                  baseImage: baseImage,
                  iaScene: mainScene,
                  background_layer: layers[1],
                  backgroundCache_layer: layers[0],
                  zoomLayer: layers[3],
                  myhooks: myhooks
              })
              mainScene.shapes.push(iaObj);
          }

          if (0 in mainScene.shapes) mainScene.element = mainScene.shapes[0]

      }
    })

    if (scene.path !== "") {
      var tempCanvas = this.convertPath2Image(scene)
      scene.image = tempCanvas.toDataURL()
      this.backgroundLoaded.resolve(0)
    }
    else if (typeof(scene.group) !== "undefined") {
      this.convertGroup2Image(scene)
    }
    else {
      this.backgroundLoaded.resolve(0)
    }

}
/*
 * convert path to image if this path is used as background
 * transform scene.path to scene.image
 */
main.prototype.convertPath2Image = function(scene) {
  var tempCanvas = document.createElement('canvas')
  tempCanvas.setAttribute('width', scene.width)
  tempCanvas.setAttribute('height', scene.height)
  var tempContext = tempCanvas.getContext('2d')
  // Arghh...forced to remove single quotes from scene.path...
  var currentPath = new Path2D(scene.path.replace(/'/g, ""))
  tempContext.beginPath()
  tempContext.fillStyle = scene.fill
  tempContext.fill(currentPath)
  tempContext.strokeStyle = scene.stroke
  tempContext.lineWidth = scene.strokewidth
  tempContext.stroke(currentPath)
  //scene.image = tempCanvas.toDataURL()
  return tempCanvas
}
main.prototype.convertGroup2Image = function(scene) {
  var nbImages = 0
  var nbImagesLoaded = 0
  var tempCanvas = document.createElement('canvas')
  tempCanvas.setAttribute('width', scene.width)
  tempCanvas.setAttribute('height', scene.height)
  var tempContext = tempCanvas.getContext('2d')
  tempContext.beginPath()
  for (var i in scene['group']) {
    if (typeof(scene['group'][i].image) != "undefined") {
      nbImages++
    }
  }
  for (var i in scene['group']) {
      if (typeof(scene['group'][i].path) != "undefined") {
        // Arghh...forced to remove single quotes from scene.path...
        var currentPath = new Path2D(scene['group'][i].path.replace(/'/g, ""))
        tempContext.fillStyle = scene['group'][i].fill
        tempContext.fill(currentPath)
        tempContext.strokeStyle = scene['group'][i].stroke
        tempContext.lineWidth = scene['group'][i].strokewidth
        tempContext.stroke(currentPath)
      }
      else if (typeof(scene['group'][i].image) != "undefined") {
        var tempImage = new Image()
        tempImage.onload = (function(main, imageItem){
          return function(){
              tempContext.drawImage(this, 0, 0, this.width, this.height, imageItem.x, imageItem.y, this.width, this.height)
              nbImagesLoaded++
              if (nbImages == nbImagesLoaded) {
                  scene.image = tempCanvas.toDataURL()
                  main.backgroundLoaded.resolve(0)
              }
          }
        })(this, scene['group'][i])

        tempImage.src = scene['group'][i].image
      }
  }
  if (nbImages == 0) {
    scene.image = tempCanvas.toDataURL()
    this.backgroundLoaded.resolve(0)
  }
}

myhooks = new hooks();
launch = new main(myhooks);

// XORCipher - Super simple encryption using XOR and Base64
// MODIFIED VERSION TO AVOID underscore dependancy
// License : MIT
// 
// As a warning, this is **not** a secure encryption algorythm. It uses a very
// simplistic keystore and will be easy to crack.
//
// The Base64 algorythm is a modification of the one used in phpjs.org
// * http://phpjs.org/functions/base64_encode/
// * http://phpjs.org/functions/base64_decode/
//
// Examples
// --------
//
// XORCipher.encode("test", "foobar"); // => "EgocFhUX"
// XORCipher.decode("test", "EgocFhUX"); // => "foobar"
//
/* jshint forin:true, noarg:true, noempty:true, eqeqeq:true, strict:true,
undef:true, unused:true, curly:true, browser:true, indent:2, maxerr:50 */
/* global _ */

(function(exports) {
    "use strict";

    var XORCipher = {
        encode: function(key, data) {
            data = xor_encrypt(key, data);
            return b64_encode(data);
        },
        decode: function(key, data) {
            data = b64_decode(data);
            return xor_decrypt(key, data);
        }
    };

    var b64_table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    function b64_encode(data) {
        var o1, o2, o3, h1, h2, h3, h4, bits, r, i = 0, enc = "";
        if (!data) { return data; }
        do {
        o1 = data[i++];
        o2 = data[i++];
        o3 = data[i++];
        bits = o1 << 16 | o2 << 8 | o3;
        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;
        enc += b64_table.charAt(h1) + b64_table.charAt(h2) + b64_table.charAt(h3) + b64_table.charAt(h4);
        } while (i < data.length);
        r = data.length % 3;
        return (r ? enc.slice(0, r - 3) : enc) + "===".slice(r || 3);
    }

    function b64_decode(data) {
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, result = [];
        if (!data) { return data; }
        data += "";
        do {
            h1 = b64_table.indexOf(data.charAt(i++));
            h2 = b64_table.indexOf(data.charAt(i++));
            h3 = b64_table.indexOf(data.charAt(i++));
            h4 = b64_table.indexOf(data.charAt(i++));
            bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
            o1 = bits >> 16 & 0xff;
            o2 = bits >> 8 & 0xff;
            o3 = bits & 0xff;
            result.push(o1);
            if (h3 !== 64) {
                result.push(o2);
                if (h4 !== 64) {
                    result.push(o3);
                }
            }
        } while (i < data.length);
        return result;
    }

    function keyCharAt(key, i) {
        //return key.charCodeAt( Math.floor(i % key.length) );
        return key.charCodeAt( i % key.length );
    }

    function xor_encrypt(key, data) {
        /*return _.map(data, function(c, i) {
                return c.charCodeAt(0) ^ keyCharAt(key, i);
        });*/
        var result = [];
        for (var indice in data) {
                result[indice] = data[indice].charCodeAt(0) ^ keyCharAt(key, indice);
        }
        return result;
    }

    function xor_decrypt(key, data) {
        /*return _.map(data, function(c, i) {
                return String.fromCharCode( c ^ keyCharAt(key, i) );
        }).join("");*/
        var result = [];
        for (var indice in data) {
                result[indice] = String.fromCharCode( data[indice] ^ keyCharAt(key, indice) );
        }
        return result.join("");

    }

    exports.XORCipher = XORCipher;

})(this);

String.prototype.decode = function(encoding) {
    var result = "";
 
    var index = 0;
    var c = c1 = c2 = 0;
 
    while(index < this.length) {
        c = this.charCodeAt(index);
 
        if(c < 128) {
            result += String.fromCharCode(c);
            index++;
        }
        else if((c > 191) && (c < 224)) {
            c2 = this.charCodeAt(index + 1);
            result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            index += 2;
        }
        else {
            c2 = this.charCodeAt(index + 1);
            c3 = this.charCodeAt(index + 2);
            result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            index += 3;
        }
    }
 
    return result;
};
String.prototype.encode = function(encoding) {
    var result = "";
 
    var s = this.replace(/\r\n/g, "\n");
 
    for(var index = 0; index < s.length; index++) {
        var c = s.charCodeAt(index);
 
        if(c < 128) {
            result += String.fromCharCode(c);
        }
        else if((c > 127) && (c < 2048)) {
            result += String.fromCharCode((c >> 6) | 192);
            result += String.fromCharCode((c & 63) | 128);
        }
        else {
            result += String.fromCharCode((c >> 12) | 224);
            result += String.fromCharCode(((c >> 6) & 63) | 128);
            result += String.fromCharCode((c & 63) | 128);
        }
    }
 
    return result;
};
