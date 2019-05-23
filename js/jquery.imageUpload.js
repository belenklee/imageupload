/**
 * jquery.imageUpload.js v1.0.0
 * Created by Belenk Lee on 2017/9/7.
 * Last update by 2018/10/15.
 */


;(function (factory) {
    if (typeof define === "function" && define.amd) {
        // AMD模式
        define([ "jquery" ], factory);
    } else {
        // 全局模式
        factory(jQuery);
    }
}(function ($) {
    $.fn.extend({
        "imageUpload" : function(options){
            //配置
            $.fn.imageUpload.defaults = {
                //自定义皮肤类名
                skinName: "default-skin",
                //同时选择上传张数
                selectMax: 3,
                //最大上传张数
                fileMax: 3,
                //上传文件大小限制（字节数），默认：5M，配置为false或0即不限大小
                fileSize: 5 * 1024 * 1024,
                //图片类型（正则匹配）
                fileType: /\/(?:jpeg|png|bmp)/i,
                //上传路径（自行配置）
                uploadUrl: null,
                //异步上传文件字段名
                uploadName: "imagefile",
                //提交路径字段名
                imageInputName: "path",
                //自定义上传返回key值
                resultKey: "path",
                //上传成功回调
                uploadSuccess: null,
                //图片缩放预览，默认：启用
                zoomable: true,
                //canvas图片预处理
                canvas: {
                    //是否启用，默认：否
                    enable: false,
                    //压缩大小界定，如果小于它，则直接上传
                    maxSize: 5 * 1024 * 1024,
                    //像素压缩，超过该像素配置图片将压缩至该像素，默认400万像素
                    maxPixel: 4000000,
                    //如果图片像素大于该配置则使用瓦片绘制，默认xxhdpi
                    tilePixel: 1920 * 1080,
                    //图片质量控制(0.1 ~ 1)
                    quality: .5
                },
                //存放缩略图路径
                thumbnail: {
                    //是否启用，默认：false
                    enable: false,
                    //自定义上传返回key值
                    resultKey: "thumbPath",
                    //提交路径字段名
                    thumbInputName: "thumbPath"
                },
                //图片描述功能
                description: {
                    //是否开启，默认：false
                    enable: false,
                    //描述内容字段名
                    descInputName: "description",
                    //默认value
                    defaultValue: "",
                    //空内容提示
                    placeholder: "请输入该图片描述...",
                    //描述字数限制
                    allowed: 200,
                    warning: 25,
                    cssWarning: 'warning',
                    cssExceeded: 'exceeded',
                    counterText: '剩余字符：',
                    counterExceeded: '超出字符：'
                },
                //消息
                message: {
                    //最多选择提示
                    tipsSelectMax: "最多同时只可上传 __SELECTMAX__ 张图片。",
                    //最多上传提示
                    tipsFileMax: "最多只可上传 __FILEMAX__ 张图片。",
                    //图片大小提示
                    tipsFileSize: "图片大小不能超过 __FILESIZE__M。",
                    //图片类型错误提示
                    tipsFileType: "只支持jpg、png、bmp格式图片。",
                    //上传按钮文字
                    textButton: "点击添加图片",
                    //上传按钮提示
                    tipsButton: "支持jpg，png，bmp格式"
                },
                //使用自定义的消息事件(callback function)
                customMessage: {
                    /**
                     * 示例
                    selectMax: function(){
                        layer.confirm('最多同时只可上传3张图片。', {
                            btn: ['确定'], //按钮
                            shade: false,//不显示遮罩
                            icon: 7
                        });
                    }
                    */
                    selectMax: null,
                    fileMax: null,
                    fileSize: null,
                    fileType: null
                },
                data: {
                    imageData: {}
                }
                /**
                 * 初始数据加载，格式示例
                 * @namespace （可选项）路径命名空间，当图片在数据库内为相对路径时使用
                 * @path 数据库存储的图片路径
                data: {
                    imageData: [
                        {
                            namespace: "",
                            path: "../../images/demo/test/20160912003659690.jpg",
                            thumbPath: "../../images/demo/test/20160912003659690.jpg",
                            description: "这是第一张图片"
                        },
                        {
                            namespace: "",
                            path: "../../images/demo/test/aeolian_by_wlop-d9ctyhy.jpg",
                            thumbPath: "../../images/demo/test/20160912003659690.jpg",
                            description: "这是第二张图片"
                        }
                    ]
                }
                 */
            };

            var $element = $(this),
                settings = $.extend(true, {},$.fn.imageUpload.defaults,options);

            var imageUpload = {
                //需要渲染的html
                htmlBuffer:
                    '<div class="upload-image ' + settings.skinName + '">' +
                        '<div style="display:none">' +
                            '<input type="file" class="upload-choose" multiple >' +
                            '<div class="pic-list"></div>' +
                        '</div>' +
                        '<div class="upload-box">' +
                            '<div class="upload-icon">' +
                                '<div class="icon-wrapper">' +
                                '<div class="icon-plus-x"></div>' +
                                '<div class="icon-plus-y"></div>' +
                                '</div>' +
                            '</div>' +
                            '<em>' + settings.message.textButton + '</em>' +
                            '<p>' + settings.message.tipsButton + '</p>' +
                        '</div>' +
                        '<ul class="img-list clearfix">' +
                        '</ul>' +
                    '</div>',
                //格式化模板
                msgFormat: function(template, msg){
                    return template.
                    replace(/__SELECTMAX__/g, msg ).
                    replace(/__FILEMAX__/g, msg ).
                    replace(/__FILESIZE__/g, msg );
                },
                //图片上传，将base64的图片转成二进制对象，塞进formdata上传
                upload: function(basestr, file, $li ,$content) {
                    var context = this;
                    var text = window.atob(basestr.split(",")[1]);
                    var buffer = new Uint8Array(text.length);
                    var pecent = 0;
                    for (var i = 0; i < text.length; i++) {
                        buffer[i] = text.charCodeAt(i);
                    }
                    var blob = utils.getBlob([buffer], file.type);
                    var formdata = utils.getFormData();
                    formdata.append(settings.uploadName, blob, file.name);
                    //上传url
                    $.ajax({
                        type: "POST",
                        url: settings.uploadUrl,
                        data: formdata,
                        cache: false,
                        processData: false,
                        contentType: false,
                        success: function(data){
                            var jsonData = data;
                            var imagedata = jsonData || {};
                            var text = imagedata[settings.resultKey] ? '上传成功' : '上传失败';
                            console.log(text + '：' + imagedata[settings.resultKey]);
                            //当收到该消息时上传完毕
                            $li.find(".upload-progress span").css('height', 0);
                            $li.find(".upload-progress .pecent").text("").hide();
                            $li.find(".upload-progress").append('<em><i class="success"></i><p>上传成功</p></em>');
                            $li.find(".upload-progress em").css({
                                'top': $li.find(".upload-progress").height() / 2 - $li.find(".upload-progress em").height() / 2,
                                'left': $li.find(".upload-progress").width() / 2 - $li.find(".upload-progress em").width() / 2
                            });
                            setTimeout(function(){$li.find(".upload-progress em").fadeOut(200)},1000);
                            if (!imagedata[settings.resultKey]) return;
                            // $li.data("path", imagedata[settings.resultKey]);
                            $li.addClass("success").append(
                                '<input class="path-input" name="' + settings.imageInputName + '" type="text" value="' + imagedata[settings.resultKey] + '" style="display: none;"/>'
                            );
                            if(settings.thumbnail.enable){
                                $li.addClass("success").append(
                                    '<input class="thumb-path-input" name="' + settings.thumbnail.thumbInputName + '" type="text" value="' + imagedata[settings.thumbnail.resultKey] + '" style="display: none;"/>'
                                );
                            }
                            if(settings.description.enable){
                                $li.append(
                                    '<div class="mask">添加描述</div><textarea class="description-input" name="' + settings.description.descInputName + '" type="text" style="display: none;">' + settings.description.defaultValue + '</textarea>'
                                );
                                $li.find('.mask').mousedown(function(e){
                                    e.stopPropagation();
                                }).click(function() {
                                    var $descInput = $(this).siblings('.description-input');
                                    var html = "";
                                    html += '<div class="description-box">';
                                    html += '<div class="description-header clearfix">';
                                    html += '<div class="header-title">描述</div>';
                                    html += '<div class="count-tips">剩余字符：<em>' + settings.description.allowed + '</em></div>';
                                    html += '</div>';
                                    html += '<textarea class="description-edit" placeholder="' + settings.description.placeholder + '">' + utils.decodeTextAreaString($descInput.val()) + '</textarea> ';
                                    html += '<div class="description-group">';
                                    html += '<div class="description-btn button btn-primary btn-confirm">确定</div> <div class="description-btn button btn-normal btn-cancel">取消</div>';
                                    html += '</div>';
                                    html += '</div>';

                                    $('.page-dialog').remove();
                                    $('body').append('<div class="page-dialog"><div class="page-mask"></div><div class="dialog-box"></div></div>');
                                    $('.page-dialog .dialog-box').append(html).css({
                                        'top': $(window).height()/2 - $('.page-dialog .dialog-box').height()/2,
                                        'left': $(window).width()/2 - $('.page-dialog .dialog-box').width()/2
                                    });

                                    var $tips = $('.page-dialog .description-header .count-tips');
                                    var $textarea = $('.page-dialog .description-edit');
                                    context.calculate($tips, $textarea);
                                    $textarea.keyup(function(){
                                        context.calculate($tips, $textarea);
                                    }).change(function(){
                                        context.calculate($tips, $textarea);
                                    });

                                    $('.page-dialog .btn-confirm').click(function(){
                                        if(settings.description.allowed - $textarea.val().length < 0){
                                            $textarea.addClass("warning");
                                        }else{
                                            $descInput.val(utils.encodeTextAreaString($('.page-dialog .description-box .description-edit').val()));
                                            $('.page-dialog').remove();
                                            $textarea.removeClass("warning");
                                        }
                                    });

                                    $('.page-dialog .btn-cancel, .page-dialog .page-mask').click(function(){
                                        $('.page-dialog').remove();
                                    });
                                });
                            }
                            //上传成功后回调
                            if(typeof(settings.uploadSuccess) == "function"){
                                settings.uploadSuccess($element, $content, $li);
                            }
                        },
                        error: function(){
                            $li.find(".upload-progress span").css('height', 0);
                            $li.find(".upload-progress .pecent").text("").hide();
                            $li.find(".upload-progress").append('<em><i class="failed"></i><p>上传失败</p></em>');
                            $li.find(".upload-progress em").css({
                                'top': $li.find(".upload-progress").height() / 2 - $li.find(".upload-progress em").height() / 2,
                                'left': $li.find(".upload-progress").width() / 2 - $li.find(".upload-progress em").width() / 2
                            });
                        },
                        xhr: function() {
                            var xhr = $.ajaxSettings.xhr();
                            //检查upload属性是否存在
                            if(xhr.upload){
                                //绑定上传进度的回调函数
                                xhr.upload.addEventListener('progress', function (e) {
                                    if (e.lengthComputable) {
                                        pecent = e.loaded / e.total * 100;
                                        $li.find(".upload-progress span").css('height', 100 - pecent + "%");
                                        $li.find(".upload-progress .pecent").text(parseInt(pecent) + "%").css({
                                            'top': $li.find(".upload-progress").height() / 2 - $li.find(".upload-progress .pecent").height() / 2,
                                            'left': $li.find(".upload-progress").width() / 2 - $li.find(".upload-progress .pecent").width() / 2
                                        });
                                    }
                                }, false);
                            }
                            //一定要返回，不然jQ没有XHR对象用了
                            return xhr;
                        }
                    });
                },
                //使用canvas对大图片进行压缩
                compress: function(img) {
                    //用于压缩图片的canvas
                    var pCanvas = document.createElement("canvas");
                    var pctx = pCanvas.getContext('2d');
                    //瓦片canvas
                    var tCanvas = document.createElement("canvas");
                    var tctx = tCanvas.getContext("2d");

                    var initSize = img.src.length;
                    var width = img.width;
                    var height = img.height;
                    //如果图片大于像素配置，计算压缩比并将大小压至配置以下
                    var ratio;
                    if ((ratio = width * height / settings.canvas.maxPixel) > 1) {
                        ratio = Math.sqrt(ratio);
                        width /= ratio;
                        height /= ratio;
                    } else {
                        ratio = 1;
                    }
                    pCanvas.width = width;
                    pCanvas.height = height;
                    //铺底色
                    pctx.fillStyle = "#fff";
                    pctx.fillRect(0, 0, pCanvas.width, pCanvas.height);
                    //如果图片像素大于绘制配置万则使用瓦片绘制
                    var count;
                    if ((count = width * height / settings.canvas.tilePixel) > 1) {
                        count = ~~(Math.sqrt(count) + 1); //计算要分成多少块瓦片
                        //计算每块瓦片的宽和高
                        var nw = ~~(width / count);
                        var nh = ~~(height / count);
                        tCanvas.width = nw;
                        tCanvas.height = nh;
                        for (var i = 0; i < count; i++) {
                            for (var j = 0; j < count; j++) {
                                tctx.drawImage(img, i * nw * ratio, j * nh * ratio, nw * ratio, nh * ratio, 0, 0, nw, nh);
                                pctx.drawImage(tCanvas, i * nw, j * nh, nw, nh);
                            }
                        }
                    } else {
                        pctx.drawImage(img, 0, 0, width, height);
                    }
                    //进行最小压缩
                    var ndata = pCanvas.toDataURL('image/jpeg', settings.canvas.quality);
                    console.log('压缩前：' + initSize);
                    console.log('压缩后：' + ndata.length);
                    console.log('压缩率：' + ~~(100 * (initSize - ndata.length) / initSize) + "%");
                    tCanvas.width = tCanvas.height = pCanvas.width = pCanvas.height = 0;

                    return ndata;
                },
                //描述字符计算
                calculate: function($tips, $textarea){
                    var count = $textarea.val().length;
                    var available = settings.description.allowed - count;
                    if(available <= settings.description.warning && available >= 0){
                        $tips.addClass(settings.description.cssWarning);
                    } else {
                        $tips.removeClass(settings.description.cssWarning);
                    }
                    if(available < 0){
                        $tips.addClass(settings.description.cssExceeded).html(settings.description.counterExceeded + '<em>' + -available + '</em>');
                    } else {
                        $tips.removeClass(settings.description.cssExceeded).html(settings.description.counterText + '<em>' + available + '</em>');
                    }
                },
                //图片缩放
                imageZoom: function(img){
                    //缩放html
                    var html = '';
                    var outerdiv = "outerdiv";
                    var bigimg = "bigimg";
                    html += '<div id=' + outerdiv + '>';
                    html += '<img id=' + bigimg + ' src="" />';
                    html += '</div>';

                    $('#' + outerdiv).remove();
                    $(document.body).append($(html).hide().fadeIn("fast"));
                    $('#bigimg').attr("src", img);//设置#bigimg元素的src属性
                    $('#' + outerdiv).click(function(){//再次点击淡出消失弹出层
                        $(this).fadeOut("fast", function(){ $(this).remove(); });
                    });
                },
                uninit: function(){
                    var $content = $element.find('.upload-image');

                    $content.find('.upload-box').unbind('click');
                    $content.find('.upload-choose').unbind('change');
                    $content.find('.img-list li .delete').unbind('mousedown click');
                    if(settings.zoomable){
                        $content.find('.img-list li .zoom').unbind('mousedown click');
                    }
                    if(settings.description.enable) {
                        $content.find('.img-list li .mask').unbind('mousedown click');
                    }
                    $content.remove();
                },
                init: function(){
                    var context = this;

                    $element.append(imageUpload.htmlBuffer);

                    var $content = $element.find('.upload-image');
                    if(typeof(settings.data.imageData) != "undefined"){
                        if(settings.data.imageData.length > 0){
                            var li = '';
                            for(var i in settings.data.imageData){
                                li += '<li class="success" style="background-image: url(' + (typeof(settings.data.imageData[i].namespace) == "undefined" ? "" : settings.data.imageData[i].namespace) + settings.data.imageData[i][settings.resultKey] + '">';
                                li +=   '<div class="drag-wrapper"></div>';
                                li +=   '<div class="button-group">';
                                li +=       '<div class="delete" title="删除"></div>';
                                if(settings.zoomable){
                                    li +=       '<div class="zoom" title="缩放"></div>';
                                }
                                li +=   '</div>';
                                li +=   '<input class="path-input" name="' + settings.imageInputName + '" type="text" value="' + (typeof(settings.data.imageData[i][settings.resultKey]) == "undefined" ? "" : settings.data.imageData[i][settings.resultKey]) + '" style="display: none;"/>'
                                if(settings.thumbnail.enable){
                                    li +=   '<input class="thumb-path-input" name="' + settings.thumbnail.thumbInputName + '" type="text" value="' + (typeof(settings.data.imageData[i][settings.thumbnail.resultKey]) == "undefined" ? "" : settings.data.imageData[i][settings.thumbnail.resultKey]) + '" style="display: none;"/>'
                                }
                                if(settings.description.enable){
                                    li +=   '<div class="mask">添加描述</div>';
                                    li +=   '<textarea class="description-input" name="' + settings.description.descInputName + '" type="text" style="display: none;">' + (typeof(settings.data.imageData[i].description) == "undefined" ? settings.description.defaultValue : settings.data.imageData[i].description) + '</textarea>'
                                }
                                li += '</li>';
                            }
                            $content.find('.img-list').append($(li));
                        }
                    }

                    $content.find('.upload-box').click(function () {
                        $content.find('.upload-choose').click();
                    });

                    $content.find('.img-list li .delete').mousedown(function(e){
                        e.stopPropagation();
                    }).click(function() {
                        $(this).parent('.button-group').parent('li').remove();
                    });

                    $content.find('.img-list li .zoom').mousedown(function(e){
                        e.stopPropagation();
                    }).click(function() {
                        context.imageZoom($(this).parent('.button-group').parent('li').css("background-image").replace('url(','').replace(')','').replace(/\"/gi, ""));
                    });

                    if(settings.description.enable) {
                        $content.find('.img-list li .mask').mousedown(function (e) {
                            e.stopPropagation();
                        }).click(function () {
                            var $descInput = $(this).siblings('.description-input');
                            var html = "";
                            html += '<div class="description-box">';
                            html += '<div class="description-header clearfix">';
                            html += '<div class="header-title">描述</div>';
                            html += '<div class="count-tips">剩余字符：<em>' + settings.description.allowed + '</em></div>';
                            html += '</div>';
                            html += '<textarea class="description-edit" placeholder="' + settings.description.placeholder + '">' + utils.decodeTextAreaString($descInput.val()) + '</textarea> ';
                            html += '<div class="description-group">';
                            html += '<div class="description-btn button btn-primary btn-confirm">确定</div> <div class="description-btn button btn-normal btn-cancel">取消</div>';
                            html += '</div>';
                            html += '</div>';

                            $('.page-dialog').remove();
                            $('body').append('<div class="page-dialog"><div class="page-mask"></div><div class="dialog-box"></div></div>');
                            $('.page-dialog .dialog-box').append(html).css({
                                'top': $(window).height() / 2 - $('.page-dialog .dialog-box').height() / 2,
                                'left': $(window).width() / 2 - $('.page-dialog .dialog-box').width() / 2
                            });

                            var $tips = $('.page-dialog .description-header .count-tips');
                            var $textarea = $('.page-dialog .description-edit');
                            context.calculate($tips, $textarea);
                            $textarea.keyup(function(){
                                context.calculate($tips, $textarea);
                            }).change(function(){
                                context.calculate($tips, $textarea);
                            });

                            $('.page-dialog .btn-confirm').click(function(){
                                if(settings.description.allowed - $textarea.val().length < 0){
                                    $textarea.addClass("warning");
                                }else{
                                    $descInput.val(utils.encodeTextAreaString($('.page-dialog .description-box .description-edit').val()));
                                    $('.page-dialog').remove();
                                    $textarea.removeClass("warning");
                                }
                            });

                            $('.page-dialog .btn-cancel, .page-dialog .page-mask').click(function () {
                                $('.page-dialog').remove();
                            });
                        });
                    }

                    $content.find('.upload-choose').change(function () {
                        if (!this.files.length) return;
                        var files = Array.prototype.slice.call(this.files);
                        if (files.length > settings.selectMax) {
                            if(typeof(settings.customMessage.selectMax) == "function"){
                                settings.customMessage.selectMax();
                            }else{
                                alert(imageUpload.msgFormat(settings.message.tipsSelectMax, settings.selectMax));
                            }
                            return;
                        }
                        files.forEach(function (file, i) {
                            if($content.find('.img-list li.success').length >= settings.fileMax || files.length > settings.fileMax - $content.find('.img-list li.success').length){
                                if(typeof(settings.customMessage.fileMax) == "function"){
                                    settings.customMessage.fileMax();
                                }else{
                                    alert(imageUpload.msgFormat(settings.message.tipsFileMax, settings.fileMax));
                                }
                                return;
                            }
                            if (!settings.fileType.test(file.type)){
                                if(typeof(settings.customMessage.fileType) == "function"){
                                    settings.customMessage.fileType();
                                }else{
                                    alert(settings.message.tipsFileType);
                                }
                                return;
                            }
                            if(~~settings.fileSize){
                                if(file.size > settings.fileSize){//字节数
                                    console.log(file.size);
                                    if(typeof(settings.customMessage.fileSize) == "function"){
                                        settings.customMessage.fileSize();
                                    }else{
                                        alert(imageUpload.msgFormat(settings.message.tipsFileSize, parseFloat((settings.fileSize / 1024 / 1024).toFixed(2))));
                                    }
                                    return;
                                }
                            }

                            var reader = new FileReader();
                            var li = document.createElement("li");
                            li.innerHTML = '' +
                                '<div class="drag-wrapper"></div>' +
                                '<div class="button-group">' +
                                    '<div class="delete" title="删除"></div>' +
                                    (settings.zoomable ? '<div class="zoom" title="缩放"></div>' : '') +
                                '</div>' +
                                '<div class="upload-progress">' +
                                    '<span></span>' +
                                    '<div class="pecent"></div>' +
                                '</div>';

                            $content.find('.img-list').append($(li));
                            $(li).find('.delete').mousedown(function(e){
                                e.stopPropagation();
                            }).click(function() {
                                $(this).parent('.button-group').parent('li').remove();
                            });
                            $(li).find('.zoom').mousedown(function(e){
                                e.stopPropagation();
                            }).click(function() {
                                context.imageZoom($(li).css("background-image").replace('url(','').replace(')','').replace(/\"/gi, ""));
                            });

                            reader.onload = function () {
                                var result = this.result;
                                var img = new Image();
                                img.src = result;
                                $(li).css("background-image", "url(" + result + ")");
                                if(settings.canvas.enable){
                                    //如果图片大小小于配置，则直接上传
                                    if (result.length <= settings.canvas.maxSize) {
                                        img = null;
                                        context.upload(result, file, $(li), $content);
                                        return;
                                    }
                                    //图片加载完毕之后进行压缩，然后上传
                                    if (img.complete) {
                                        callback();
                                    } else {
                                        img.onload = callback;
                                    }
                                    function callback() {
                                        var data = context.compress(img);
                                        context.upload(data, file, $(li), $content);
                                        img = null;
                                    }
                                }else{
                                    context.upload(result, file, $(li), $content);
                                    return;
                                }
                            };
                            reader.readAsDataURL(file);
                        });

                        var $file = $(this);
                        $file.val("");
                    });
                }
            };

            var utils = {
                /**
                 * 获取blob对象的兼容性写法
                 * @param buffer
                 * @param format
                 * @returns {*}
                 */
                getBlob: function(buffer, format) {
                    try {
                        return new Blob(buffer, {type: format});
                    } catch (e) {
                        var bb = new (window.BlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder);
                        buffer.forEach(function (buf) {
                            bb.append(buf);
                        });
                        return bb.getBlob(format);
                    }
                },

                /**
                 * 获取formdata
                 */
                getFormData: function() {
                    var isNeedShim = ~navigator.userAgent.indexOf('Android')
                        && ~navigator.vendor.indexOf('Google')
                        && !~navigator.userAgent.indexOf('Chrome')
                        && navigator.userAgent.match(/AppleWebKit\/(\d+)/).pop() <= 534;
                    return isNeedShim ? new this.FormDataShim() : new FormData()
                },

                /**
                 * formdata 补丁, 给不支持formdata上传blob的android机打补丁
                 * @constructor
                 */
                FormDataShim: function() {
                    console.warn('using formdata shim');
                    var o = this,
                        parts = [],
                        boundary = Array(21).join('-') + (+new Date() * (1e16 * Math.random())).toString(36),
                        oldSend = XMLHttpRequest.prototype.send;
                    this.append = function (name, value, filename) {
                        parts.push('--' + boundary + '\r\nContent-Disposition: form-data; name="' + name + '"');
                        if (value instanceof Blob) {
                            parts.push('; filename="' + (filename || 'blob') + '"\r\nContent-Type: ' + value.type + '\r\n\r\n');
                            parts.push(value);
                        }
                        else {
                            parts.push('\r\n\r\n' + value);
                        }
                        parts.push('\r\n');
                    };
                    // Override XHR send()
                    XMLHttpRequest.prototype.send = function (val) {
                        var fr,
                            data,
                            oXHR = this;
                        if (val === o) {
                            // Append the final boundary string
                            parts.push('--' + boundary + '--\r\n');
                            // Create the blob
                            data = getBlob(parts);
                            // Set up and read the blob into an array to be sent
                            fr = new FileReader();
                            fr.onload = function () {
                                oldSend.call(oXHR, fr.result);
                            };
                            fr.onerror = function (err) {
                                throw err;
                            };
                            fr.readAsArrayBuffer(data);
                            // Set the multipart content type and boudary
                            this.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
                            XMLHttpRequest.prototype.send = oldSend;
                        }
                        else {
                            oldSend.call(this, val);
                        }
                    };
                },

                /**
                * 根据Value格式化为带有换行、空格，引号格式的HTML代码
                * @param strValue {String} 需要转换的值
                * @return  {String}转换后的HTML代码
                * @example
                * encodeTextAreaString("测\r\n\s试")  =>  “测<br/> 试”
                */
                encodeTextAreaString: function(str){
                    return str .replace(/\r\n/g, '<br/>')
                        .replace(/\n/g, '<br/>')
                        .replace(/\s\s/g, ' &nbsp;');

                },

                decodeTextAreaString: function(str){
                    return str .replace(/<br\/>/ig, '\n')
                        .replace(/ &nbsp;/g, '  ');
                }
            };

            //销毁方法
            if (options == "destroy") {
                imageUpload.uninit();
                return $element;
            }
            else{
                //入口方法
                imageUpload.init();
                return $element;
            }
        }
    })
}));