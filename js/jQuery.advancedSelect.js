(function(factory) {
	if (typeof define === "function" && define.amd) {
		define([ "jquery" ], function($) {
			factory($, window, document);
		});
	} else if (typeof module === "object" && module.exports) {
		module.exports = factory(require("jquery"), window, document);
	} else {
		factory(jQuery, window, document);
	}
})(function($, window, document, undefined) {
	"use strict";
	// these vars persist through all instances of the plugin
	var pluginName = "advancedSelect", id = 1, // give each instance it's own id for namespaced event handling
		defaults = {
			element: $(),																					/// element plugin being applied to
			divID: '',																						/// parent div ID
			ajax: {
				data: {},																					/// data returned from search
				template: '',																				/// row template
				listUrl: '',																				/// url for search
				getUrl: '',																					/// url for get details
				templateUrl: '',																			/// url for the template
				lastListUrl: ''																				/// last url for list
			},
			language:{
				noValueText: '- No Value Required -',														/// text for No Value
				buttonText: '- Please Select -',															/// text for button when nothing selected
				multiText: 'Selected',																		/// text for button when multiple rows are selected
				selectAllText: 'Select All',																/// text for button when select all is required
				deselectAllText: 'Deselect All'															/// text for button when deselect all is required
			},
			templateDir: '/templates/advancedSelect/',														/// template directory
			theme: 'materialize',																			/// theme
			viewButton: false,																				/// boolean to show view button
			viewId: 'value',																				/// key for id
			rowCreatedCallback: function(row, data, self){													/// overridable function to run when row created
				var id = row.attr('id');
				var options = self.options;

				var canContinue = true;

				if(!row.hasClass('group')) {

					if(options.multiSelect){
						/// Add row click event
						row.on('click', {'self': self, 'id': id}, function (e) {
							var self = e.data['self'];
							var id = e.data['id'];
							self.check(id);
						});

						/// Create checkbox
						$(document.createElement('input'))
							.attr({
								'id': options.element.attr('id') + '-' + id + "Input",
								'name': options.element.attr('id') + '-' + id + "Input",
								'type': 'checkbox'
							})
							.on('click', {'self': self, 'id': id}, function (e) {
								var self = e.data['self'];
								var id = e.data['id'];

								if ($(this).prop('checked') == true) {
									$(this).prop('checked', false);
								} else {
									$(this).prop('checked', true);
								}

								self.check(id);
								e.stopPropagation();
							})
							.appendTo(row);

						canContinue = false;
					}

					if(canContinue) {
						/// Add row click event
						row.on('click', {'self': self, 'id': id}, function (e) {
							var self = e.data['self'];
							var id = e.data['id'];

							self.set(id);
						});
					}

					if(!options.viewButton){
						$('#button' + id).hide();
					}else if(options.viewButton){
						$('#button' + id).on('click', {'self': self, 'id': id}, function(e){
							var id = e.data['id'];
							var self = e.data['self'];
							self.view(id);
							e.preventDefault();
							e.stopPropagation();
						});
					}
				}
				canContinue = null;
			},																							/// function to launch modal
			ajaxCall: function( defer, self ){
				var options = self.options;
				/// Get select list from URL
				ajaxExtend.create().then(function() {
					ajaxExtend.listExecute({
						"url": options.ajax.listUrl,
						"type": "GET",
						"data": null,
						"key": 'optionsData',
						"text": "Retrieving Data",
						"success": function (data, textStatus, xhr) {
							/// this call is required if overridden
							self.ajaxGetComplete(data, xhr, defer);
						}
					}, options.element);
				});
			},
			disabled: false,																			/// boolean to show whether plugin is disabled
			multiSelect: false,																			/// boolean for whether multi select is on
			zeroValue: true,																			/// boolean for whether to show zero valued options
			blankValue: false,																			/// boolean for whether to show blank valued options
			zeroSet: true,																				/// boolean for whether to allow zero valued options to be selected
			blankSet: true,																				/// boolean for whether to allow blank valued options to be selected
			selectedItems: [],																			/// selected items
			autoBuild: true,																			/// boolean to decide whether to autobuild
			typed: '',
			templateConfig: {}
		};

	function Plugin ( element, options ) {
		this.element = $(element);
		var newObject = $.extend(true, {}, defaults);
		this.options = $.extend(true, newObject, options);
		this.ns = "." + pluginName + id++;
		// Chrome, FF, Safari, IE9+
		this.isGoodBrowser = Boolean(element.setSelectionRange);
		this._name = pluginName;
	}
	Plugin.prototype = {
		_init: function () {
			var self = this;
			var options = this.options;

			options.element = this.element;
			options.selectedItems = [];

			/// Build Screen
			if (options.element.get(0).tagName == "SELECT") {

				var cssClasses = options.element.attr('class');

				if(cssClasses == undefined){
					cssClasses = '';
				}

				/// If select create surround
				var div = $(document.createElement('div'))
					.addClass(cssClasses + " advancedSelect")
					.attr('id', options.element.attr('id') + 'Div');

				options.element.wrap(div);

				options.divID = $('#' + options.element.attr('id') + 'Div');

				/// Hide select
				options.element.hide();
			} else {
				console.error("element is not a select");
			}

			/// Add data for val check
			options.element.data('plugin-name', 'advancedSelect');

			/// Check element attributes for settings
			if(options.element.attr('multiple') == 'multiple'){
				options.multiSelect = true;
			}

			if(options.element.attr('disabled') == 'disabled'){
				options.disabled = true;
			}

			if(options.element.data('build') != null){
				options.autoBuild = options.element.data('build');
			}

			if(options.element.attr('placeholder') != '' && options.element.attr('placeholder') != undefined){
				options.language.buttonText = options.element.attr('placeholder');
			}

			if(options.element.data('ajax-listurl') != null){
				options.ajax.listUrl = options.element.data('ajax-listurl');
			}

			if(options.element.data('ajax-templateurl') != null){
				options.ajax.templateUrl = options.element.data('ajax-templateurl');
			}

			if(options.element.data('ajax-geturl') != null) {
				options.ajax.getUrl = options.element.data('ajax-geturl');
			}

			if(options.ajax.getUrl != "" ) {
				options.viewButton = true;
			}

			if(options.ajax.templateUrl == ""){
				options.ajax.templateUrl = options.templateDir + options.theme + '/row.html';
			}
			/// End check element attributes for settings

			var templateConfig = {
				dialogId: options.element.attr( 'id' ) + 'Dialog',
				headerId: options.element.attr( 'id' ) + 'Header',
				searchId: options.element.attr( 'id' ) + 'Search',
				searchFieldsId: options.element.attr( 'id' ) + 'Fields',
				searchCellId: options.element.attr( 'id' ) + 'SearchCell',
				searchInputId: options.element.attr( 'id' ) + 'SearchInput',
				searchButtonId: options.element.attr( 'id' ) + 'SearchButton',
				spanId: options.element.attr( 'id' ) + 'Span',
				buttonId: options.element.attr( 'id' ) + 'Button',
				infoBackId: options.element.attr( 'id' ) + 'InfoBack',
				footerId: options.element.attr( 'id' ) + 'Footer',
				allButtonId: options.element.attr( 'id' ) + 'All',
				saveButtonId: options.element.attr( 'id' ) + 'Save',
				contentId: options.element.attr( 'id' ) + 'Content',
				resultsContentId: options.element.attr( 'id' ) + 'ResultsContent',
				infoContentId: options.element.attr( 'id' ) + 'InfoContent',
				elementId: options.element.attr('id')
			};

			options.templateConfig = templateConfig;

			/// Build inline structure
			self.buildInline(templateConfig).then(function(){
				/// Build modal dialog
				self.buildModal(templateConfig).then(function() {
					if( options.autoBuild ) {
						self.build().then(function(){
							if (options.disabled) {
								self.disable();
							}
							self.element.trigger('_create');
							return self;
						});
					}else{
						if (options.disabled) {
							self.disable();
						}
						self.element.trigger('_create');
						return self;
					}
				});
			});

		},

		buildInline: function(templateConfig) {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {

				templateEngine.load(options.templateDir + options.theme + '/inline.html', templateConfig, options.divID).then(function(){
					$( '#' + templateConfig.spanId ).hide();
					$( '#' + templateConfig.buttonId )
						.on('keyup', {'self': self}, function(e){
							var self = e.data['self'];
							var options = self.options;
							if( !options.multiSelect ) {
								var k = e.charCode || e.keyCode || e.which;

								clearTimeout( $.data( this, "typeMove" ) );

								if ( k == 40 ) {
									var next = $( '#' + options.element.attr( 'id' ) + ' > option:selected' ).next( 'option' );
									if ( next.length > 0 ) {
										var value = next.val();
									}else{
										var next = $( '#' + options.element.attr( 'id' ) + ' > option:first' );
										var value = next.val();
									}
									next = null;
									options.element.val( value ).trigger( 'change' );
									value = null;
								}else if ( k == 38 ) {
									var prev = $( '#' + options.element.attr( 'id' ) + ' > option:selected' ).prev( 'option' );
									if ( prev.length > 0 ) {
										var value = prev.val();
									}else{
										var prev = $( '#' + options.element.attr( 'id' ) + ' > option:last' );
										var value = prev.val();
									}
									prev = null;
									options.element.val( value ).trigger( 'change' );
									value = null;
								}else if( k >= 48 && k <=90 ) {
									options.typed += String.fromCharCode(k);
									$.data( this, "typeMove", setTimeout( function () {
										clearTimeout( $.data( this, "typeMove" ) );

										var len = options.typed.length;
										$.each(options.ajax.data['results'], function (key, value) {
											var sub = value['name'].toLowerCase().substr( 0, len );
											if( options.typed.toLowerCase() == sub ) {
												self.set( value['value'] );
											}
											sub = null;
										});
										len = null;

										options.typed = '';
									}, 500 ) );
								}
								k = null;
							}

						});
				});

				self.setButtonText(options.language.buttonText);
				defer.resolve();
				self.element.trigger('buildInline');
			});

			defer.notify();
			return promise;
		},

		buildModal: function(templateConfig) {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {
				templateEngine.load(options.templateDir + options.theme + '/modal.html', templateConfig, $('body')).then(function() {
					$('#' + templateConfig.searchInputId).on('keydown', {'self': self}, function (e) {
						var self = e.data['self'];
						setTimeout(function () {
							self.submit();
						}, 0);
					});

					$('#' + templateConfig.searchButtonId).on('click', {'self': self}, function (e) {
						var self = e.data['self'];
						self.open();
					});

					$('#' + templateConfig.infoBackId)
						.on('click', {'self': self}, function (e) {
							var self = e.data['self'];
							self.load();
						})
						.hide();

					$('#' + templateConfig.allButtonId)
						.html(options.language.selectAllText)
						.on('click', {'self': self}, function (e) {
							var self = e.data['self'];
							self.selectAll();
						})
						.hide();

					$('#' + templateConfig.saveButtonId)
						.on('click', {'self': self}, function (e) {
							var self = e.data['self'];
							self.save();
						})
						.hide();
					self.setButtonText(options.language.buttonText);

					self.element.trigger('buildModal');
					defer.resolve();
				});
			});

			defer.notify();
			return promise;
		},

		/// Select all
		selectAll: function () {
			var self = this;
			var options = this.options;

			var selectedLength = options.selectedItems.length;
			options.selectedItems = [];

			if(options.ajax.data['results'] !== undefined) {
				if (selectedLength == options.ajax.data['results'].length) {
					/// If all checkboxes are checked, uncheck them
					$("#" + options.element.attr('id') + "Dialog input[type='checkbox']").each(function () {
						$(this).prop('checked', false);
					});
					$("#" + options.element.attr('id') + "All").html(options.language.selectAllText);
				} else {
					/// If all checkboxes are not checked, check them
					$("#" + options.element.attr('id') + "Dialog input[type='checkbox']").each(function () {
						$(this).prop('checked', true);
						var id = $(this).attr('id').replace(options.element.attr('id') + '-', '');
						id = id.replace("Input", '');
						options.selectedItems.push(id);
					});
					$("#" + options.element.attr('id') + "All").html(options.language.deselectAllText);
				}
			}
			selectedLength = null;

			self.element.trigger('selectAll');
		},

		/// Build UL/LIs
		 build: function () {
			var self = this;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {
				self.loadData().then( function () {
					self.element.trigger( 'build' );
					defer.resolve();
				});
			});
			defer.notify();
			return promise;
		},

		reBuild: function() {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {
				self.searchResults(options.ajax.data ).then(function(){
					if(options.element.val() == '' || options.element.val() == null){
						$('#' + options.element.attr('id') + 'Button').addClass('empty');
					}else{
						$('#' + options.element.attr('id') + 'Button').removeClass('empty');
					}
					defer.resolve();
				});
			});

			defer.notify();
			return promise;
		},

		destroy: function () {
			var self = this;
			var options = this.options;

			options.element.removeData('advancedSelect');

			options.element.removeClass("advancedSelect");

			$('#' + options.element.attr('id') + 'Dialog').remove();
			$('#' + options.element.attr('id') + 'Button').remove();
			$('#' + options.element.attr('id') + 'Span').remove();
			if (options.element.get(0).tagName == "SELECT") {
				options.element.unwrap();
				options.element.show();
			} else {
				options.element.html('');
			}

			$.Widget.prototype.destroy.call(this);
		},

		/// Get dataSource
		_initSource: function () {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {
				/// Get row template
				templateEngine.load(options.ajax.templateUrl, {}).then(function(template){
					self.options.ajax.template = template;
					self.loadData().then(function(){
						defer.resolve();
					});
				});
			});

			defer.notify();
			return promise;
		},

		loadData: function () {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {
				if (options.ajax.listUrl != ''){

					if( options.ajax.listUrl != options.ajax.lastListUrl || $.isEmptyObject(options.ajax.data)) {

						options.ajax.lastListUrl = options.ajax.listUrl;
						options.ajaxCall(defer, self);

					}else{
						defer.resolve();
					}
				} else {

					/// Read select options
					var blank = options.element.find("option[value='']");
					var zero = options.element.find("option[value='0']");
					var results = options.element.find("option");
					var temp_arr = [];

					if (results.length > 0 ) {
						if (blank.length == 0 && zero.length == 0) {
							options.element.prepend($("<option></option>").attr("value", '').text(options.language.buttonText));
						} else {
							options.language.buttonText = options.element.find('option[value=""]').html();
							self.setButtonText(options.language.buttonText);
						}
					}

					/// Build array for use in search results
					options.element.children().each(function () {
						/// If there are option groups
						if($(this).children().length > 0 ){
							var id = $(this).attr('value');
							var type = $(this).get(0).tagName.toLowerCase();

							temp_arr.push({
								'value': $(this).attr('value'),
								'name': $(this).attr('label'),
								'parent': '0',
								'type': type
							});

							$(this).children().each(function () {
								var type = $(this).get(0).tagName.toLowerCase();
								temp_arr.push({
									'value': $(this).attr('value'),
									'name': $(this).html(),
									'parent': id,
									'type': type
								});
							});
							id = null;
						}else {
							var type = $(this).get(0).tagName.toLowerCase();
							temp_arr.push({
								'value': $(this).attr('value'),
								'name': $(this).html(),
								'type': type
							});
						}
					});

					options.ajax.data['results'] = temp_arr;
					blank = null;
					zero = null;
					results = null;
					temp_arr = null;

					self.element.trigger('loadData');
					defer.resolve();
				}
			});

			defer.notify();
			return promise;
		},

		ajaxGetComplete: function ( data, xhr, defer ) {
			var self = this;
			var options = this.options;

			if (xhr.status == 200) {
				options.ajax.data = data;
				var spliceArray = [];

				var i = 0;
				$.each(data['results'], function () {
					if (this.value == "" && !$.isNumeric(this.value)) {
						if (this.name == "") {
							this.name = options.language.buttonText;
						} else {
							self.setButtonText(this.name);
						}
						if (!options.blankValue) {
							spliceArray.push(i);
						}
					}
					if (this.value == 0) {
						//this.name = options.language.buttonText;
						if (!options.zeroValue) {
							if (spliceArray.indexOf(i) < 0) {
								spliceArray.push(i);
							}
						}
					}
					i++;
				});
				i = null;

				$.each(spliceArray, function (key, value) {
					data['results'].splice(value, 1);
				});
				spliceArray = null;
			}

			self.element.trigger('loadData');
			defer.resolve();
		},

		view: function (id) {
			var self = this;
			var options = this.options;

			/// Get view template
			ajaxExtend.create().then(function() {
				ajaxExtend.setExecute({
					"url": options.ajax.getUrl,
					"type": "POST",
					"data": {'id': id},
					"key": 'getview',
					"text": "Retrieving Details",
					"success": function (data1, textStatus, xhr) {

						if (xhr.status == 200) {
							$('#' + options.templateConfig.infoContentId).show();
							$('#' + options.templateConfig.infoBackId).show();

							$('#' + options.templateConfig.resultsContentId).hide();
							$('#' + options.templateConfig.searchId).hide();
							templateEngine.load(options.templateDir + options.theme + '/view.html', data1).then(function(template){
								$('#' + options.templateConfig.infoContentId).html(template);
								self.element.trigger('view', {'id': id});
							});
						}
					}
				});
			});
		},

		searchResults: function( data ){
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {
				if(data['results'] !== undefined) {

					var searchFunc = function(){
						/// Clear results
						$('#' + options.element.attr('id') + "ResultsContent").html('');

						$('#' + options.element.attr('id') + 'ResultsContent')
							.css({
								'max-height': "100%"
							});

						/// Loop through results adding row based on template
						$.each(data['results'], function (key, value) {

							var valueBlank = false;
							var valueZero = false;

							var template = options.ajax.template;

							if( ( value['value'] == '' || value['value'] == 0 ) && value['name'].toLowerCase().indexOf('please select') > -1 ){
								value['name'] = options.language.noValueText;
							}

							var type = 'option';
							if(value['type'] !== undefined){
								type = value['type'];
							}
							value['type'] = type;

							/// If there is not a group
							if ((value['parent'] === undefined || value['parent'] != 0) && type != 'optgroup' ) {
								value['buttonId'] = 'button' + value['value'];
								/// Replace template variables
								$.each(value, function (k, v) {
									template = template.replace('{' + k + '}', v);
									if( v === undefined ){
										v = "";
									}
									if (v == 0) {
										valueZero = true;
									}
									if (v.toString() == '') {
										valueBlank = true;
									}
								});
							} else {
								/// If this is a group
								var id = value['value'];
								if (id === undefined) {
									id = value['id'];
								}

								var text = value['name'];
								if (text === undefined) {
									text = value['title'];
								}

								template = '<div class="group" id="' + id + '"><h3>' + text + '</h3></div>';
							}

							var canContinue = true;

							/// Do not add if blank/zero and we have asked not to show these
							if ((valueBlank == true && options.blankValue == false) || (valueZero == true && options.zeroValue == false)) {
								canContinue = false;
							}

							if (canContinue) {
								if (value['parent'] === undefined) {
									var parentId = 0;
								} else {
									var parentId = value['parent'];
								}

								var row = $(template);

								if($.isNumeric( value['value'] )){
									value['value'] = parseInt(value['value']);
								}

								/// Append to the correct parent
								if ( parentId == 0 ) {
									$( '#' + options.element.attr( 'id' ) + "ResultsContent" ).append( row );
								} else {
									$( '#' + options.element.attr( 'id' ) + "ResultsContent" ).find( '[id="' + parentId + '"]' ).append( row );
								}

								/// Do row create event
								options.rowCreatedCallback(row, value, self);
								self.element.trigger('rowCreated', {"row": row, "data": value, "self": self} );
								parentId = null;
								row = null;
							}

							valueBlank = null;
							valueZero = null;
							canContinue = null;
							template = null;
						});

						/// Resize results window
						self.resizeResults();

						self.element.trigger('searchresults');
						defer.resolve();
					};

					if(options.ajax.template == ''){
						self._initSource().then(function(){
							searchFunc();
						});
					}else{
						searchFunc();
					}

				}else{
					self.element.trigger('searchresults');
					defer.resolve();
				}

			});

			defer.notify();
			return promise;
		},

		resizeResults: function (){
			var self = this;
			var options = this.options;

			$('#' + options.element.attr('id') + 'ResultsContent')
				.css({
					'max-height': '100%'
				});

			/// Calculate height of dialog so that there is no outer scrolling
			var padding = $('#' + options.element.attr('id') + 'Dialog').find('.modal-dialog').outerHeight(true) - $('#' + options.element.attr('id') + 'Dialog').find('.modal-dialog').height();
			var height = $(window).height() - padding;

			height -= $('#' + options.element.attr('id') + 'Header').outerHeight(true);
			height -= $('#' + options.element.attr('id') + 'Footer').outerHeight(true);

			var contentPadding = $('#' + options.element.attr('id') + 'ResultsContent').outerHeight(true) - $('#' + options.element.attr('id') + 'ResultsContent').height();
			height -= contentPadding;

			var liHeight = 0;
			var totalHeight = 0;

			/// Loop through results working out how many can be shown
			$.each($('#' + options.element.attr('id') + "ResultsContent").children(), function() {
				/// If this is a group
				if($(this).children(':not(i)').length > 0 ) {
					/// Loop through children
					liHeight += $(this).outerHeight(true);
					totalHeight += $(this).outerHeight(true);

					if (liHeight > height) {
						liHeight -= $(this).outerHeight(true);
					}

				} else {
					liHeight += $(this).outerHeight(true);
					totalHeight += $(this).outerHeight(true);
					if (liHeight > height) {
						liHeight -= $(this).outerHeight(true);
					}
				}
			});

			if(height < totalHeight) {
				$('#' + options.element.attr('id') + 'ResultsContent')
					.css({
						'max-height': liHeight + 'px',
						'overflow-y': 'auto'
					});
			}else{
				$('#' + options.element.attr('id') + 'ResultsContent')
					.css({
						'max-height': 'auto',
						'overflow-y': 'none'
					});
			}

			$('#' + options.element.attr('id') + 'SearchInput').focus();

			padding = null;
			contentPadding = null;
			liHeight = null;
			totalHeight = null;
			height = null;

			self.element.trigger('resizeResults');

		},

		setOption: function (key, value) {
			var self = this;
			var options = this.options;

			$.Widget.prototype._setOption.apply(this, arguments);

			self.element.trigger('setOption');
		},

		setOptions: function(newOptions){
			var self = this;
			var options = this.options;
			this.options = $.extend(true, options, newOptions);

			if(newOptions['ajax']['data'] !== undefined){

				if( $.isEmptyObject(newOptions['ajax']['data']) ) {
					this.options.ajax.data = {};
				}
			}

			self.element.trigger('setOptions');
		},

		close: function () {
			var self = this;
			var options = this.options;

			if( options.theme == 'bootstrap' ) {
				$('#' + options.element.attr('id') + 'Dialog').modal('hide');
			}else if( options.theme = 'materialize' ){
				$('#' + options.element.attr('id') + 'Dialog').closeModal();
			}

			self.element.trigger('close');
		},

		check: function(id) {
			var self = this;
			var options = self.options;
			var checkBox = $('#' + options.element.attr('id') + '-' + id + 'Input');

			if($.isNumeric(id)){
				id = parseInt(id);
			}

			var index = options.selectedItems.indexOf(id);

			if (index > -1) {
				options.selectedItems.splice(index, 1);
			}

			/// Swap checkbox state
			if (checkBox.prop('checked') == true) {
				checkBox.prop('checked', false);
			} else {
				checkBox.prop('checked', true);
				options.selectedItems.push( id );
			}

			/// If all checkboxes are checked check text
			if( options.ajax.data['results'] !== undefined ) {
				if (options.selectedItems.length == options.ajax.data['results'].length) {
					$("#" + options.element.attr('id') + "All").html(options.language.deselectAllText);
				} else {
					$("#" + options.element.attr('id') + "All").html(options.language.selectAllText);
				}
			}

			if(options.selectedItems.length == 0 && options.blankSet == false){
				$('#' + options.element.attr('id') + 'Save').attr('disabled', 'disabled');
			}else{
				$('#' + options.element.attr('id') + 'Save').removeAttr('disabled');
			}

			id = null;
			checkBox = null;

			self.element.trigger('check', 0, {'self': self});
		},

		set: function (id) {
			var self = this;
			var options = this.options;

			var idArray = [];
			if(id != '' && id != null) {
				/// Check id type and assign
				if (typeof id == "string" || typeof id == "number") {
					idArray = String(id).split(',');
				} else if (typeof id == "object") {
					idArray = id;
				}
				idArray = $.map(idArray, function (item) {
					if ($.isNumeric(item)) {
						return parseInt(item);
					} else {
						return item;
					}
				});
			}

			var arrayFound = false;
			options.element.find("option").each( function() {
				var value = $(this).val();
				if( $.isNumeric(value)){
					value = parseInt(value);
				}
				if( $.inArray( value, idArray ) > -1 ){
					arrayFound = true;
				}
			});

			if( arrayFound || ( id == '' && options.blankSet == true ) ) {
				var currentIdArray = [];
				var currentId = options.element.val();

				if (currentId != '' && currentId != null) {
					/// Check current selection type and assign
					if (typeof currentId == "string" || typeof currentId == "number") {
						currentIdArray = String(currentId).split(',');
					} else if (typeof currentId == "object") {
						currentIdArray = currentId;
					}
					currentIdArray = $.map(currentIdArray, function (item) {
						if ($.isNumeric(item)) {
							return parseInt(item);
						} else {
							return item;
						}
					});
				}
				currentId = null;

				if (currentIdArray !== null) {
					currentIdArray.sort();
				}

				if (idArray !== null) {
					idArray.sort();
				}

				if (options.element.children().length > 0) {

					var canContinue = true;

					if (options.element.children().length == 1) {

						/// Abort if trying to set blank value and we've asked to not allow blank/zero values to be set
						if ((options.element.children().eq(0).val() == '' && options.blankSet == false) || (options.element.children().eq(0).val() == '0' && options.zeroSet == false)) {
							canContinue = false;
						}
					}

					if (canContinue) {
						/// If not the same, update value

						options.selectedItems = idArray;

						if (JSON.stringify(currentIdArray) !== JSON.stringify(idArray)) {
							options.element.val(idArray).trigger('change');

							/// Find the form the element is in
							var form = options.element.closest('form');

							if (form.length > 0) {
								/// Validate the form the element is in
								try {
									if (options.element.valid()) {
										var rules = options.element.rules();
										var validate = false;
										for (var i in rules) {
											validate = true;
										}

										if (validate) {
											options.element.closest("form").valid();
										}
										validate = null;
										rules = null;
									}
								}catch (err){

								}
							}
							form = null;
						}
					}
					canContinue = null;
				}

				/// Add/Remove empty class if value is blank
				if (id == '') {
					$('#' + options.element.attr('id') + 'Button').addClass('empty');
				} else {
					$('#' + options.element.attr('id') + 'Button').removeClass('empty');
				}

				self.close();
			}

			/// Set text of button and span
			self.getText(options.ajax.data, idArray, true);

			idArray = null;
			id = null;
			currentIdArray = null;
			arrayFound = null;

			self.element.trigger('set', {'self':self});
		},

		/// Load value into dialog
		load: function () {
			var self = this;
			var options = this.options;

			var defer = $.Deferred();
			var promise = defer.promise();

			promise.progress(function() {
				$( '#' + options.element.attr( 'id' ) + 'InfoContent' ).hide();
				$( '#' + options.element.attr( 'id' ) + 'InfoBack' ).hide();

				$( '#' + options.element.attr( 'id' ) + 'ResultsContent' ).show();
				$( '#' + options.element.attr( 'id' ) + 'Search' ).show();

				var currentIdArray = [];
				var currentId = options.element.val();

				/// Check current selection type and assign
				if ( typeof currentId == "string" || typeof currentId == "number" ) {
					var currentIdArray = String( currentId ).split( ',' );
				} else if ( typeof currentId == "object" ) {
					var currentIdArray = [];

					if ( currentId != null ) {
						currentIdArray = currentId;
					}
				}
				currentId = null;

				/// Remove selected class
				$( '#' + options.element.attr( 'id' ) + "ResultsContent" ).children().each( function () {
					$( this ).removeClass( 'selected' );

					if ( $( this ).children().length > 0 ) {
						$( this ).children().each( function () {
							$( this ).removeClass( 'selected' );
						} );
					}
				} );

				if ( options.multiSelect ) {
					/// Uncheck all
					$( "#" + options.element.attr( 'id' ) + "Dialog" ).find( "input[type='checkbox']:checked" ).each( function () {
						$( this ).prop( 'checked', false );
					} );
					/// Show save and select all buttons
					$( '#' + options.element.attr( 'id' ) + 'All' ).show();
					$( '#' + options.element.attr( 'id' ) + 'Save' ).show();

				} else {
					/// Hide save and select all buttons
					$( '#' + options.element.attr( 'id' ) + 'All' ).hide();
					$( '#' + options.element.attr( 'id' ) + 'Save' ).hide();
				}

				/// Loop through all selected values
				$.each( currentIdArray, function ( index, value ) {
					if ( options.multiSelect ) {
						/// Check check box
						$( '#' + options.element.attr( 'id' ) + '-' + value + 'Input' ).prop( 'checked', true );
					} else {
						/// Flag as selected
						$( '#' + options.element.attr( 'id' ) + "ResultsContent" ).find( '[id="' + value + '"]' ).addClass( 'selected' );
					}
				} );

				currentIdArray = null;

				self.element.trigger( 'load' );
				defer.resolve();
			});
			defer.notify();
			return promise;
		},

		/// Save
		save: function () {
			var self = this;
			var options = this.options;

			self.set(options.selectedItems);

			self.element.trigger('save');

		},

		getText: function(data, idArray) {
			var self = this;
			var options = this.options;
			var new_text = options.language.buttonText;

			if (typeof (data) !== 'object')
				return;

			data = data['results'];

			if(idArray.length != 0 && data !== undefined) {
				if (idArray.length == data.length && options.multiSelect == true) {
					/// Selected all Text
					new_text = options.language.selectedAllText;
				} else {
					if (idArray.length > 1) {
						/// Selected multiple Text
						new_text = idArray.length + ' ' + options.language.multiText;
					} else {
						/// Selected individual record
						$.each(data, function (index, item) {
							if (item.value == idArray[0]) {
								new_text = item.name;
							}
						});
					}
				}
			}

			$('#' + options.element.attr('id') + 'Span').html(new_text);
			self.setButtonText(new_text);

			new_text = null;
			self.element.trigger('getText');
		},

		/// Search
		search: function (searchTerm) {

			searchTerm = String(searchTerm);
			var self = this;
			var options = this.options;
			var distArray = [];
			var part1 = options.element.attr('id') + "-";
			var data2 = $.extend(true, {}, options.ajax.data);
			var idArray = [];

			/// Get all already ticked checkboxes
			$("#" + options.element.attr('id') + "Dialog input[type='checkbox']:checked").each(function () {
				var this_id = $(this).parent().attr('id').replace(part1, '');
				idArray.push(this_id);
				this_id = null;
				part1 = null;
			});

			/// If searching
			if(searchTerm != '') {
				$.each(data2['results'], function (index, item) {
					if(item['parent'] === undefined || item['parent'] != 0) {
						/// Get factors
						var tempArray = item;
						delete (tempArray['parent']);

						tempArray['incorrect'] = 0; //-
						tempArray['correct'] = 0; //+
						tempArray['jw'] = 0; // +
						tempArray['distance'] = 0; //-
						tempArray['word_match'] = 0; //+

						/// For each key in data results
						$.each(item, function(k, v){
							/// If not ID, value or parent
							if( k != 'id' && k != 'value' && k != 'parent') {
								v = String(v);
								var the_name = v.toLowerCase();

								/// Search types
								var incorrect = self.levDist(searchTerm, the_name);
								var correct = self.letter_match(searchTerm, the_name);
								var jw = self.jaroWinkle(searchTerm, the_name);
								var distance = self.levDistRatio(searchTerm, the_name);
								var wordMatch = self.word_match(searchTerm, the_name);

								/// Assigning biggest value
								tempArray['incorrect'] = (tempArray['incorrect'] < incorrect) ? incorrect : tempArray['incorrect'];
								tempArray['correct'] = (tempArray['correct'] < correct) ? correct : tempArray['correct'];
								tempArray['jw'] = (tempArray['jw'] < jw) ? jw : tempArray['jw'];
								tempArray['distance'] = (tempArray['distance'] < distance) ? distance : tempArray['distance'];
								tempArray['word_match'] = (tempArray['word_match'] < wordMatch) ? wordMatch : tempArray['word_match'];

								the_name = null;
								incorrect = null;
								correct = null;
								jw = null;
								distance = null;
								wordMatch = null;
							}
						});

						/// Add to new array
						distArray.push(tempArray);
						tempArray = null;
					}

				});

				/// Relevance Sorting
				distArray.sort(function (a, b) {

					var w1 = parseInt(b.word_match);
					var w2 = parseInt(a.word_match);

					if (w1 != w2) {
						return w1 - w2;
						w1 = null;
						w2 = null;
					}

					var c1 = parseInt(b.correct);
					var c2 = parseInt(a.correct);

					if (c1 != c2) {
						return c1 - c2;
					}

					var j1 = parseInt(b.jw, 10);
					var j2 = parseInt(a.jw, 10);

					if (j1 != j2) {
						return j1 - j2;
					}

					var d1 = parseInt(b.distance, 10);
					var d2 = parseInt(a.distance, 10);

					if (d1 != d2) {
						return d1 - d2;
					}

					return parseInt(a.incorrect) - parseInt(b.incorrect);
				});

				data2['results'] = distArray;
				distArray = null;
			}

			self.element.trigger('search');
			self.searchResults(data2).then(function(){
				/// Select all already ticked checkboxes
				$.each(idArray, function (index, value) {
					if( options.multiSelect ){
						$('#' + options.element.attr('id') + '-' + value + 'Input').prop('checked', true);
					}
				});
			});
			idArray = null;
			data2 = null;
		},

		/// Get percentage of levenshtein distance
		levDistRatio: function (s, t) {
			var self = this;

			if (s.length > t.length) {
				var max_len = s.length;
			} else {
				var max_len = t.length;
			}

			return Math.round((1 - self.levDist(s, t) / max_len) * 100);
		},

		/// Get levenshtein distance
		levDist: function (s, t) {
			var d = []; //2d matrix

			/// Step 1
			var n = s.length;
			var m = t.length;

			if (n == 0)
				return m;
			if (m == 0)
				return n;

			/// Create an array of arrays in javascript
			for (var i = n; i >= 0; i--)
				d[i] = [];

			for (var i = n; i >= 0; i--)
				d[i][0] = i;

			for (var j = m; j >= 0; j--)
				d[0][j] = j;

			for (var i = 1; i <= n; i++) {
				var s_i = s.charAt(i - 1);

				for (var j = 1; j <= m; j++) {

					/// Check the jagged ld total so far
					if (i == j && d[i][j] > 4)
						return n;

					var t_j = t.charAt(j - 1);
					var cost = (s_i == t_j) ? 0 : 1;

					/// Calculate the minimum
					var mi = d[i - 1][j] + 1;
					var b = d[i][j - 1] + 1;
					var c = d[i - 1][j - 1] + cost;

					if (b < mi)
						mi = b;
					if (c < mi)
						mi = c;

					d[i][j] = mi; // Step 6

					/// Damerau transposition
					if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
						d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
					}
					b = null;
					c = null;
					mi = null;
					t_j = null;
					cost = null;
				}
				s_i = null;
			}

			return d[n][m];
		},

		/// How many words match
		word_match: function (s, t) {
			var search_words = s.split(" ");
			var term_words = t.split(" ");
			var count = 0;

			$.each(search_words, function (index) {
				$.each(term_words, function (key) {
					if (term_words[key] == search_words[index]) {
						count++;
					}
				});
			});

			return count;
		},

		/// How many 2 or more letter combinations are in string
		letter_match: function (s, t) {
			var search_terms = s.split(" ");
			var result = [];

			/// Loop through each word in search term
			for (var i = 0; i < search_terms.length; i++) {

				var word = '';

				var search_words = search_terms[i].split("");

				/// Loop through each letter in word
				for (var j = 0; j < search_words.length; j++) {

					var letter = search_words[j];

					word += letter;
					letter = null;

					if (word.length > 1) {
						var re = new RegExp(word, "gi");
						var temp = t.match(re);

						if (temp != null && temp.length > 0) {
							result.push(temp);
						}
					}
				}

				var word = search_terms[i];

				/// Loop backwards through word
				for (var j = search_words.length; j > 0; j--) {

					word = word.substring(1, word.length);

					if (word.length > 1) {
						var re = new RegExp(word, "gi");
						var temp = t.match(re);

						if (temp != null && temp.length > 0) {
							result.push(temp);
						}
						re = null;
						temp = null;
					}
				}
				word = null;
				search_words = null;
			}

			search_terms = null;
			return result.length;
		},

		/// Get Jaro Winkle distance as percentage
		jaroWinkle: function (s, t) {
			var a = s;
			var c = t;
			var h, b, d, k, e, g, f, l, n, m, p;
			a.length > c.length && (c = [c, a], a = c[0], c = c[1]);
			k = ~~Math.max(0, c.length / 2 - 1);
			e = [];
			g = [];
			b = n = 0;
			for (p = a.length; n < p; b = ++n)
				for (h = a[b], l = Math.max(0, b - k), f = Math.min(b + k + 1, c.length), d = m = l; l <= f ? m < f : m > f; d = l <= f ? ++m : --m)
					if (null == g[d] && h === c[d]) {
						e[b] = h;
						g[d] = c[d];
						break
					}
			e = e.join("");
			g = g.join("");
			if (d = e.length) {
				b = f = k = 0;
				for (l = e.length; f < l; b = ++f)
					h = e[b], h !== g[b] && k++;
				b = g = e = 0;
				for (f = a.length; g < f; b = ++g)
					if (h = a[b], h === c[b])
						e++;
					else
						break;
				a = (d / a.length +
				d / c.length + (d - ~~(k / 2)) / d) / 3;
				a += 0.1 * Math.min(e, 4) * (1 - a)
			} else
				a = 0;

			c, h, b, d, k, e, g, f, l, n, m, p = null;
			return a * 100;

		},

		submit: function () {
			var self = this;
			var options = this.options;

			var search_term = $('#' + options.element.attr('id') + 'SearchInput').val().toLowerCase();

			self.search(search_term);

			self.element.trigger('submit');
		},

		clear: function () {
			var self = this;
			var options = this.options;
			options.element.val('');
			self.load('');
			self.setButtonText(options.language.buttonText);
			self.element.trigger('clear');

		},

		setButtonText: function(text){
			var self = this;
			var options = this.options;
			$('#' + options.element.attr('id') + 'Button').html(text);
			$('#' + options.element.attr('id') + 'Span').html(text);

			$(document.createElement('span'))
				.attr('id', options.element.attr('id') + 'Icon')
				.addClass("caret")
				.appendTo($('#' + options.element.attr('id') + 'Button'));

			self.element.trigger('setButtonText');
		},

		disable: function () {
			var self = this;
			var options = this.options;

			$('#' + options.element.attr('id') + 'Button').hide();
			$('#' + options.element.attr('id') + 'Span').show();

			$('#' + options.element.attr('id') + 'Div').attr('disabled', 'disabled');

			options.disabled = true;
			self.element.trigger('disable');

		},

		enable: function () {
			var self = this;
			var options = this.options;

			$('#' + options.element.attr('id') + 'Button').show();
			$('#' + options.element.attr('id') + 'Span').hide();

			$('#' + options.element.attr('id') + 'Div').removeAttr('disabled');

			options.disabled = false;
			self.element.trigger('enable');

		},

		/// Get value
		get: function () {
			var self = this;
			var options = this.options;
			var arr = [];

			if(options.multiSelect){
				arr = options.element.val();
			}else{
				arr.push(options.element.val());
			}

			return arr;
			arr = null;
			self.element.trigger('get');
		},

		/// add value to list
		add: function (name,value,parentId) {
			var self = this;
			var options = this.options;
			if( parentId === undefined ) {
				parentId= 0;
			}

			var exists = false;
			if( options.ajax.data['results'] !== undefined ) {
				$.each( options.ajax.data['results'], function ( k, v ) {
					if ( v['value'] == value ) {
						exists = true;
						return false;
					}
				} );
				if ( !exists ) {
					options.ajax.data['results'].push( {
						'name': name,
						'value': value,
						'parent': parentId,
						'type': 'option'
					} )
				}

				var e = $( document.createElement( 'option' ) )
					.attr( 'value', value )
					.html( name );

				if ( parentId == 0 ) {
					options.element.append( e );
				} else {
					options.element.find( 'optgroup' ).each( function () {
						if ( $( this ).attr( 'data-value' ) == parentId ) {
							$( this ).append( e );
						}
					} );
				}
				e = null;
			}
				parentId = null;


			self.element.trigger('add');
		},

		/// Remove value from list
		remove: function (value) {
			var self = this;
			var options = this.options;

			var id = options.element.attr('id');

			if( $.isNumeric(value) ) {
				value = parseInt(value);
			}

			$('#' + id + 'ResultsContent').children().each(function () {
				var the_id = $(this).attr('id');
				the_id = the_id.replace(options.element.attr('id') + '-', "");
				if( $.isNumeric(the_id) ) {
					the_id = parseInt(the_id);
				}
				if (the_id == value) {
					$(this).remove();
				}
				the_id = null;
			});

			$.each(options.element.find('option'), function(){
				var aValue = this.value;
				if( $.isNumeric(aValue) ) {
					aValue = parseInt(aValue);
				}
				if ( aValue == value ) {
					$(this).remove();
					if( $.inArray(value,options.selectedItems) >= 0){
						self.clear();
					}
				}
			});


			id = null;

			self.element.trigger('remove');
		},

		show: function(){
			var self = this;
			var options = this.options;
			$('#' + options.element.attr('id') + 'Button' ).show();

			self.element.trigger('show');
		},


		hide: function(){
			var self = this;
			var options = this.options;
			$('#' + options.element.attr('id') + 'Button' ).hide();

			self.element.trigger('hide');
		},

		displayValue: function(){
			var self = this;
			var options = this.options;

			return $('#' + options.element.attr('id') + 'Span' ).html();
		},

		focus: function() {
			var self = this;
			var options = this.options;
			$('#' + options.element.attr('id') + 'Button' ).focus();

			self.element.trigger('focus');
		},

		getData: function() {
			var self = this;
			var options = this.options;

			return options.ajax.data;
		}
	};

	// using https://github.com/jquery-boilerplate/jquery-boilerplate/wiki/Extending-jQuery-Boilerplate
	// (adapted to allow public functions)
	$.fn[pluginName] = function(options) {
		var args = arguments;
		// Is the first parameter an object (options), or was omitted,
		// instantiate a new instance of the plugin.
		if (options === undefined || typeof options === "object") {
			var deferreds = [];
			this.each(function() {
				if (!$.data(this, "plugin_" + pluginName)) {
					var instance = new Plugin(this, options);
					instance._init();
					$.data(this, "plugin_" + pluginName, instance);
				}
			});
			// return the promise from the "master" deferred object that tracks all the others
			return $.when.apply(null, deferreds);
		} else if (typeof options === "string" && options[0] !== "_") {
			// If the first parameter is a string and it doesn't start
			// with an underscore or "contains" the `init`-function,
			// treat this as a call to a public method.
			// Cache the method call to make it possible to return a value
			var returns;
			this.each(function() {
				var instance = $.data(this, "plugin_" + pluginName);
				// Tests that there's already a plugin-instance
				// and checks that the requested public method exists
				if (instance instanceof Plugin && typeof instance[options] === "function") {
					// Call the method of our plugin instance,
					// and pass it the supplied arguments.
					returns = instance[options].apply(instance, Array.prototype.slice.call(args, 1));
				}
				// Allow instances to be destroyed via the 'destroy' method
				if (options === "destroy") {
					$.data(this, "plugin_" + pluginName, null);
				}
			});
			// If the earlier cached method gives a value back return the value,
			// otherwise return this to preserve chainability.
			return returns !== undefined ? returns : this;
		}
	};

	$.fn[pluginName].version = "0.4.4";
	$.fn[pluginName].author = "Marc Evans (moridiweb)";

	var originalVal = $.fn.val;
	$.fn.val = function (value) {

		if (typeof value == 'undefined') {
			return originalVal.call(this);
		} else {

			var output = originalVal.call(this, value);

			if ($(this[0]).data('plugin-name') == 'advancedSelect') {
				$(this[0]).advancedSelect('set', value);
			}

			return output;
		}
	};
});