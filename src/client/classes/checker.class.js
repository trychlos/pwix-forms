/*
 * pwix:forms/src/client/classes/checker.class.js
 *
 * Checker aims to industrialize and homogeneize the management of any of our input forms:
 * - let the application provides its check per fields
 * - provides indicators to show to the user the mandatory character f the fields and its check status
 * - manage a TypedMessage's error message stack.
 *
 * Checker is bound to a Blaze.TemplateInstance. When your form is built with several Blaze components,
 * then you will have a tree of Checker's which will all cooperate together to produce consollidated results.
 *
 * Array-ed panels:
 *  Checker doesn't manage array-ed forms. In this case, you should have a template per row in your array, and so a Checker per row.
 *  Checker expects each such row have its own identifier, and an 'id' string or function must be provided at instanciation time.
 *
 * Error messages:
 *  Even if we are talking about error messages, we actually manage the typed TM.TypedMessage emitted by the sub-components and check functions.
 *  Checker manages them via an 'IMessager' interface which sits over the (more complex) IOrderableStack interface.
 *
 * Validity status:
 *  Correlatively to recurrent elementary and global checks, the validity status of the edited entiy (resp. entities) is recomputed.
 *  For each individual field check, Checker expects to get:
 *  - either a 'null' answer, which means that all is fine and nothing is to be sait about that,
 *  - or a TypedMessage which may indicates an info to be displayed, or a warning or an error,
 *  - or an array of TypedMessage's.
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

import '../../common/js/trace.js';

import { Base } from '../../common/classes/base.class.js';

//import { ICheckDom } from '../interfaces/icheck-dom.iface.js';
import { ICheckEvents } from '../interfaces/icheck-events.iface.js';
import { ICheckField } from '../interfaces/icheck-field.iface.js';
import { ICheckHierarchy } from '../interfaces/icheck-hierarchy.iface.js';
import { ICheckStatus } from '../interfaces/icheck-status.iface.js';
import { IFieldSpec } from '../interfaces/ifield-spec.iface.js';
import { IMessager } from '../interfaces/imessager.iface.js';
import { IPanelSpec } from '../interfaces/ipanel-spec.iface.js';

export class Checker extends mix( Base ).with( ICheckEvents, ICheckField, ICheckHierarchy, ICheckStatus ){

    // static data

    // static methods

    // private data

    // instanciation parameters
    #instance = null;
    #args = null;

    // configuration
    #defaultConf = {
        parent: null,
        messager: null,
        panel: null,
        data: null,
        id: null,
        validityEvent: 'checker-validity.forms',
        parentClass: 'form-indicators-parent'
   };
    #conf = {};

    // runtime data

    // the topmost node of the template as a jQuery object
    #$topmost = null;

    // the consolidated data parts for each underlying component / pane / panel / FormChecker
    #dataParts = new ReactiveDict();

    // private methods

    /*
     * @summary Clears the messages place, and the error messages stack
     */
    _msgClear(){
        const messager = this.confIMessager();
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
        _trace( 'Checker._valueFrom' );
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
        _trace( 'Checker._valueTo' );
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

    // returns the Blaze.TemplateInstance defined at instanciation time
    argInstance(){
        const instance = this.#instance || null;
        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance is expected to be a Blaze.TemplateInstance instance' );
        return instance;
    }

    // returns the data to be passed to field-defined check functions, may be null
    confData(){
        return this.#conf.data || null;
    }

    // returns the id row identifier, may be null
    confId(){
        const id = this.#conf.id || null;
        assert( id === null || ( id && _.isString( id )), 'id is expected to be a non-empty string' );
        return id;
    }

    // returns the IMessager interface, may be null
    confIMessager(){
        const messager = this.#conf.messager || null;
        assert( !messager || messager instanceof IMessager, 'messager is expected to be a IMessager instance' );
        return messager;
    }

    // returns the $ok jQuery object or null
    conf$Ok(){
        const $obj = this.#conf.$ok || null;
        assert( !$obj || ( $obj instanceof jQuery && $obj.length ), '$ok is expected to be a jQuery object' );
        return $obj;
    }

    // returns the okFn function or null
    confOkFn(){
        const fn = this.#conf.okFn || null;
        assert( !fn || _.isFunction( fn ), 'okFn is expected to be a function' );
        return fn;
    }

    // returns the PanelSpec fields definition, may be null
    confPanelSpec(){
        const panel = this.#conf.panel || null;
        assert( !panel || panel instanceof IPanelSpec, 'panel is expected to be a IPanelSpec instance' );
        return panel;
    }

    // returns the parent Checker if any, may be null
    confParent(){
        const parent = this.#conf.parent || null;
        assert( !parent || parent instanceof Checker, 'parent is expected to be a Checker instance' );
        return parent;
    }

    // returns the class to be set on the parent dynamically inserted before each field
    confParentClass(){
        const name = this.#conf.parentClass || null;
        assert( !name || _.isString( name ), 'parentClass is expected to be a non empty string' );
        return name;
    }

    // returns the validity event, always set
    confValidityEvent(){
        const event = this.#conf.validityEvent || null;
        assert( !event || _.isString( event ), 'validityEvent is expected to be a non empty string' );
        return event;
    }

    // returns the topmost node of the template as a jQuery object - always set
    // automaticaly computed the first time we need it
    rtTopmost(){
        if( !this.#$topmost ){
            const instance = this.argInstance();
            this.#$topmost = instance.$( instance.firstNode );
        }
        const $elt = this.#$topmost;
        assert( $elt && $elt instanceof jQuery && $elt.length, '$topmost node is expected to be non-null jQuery object' );
        return $elt;
    }

    // public data

    /**
     * Constructor
     * @locus Client
     * @summary Instanciates a new Checker instance
     * @param {Blaze.TemplateInstance} instance the (mandatory) bound Blaze template instance
     *  - let us defines autorun() functions
     *  - provides a '$' jQuery operator which is tied to this template instance
     *  - provides the DOM element which will act as a global event receiver
     *  - provides the topmost DOM element to let us find all managed fields
     * @param {Object} args an optional arguments object with following keys:
     *  - parent: an optional parent Checker instance
     *  - messager: an optional IMessager implementation
     *      > this is a caller's design decision to have a message zone per panel, or globalized at a higher level
     *      > caller doesn't need to address a globalized messager at any lower panel: it is enough to identify the parent Checker (if any)
     *  - panel: an optional IPanelSpec implementation which defines the managed fields
     *  - data: an optional data opaque object to be passed to check functions as additional argument
     *  - id: when the panel is array-ed, the row identifier
     *      will be passed as an option to field-defined check function
     *  - $ok: an optional jQuery object which defines the OK button (to enable/disable it)
     *  - okFn( valid<Boolean> ): an optional function to be called when OK button must be enabled/disabled
     *
     *  - displayCheckResultIndicator: whether to display a check result indicator on the right of the field
     *    only considered if the corresponding package configured value is overridable
     *
     *  - validityEvent: if set, the event used to advertize of each Checker validity status, defaulting to 'checker-validity'
     *  - parentClass: if set, the class to be set on the parent DIV inserted on top of each field, defaulting to 'form-indicators-parent'
     * @returns {Checker} this Checker instance
     */
    constructor( instance, args={} ){
        _trace( 'Checker.Checker' );
        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance is mandatory, must be a Blaze.TemplateInstance instance');
        assert( !args || _.isObject( args ), 'when set, options must be a plain javascript Object' );
        if( args ){
            assert( !args.parent || args.parent instanceof Checker, 'when set, parent must be a Checker instance' );
            assert( !args.messager || args.messager instanceof IMessager, 'when set, messager must be a IMessager instance' );
            assert( !args.panel || args.panel instanceof IPanelSpec, 'when set, panel must be a IPanelSpec instance' );
            assert( !args.id || _.isString( args.id ), 'when set, id must be a non-empty string' );
            assert( !args.$ok || ( args.$ok instanceof jQuery && args.$ok.length ), 'when set, $ok must be a jQuery object' );
            assert( !args.okFn || _.isFunction( args.okFn ), 'when set, okFn must be a function' );
            assert( !args.validityEvent || _.isString( args.validityEvent ), 'when set, validityEvent must be a non-empty string' );
            assert( !args.parentClass || _.isString( args.parentClass ), 'when set, parentClass must be a non-empty string' );
        }

        super( ...arguments );
        const self = this;

        // keep the provided params
        this.#instance = instance;
        this.#args = args;

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, args );

        // if we want some debug display that before logs of interfaces initializations
        console.debug( this, this.confId());

        // initialize panel-level runtime data
        // have to wait for having returned from super() and have built the configuration
        this.eventInstallInputHandler();
        this.eventInstallValidityHandler();
        this.hierarchyRegisterParent();
        this.statusInstallOkAutorun();
        this.statusInstallStatusAutorun();
        this.statusInstallValidityAutorun();

        // initialize field-level data
        const cb = function( name, spec ){
            spec.checkerInit( this );
            return true;
        }
        this.fieldsIterate( cb );

        // define an autorun which reacts to dataParts changes to set the global validity status
        this.argInstance().autorun(() => {
            let ok = true;
            Object.keys( self.#dataParts.all()).every(( emitter ) => {
                ok &&= self.#dataParts.get( emitter );
                return ok;
            });
            //self.#valid.set( ok );
        });

        // onDestroyed
        const confId = this.confId();
        this.argInstance().view.onViewDestroyed( function(){
            console.debug( 'onViewDestroyed', confId );
        });
        //this.argInstance().onDestroyed( function(){
        //    console.debug( 'onDestroyed' );
        //});

        // run an initial check with default values (but do not update the provided data if any)
        this.check({ update: false });

        return this;
    }

    /**
     * @summary Check a panel, and all rows of an array-ed panel, and update its status
     * @param {Object} opts an option object with following keys:
     *  - $parent: if set, a jQuery element which acts as the parent of the (array-ed) form
     *  - update: whether the value found in the form should update the edited object, defaulting to true
     *  - field: if set, indicates a field to not check (as just already validated from an input handler)
     *
     *  - display: if set, then says whether checks have any effect on the display, defaulting to true
     *  - msgerr: if set, says if error message are to be displayed, defaulting to true
     * @returns {Promise} which eventually resolves to the global validity status of the form as true|false
     */
    async check( opts={} ){
        _trace( 'Checker.check' );
        return this.iCkFieldCheckAll( opts );
    }

    /**
     * @summary Clears the validity indicators
     */
    clear(){
        _trace( 'Checker.clear' );
        /*
        const self = this;
        Object.keys( self.#fields ).every(( f ) => {
            self.#instance.$( self.#fields[f].js ).removeClass( 'is-valid is-invalid' );
            return true;
        });
        // also clears the error messages if any
        this.iCkHierarchyUp( '_msgClear' )
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
     * @summary Iterate on each field specification, calling the provided 'cb' callback for each one
     *  the recursive iteration stops as soon as the 'cb' doesn't return true
     *  in other words, iterate while 'cb' returns true (same than 'every' instruction)
     * @param {Function} cb callback
     *  cb( fieldName<String>, fieldSpec<IFieldSpec>, args<Any>) : Boolean
     *  NB: inside of the 'cb' callback, 'this' is this Checker instance
     * @param {Any} args to be passed to the callback
     */
    fieldsIterate( cb, args=null ){
        _trace( 'Checker.fieldsIterate' );
        const self = this;
        const _iterate = function( name, spec, arg ){
            check( spec, IFieldSpec );
            return cb.bind( self )( name, spec, arg );
        };
        const panel = this.confPanelSpec();
        if( panel ){
            panel.iEnumerateKeys( _iterate, args );
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
     * @returns {Object} with data from the form
     *  Note: doesn't work well in an array-ed panel
     */
    getForm(){
        const self = this;
        let res = {};
        /*
        const cb = function( name, spec ){
            const eltData = self.iCkDomDataset( spec );
            res[name] = self._valueFrom( eltData );
            return true;
        };
        this.fieldsIterate( cb );
        Object.keys( self.#fields ).every(( f ) => {
            o[f] = self.#instance.$( self.#fields[f].js ).val();
            return true;
        });
        */
        return res;
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
            const js = field.iFieldSelector();
            if( js ){
                let $js = null;
                if( opts.$parent ){
                    $js = opts.$parent.find( js );
                } else {
                    const instance = self.argInstance();
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
        this.fieldsIterate( cb );
        return this;
    }
    */

    /**
     * @returns {String} the current (consolidated) check status of this panel
     */
    status(){
        return this.iCkStatusStatus();
    }
}
