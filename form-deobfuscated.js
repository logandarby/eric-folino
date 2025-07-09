// ==============================================================
// SENDFOX FORM HANDLER - De-obfuscated
// ==============================================================

// Main IIFE wrapper - prevents global namespace pollution
(() => {
  // ==============================================================
  // MODULE SYSTEM SETUP
  // ==============================================================

  // Module definitions object - stores all bundled modules
  const moduleDefinitions = {
    // Module 5287: International Telephone Input CSS Styles
    5287: (module, exports, require) => {
      'use strict';

      // CSS module exports
      require.d(exports, { A: () => compiledCSS });

      // CSS processing dependencies
      const cssLoader = require(76314);
      const cssToString = require.n(cssLoader);
      const urlProcessor = require(4417);
      const urlToString = require.n(urlProcessor);
      const flagsPng = require(83870);
      const flagsPngPath = require.n(flagsPng);
      const flags2xPng = require(69718);
      const flags2xPngPath = require.n(flags2xPng);

      // CSS compilation
      const cssContent = cssToString()(function (item) {
        return item[1];
      });

      const flagsImage = urlToString()(flagsPngPath());
      const flags2xImage = urlToString()(flags2xPngPath());

      // Extensive CSS for International Telephone Input widget
      cssContent.push([
        module.id,
        `
        /* International Telephone Input Styles */
        .iti {
          position: relative;
          display: inline-block;
        }
        
        .iti * {
          box-sizing: border-box;
          -moz-box-sizing: border-box;
        }
        
        .iti__hide {
          display: none;
        }
        
        .iti__v-hide {
          visibility: hidden;
        }
        
        /* Input field styles */
        .iti input, .iti input[type=text], .iti input[type=tel] {
          position: relative;
          z-index: 0;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          padding-right: 36px;
          margin-right: 0;
        }
        
        /* Flag container */
        .iti__flag-container {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          padding: 1px;
        }
        
        /* Selected flag display */
        .iti__selected-flag {
          z-index: 1;
          position: relative;
          display: flex;
          align-items: center;
          height: 100%;
          padding: 0 6px 0 8px;
        }
        
        /* Dropdown arrow */
        .iti__arrow {
          margin-left: 6px;
          width: 0;
          height: 0;
          border-left: 3px solid transparent;
          border-right: 3px solid transparent;
          border-top: 4px solid #555;
        }
        
        .iti__arrow--up {
          border-top: none;
          border-bottom: 4px solid #555;
        }
        
        /* Country list dropdown */
        .iti__country-list {
          position: absolute;
          z-index: 2;
          list-style: none;
          text-align: left;
          padding: 0;
          margin: 0 0 0 -1px;
          box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.2);
          background-color: white;
          border: 1px solid #CCC;
          white-space: nowrap;
          max-height: 200px;
          overflow-y: scroll;
          -webkit-overflow-scrolling: touch;
        }
        
        .iti__country-list--dropup {
          bottom: 100%;
          margin-bottom: -1px;
        }
        
        /* Responsive design */
        @media (max-width: 500px) {
          .iti__country-list {
            white-space: normal;
          }
        }
        
        /* Individual country items */
        .iti__country {
          padding: 5px 10px;
          outline: none;
        }
        
        .iti__country.iti__highlight {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        /* Flag display */
        .iti__flag-box {
          display: inline-block;
          width: 20px;
        }
        
        .iti__flag {
          width: 20px;
          height: 15px;
          box-shadow: 0px 0px 1px 0px #888;
          background-image: url(${flagsImage});
          background-repeat: no-repeat;
          background-color: #DBDBDB;
          background-position: 20px 0;
        }
        
        /* High DPI display support */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .iti__flag {
            background-image: url(${flags2xImage});
            background-size: 5652px 15px;
          }
        }
        
        /* Individual country flag positions - extensive list of country codes */
        /* (Contains positioning for all country flags in the sprite) */
        
        /* Mobile specific styles */
        .iti-mobile .iti--container {
          top: 30px;
          bottom: 30px;
          left: 30px;
          right: 30px;
          position: fixed;
        }
        
        .iti-mobile .iti__country-list {
          max-height: 100%;
          width: 100%;
        }
        
        .iti-mobile .iti__country {
          padding: 10px 10px;
          line-height: 1.5em;
        }
        
        /* Dropdown and separate dial code styles */
        .iti--allow-dropdown input,
        .iti--allow-dropdown input[type=text],
        .iti--allow-dropdown input[type=tel],
        .iti--separate-dial-code input,
        .iti--separate-dial-code input[type=text],
        .iti--separate-dial-code input[type=tel] {
          padding-right: 6px;
          padding-left: 52px;
          margin-left: 0;
        }
        
        /* ... many more specific flag and country styles ... */
        `,
        '',
      ]);

      const compiledCSS = cssContent;
    },

    // Module 44452: CSS Bundler
    44452: (module, exports, require) => {
      'use strict';
      require.d(exports, { A: () => bundledCSS });

      const cssLoader = require(76314);
      const cssToString = require.n(cssLoader);
      const intlTelInputCSS = require(5287);

      const bundledContent = cssToString()(function (item) {
        return item[1];
      });

      bundledContent.i(intlTelInputCSS.A);
      bundledContent.push([module.id, '', '']);

      const bundledCSS = bundledContent;
    },

    // Module 76314: CSS Loader Utility
    76314: (module) => {
      'use strict';

      // CSS array processing utility
      module.exports = function (itemProcessor) {
        const cssArray = [];

        // Convert CSS array to string
        cssArray.toString = function () {
          return this.map(function (item) {
            const cssContent = itemProcessor(item);
            return item[2]
              ? '@media '.concat(item[2], ' {').concat(cssContent, '}')
              : cssContent;
          }).join('');
        };

        // Add CSS items to array
        cssArray.i = function (cssItems, mediaQuery, dedupe) {
          if (typeof cssItems === 'string') {
            cssItems = [[null, cssItems, '']];
          }

          const alreadyImportedModules = {};

          if (dedupe) {
            for (let i = 0; i < this.length; i++) {
              const id = this[i][0];
              if (id != null) {
                alreadyImportedModules[id] = true;
              }
            }
          }

          for (let i = 0; i < cssItems.length; i++) {
            const item = [].concat(cssItems[i]);

            if (dedupe && alreadyImportedModules[item[0]]) {
              continue;
            }

            if (mediaQuery) {
              if (item[2]) {
                item[2] = ''.concat(mediaQuery, ' and ').concat(item[2]);
              } else {
                item[2] = mediaQuery;
              }
            }

            cssArray.push(item);
          }
        };

        return cssArray;
      };
    },

    // Module 4417: URL Processing Utility
    4417: (module) => {
      'use strict';

      // URL string processing for CSS
      module.exports = function (url, options) {
        options = options || {};

        if (typeof url !== 'string') {
          return url;
        }

        // Remove surrounding quotes if present
        if (/^['"].*['"]$/.test(url)) {
          url = url.slice(1, -1);
        }

        // Add hash if provided
        if (options.hash) {
          url += options.hash;
        }

        // Quote URL if it contains special characters
        if (/["'() \t\n]/.test(url) || options.needQuotes) {
          return '"'.concat(
            url.replace(/"/g, '\\"').replace(/\n/g, '\\n'),
            '"'
          );
        }

        return url;
      };
    },

    // Module 83870: Flags PNG Image Path
    83870: (module) => {
      module.exports =
        '/images/vendor/intl-tel-input/build/flags.png?007b2705c0a8f69dfdf6ea1bfa0341c9';
    },

    // Module 69718: Flags 2x PNG Image Path
    69718: (module) => {
      module.exports =
        '/images/vendor/intl-tel-input/build/flags@2x.png?9d5328fb490cddd43f6698012123404b';
    },

    // Module 10436: International Telephone Input Main Library
    10436: (module) => {
      let intlTelInputFactory;

      // Main International Telephone Input library factory
      intlTelInputFactory = function (exports) {
        'use strict';

        return (function () {
          // ==============================================================
          // COUNTRY DATA DEFINITIONS
          // ==============================================================

          // Comprehensive list of countries with their data
          const allCountries = [
            ['Afghanistan (‫افغانستان‬‎)', 'af', '93'],
            ['Albania (Shqipëri)', 'al', '355'],
            ['Algeria (‫الجزائر‬‎)', 'dz', '213'],
            ['American Samoa', 'as', '1', 5, ['684']],
            ['Andorra', 'ad', '376'],
            // ... extensive list of 240+ countries with:
            // [country name, ISO2 code, dial code, priority, area codes]
          ];

          // Transform country data into objects
          for (let i = 0; i < allCountries.length; i++) {
            const countryArray = allCountries[i];
            allCountries[i] = {
              name: countryArray[0],
              iso2: countryArray[1],
              dialCode: countryArray[2],
              priority: countryArray[3] || 0,
              areaCodes: countryArray[4] || null,
            };
          }

          // ==============================================================
          // UTILITY FUNCTIONS
          // ==============================================================

          // Class definition helper
          function defineClass(
            constructor,
            prototypeDescriptors,
            staticDescriptors
          ) {
            if (prototypeDescriptors) {
              Object.defineProperties(
                constructor.prototype,
                prototypeDescriptors
              );
            }
            if (staticDescriptors) {
              Object.defineProperties(constructor, staticDescriptors);
            }
            return constructor;
          }

          // ==============================================================
          // GLOBAL INSTANCE MANAGEMENT
          // ==============================================================

          const intlTelInputGlobals = {
            getInstance: function (input) {
              const id = input.getAttribute('data-intl-tel-input-id');
              return window.intlTelInputGlobals.instances[id];
            },
            instances: {},
            documentReady: function () {
              return document.readyState === 'complete';
            },
          };

          if (typeof window === 'object') {
            window.intlTelInputGlobals = intlTelInputGlobals;
          }

          // ==============================================================
          // CONFIGURATION DEFAULTS
          // ==============================================================

          let instanceCounter = 0;

          const defaultOptions = {
            allowDropdown: true,
            autoHideDialCode: true,
            autoPlaceholder: 'polite',
            customContainer: '',
            customPlaceholder: null,
            dropdownContainer: null,
            excludeCountries: [],
            formatOnDisplay: true,
            geoIpLookup: null,
            hiddenInput: '',
            initialCountry: '',
            localizedCountries: null,
            nationalMode: true,
            onlyCountries: [],
            placeholderNumberType: 'MOBILE',
            preferredCountries: ['us', 'gb'],
            separateDialCode: false,
            utilsScript: '',
          };

          // North American toll-free area codes
          const tollFreeAreaCodes = [
            '800',
            '822',
            '833',
            '844',
            '855',
            '866',
            '877',
            '880',
            '881',
            '882',
            '883',
            '884',
            '885',
            '886',
            '887',
            '888',
            '889',
          ];

          // ==============================================================
          // HELPER FUNCTIONS
          // ==============================================================

          // Iterate over object properties
          const forEachProperty = function (obj, callback) {
            const keys = Object.keys(obj);
            for (let i = 0; i < keys.length; i++) {
              callback(keys[i], obj[keys[i]]);
            }
          };

          // Call method on all instances
          const callOnAllInstances = function (methodName) {
            forEachProperty(
              window.intlTelInputGlobals.instances,
              function (key) {
                window.intlTelInputGlobals.instances[key][methodName]();
              }
            );
          };

          // ==============================================================
          // MAIN INTL TEL INPUT CLASS
          // ==============================================================

          const IntlTelInput = (function () {
            // Constructor
            function IntlTelInput(input, options) {
              const self = this;

              // Validate constructor call
              if (!(this instanceof IntlTelInput)) {
                throw new TypeError('Cannot call a class as a function');
              }

              // Initialize instance properties
              this.id = instanceCounter++;
              this.telInput = input;
              this.activeItem = null;
              this.highlightedItem = null;

              // Merge options with defaults
              const userOptions = options || {};
              this.options = {};

              forEachProperty(defaultOptions, function (key, value) {
                self.options[key] = userOptions.hasOwnProperty(key)
                  ? userOptions[key]
                  : value;
              });

              this.hadInitialPlaceholder = Boolean(
                input.getAttribute('placeholder')
              );
            }

            // ==============================================================
            // INITIALIZATION METHODS
            // ==============================================================

            IntlTelInput.prototype._init = function () {
              const self = this;

              // Validate option combinations
              if (this.options.nationalMode) {
                this.options.autoHideDialCode = false;
              }

              if (this.options.separateDialCode) {
                this.options.autoHideDialCode = false;
                this.options.nationalMode = false;
              }

              // Detect mobile device
              this.isMobile =
                /Android.+Mobile|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                  navigator.userAgent
                );

              if (this.isMobile) {
                document.body.classList.add('iti-mobile');

                if (!this.options.dropdownContainer) {
                  this.options.dropdownContainer = document.body;
                }
              }

              // Setup promises for async operations
              if (typeof Promise !== 'undefined') {
                const autoCountryPromise = new Promise(function (
                  resolve,
                  reject
                ) {
                  self.resolveAutoCountryPromise = resolve;
                  self.rejectAutoCountryPromise = reject;
                });

                const utilsScriptPromise = new Promise(function (
                  resolve,
                  reject
                ) {
                  self.resolveUtilsScriptPromise = resolve;
                  self.rejectUtilsScriptPromise = reject;
                });

                this.promise = Promise.all([
                  autoCountryPromise,
                  utilsScriptPromise,
                ]);
              } else {
                // Fallback for environments without Promise support
                this.resolveAutoCountryPromise = this.rejectAutoCountryPromise =
                  function () {};
                this.resolveUtilsScriptPromise = this.rejectUtilsScriptPromise =
                  function () {};
              }

              // Initialize main functionality
              this.selectedCountryData = {};
              this._processCountryData();
              this._generateMarkup();
              this._setInitialState();
              this._initListeners();
              this._initRequests();
            };

            // Process and filter country data based on options
            IntlTelInput.prototype._processCountryData = function () {
              this._processAllCountries();
              this._processCountryCodes();
              this._processPreferredCountries();

              if (this.options.localizedCountries) {
                this._translateCountriesByLocale();
              }

              if (
                this.options.onlyCountries.length ||
                this.options.localizedCountries
              ) {
                this.countries.sort(this._countryNameSort);
              }
            };

            // Filter countries based on onlyCountries/excludeCountries options
            IntlTelInput.prototype._processAllCountries = function () {
              if (this.options.onlyCountries.length) {
                const onlyCountriesLowerCase = this.options.onlyCountries.map(
                  function (country) {
                    return country.toLowerCase();
                  }
                );

                this.countries = allCountries.filter(function (country) {
                  return onlyCountriesLowerCase.indexOf(country.iso2) > -1;
                });
              } else if (this.options.excludeCountries.length) {
                const excludeCountriesLowerCase =
                  this.options.excludeCountries.map(function (country) {
                    return country.toLowerCase();
                  });

                this.countries = allCountries.filter(function (country) {
                  return excludeCountriesLowerCase.indexOf(country.iso2) === -1;
                });
              } else {
                this.countries = allCountries;
              }
            };

            // Apply localized country names
            IntlTelInput.prototype._translateCountriesByLocale = function () {
              for (let i = 0; i < this.countries.length; i++) {
                const countryCode = this.countries[i].iso2.toLowerCase();

                if (
                  this.options.localizedCountries.hasOwnProperty(countryCode)
                ) {
                  this.countries[i].name =
                    this.options.localizedCountries[countryCode];
                }
              }
            };

            // Sort countries by name
            IntlTelInput.prototype._countryNameSort = function (a, b) {
              return a.name.localeCompare(b.name);
            };

            // Build lookup structures for dial codes and country codes
            IntlTelInput.prototype._processCountryCodes = function () {
              this.countryCodeMaxLen = 0;
              this.dialCodes = {};
              this.countryCodes = {};

              // Process main dial codes
              for (let i = 0; i < this.countries.length; i++) {
                const country = this.countries[i];

                if (!this.dialCodes[country.dialCode]) {
                  this.dialCodes[country.dialCode] = true;
                }

                this._addCountryCode(
                  country.iso2,
                  country.dialCode,
                  country.priority
                );
              }

              // Process area codes
              for (let i = 0; i < this.countries.length; i++) {
                const country = this.countries[i];

                if (country.areaCodes) {
                  const mainCountryForDialCode =
                    this.countryCodes[country.dialCode][0];

                  for (let j = 0; j < country.areaCodes.length; j++) {
                    const areaCode = country.areaCodes[j];

                    // Add partial area codes
                    for (let k = 1; k < areaCode.length; k++) {
                      const partialAreaCode =
                        country.dialCode + areaCode.substr(0, k);
                      this._addCountryCode(
                        mainCountryForDialCode,
                        partialAreaCode
                      );
                      this._addCountryCode(country.iso2, partialAreaCode);
                    }

                    // Add full area code
                    this._addCountryCode(
                      country.iso2,
                      country.dialCode + areaCode
                    );
                  }
                }
              }
            };

            // Add country code to lookup structure
            IntlTelInput.prototype._addCountryCode = function (
              iso2,
              dialCode,
              priority
            ) {
              if (dialCode.length > this.countryCodeMaxLen) {
                this.countryCodeMaxLen = dialCode.length;
              }

              if (!this.countryCodes.hasOwnProperty(dialCode)) {
                this.countryCodes[dialCode] = [];
              }

              // Check if country already exists in this dial code
              for (let i = 0; i < this.countryCodes[dialCode].length; i++) {
                if (this.countryCodes[dialCode][i] === iso2) {
                  return;
                }
              }

              // Add country at appropriate priority position
              const insertIndex =
                priority !== undefined
                  ? priority
                  : this.countryCodes[dialCode].length;
              this.countryCodes[dialCode][insertIndex] = iso2;
            };

            // Setup preferred countries list
            IntlTelInput.prototype._processPreferredCountries = function () {
              this.preferredCountries = [];

              for (let i = 0; i < this.options.preferredCountries.length; i++) {
                const countryCode =
                  this.options.preferredCountries[i].toLowerCase();
                const countryData = this._getCountryData(
                  countryCode,
                  false,
                  true
                );

                if (countryData) {
                  this.preferredCountries.push(countryData);
                }
              }
            };

            // ==============================================================
            // MARKUP GENERATION
            // ==============================================================

            // Create DOM element with attributes
            IntlTelInput.prototype._createEl = function (
              tagName,
              attributes,
              parent
            ) {
              const element = document.createElement(tagName);

              if (attributes) {
                forEachProperty(attributes, function (key, value) {
                  element.setAttribute(key, value);
                });
              }

              if (parent) {
                parent.appendChild(element);
              }

              return element;
            };

            // Generate the main widget markup
            IntlTelInput.prototype._generateMarkup = function () {
              // Set autocomplete attribute
              if (!this.telInput.hasAttribute('autocomplete')) {
                if (
                  !(
                    this.telInput.form &&
                    this.telInput.form.hasAttribute('autocomplete')
                  )
                ) {
                  this.telInput.setAttribute('autocomplete', 'off');
                }
              }

              // Build main container classes
              let containerClass = 'iti';

              if (this.options.allowDropdown) {
                containerClass += ' iti--allow-dropdown';
              }

              if (this.options.separateDialCode) {
                containerClass += ' iti--separate-dial-code';
              }

              if (this.options.customContainer) {
                containerClass += ' ' + this.options.customContainer;
              }

              // Create main container
              const mainContainer = this._createEl('div', {
                class: containerClass,
              });
              this.telInput.parentNode.insertBefore(
                mainContainer,
                this.telInput
              );

              // Create flag container
              this.flagsContainer = this._createEl(
                'div',
                { class: 'iti__flag-container' },
                mainContainer
              );

              // Move input into container
              mainContainer.appendChild(this.telInput);

              // Create selected flag element
              this.selectedFlag = this._createEl(
                'div',
                {
                  class: 'iti__selected-flag',
                  role: 'combobox',
                  'aria-controls': 'iti-' + this.id + '__country-listbox',
                  'aria-owns': 'iti-' + this.id + '__country-listbox',
                  'aria-expanded': 'false',
                },
                this.flagsContainer
              );

              // Create flag display
              this.selectedFlagInner = this._createEl(
                'div',
                { class: 'iti__flag' },
                this.selectedFlag
              );

              // Create separate dial code display if needed
              if (this.options.separateDialCode) {
                this.selectedDialCode = this._createEl(
                  'div',
                  { class: 'iti__selected-dial-code' },
                  this.selectedFlag
                );
              }

              // Create dropdown functionality if enabled
              if (this.options.allowDropdown) {
                this.selectedFlag.setAttribute('tabindex', '0');

                // Create dropdown arrow
                this.dropdownArrow = this._createEl(
                  'div',
                  { class: 'iti__arrow' },
                  this.selectedFlag
                );

                // Create country list
                this.countryList = this._createEl('ul', {
                  class: 'iti__country-list iti__hide',
                  id: 'iti-' + this.id + '__country-listbox',
                  role: 'listbox',
                  'aria-label': 'List of countries',
                });

                // Add preferred countries section
                if (this.preferredCountries.length) {
                  this._appendListItems(
                    this.preferredCountries,
                    'iti__preferred',
                    true
                  );

                  // Add divider
                  this._createEl(
                    'li',
                    {
                      class: 'iti__divider',
                      role: 'separator',
                      'aria-disabled': 'true',
                    },
                    this.countryList
                  );
                }

                // Add all countries
                this._appendListItems(this.countries, 'iti__standard');

                // Attach dropdown to container
                if (this.options.dropdownContainer) {
                  this.dropdown = this._createEl('div', {
                    class: 'iti iti--container',
                  });
                  this.dropdown.appendChild(this.countryList);
                } else {
                  this.flagsContainer.appendChild(this.countryList);
                }
              }

              // Create hidden input if specified
              if (this.options.hiddenInput) {
                let hiddenInputName = this.options.hiddenInput;
                const inputName = this.telInput.getAttribute('name');

                if (inputName) {
                  const lastBracket = inputName.lastIndexOf('[');
                  if (lastBracket !== -1) {
                    hiddenInputName =
                      inputName.substr(0, lastBracket) +
                      '[' +
                      hiddenInputName +
                      ']';
                  }
                }

                this.hiddenInput = this._createEl('input', {
                  type: 'hidden',
                  name: hiddenInputName,
                });

                mainContainer.appendChild(this.hiddenInput);
              }
            };

            // Generate HTML for country list items
            IntlTelInput.prototype._appendListItems = function (
              countries,
              cssClass,
              preferred
            ) {
              let html = '';

              for (let i = 0; i < countries.length; i++) {
                const country = countries[i];
                const preferredSuffix = preferred ? '-preferred' : '';

                html +=
                  "<li class='iti__country " +
                  cssClass +
                  "' tabIndex='-1' id='iti-" +
                  this.id +
                  '__item-' +
                  country.iso2 +
                  preferredSuffix +
                  "' role='option' data-dial-code='" +
                  country.dialCode +
                  "' data-country-code='" +
                  country.iso2 +
                  "' aria-selected='false'>";
                html +=
                  "<div class='iti__flag-box'><div class='iti__flag iti__" +
                  country.iso2 +
                  "'></div></div>";
                html +=
                  "<span class='iti__country-name'>" + country.name + '</span>';
                html +=
                  "<span class='iti__dial-code'>+" +
                  country.dialCode +
                  '</span>';
                html += '</li>';
              }

              this.countryList.insertAdjacentHTML('beforeend', html);
            };

            // Continue with more methods...

            // Return the constructor
            return IntlTelInput;
          })();

          // ==============================================================
          // UTILITY SCRIPT LOADING
          // ==============================================================

          // Load utils script dynamically
          const loadUtilsScript = function (scriptPath, onSuccess, onError) {
            const script = document.createElement('script');

            script.onload = function () {
              callOnAllInstances('handleUtils');
              if (onSuccess) onSuccess();
            };

            script.onerror = function () {
              callOnAllInstances('rejectUtilsScriptPromise');
              if (onError) onError();
            };

            script.className = 'iti-load-utils';
            script.async = true;
            script.src = scriptPath;

            document.body.appendChild(script);
          };

          // ==============================================================
          // PUBLIC API
          // ==============================================================

          // Static methods
          intlTelInputGlobals.getCountryData = function () {
            return allCountries;
          };

          intlTelInputGlobals.loadUtils = function (scriptPath) {
            if (
              !window.intlTelInputUtils &&
              !window.intlTelInputGlobals.startedLoadingUtilsScript
            ) {
              window.intlTelInputGlobals.startedLoadingUtilsScript = true;

              if (typeof Promise !== 'undefined') {
                return new Promise(function (resolve, reject) {
                  loadUtilsScript(scriptPath, resolve, reject);
                });
              }

              loadUtilsScript(scriptPath);
            }

            return null;
          };

          intlTelInputGlobals.defaults = defaultOptions;
          intlTelInputGlobals.version = '17.0.21';

          // Main factory function
          return function (input, options) {
            const instance = new IntlTelInput(input, options);
            instance._init();

            input.setAttribute('data-intl-tel-input-id', instance.id);
            window.intlTelInputGlobals.instances[instance.id] = instance;

            return instance;
          };
        })();
      };

      // Export based on environment
      if (module.exports) {
        module.exports = intlTelInputFactory();
      } else {
        window.intlTelInput = intlTelInputFactory();
      }
    },
  };

  // ==============================================================
  // MODULE LOADER SYSTEM
  // ==============================================================

  const moduleCache = {};

  function requireModule(moduleId) {
    const cachedModule = moduleCache[moduleId];
    if (cachedModule !== undefined) {
      return cachedModule.exports;
    }

    const module = (moduleCache[moduleId] = {
      id: moduleId,
      exports: {},
    });

    moduleDefinitions[moduleId](module, module.exports, requireModule);
    return module.exports;
  }

  // Require utility functions
  requireModule.n = (module) => {
    const getter =
      module && module.__esModule ? () => module.default : () => module;
    requireModule.d(getter, { a: getter });
    return getter;
  };

  requireModule.d = (exports, definition) => {
    for (const key in definition) {
      if (requireModule.o(definition, key) && !requireModule.o(exports, key)) {
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: definition[key],
        });
      }
    }
  };

  requireModule.o = (obj, prop) =>
    Object.prototype.hasOwnProperty.call(obj, prop);

  requireModule.nc = undefined;

  // ==============================================================
  // MAIN APPLICATION LOGIC
  // ==============================================================

  (() => {
    'use strict';

    // Import required modules
    const intlTelInput = requireModule(30603);
    const intlTelInputFactory = requireModule.n(intlTelInput);

    // ==============================================================
    // INTERNATIONAL PHONE INPUT SETUP
    // ==============================================================

    function setupInternationalPhoneInput(
      inputElement,
      formattedInput,
      errorElement
    ) {
      // Initialize international telephone input
      const itiInstance = intlTelInputFactory()(inputElement, {
        utilsScript: 'https://sendfox.com/js/intl-tel-input/utils.js',
        initialCountry: 'auto',
        nationalMode: true,
        geoIpLookup: function (callback) {
          // Fetch user's country from IP geolocation
          fetch('https://sendfox.com/ipinfo', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
            .then(function (response) {
              return response.json();
            })
            .then(function (data) {
              callback(data.country ? data.country : 'us');
            })
            .catch(function () {
              callback('us'); // Default to US if geolocation fails
            });
        },
      });

      // Format phone number on blur
      function formatPhoneNumber() {
        if (itiInstance) {
          const formattedNumber = itiInstance.getNumber(
            intlTelInputUtils.numberFormat.NATIONAL
          );
          inputElement.value = formattedNumber;
          return formattedNumber;
        }
        return null;
      }

      // Validate phone number
      function validatePhoneNumber() {
        const validationError = itiInstance.getValidationError();
        const isValid = itiInstance.isValidNumber();

        const errorMessage = isValid
          ? null
          : {
              0: 'Invalid number',
              1: 'Invalid country code',
              2: 'Too short',
              3: 'Too long',
              4: 'Invalid number',
              5: 'Invalid number',
              '-99': 'Invalid number',
            }[validationError];

        errorElement.textContent = errorMessage || '';

        if (errorMessage) {
          inputElement.value = '';
          formattedInput.value = '';
        }
      }

      // Event listeners
      inputElement.addEventListener('blur', function () {
        validatePhoneNumber();
        formatPhoneNumber();
      });

      inputElement.addEventListener('keyup', function (event) {
        // Clean input value
        const cleanedValue = inputElement.value.replace(/[^0-9()\s]/g, '');
        formattedInput.value = cleanedValue;

        // Add country code if not present
        if (
          !cleanedValue.startsWith(
            '+' + itiInstance.getSelectedCountryData().dialCode
          ) &&
          cleanedValue
        ) {
          formattedInput.value =
            '+' + itiInstance.getSelectedCountryData().dialCode + cleanedValue;
        }

        // Validate on Enter key
        if (event.key === 'Enter') {
          validatePhoneNumber();
          formatPhoneNumber();
        }
      });
    }

    // ==============================================================
    // CSS INJECTION
    // ==============================================================

    const cssInjector = requireModule(85072);
    const cssInjectorFactory = requireModule.n(cssInjector);
    const cssStyles = requireModule(44452);

    const cssOptions = { insert: 'head', singleton: false };
    cssInjectorFactory()(cssStyles.A, cssOptions);

    // ==============================================================
    // FORM INITIALIZATION
    // ==============================================================

    // Prevent multiple initializations
    if (!window.SENDFOX_FORM_LOADED) {
      window.SENDFOX_FORM_LOADED = true;

      document.addEventListener('DOMContentLoaded', function () {
        const forms = document.getElementsByClassName('sendfox-form');
        let recaptchaLoaded = false;

        // Process each form
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i];

          // Load reCAPTCHA if needed
          if (form.dataset.recaptcha === 'true' && !recaptchaLoaded) {
            const recaptchaScript = document.createElement('script');
            recaptchaScript.type = 'text/javascript';
            recaptchaScript.src =
              'https://www.google.com/recaptcha/api.js?render=6Lemwu0UAAAAAJghn3RQZjwkYxnCTuYDCAcrJJ7S';

            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode.insertBefore(recaptchaScript, firstScript);
            recaptchaLoaded = true;
          }

          // Setup international phone input
          const phoneInput = form.querySelector('input[type="tel"]');
          if (phoneInput) {
            setupInternationalPhoneInput(
              phoneInput,
              form.querySelector('.sendfox-phone-number-formatted'),
              form.querySelector('.sendfox-phone-number-error')
            );
          }

          // Setup form submission
          form.addEventListener('submit', function (event) {
            event.preventDefault();
            const currentForm = this;

            if (currentForm.dataset.recaptcha === 'true') {
              // Handle reCAPTCHA verification
              window.grecaptcha.ready(function () {
                window.grecaptcha
                  .execute('6Lemwu0UAAAAAJghn3RQZjwkYxnCTuYDCAcrJJ7S', {
                    action: 'embedded_form',
                  })
                  .then(function (token) {
                    // Add reCAPTCHA token to form
                    const recaptchaInput = document.createElement('input');
                    recaptchaInput.setAttribute('name', 'g-recaptcha-response');
                    recaptchaInput.setAttribute('value', token);
                    recaptchaInput.setAttribute('type', 'hidden');
                    currentForm.appendChild(recaptchaInput);

                    submitForm(currentForm);
                  })
                  .catch(function (error) {
                    console.error('Recaptcha failed.');
                    submitForm(currentForm);
                  });
              });
            } else {
              submitForm(currentForm);
            }
          });
        }
      });

      // ==============================================================
      // FORM SUBMISSION HANDLER
      // ==============================================================

      const submitForm = function (form) {
        if (form.dataset.async === 'true') {
          // Remove previous messages
          const existingMessage = form.querySelector('.sendfox-message');
          if (existingMessage) {
            existingMessage.remove();
          }

          // Disable submit button
          const submitButton = form.querySelector('button');
          submitButton.disabled = true;

          // Create AJAX request
          const xhr = new XMLHttpRequest();

          // Handle response
          xhr.addEventListener('load', function (event) {
            const response = JSON.parse(xhr.responseText);

            if (event.currentTarget.status === 422) {
              // Validation error
              if (response.hasOwnProperty('errors')) {
                const errorMessage = document.createElement('p');
                errorMessage.className = 'sendfox-message error';
                errorMessage.innerHTML = response.errors[0];
                form.appendChild(errorMessage);
              }
            } else if (event.currentTarget.status === 200) {
              // Success
              if (response.redirect_url) {
                window.location.href = response.redirect_url;
              } else {
                const successMessage = document.createElement('p');
                successMessage.className = 'sendfox-message success';
                successMessage.innerHTML =
                  'Thanks, your signup was successful!';
                form.appendChild(successMessage);
                form.reset();
              }
            }

            submitButton.disabled = false;
          });

          // Handle error
          xhr.addEventListener('error', function () {
            console.error('Error submitting form.');
            submitButton.disabled = false;
          });

          // Send request
          xhr.open('POST', form.action);
          xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
          xhr.send(new FormData(form));
        } else {
          // Standard form submission
          form.submit();
        }
      };
    }
  })();
})();
