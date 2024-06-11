/*
 * /src/client/classes/form-checker.class.js
 *
 * This client-only class manages the input checks inside of a form.
 * It is is designed so that the application can directly instanciate it, or may also derive it to build its own derived class.
 * 
 * This class aims to be able to manage static forms as well as array and dynamics. Remind so that there may NOT be a one-to-one relation
 * between a field definition and a DOM element.
 * 
 * Instanciation:
 *  The FormChecker must be instanciated as a ReactiveVar content inside of an autorun() from onRendered():
 *  ```
 *      Template.my_app_template.onCreated( function(){
 *          const self = this;
 *          self.formChecker = new ReactiveVar( null );
 *      });
 *      Template.my_app_template.onRendered( function(){
 *          const self = this;
 *          self.autorun(() => {
 *              self.formChecker.set( new Forms.FormChecker( self, fields, {
 *                  options
 *              }));
 *          });
 *      });
 *  ```
 * 
 * Fields:
 *  This is a madantory hash which defines the fields to be checked, where:
 *  <key> the name of the field in the 'checks' object
 *  <value> is a hash wih define the field and its behavior:
 *    > children: a hash of sub-fields, for example if the schema is an array
 *   or:
 *    > js: a mandatory jQuery CSS selector for the INPUT/SELECT/TEXTAREA field in the DOM; it must let us address the field and its content
 *    > display: whether the field should be updated to show valid|invalid state, defaulting to true
 *    > valFrom(): a function to get the value from the provided item, defaulting to just getting the field value as `value = item[name]`
 *    > valTo(): a function to set the value into the provided item, defaulting to just setting the field value as item[name] = value
 *    > post: a function to be called after check with the ITypedMessage result of the corresponding 'checks.check_<field>()' function
 * 
 * Configuration options are provided at instanciation time as an object with following keys:
 * 
 *  - checks: an object which holds the check_<field>() functions:
 *      Proto is: <checks>.check_<field>( value, data, opts ) which returns a Promise which resolves to a ITypedMessage or null
 *      > value is the current value of the field
 *      > data is an object passed-in by the application when instanciating the FormChecker
 *      > opts is provided by this FormChecker instance with following keys:
 *          - display: if set, whether or not having a UI feedback, defaulting to true
 *          - update: if set, whether or not update the current item (for example, do not update when re-checking all fields)
 * 
 *  - fnPrefix: if set, a string which prefixes the field name when addressing the 'checks.check_<field>()' check function
 *      e.g. for 'foo' field, the check function is expected to be 'check_foo()'
 *          if fnPrefix is 'bar_', then the check function becomes 'check_bar_foo()'
 * 
 *  - $ok: if set, the jQuery object which defines the OK button (to enable/disable it)
 *  - okSetFn( valid<Boolean>, data<any> ): if set, a function to be called when OK button must be enabled / disabled
 *  - $err: if set, the jQuery object which defines the error message place
 *  - errSetFn( message<String> ): if set, a function to be called to display an error message
 *  - errClearFn(): if set, a function to be called to clear all messages
 *      Because we re-check all fields on each input event, also each input event re-triggers all error messages
 *      So this function to let the application re-init its error messages stack.
 * or:
 *  - entityChecker: an EntityChecker instance which manages several components / panes / panels / FormChecker's
 *      Providing an EntityChecker will silently ignore $ok, okSetFn, $err, errSetFn, errClearFn
 * 
 *  - data: if set, an object which will be passed to every '<checks>.check_<fn>()' function
 * 
 *  - inputOkCheckAll: whether the form should be fully re-checked after each successful input of any field
 *      this is the default behavior, but may be not exactly what you want typically for example in case of an array
 *      this defaults to true
 * 
 *  - useBootstrapValidationClasses: defaulting to false
 * 
 *  - validFn( err<ITypedMessage>, field<String> ): if set, a function which computes the validity status of the form depending of the returned value of each check function
 *      default is that only messages of type MessageType.C.ERROR are said invalid
 * 
 * Notes:
 *  - The class defines:
 *      - a local 'check_<field>( [opts] })' function for each field which returns a Promise which resolves to a validity boolean for the relevant field
 *      - a local 'check( [opts] )' function which returns a Promise which resolves to a validity boolean for the whole form.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x

import { check } from 'meteor/check';
import { ReactiveVar } from 'meteor/reactive-var';

import { caBase } from '../../common/classes/base.class.js';

export class FormChecker extends caBase {

    // static data

    // static methods

    // private data

    // instanciation parameters
    #instance = null;
    #fields = null;
    #options = null;

    // configuration
    #defaultConf = {
        checks: null,
        $ok: null,
        okSetFn: null,
        $err: null,
        errSetFn: null,
        errClearFn: null,
        entityChecker: null,
        data: null,
        inputOkCheckAll: true,
        useBootstrapValidationClasses: false,
        validFn: null
    };
    #conf = {};

    // runtime data

    // the validity status of this form
    #valid = new ReactiveVar( false );

    #priv = null;

    // private methods

    // compute the checked type (in the sense of FieldCheck)
    _computeCheck( eltData, err ){
        let check = 'NONE';
        if( err ){
            switch( err.ITypedMessageType()){
                case Forms.MessageType.C.ERROR:
                    check = 'INVALID';
                    break;
                case Forms.MessageType.C.WARNING:
                    check = 'UNCOMPLETE';
                    break;
            }
        } else if( eltData.defn.type ){
            switch( eltData.defn.type ){
                case 'INFO':
                    check = 'NONE';
                    break;
                default:
                    check = 'VALID';
                    break
            }
        }
        //console.debug( eltData, err, check );
        return check;
    }

    // return the check function name
    //  this is usually check_.<field>
    //      unless the application has asked to insert a 'fnPrefix'
    //      unless a parent appears
    _computeCheckFname( field, defn, parent ){
        let fn = 'check_';
        if( parent ){
            fn += parent + '_';
        }
        if( this.#conf.fnPrefix ){
            fn += this.#conf.fnPrefix;
        }
        fn += field;
        return fn;
    }

    // an error message returned by the check function is only considered a validity error if it is of type ERROR
    //  else keep it cool
    _computeValid( eltData, err ){
        let valid = true;
        if( this.#conf.validFn ){
            valid = this.#conf.validFn( err, field );
        } else {
            valid = !err || err.ITypedMessageType() !== Forms.MessageType.C.ERROR;
        }
        //console.debug( 'err', err, 'field', field, 'valid', valid );
        return valid;
    }


    // at construction time, define the check_xx local check functions
    //  this local check function will always call the corresponding checks function (if exists)
    //  returns a Promise which resolve to 'valid' status for the field
    //  (while the checks check_<field>() is expected to return a Promise which resolves to a TypedMessage or null)

    // + attach to the DOM element addressed by the 'js' key an object:
    //   - value: a ReactiveVar which contains the individual value got from the form
    //   - checked: a ReactiveVar which contains the individual checked type (in the sense of FieldCheck class)
    //   - field: the field name
    //   - defn: the field definition
    //   - fn: the check function name
    //   - parent: if set, the parent field name

    _defineLocalFunction( args, field, defn, parent=null ){
        const self = this;
        // function is named check_label() or check_emails_label() depending if we have children fields
        const fn = self._computeCheckFname( field, defn, parent );
        if( !_.isFunction( self.#conf.checks[fn] )){
            Meteor.isDevelopment && console.warn( '[DEV] \''+fn+'()\' is not defined in provided checks object' );
        }
        // local check function must be called with element dom data
        self[fn] = async function( eltData, opts={} ){
            if( eltData.$js.length ){
                eltData.$js.removeClass( 'is-valid is-invalid' );
            }
            const value = self._valueFrom( eltData, opts );
            eltData.value.set( value );
            // this local function returns a Promise which resolves to a validity boolean
            return Promise.resolve( true )
                .then(() => {
                    // the checks function returns a Promise which resolves to a TypedMessage or null
                    return _.isFunction( self.#conf.checks[fn] ) ? self.#conf.checks[fn]( value, self.#conf.data, opts ) : null;
                })
                .then(( err ) => {
                    //console.debug( eltData, err );
                    check( err, Match.OneOf( null, Forms.TypedMessage ));
                    const valid = self._computeValid( eltData, err );
                    self.#valid.set( valid );
                    // manage different err types
                    if( err && opts.msgerr !== false ){
                        self._msgPush( err );
                    }
                    if( eltData.defn.post ){
                        eltData.defn.post( err );
                    }
                    const checked_type = self._computeCheck( eltData, err );
                    //console.debug( eltData.field, err, checked_type );
                    eltData.checked.set( checked_type );
                    // set valid/invalid bootstrap classes
                    if( defn.display !== false && self.#conf.useBootstrapValidationClasses === true && $js.length ){
                        $js.addClass( valid ? 'is-valid' : 'is-invalid' );
                    }
                    return valid;
                })
                .catch(( e ) => {
                    console.error( e );
                });
        };
        // end_of_function
        // needed by inputHandler so that we can get back our FormChecker data for this field from the event.target
        //  take care of having one and only target DOM element for this definition at this time
        const $js = defn.js ? self.#instance.$( defn.js ) : null;
        if( $js.length === 1 ){
            this._domDataSet( $js, field, defn, parent );
        }
        return true;
    }

    // search a field (and its field definition) when receiving an input event through the inputHandler()
    //  maybe we already have set the data here, else find the correct DOM element and initialize the data object
    //  returns the elementData or null
    _domDataByEvent( event, opts ){
        const $target = this.#instance.$( event.target );
        let data = $target.data( 'form-checker' );
        if( !data ){
            data = null;
            const cb = function( args, field, defn, parent ){
                ( $target.attr( 'class' )?.split( /\s+/ ) || [] ).every(( c ) => {
                    const _selector = '.'+c;
                    const _words = defn.js.split( ' ' );
                    if( _words.includes( _selector )){
                        this._domDataSet( $target, field, defn, parent );
                        data = $target.data( 'form-checker' );
                    }
                    return data === null;
                });
                return data === null;
            };
            this._fieldsIterate( cb );
        }
        return data;
    }

    // search a field (and its dom data) by the field name
    //  returns elementData or null
    _domDataByField( field, opts ){
        const self = this;
        let data = null;
        let found = false;
        const cb = function( args, f, defn, parent ){
            if( f === field ){
                found = true; 
                if( defn.js ){
                    const $js = self.#instance.$( defn.js );
                    if( $js.length === 1 ){
                        data = $js.data( 'form-checker' );
                    }
                }
            };
            return found === false;
        };
        this._fieldsIterate( cb );
        return data;
    }
    
    // set our FormChecker data against the targeted DOM element
    //  this data may be set at construction time if field already exists
    //  or at input time
    _domDataSet( $elt, field, defn, parent ){
        $elt.data( 'form-checker', {
            field: field,
            defn: defn,
            parent: parent,
            fn: this._computeCheckFname( field, defn, parent ),
            value: new ReactiveVar( null ),
            checked: new ReactiveVar( null ),
            $js: $elt
        });
    }

    // iterate on each field definition, calling the provided 'cb' callback for each one
    //  when 'children' are defined, iterate on the children
    //  the recursive iteration stops as soon as the 'cb' doesn't return true
    //  in other words, iterate while 'cb' returns true (same than every instruction)
    _fieldsIterate( cb, args=null ){
        const self = this;
        const _fields_iterate_f = function( args, field, defn, parent=null ){
            if( defn.children ){
                Object.keys( defn.children ).every(( f ) => {
                    return _fields_iterate_f( args, f, defn.children[f], field );
                });
            } else {
                return cb.bind( self )( args, field, defn, parent );
            }
        };
        Object.keys( this.#fields ).every(( f ) => {
            return _fields_iterate_f( args, f, this.#fields[f] );
        });
    }

    // clear all current messages
    _msgClear(){
        if( this.#conf.entityChecker ){
            this.#conf.entityChecker.IMessagesSetClear();
        } else {
            if( this.#conf.errClearFn ){
                this.#conf.errClearFn();
            }
        }
    }

    // push the message inside the form or call the corresponding function
    //  'err' here is expected to be a ITypedMessage
    _msgPush( err ){
        if( this.#conf.entityChecker ){
            this.#conf.entityChecker.IMessagesSetPush( err );
        } else {
            if( this.#conf.$err ){
                this.#conf.$err.html( err ? ( _.isString( err ) ? err : err.ITypedMessageMessage()) : '&nbsp;' );
            }
            if( this.#conf.errFn ){
                this.#conf.errFn( err );
            }
        }
    }

    // get the value from the form
    //  when are dealing with children, the options may hold a '$parent' which includes all the fields of the array
    _valueFrom( eltData, opts ){
        const tagName = eltData.$js.prop( 'tagName' );
        const eltType = eltData.$js.attr( 'type' );
        let value;
        if( tagName === 'INPUT' && ( eltType === 'checkbox' )){
            value = eltData.$js.prop( 'checked' );
            //value = eltData.$js.find( ':checked' ).val();
        } else {
            value = eltData.$js.val() || '';
            // a small hack to handle 'true' and 'false' values from coreYesnoSelect
            const $select = eltData.$js.closest( '.core-yesno-select' );
            if( $select.length ){
                if( value === 'true' || value === 'false' ){
                    value = ( value === 'true' );
                }
            }
        }
        return value;
    }

    // set the value from the item to the form field according to the type of field
    _valueTo( eltData, item ){
        let value = null;
        if( eltData.defn.valTo ){
            value = eltData.defn.valTo( item );
        } else {
            value = item[eltData.field];
        }
        const tagName = eltData.$js.prop( 'tagName' );
        const eltType = eltData.$js.attr( 'type' );
        if( tagName === 'INPUT' && ( eltType === 'checkbox' )){
            eltData.$js.prop( 'checked', value );
            //eltData.$js.find( '[value="'+value+'"]' ).prop( 'checked', true );
        } else {
            const $select = eltData.$js.closest( '.core-yesno-select' );
            if( $select.length ){
                const def = Forms.YesNo.byValue( value );
                if( def ){
                    eltData.$js.val( Forms.YesNo.id( def ));
                }
            } else {
                eltData.$js.val( value );
            }
        }
    }

    // protected methods

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new FormChecker instance
     * @param {Blaze.TemplateInstance} instance
     * @param {Object} fields
     * @param {Object} opts
     * @returns {FormChecker} this FormChecker instance
     */
    constructor( instance, fields, opts={} ){
        super( ...arguments );
        const self = this;

        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance must be a Blaze.TemplateInstance');
        assert( fields && _.isObject( fields ), 'fields must be a plain javascript Object' );
        assert( !opts || _.isObject( opts ), 'when set, options must be a plain javascript Object' );
        if( opts ){
            assert( !opts.checks || _.isObject( opts.checks ), 'when set, options.checks must be a plain javascript Object' );
            assert( !opts.$ok || opts.$ok instanceof jQuery, 'when set, options.$ok must be a jQuery object' );
            assert( !opts.okSetFn || _.isFunction( opts.okSetFn ), 'when set, options.okSetFn must be a function' );
            assert( !opts.$err || opts.$err instanceof jQuery, 'when set, options.$err must be a jQuery object' );
            assert( !opts.errSetFn || _.isFunction( opts.errSetFn ), 'when set, options.errSetFn must be a function' );
            assert( !opts.errClearFn || _.isFunction( opts.errClearFn ), 'when set, options.errClearFn must be a function' );
            assert( !opts.entityChecker || opts.entityChecker instanceof Forms.EntityChecker, 'when set, options.entityChecker must be a Forms.EntityChecker');
            if( opts.entityChecker && ( opts.$ok || opts.okFn || opts.$err || opts.errFn || opts.errClearFn )){
                Meteor.isDevelopment && console.warn( 'An EntityChecker is specified, silently ignoring $ok, okFn, $err, errFn, errClearFn' );
            }
            assert( !Object.keys( opts ).includes( 'inputOkCheckAll' ) || _.isBoolean( opts.inputOkCheckAll ), 'when set, options.inputOkCheckAll must be a Boolean');
            assert( !Object.keys( opts ).includes( 'useBootstrapValidationClasses' ) || _.isBoolean( opts.useBootstrapValidationClasses ), 'when set, options.useBootstrapValidationClasses must be a Boolean');
            assert( !opts.validFn || _.isFunction( opts.validFn ), 'when set, options.validFn must be a function' );
        }

        // keep the provided params
        this.#instance = instance;
        this.#fields = fields;
        this.#options = opts;

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, opts );

        // initialize runtime data

        if( this.#conf.entityChecker ){
            this.#conf.entityChecker.formRegister( this );
        }

        // define an autorun which will enable/disable the OK button depending of the validity status
        this.#instance.autorun(() => {
            const valid = self.#valid.get();
            if( self.#conf.$ok ){
                self.#conf.$ok.prop( 'disabled', !valid );
            }
            if( self.#conf.okFn ){
                self.#conf.okFn( valid, this.#conf.data );
            }
        });

        // for each field to be checked, define its own internal check function
        this._fieldsIterate( this._defineLocalFunction );

        console.debug( this );
        return this;
    }

    /**
     * @summary a general function which check each field successively
     * @param {Object} opts an option object with following keys:
     *  - field: if set, indicates a field to not check (as just already validated from an input handler)
     *  - display: if set, then says whether checks have any effect on the display, defaulting to true
     *  - msgerr: if set, says if error message are to be displayed, defaulting to true
     *  - update: if set, then says whether the value found in the form should update the edited object, defaulting to true
     *  - $parent: if set, a jQuery element which acts as the parent of the form
     * @returns {Promise} which eventually resolves to the global validity status of the form
     */
    async check( opts={} ){
        let valid = true;
        let promises = [];
        const self = this;
        this._fieldsIterate(( args, field, defn, parent ) => {
            if( defn.js ){
                let $js = null;
                if( opts.$parent ){
                    $js = opts.$parent.find( defn.js );
                } else {
                    $js = self.#instance.$( defn.js );
                }
                if( $js && $js.length === 1 ){
                    let eltData = $js.data( 'form-checker' );
                    if( !eltData ){
                        this._domDataSet( $js, field, defn, parent );
                        eltData = $js.data( 'form-checker' );
                    }
                    promises.push( self[ eltData.fn ]( eltData, opts )
                        .then(( v ) => {
                            valid &&= v;
                            return valid;
                        }));
                }
            }
            return true;
        });
        return Promise.allSettled( promises )
            .then(() => {
                if( opts.display === false ){
                    self.clear();
                }
                //self.#conf.entityChecker && console.debug( self.#conf.entityChecker );
                return valid;
            });
    }

    /**
     * @summary Clears the validity indicators
     */
    clear(){
        const self = this;
        Object.keys( self.#fields ).every(( f ) => {
            self.#instance.$( self.#fields[f].js ).removeClass( 'is-valid is-invalid' );
            return true;
        });
        // also clears the error messages if any
        this._msgClear();
    }

    /**
     * @returns {Object} data
     */
    getData(){
        return this.#conf.data;
    }

    /**
     * @param {String} field the name of the field we are interested of
     * @returns {String} the corresponding current FieldCheck type
     */
    getFieldCheck( field ){
        const eltData = this._domDataByField( field );
        let ret = null;
        if( eltData ){
            ret = eltData.checked.get();
        } else {
            Meteor.isDevelopment && console.warn( 'uninitialized', field );
        }
        return ret;
    }

    /**
     * @returns {Object} with data from the form
     */
    getForm(){
        const self = this;
        let o = {};
        Object.keys( self.#fields ).every(( f ) => {
            o[f] = self.#instance.$( self.#fields[f].js ).val();
            return true;
        });
        return o;
    }

    /**
     * @summary input event handler
     * @param {Object} event the Meteor event
     * @param {Object} opts an options object with following keys:
     *  - id: in case of array'ed fields, the id of the item
     *  - $parent: in case of dynamic fields, a DOM jQuery element which is a parent of this form
     * 
     * The principle is that:
     * 1. we check the input field identified by its selector
     *      the check function returns an error message if not ok
     * 2. if ok, we check all fields (but this one) unless prevented to at the FormChecker construction
     *      (because an app may prefer to have a global check inside of an autorun which will so re-run after each update)
     * 
     * @returns {Promise} which eventually resolves to the validity status (of the single current field if false, of the whole form else)
     */
    async inputHandler( event, opts={} ){
        // an event addressed to another formChecker, or already handled by another FormChecker
        if( event.data && event.data.FormChecker && event.data.FormChecker.handled === true ){
            return Promise.resolve( null );
        // not already handled, so try to handle it here
        } else {
            this._msgClear();
            const o = this._domDataByEvent( event, opts );
            if( !o || !this[ o.fn ] ){
                return Promise.resolve( null );
            }
            event.data = event.data || {};
            event.data.FormChecker = event.data.FormChecker || {};
            event.data.FormChecker.handled = true;
            console.debug( event.type, event.data );
            return this[ o.fn ]( o, opts )
                .then(( valid ) => {
                    if( valid && this.#conf.inputOkCheckAll !== false ){
                        const parms = { field: o.field, update: false, display: false };
                        return this.#conf.entityChecker ? this.#conf.entityChecker.check( parms ) : this.check( parms );
                    }
                    return valid;
                });
        }
    }

    /**
     * @summary set options to be passed to the form checkers
     * @param {Object} data
     * @returns {FormChecker} this instance
     */
    setData( data ){
        //console.debug( 'setData()', data );
        this.#conf.data = data || {};
        return this;
    }

    /**
     * @summary set a form field
     * @param {String} field
     *  When have children fields, the 'field' should be specified as parent+'_'+field
     * @param {Object} item
     */
    setField( field, item ){
        const eltData = this._domDataByField( field );
        if( eltData ){
            this._valueTo( eltData, item );
        } else {
            Meteor.isDevelopment && console.warn( field, 'unknown or uninitialized field' );
        }
    }

    /**
     * @summary initialize the form with the given data
     * @param {Object} item
     * @param {Object} opts an option object with following keys:
     *  $parent: when set, the DOM parent of the targeted form - in case of an array
     * @returns {FormChecker} this instance
     */
    setForm( item, opts={} ){
        const self = this;
        console.warn( 'setForm' );
        const cb = function( args, field, defn, parent ){
            if( defn.js ){
                let $js = null;
                if( opts.$parent ){
                    $js = opts.$parent.find( defn.js );
                } else {
                    $js = self.#instance.$( defn.js );
                }
                if( $js && $js.length === 1 ){
                    eltData = $js.data( 'form-checker' );
                    if( !eltData ){
                        this._domDataSet( $js, field, defn, parent );
                        eltData = $js.data( 'form-checker' );
                    }
                    if( eltData ){
                        self._valueTo( eltData, item );
                    } else {
                        Meteor.isDevelopment && console.warn( field, 'eltData not set' );
                    }
                }
            }
            return true;
        };
        this._fieldsIterate( cb );
        return this;
    }

    /**
     * @summary initialize the elements DOM data in case of a dynamic form
     * @param {Object} opts an option object with following keys:
     *  - id: in case of array'ed fields, the id of the item
     *  - $parent: when set, the DOM parent of the targeted form - in case of an array
     * @returns a Promise which eventually resolves to a validity status
     */
    setupDom( opts={} ){
        const self = this;
        const cb = function( args, field, defn, parent ){
            if( defn.js ){
                let $js = null;
                if( opts.$parent ){
                    $js = opts.$parent.find( defn.js );
                } else {
                    $js = self.#instance.$( defn.js );
                }
                if( $js && $js.length === 1 ){
                    const eltData = $js.data( 'form-checker' );
                    if( !eltData ){
                        this._domDataSet( $js, field, defn, parent );
                    }
                }
            }
            return true;
        };
        this._fieldsIterate( cb );
        // at the end, initial check of the form
        opts.update = false;
        return this.check( opts );
    }
}
