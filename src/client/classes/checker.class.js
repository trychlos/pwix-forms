/*
 * pwix:forms/src/client/classes/checker.class.js
 *
 * Checker aims to:
 * - maybe manage an error message stack at its level, unless it delegates this task to a parent Checker
 * - manage the global validity status at this same level.
 *
 * Checker will receive its events either from a child Checker, or from its own input handler.
 *
 * Array-ed fields:
 *  Checker expects array-ed records to each have their own identifier.
 *  Checker is limited to a single array. If the application have to manage several arrays, then it must define several Checker's.
 *
 * Error messages:
 *  Even if we are talking about error messages, we actually manage the typed TM.TypedMessage emitted by the sub-components and check functions.
 *  Checker manages them via the IOrderableStack interface.
 *
 * Validity status:
 *  Correlatively to recurrent elementary and global checks, the validity status of the edited entiy (resp. entities) is recomputed.
 *  Checker considers that TypedMessage of 'ERROR' type are blocking and errors. All other messages let the dialog/page to be saved.
 *
 * Instanciation:
 *  The Checker must be instanciated as a ReactiveVar content inside of an autorun() from onRendered():
 *  ```
 *      Template.my_app_template.onCreated( function(){
 *          const self = this;
 *          self.checker = new ReactiveVar( null );
 *      });
 *      Template.my_app_template.onRendered( function(){
 *          const self = this;
 *          self.autorun(() => {
 *              self.checker.set( new Forms.Checker({
 *                  ...args
 *              }));
 *          });
 *      });
 *  ```
 *
 * Validity consolidation:
 *  All underlying components/pane/panels/Forms.Checker's may advertize their own validity status through:
 *  - a 'form-validity' event, holding data as { emitter, ok, ... }
 *  - a call to Checker.formValidity( emitter, ok, .. })
 *      where:
 *       > emitter must uniquely identify the panel, among all validity periods if relevant
 *       > ok must be true or false, and will be and-ed with other individual validity status to provide the global one
 *       > other datas are up to the emitter, and not kept there.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { check } from 'meteor/check';
import { ReactiveDict } from 'meteor/reactive-dict';
import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';

import { Base } from '../../common/classes/base.class.js';

import { ICheckDataset } from '../interfaces/icheck-dataset.iface.js';
import { ICheckEvents } from '../interfaces/icheck-events.iface.js';
import { ICheckHierarchy } from '../interfaces/icheck-hierarchy.iface.js';
import { ICheckStatus } from '../interfaces/icheck-status.iface.js';
import { IMessager } from '../interfaces/imessager.iface.js';
import { IPanelSpec } from '../interfaces/ipanel-spec.iface.js';

export class Checker extends mix( Base ).with( ICheckDataset, ICheckEvents, ICheckHierarchy, ICheckStatus ){

    // static data

    // static methods

    // private data

    // instanciation parameters
    #args = null;

    // configuration
    #defaultConf = {
        instance: null,
        parent: null,
        messager: null,
        fields: null,
        data: null,
        validityEvent: 'checker-validity.forms',
        datasetName: 'form-checker'
   };
    #conf = {};

    // runtime data

    // an object which holds the local check functions, keyed with the field name
    #locals = {};

    // the consolidated data parts for each underlying component / pane / panel / FormChecker
    #dataParts = new ReactiveDict();

    // the validity status for this checker
    #valid = new ReactiveVar( false );

    // private methods

    // at construction time, define a local check function for each defined field
    //  this local check function will always call the corresponding defined checks function (if exists)
    //  returns a Promise which resolve to 'valid' status for the field
    //  (while the checks check_<field>() is expected to return a Promise which resolves to a TypedMessage or null)

    // + attach to the DOM element addressed by the 'js' key an object:
    //   - value: a ReactiveVar which contains the individual value got from the form
    //   - checked: a ReactiveVar which contains the individual checked type (in the sense of FieldCheck class)
    //   - field: the field name
    //   - defn: the field definition
    //   - fn: the check function name
    //   - parent: if set, the parent field name

    _defineLocalCheckFunction( field, spec, arg ){
        const self = this;
        // do we have a check function for this field ? warn in dev...
        spec.iFieldHaveCheck();
        // local check function is called with element dom data
        const localFn = spec.iFieldComputeLocalCheckFunctionName();
        self.#locals[localFn] = async function( eltData, opts={} ){
            if( eltData.$js.length ){
                eltData.$js.removeClass( 'is-valid is-invalid' );
            }
            const value = self._valueFrom( eltData, opts );
            eltData.value.set( value );
            // this local function returns a Promise which resolves to a validity boolean
            return Promise.resolve( true )
                .then(() => {
                    // the checks function returns a Promise which resolves to a TypedMessage or null
                    return spec.iFieldCheck( value, self._getData(), opts );
                })
                .then(( errs ) => {
                    //console.debug( eltData, err );
                    check( errs, Match.OneOf( null, TM.TypedMessage, Array ));
                    const fullStatus = self.iStatusCompute( eltData, errs );
                    self.#valid.set( fullStatus.valid ); //? are we sure ??
                    eltData.valid.set( fullStatus.valid );
                    eltData.status.set( fullStatus.status );
                    // manage different err types
                    //if( err && opts.msgerr !== false ){
                    //    self._msgPush( err );
                    //}
                    //if( eltData.defn.post ){
                    //    eltData.defn.post( err );
                    //}
                    //const status = self.iStatusCompute( eltData, errs );
                    //console.debug( eltData.field, err, checked_type );
                    // set valid/invalid bootstrap classes
                    //if( defn.display !== false && self.#conf.useBootstrapValidationClasses === true && $js.length ){
                    //    $js.addClass( valid ? 'is-valid' : 'is-invalid' );
                    //}
                    return fullStatus.valid;
                })
                .catch(( e ) => {
                    console.error( e );
                });
        };
        // end_of_function
        // needed by inputHandler so that we can get back our Checker data for this field from the event.target
        //  take care of having one and only target DOM element for this definition at this time
        const instance = self._getInstance();
        const selector = spec.iFieldJsSelector();
        if( instance && selector ){
            const $js = instance.$( selector );
            this.iDatasetSet( $js, spec );
        }
        return true;
    }

    // iterate on each field definition, calling the provided 'cb' callback for each one
    //  the recursive iteration stops as soon as the 'cb' doesn't return true
    //  in other words, iterate while 'cb' returns true (same than 'every' instruction)
    _fieldsIterate( cb, args=null ){
        const self = this;
        const _fields_iterate_f = function( name, spec, arg ){
            return cb.bind( self )( name, spec, arg );
        };
        const panel = this._getPanelSpec();
        if( panel ){
            panel.iEnumerateKeys( _fields_iterate_f, args );
        }
    }

    // call the local check function which itself calls the field-defined check
    _local_check( eltData, opts ){
        check( eltData, Object );
        const localFn = eltData.spec.iFieldComputeLocalCheckFunctionName();
        return this.#locals[localFn]( eltData, opts );
    }

    /*
     * @summary Clears the messages place, and the error messages stack
     */
    _msgClear(){
        const messager = this._getIMessager();
        if( messager ){
            messager.iMessagerClear();
        }
        /*
        this.IMessagesSetClear();
        this.#dataParts.clear();
        if( this.#conf.$err && this.#conf.$err.length ){
            $err.val( '' );
        }
        if( this.#conf.errSetFn ){
            this.#conf.errSetFn( '' );
        }
        if( this.#conf.errClearFn ){
            this.#conf.errClearFn();
        }
        */
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
        if( eltData.spec.valTo ){
            value = eltData.spec.valTo( item );
        } else {
            value = item[eltData.spec.name()];
        }
        const tagName = eltData.$js.prop( 'tagName' );
        const eltType = eltData.$js.attr( 'type' );
        if( tagName === 'INPUT' && ( eltType === 'checkbox' )){
            eltData.$js.prop( 'checked', value );
            //eltData.$js.find( '[value="'+value+'"]' ).prop( 'checked', true );
        } else {
            /*
            const $select = eltData.$js.closest( '.core-yesno-select' );
            if( $select.length ){
                const def = CoreApp.YesNo.byValue( value );
                if( def ){
                    eltData.$js.val( CoreApp.YesNo.id( def ));
                }
            } else {
             */
                eltData.$js.val( value );
            //}
        }
    }

    // protected methods

    // returns the data to be passed to field-defined check functions, may be null
    _getData(){
        return this.#conf.data;
    }

    // returns the name of the dataset installed on DOM elements, always set
    _getDatasetName(){
        const name = this.#conf.datasetName;
        assert( !name || _.isString( name ), 'datasetName is expected to be a non empty string' );
        return name;
    }

    // returns the IMessager interface, may be null
    _getIMessager(){
        const messager = this.#conf.messager;
        assert( !messager || messager instanceof IMessager, 'messager is expected to be a IMessager instance' );
        return messager;
    }

    // returns the PanelSpec fields definition, may be null
    _getPanelSpec(){
        const panel = this.#conf.panel;
        assert( !panel || panel instanceof IPanelSpec, 'panel is expected to be a IPanelSpec instance' );
        return panel;
    }

    // returns the parent Checker if any, may be null
    _getParent(){
        const parent = this.#conf.parent;
        assert( !parent || parent instanceof Checker, 'parent is expected to be a Checker instance' );
        return parent;
    }

    // returns the Blaze.TemplateInstance defined at instanciation time, may be null
    _getInstance(){
        const instance = this.#conf.instance;
        assert( !instance || instance instanceof Blaze.TemplateInstance, 'instance is expected to be a Blaze.TemplateInstance instance' );
        return instance;
    }

    // returns the validity event, always set
    _getValidityEvent(){
        const event = this.#conf.validityEvent;
        assert( !event || _.isString( event ), 'validityEvent is expected to be a non empty string' );
        return event;
    }

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new Checker instance
     * @param {Object} args an optional arguments object with following keys:
     *  - instance: an optional Blaze.TemplateInstance which materializes the Checker display
     *      > let us defines autorun() functions
     *      > provides a '$' jQuery operator which is tied to this instance
     *      > provides the DOM element which will act as a global event receiver
     *      > provides the topmost DOM element to let us find all managed fields
     *  - parent: an optional parent Checker instance
     *  - messager: an optional IMessager implementation
     *      > this is a caller's design decision to have a message zone per panel, or globalized at a higher level
     *      > caller doesn't need to address a globalized messager at any lower panel: it is enough to identify the parent Checker (if any)
     *  - panel: an optional IPanelSpec iplementation which defines the managed fields
     *  - data: an optional data object to be passed to check functions as additional argument
     *  - id: when the panel is array-ed, a function "( event ) : string" which returns the row identifier
     *  - displayCheckResultIndicator: whether to display a check result indicator on the right of the field
     *    only considered if the corresponding package configured value is overridable
     *
     *  - validityEvent: if set, the event used to advertize of each Checker validity status, defaulting to 'checker-validity'
     *  - datasetName: if set, the name of the data set on each DOM element, defaulting to 'form-checker'

    /////*  - $top: an optional jQuery object which should be a common ancestor of all managed fields, will act both as a common source for all fields searches and as an event receiver
    ///// *  - tm: an optional object which implements the TM.ITypedMessage interface
     /////*  - fieldsSet: a FieldSet instance which contains all fields definitions
     ///*  - $ok: an optional jQuery object which defines the OK button (to enable/disable it)
     ///*  - okSetFn( valid<Boolean> ): an optional function to be called when OK button must be enabled / disabled
     ///*  - $err: an optional jQuery object which defines the error message place
     ///*  - errSetFn( message<String> ): an optional function to be called to display an error message
     ///*  - errClearFn(): an optional function to be called to clear all messages
     *
     *      Because we want re-check all fields on each input event, in the same way each input event re-triggers all error messages
     *      So this function to let the application re-init its error messages stack.
     * @returns {Checker} this Checker instance
     */
    constructor( args={} ){
        assert( !args || _.isObject( args ), 'when set, options must be a plain javascript Object' );
        if( args ){
            assert( !args.instance || args.instance instanceof Blaze.TemplateInstance, 'when set, instance must be a Blaze.TemplateInstance instance');
            assert( !args.parent || args.parent instanceof Checker, 'when set, parent must be a Checker instance' );
            assert( !args.messager || args.messager instanceof IMessager, 'when set, messager must be a IMessager instance' );
            assert( !args.fields || args.fields instanceof IPanelSpec, 'when set, fields must be a IPanelSpec instance' );
            assert( !args.validityEvent || _.isString( args.validityEvent ), 'when set, validityEvent must be a string' );
        }

        super( ...arguments );
        const self = this;

        // keep the provided params
        this.#args = args;

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, args );

        // initialize runtime data
        // have to wait for having returned from super() and have built the configuration
        this.iEventsInit();
        this.iHierarchyInit();

        // define an autorun which reacts to dataParts changes to set the global validity status
        if( this.#conf.instance ){
            this.#conf.instance.autorun(() => {
                let ok = true;
                Object.keys( self.#dataParts.all()).every(( emitter ) => {
                    ok &&= self.#dataParts.get( emitter );
                    return ok;
                });
                self.#valid.set( ok );
            });
        }

        // define an autorun which will enable/disable the OK button depending of the entity validity status
        if( this.#conf.instance ){
            this.#conf.instance.autorun(() => {
                const valid = self.#valid.get();
                if( self.#conf.$ok ){
                    self.#conf.$ok.prop( 'disabled', !valid );
                }
                if( self.#conf.okSetFn ){
                    self.#conf.okSetFn( valid );
                }
            });
        }

        // for each defined field, define a local check function
        this._fieldsIterate( this._defineLocalCheckFunction );

        console.debug( this );
        return this;
    }

    /**
     * @summary a general function which check each field of the panel successively
     *  From the application point of view, this is mostly called at initialization time, in an autorun, after Checker instanciation and when the data context is ready.
     * @param {Object} opts an option object with following keys:
     *  - $parent: if set, a jQuery element which acts as the parent of the (array-ed) form
     *  - update: if true, then says whether the value found in the form should update the edited object, defaulting to false
     *
     *  - display: if set, then says whether checks have any effect on the display, defaulting to true
     *  - field: if set, indicates a field to not check (as just already validated from an input handler)
     *  - msgerr: if set, says if error message are to be displayed, defaulting to true
     * @returns {Promise} which eventually resolves to the global validity status of the form
     */
    async check( opts={} ){
        let valid = true;
        let promises = [];
        const self = this;
        this._fieldsIterate(( name, spec ) => {
            const js = spec.iFieldJsSelector();
            if( js ){
                let $js = null;
                if( opts.$parent ){
                    $js = opts.$parent.find( js );
                } else {
                    const instance = self._getInstance();
                    if( instance ){
                        $js = instance.$( js );
                    }
                }
                const eltData = this.iDatasetFromFieldSpec( $js, spec );
                if( eltData ){
                    promises.push( self._local_check( eltData, opts )
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
        /*
        const self = this;
        Object.keys( self.#fields ).every(( f ) => {
            self.#instance.$( self.#fields[f].js ).removeClass( 'is-valid is-invalid' );
            return true;
        });
        // also clears the error messages if any
        this.iHierarchyUp( '_msgClear' )
        */
    }

    /**
     * @summary Set a message
     * @param {ITypedMessage} tm
     */
    errorSet( tm ){
        this.IMessagesSetPush( tm );
        if( this.#conf.$err && this.#conf.$err.length ){
            $err.val( tm.ITypedMessageMessage());
        }
        if( this.#conf.errSetFn ){
            this.#conf.errSetFn( tm.ITypedMessageMessage());
        }
    }

    /**
     * @summary Let an underlying component / pane / panel / FormChecker advertize of its individual validity status
     * @param {Object} o with following keys:
     *  - emitter: a unique emitter identifier
     *  - ok: the validity status of the individual component
     */
    formValidity( o ){
        assert( o && _.isObject( o ), 'EntityChecker.formValidity() wants a plain javascript Object' );
        assert( o.emitter && _.isString( o.emitter ) && o.emitter.length, 'EntityChecker.formValidity() wants an non-empty emitter' );
        assert( _.isBoolean( o.ok ), 'EntityChecker.formValidity() wants a boolean validity status' );
        this.#dataParts.set( o.emitter, o.ok );
    }

    /**
     * @summary initialize the form with the given data
     * @param {Object} item
     * @param {Object} opts an option object with following keys:
     *  $parent: when set, the DOM parent of the targeted form - in case of an array-ed form
     * @returns {FormChecker} this instance
     */
    /*
    setForm( item, opts={} ){
        const self = this;
        console.warn( 'setForm' );
        const cb = function( name, field ){
            const js = field.iFieldJsSelector();
            if( js ){
                let $js = null;
                if( opts.$parent ){
                    $js = opts.$parent.find( js );
                } else {
                    const instance = self._getInstance();
                    if( instance ){
                        $js = instance.$( js );
                    }
                }
                if( $js && $js.length === 1 ){
                    eltData = $js.data( 'form-checker' );
                    if( !eltData ){
                        this._domDataSet( $js, field );
                        eltData = $js.data( 'form-checker' );
                    }
                    if( eltData ){
                        self._valueTo( eltData, item );
                    } else {
                        Meteor.isDevelopment && console.warn( name, field, 'eltData not set' );
                    }
                }
            }
            return true;
        };
        this._fieldsIterate( cb );
        return this;
    }
    */
}
