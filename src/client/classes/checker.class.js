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
 *  Even if we are talking about error messages, we actually manage TM.TypedMessage's emitted by the sub-components and check functions.
 *  Checker manages them via an 'IMessager' interface which let us have a stack of messages.
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
 *  All underlying components/pane/panels/Forms.Checker's may advertise their own validity status through:
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

import '../../common/js/trace.js';

import { Base } from './base.class.js';
import { Panel } from './panel.class.js';

import { FieldStatus } from '../../common/definitions/field-status.def.js';

import { ICheckable } from '../interfaces/icheckable.iface.js';
import { ICheckerEvents } from '../interfaces/ichecker-events.iface.js';
import { ICheckerHierarchy } from '../interfaces/ichecker-hierarchy.iface.js';
import { ICheckerStatus } from '../interfaces/ichecker-status.iface.js';
import { IFieldSpec } from '../interfaces/ifield-spec.iface.js';
import { IMessager } from '../interfaces/imessager.iface.js';
import { IStatusable } from '../interfaces/istatusable.iface.js';

export class Checker extends mix( Base ).with( ICheckerEvents, ICheckerHierarchy, ICheckerStatus, ICheckable, IStatusable ){

    // static data

    // static methods

    // private data

    // instanciation parameters
    #instance = null;
    #args = null;

    // configuration
    #defaultConf = {
        name: null,
        parent: null,
        messager: null,
        panel: null,
        data: null,
        id: null,
        fieldTypeShow: null,
        fieldStatusShow: null,
        setForm: null,
        validityEvent: 'checker-validity.forms',
        parentClass: 'form-indicators-parent',
        rightSiblingClass: 'form-indicators-right-sibling',
        enabled: true,
        crossCheck: null
   };
    #conf = {};

    // an array of crossCheckFn for this checker
    #crossCheckArray = null;

    // runtime data

    // the topmost node of the template as a jQuery object
    #$topmost = null;

    // private methods

    // Run the crossCheck function(s) (if any)
    async _crossCheck( opts={} ){
        _trace( 'Checker._crossCheck' );
        const array = this.confCrossCheckArray();
        //console.debug( 'crossCheck', this.name(), this.iCheckableId(), array );
        const self = this;
        if( array ){
            let msgs = [];
            this.messagerRemove( this.iCheckableId());
            for await ( const o of array ){
                const res = await o.fn( o.args, opts );
                if( res ){
                    msgs = msgs.concat( res );
                    self.messagerPush( res );
                }
            };
            // consolidate the result
            const o = this.iStatusableConsolidate( msgs );
            this.iStatusableStatus( o.status  );
            this.iStatusableValidity( o.valid );
            //console.debug( msgs, o );
            this._consolidateStatusCheckersUp();
        }
    }

    // recursive explain
    _explainRec( title, prefix ){
        _trace( 'Checker._explainRec' );
        console.log( prefix+title, this.confName(), this.iCheckableId(), this.status(), this.validity());
        console.log( prefix+'- parent' );
        const parent = this.confParent();
        if( parent ){
            console.log( prefix+'  '+parent.confName()+ ' '+parent.iCheckableId());
        } else {
            console.log( prefix+'  (none)' );
        }
        console.log( )
        console.log( prefix+'- children' );
        let count = 0;
        this.rtChildren().forEach(( child ) => {
            child._explainRec( '', prefix+'  ' );
            count += 1;
        });
        if( !count ){
            console.log( prefix+'  (none)' );
        }
        console.log( prefix+'- fields' );
        count = 0;
        // check the fields of this one
        const cb = function( name, spec ){
            console.log( prefix+'  ', name, spec.iStatusableStatus(), spec.iStatusableValidity());
            count += 1;
            return true;
        };
        this.fieldsIterate( cb );
        if( !count ){
            console.log( prefix+'  (none)' );
        }
        console.log( prefix+'- messager' );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerDump();
        } else {
            console.log( prefix+'  (none)' );
        }
    }

    // clear the IMessager if any
    _messagerClear(){
        _trace( 'Checker._messagerClear' );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerClear();
        }
    }

    // dump the IMessager
    _messagerDump(){
        _trace( 'Checker._messagerDump' );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerDump();
        }
    }

    // push a TypedMessage
    _messagerPush( tms, id ){
        _trace( 'Checker._messagerPush', tms, id );
        const messager = this.confIMessager();
        if( this.confName()){
            //console.debug( '_messagerPush', this.confName(), this.iCheckableId(), messager, tms );
        }
        if( messager ){
            messager.iMessagerPush( tms, id );
        }
    }

    // remove all messages emitted by this Checker and its fields
    //  and recurse on the children
    _messagerRemove(){
        _trace( 'Checker._messagerRemove' );
        // cleanup the messages stack from this checker
        let checkables = [];
        const cb = function( name, spec ){
            checkables.push( spec.iCheckableId());
            return true;
        };
        this.fieldsIterate( cb );
        checkables.push( this.iCheckableId());
        this.hierarchyUp( '_messagerRemoveById', checkables );
        // iterate on all children
        this.rtChildren().forEach(( child ) => {
            child._messagerRemove();
        });
    }

    // remove the messages send from this checker
    // - checkables is an identifier or an array of identifiers
    _messagerRemoveById( checkables ){
        _trace( 'Checker._messagerRemoveById', checkables );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerRemove( checkables );
        }
    }

    // protected methods

    // returns the Blaze.TemplateInstance defined at instanciation time
    argInstance(){
        const instance = this.#instance || null;
        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance is expected to be a Blaze.TemplateInstance instance' );
        return instance;
    }

    // returns the function(s) to be called to cross-check the panel, may be null
    confCrossCheckArray(){
        return this.#crossCheckArray || null;
    }

    // returns the data to be passed to field-defined check functions, may be null
    confData(){
        return this.#conf.data || null;
    }

    // whether a field type indicator must be displayed for the fields of this checker
    //  considers the configured default value and whether it is overridable
    //  considers the Checker configuration
    //  this may be overriden on a per-field basis
    // returns true|false
    confDisplayType(){
        let display = Forms.configure().fieldTypeShow;
        const overridable = Forms.configure().showTypeOverridable;
        if( overridable ){
            const opt = this.#conf.fieldTypeShow;
            if( opt !== null ){
                display = opt;
            }
        }
        return display;
    }

    // whether and how display a status indicator (none or bootstrap or indicator)
    //  considers the configured default value and whether it is overridable
    //  considers the Checker configuration
    //  this may be overriden on a per-field basis
    // returns none|bootstrap|indicator|trasnparent
    confDisplayStatus(){
        let display = Forms.configure().fieldStatusShow;
        const overridable = Forms.configure().showStatusOverridable;
        if( overridable ){
            const opt = this.#conf.fieldStatusShow;
            if( opt !== null ){
                display = opt;
            }
        }
        if( display && !Object.values( Forms.C.ShowStatus ).includes( display )){
            console.warn( 'pwix:forms unexpected status definition', this.name(), display );
            display = Forms.configure().fieldStatusShow;
        }
        return display;
    }

    // whether the Checker is enabled, defaulting to true
    confEnabled(){
        const enabled = this.#conf.enabled;
        assert( enabled === true || enabled === false, 'enabled is expected to be a true|false Boolean, got '+enabled );
        return enabled;
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

    // returns the Checker name, may be null
    confName(){
        const name = this.#conf.name || null;
        assert( !name || _.isString( name ), 'name is expected to be a string, got '+name );
        return name;
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

    // returns the Panel fields definition, may be null
    confPanel(){
        const panel = this.#conf.panel || null;
        assert( !panel || panel instanceof Panel, 'panel is expected to be a Panel instance' );
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

    // returns the class to be set on the right sibling node dynamically inserted just after each field
    confRightSiblingClass(){
        const name = this.#conf.rightSiblingClass || null;
        assert( !name || _.isString( name ), 'rightSiblingClass is expected to be a non empty string' );
        return name;
    }

    // returns the validity event, always set
    confValidityEvent(){
        const event = this.#conf.validityEvent || null;
        assert( !event || _.isString( event ), 'validityEvent is expected to be a non empty string' );
        return event;
    }

    // returns the item to be used to fimm-in the form at startup
    confSetForm(){
        const item = this.#conf.setForm || null;
        return item;
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
     *  - name: an optional instance name
     *  - parent: an optional parent Checker instance
     *  - messager: an optional IMessager implementation
     *    > this is a caller's design decision to have a message zone per panel, or globalized at a higher level
     *    > caller doesn't need to address a globalized messager at any lower panel: it is enough to identify the parent Checker (if any)
     *  - panel: an optional Panel instance which defines the managed fields
     *  - data: an optional data opaque object to be passed to check functions as additional argument
     *  - id: when the panel is array-ed, the row identifier
     *    will be passed as an option to field-defined check function
     *  - $ok: an optional jQuery object which defines the OK button (to enable/disable it)
     *  - okFn( valid<Boolean> ): an optional function to be called when OK button must be enabled/disabled
     *  - fieldTypeShow: whether to display a field type indicator on the left of each field,
     *    this value overrides the configured default value
     *    it only applies if the field is itself qualified with a 'type' in the Forms.FieldType set
     *  - fieldStatusShow: whether and how to display the result indicator on the right of the field
     *    only considered if the corresponding package configured value is overridable
     *  - setForm: if set, the item to be used to fill-in the form at startup, defaulting to none
     *  - validityEvent: if set, the event used to advertise of each Checker validity status, defaulting to 'checker-validity'
     *  - parentClass: if set, the class to be set on the parent DIV inserted on top of each field, defaulting to 'form-indicators-parent'
     *  - rightSiblingClass: if set, the class to be set on the DIV inserted just after each field, defaulting to 'form-indicators-right-sibling'
     * @returns {Checker} this Checker instance
     */
    constructor( instance, args={} ){
        _trace( 'Checker.Checker' );
        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance is mandatory, must be a Blaze.TemplateInstance instance');
        assert( !args || _.isObject( args ), 'when set, options must be a plain javascript Object' );
        if( args ){
            assert( !args.name || _.isString( args.name ), 'when set, name must be a string, got '+args.name );
            assert( !args.parent || args.parent instanceof Checker, 'when set, parent must be a Checker instance, got '+args.parent );
            assert( !args.messager || args.messager instanceof IMessager, 'when set, messager must be a IMessager instance, got '+args.messager );
            assert( !args.panel || args.panel instanceof Panel, 'when set, panel must be a Panel instance, got '+args.panel );
            assert( !args.id || _.isString( args.id ), 'when set, id must be a non-empty string, got '+args.id );
            assert( !args.$ok || ( args.$ok instanceof jQuery && args.$ok.length ), 'when set, $ok must be a jQuery object, got '+args.$ok );
            assert( !args.okFn || _.isFunction( args.okFn ), 'when set, okFn must be a function, got '+args.okFn );
            assert( !args.validityEvent || _.isString( args.validityEvent ), 'when set, validityEvent must be a non-empty string, got '+args.validityEvent );
            assert( !args.parentClass || _.isString( args.parentClass ), 'when set, parentClass must be a non-empty string, got '+args.parentClass );
            assert( !Object.keys( args ).includes( 'enabled' ) || _.isBoolean( args.enabled ), 'when set, enabled must be a true|false Boolean, got '+args.enabled );
            assert( !args.crossCheckFn || _.isFunction( args.crossCheckFn ) || _.isArray( args.crossCheckFn ), 'when set, crossCheckFn must be a function or an array of functions, got '+args.crossCheckFn );
        }

        super( ...arguments );
        const self = this;

        // keep the provided params
        this.#instance = instance;
        this.#args = args;

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, args );

        // crossCheckFn is pushed to an array (the crossCheckFn() setter is able to push other functions if this same array)
        if( args.crossCheckFn ){
            if( _.isFunction( args.crossCheckFn )){
                this.#crossCheckArray = [{ fn: args.crossCheckFn, args: this.confData() }];
            } else {
                assert( _.isArray( args.crossCheckFn ), 'when set, crossCheckFn must be a function or an array of functions, got '+args.crossCheckFn );
                this.#crossCheckArray = [];
                args.crossCheckFn.forEach(( it ) => {
                    this.#crossCheckArray.push({ fn: it, args: this.confData() });
                });
            }
        }

        // initialize panel-level runtime data
        // have to wait for having returned from super() and have built the configuration
        this.eventInstallInputHandler();
        this.eventInstallValidityHandler();
        this.hierarchyRegister();
        this.statusInstallOkAutorun();

        // initialize field-level data
        const cb = function( name, spec ){
            //console.debug( 'iFieldRunInit', this, name, spec );
            spec.iFieldRunInit( this );
            return true;
        }
        this.fieldsIterate( cb );

        // onDestroyed
        if( false ){
            const confId = this.confId();
            this.argInstance().view.onViewDestroyed( function(){
                console.debug( 'onViewDestroyed', confId );
            });
        }

        // if we have something to do to fill in the form ?
        const filling = this.confSetForm();
        if( filling ){
            this.setForm( filling );
        }

        // run an initial check with default values (but do not update the provided data if any)
        if( args.enabled !== false ){
            this.check({ update: false });
        }

        // track checker status and validity
        if( false ){
            this.argInstance().autorun(() => {
                const status = this.iStatusableStatus();
                const validity = this.iStatusableValidity()
                console.debug( 'Checker (autorun)', this.iCheckableId(), status, validity );
            });
        }

        //if( this.confName() === 'identity_address_row' ){
        //    console.debug( 'Checker', this.confName(), this.iCheckableId(), args.parent, args.parent ? args.parent.confName() : 'none', args.parent ? args.parent.iCheckableId() : 'none' );
        //}
        return this;
    }

    /**
     * @summary Check a panel and recursively all its children (but not besides nor up), and all rows of an array-ed panel, and update its status
     * @param {Object} opts an option object with following keys:
     *  - update: whether the value found in the form should update the edited object, defaulting to true
     *  - id: the identifier of the checker or null, added by IFieldRun.iFieldRunCheck() function
     *  - ignoreFields: whether fields must be considered when consolidating the status, defaulting to false
     *    use case: when the checker actually manages an external component and the defined fields have to be ignored
     * @returns {Promise} which eventually resolves to the validity boolean flag of the checker
     */
    async check( opts={} ){
        _trace( 'Checker.check' );
        if( this.enabled()){
            let valid = true;
            let promises = [];
            // check the children if any
            const children = this.rtChildren();
            if( children && children.length ){
                children.forEach(( child ) => {
                    promises.push( child.check( opts ).then(( v ) => {
                        valid &&= v;
                        return valid;
                    }));
                });
            }
            // check the fields of this one
            // crossed checks are only called at last if the fields are all valid
            opts.crossCheck = false;
            const cb = function( name, spec ){
                promises.push( spec.iFieldRunCheck( opts ).then(( v ) => {
                    valid &&= v;
                    return valid;
                }));
                return true;
            };
            this.fieldsIterate( cb );
            return Promise.allSettled( promises )
                .then(() => {
                    delete opts.crossCheck;
                    if( valid ){
                        this.crossCheck( opts );
                    }
                })
                .then(() => {
                    return valid;
                });
        }
    }

    /**
     * @summary Clears the validity indicators
     */
    clear(){
        _trace( 'Checker.clear' );
        console.warn( 'clear() is obsoleted, please use messagerClear()' );
        this.messagerClear();
    }

    /**
     * @summary Recursively clear the panel if it exists
     * @param {Object} opts an optional options object with following keys:
     *  - propagateDown: whether to also recursively clear all children, defaulting to false
     */
    clearPanel( opts={} ){
        _trace( 'Checker.clearPanel' );
        const clearField = function( name, field ){
            field.iRunValueTo({}, { value: null });
        };
        this.fieldsIterate( clearField );
        if( opts.propagateDown === true ){
            this.rtChildren().forEach(( it ) => {
                it.clearPanel( opts );
            });
        }
    }

    /**
     * @summary Run the crossCheck function (if any)
     *  Note that this function will not change any field status, but is only capable of pushing new error messages
     */
    async crossCheck( opts={} ){
        _trace( 'Checker.crossCheck' );
        this.hierarchyUp( '_crossCheck', opts );
    }

    /**
     * Setter
     * @param {Function} fn a crossCheckFn function
     * @param {Any} args the arguments to be called
     * @summary Add a crossCheckFn function to this checker
     */
    async crossCheckFn( fn, args ){
        _trace( 'Checker.crossCheck' );
        this.#crossCheckArray = this.#crossCheckArray || [];
        this.#crossCheckArray.push({ fn: fn, args: args });
    }

    /**
     * Getter/Setter
     * @param {Boolean} enabled
     * @returns {Boolean} whether checks are enabled
     */
    enabled( enabled ){
        _trace( 'Checker.enabled' );
        if( enabled === true || enabled === false ){
            this.#conf.enabled = enabled;
        }
        return this.confEnabled();
    }

    /**
     * @summary Set a message
     * @param {ITypedMessage} tm
     */
    errorSet( tm ){
        _trace( 'Checker.errorSet' );
        // in our model, only fields have TypedMessage's
        console.warn( 'errorSet() is obsoleted, please use messagerPush()' );
        this.messagerPush( tm );
    }

    /**
     * @summary Try to explain the current status and validity
     */
    explain(){
        _trace( 'Checker.explain' );
        this._explainRec( 'This checker', '' );
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
            assert( spec instanceof IFieldSpec, 'expects an instance of IFieldSpec, got '+spec );
            return cb.bind( self )( name, spec, arg );
        };
        const panel = this.confPanel();
        if( panel ){
            panel.iEnumerateKeys( _iterate, args );
        }
    }

    /**
     * @returns {Object} with data from the form
     */
    getForm(){
        let res = {};
        const cb = function( name, spec ){
            res[name] = spec.iRunValueFrom();
            return true;
        };
        this.fieldsIterate( cb );
        return res;
    }

    /**
     * @summary Clears the messages stack
     */
    messagerClear(){
        _trace( 'Checker.messagerClear' );
        this.hierarchyUp( '_messagerClear' );
    }

    /**
     * @summary Clears the messages stack from the messages exclusively pushed by me
     */
    messagerClearMine(){
        _trace( 'Checker.messagerClearMine' );
        this.messagerRemove( this.iCheckableId());
    }

    /**
     * @summary Dump the Messager content in the display order
     */
    messagerDump(){
        _trace( 'Checker.messagerDump' );
        this.hierarchyUp( '_messagerDump' );
    }

    /**
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the emitter ICheckable identifier, defaulting to this Checker
     */
    messagerPush( tms, id=null ){
        _trace( 'Checker.messagerPush' );
        //console.debug( 'messagerPush', this.confName(), this.iCheckableId(), tms, id );
        this.hierarchyUp( '_messagerPush', tms, id || this.iCheckableId());
    }

    /**
     * @summary Remove the messages published by these ICheckable's
     * @param {String|Array<String>} ids
     */
    messagerRemove( ids ){
        _trace( 'Checker.messagerRemove' );
        this.hierarchyUp( '_messagerRemoveById', ids );
    }

    /**
     * @returns {String} the configured name, or null
     */
    name(){
        _trace( 'Checker.name' );
        return this.confName();
    }

    /**
     * @returns {Panel} the configured panel, or null
     */
    panel(){
        _trace( 'Checker.panel' );
        return this.confPanel();
    }

    /**
     * @summary Remove this Checker from the hierarchy tree
     *  In an array-ed form, removing a row implies to also cleanup the associated Checker
     *  - remove the messages published from this Checker and its dependants
     *  - remove all this subtree from the hierarchy tree
     */
    removeMe(){
        _trace( 'Checker.removeMe' );
        // cleanup the messages stack from this checker
        this._messagerRemove();
        // detach from the hierarchy tree
        const parent = this.confParent();
        if( parent ){
            this.hierarchyRemove( parent );
            this.statusConsolidate( parent );
        }
    }

    /**
     * @summary initialize the form with the given data
     * @param {Object} item
     * @param {Object} opts an optional options object
     * @returns {Checker} this instance
     */
    setForm( item, opts={} ){
        _trace( 'Checker.setForm' );
        const self = this;
        const cb = function( name, field ){
            field.iRunValueTo( item, opts );
            return true;
        };
        this.fieldsIterate( cb );
        return this;
    }

    /**
     * @summary Set the validity from an external emitter
     *  As a side effect, the status is reset to NONE for this Checker
     *  Example of a use case: the form embeds an external component not managed by any Checker
     * @param {Boolean} valid
     */
    setValid( valid ){
        _trace( 'Checker.setValid' );
        this.iStatusableStatus( FieldStatus.C.NONE );
        this.iStatusableValidity( valid );
        this.statusConsolidate({ ignoreFields: true });
    }

    /**
     * @returns {FieldStatus} the current (consolidated) check status of this panel
     */
    status(){
        _trace( 'Checker.status' );
        return this.iStatusableStatus();
    }

    /**
     * @param {Array<String>} fields the array of field names to be consolidated
     * @returns {FieldStatus} the current (consolidated) check status of the fields
     */
    statusByFields( fields ){
        _trace( 'Checker.statusByFields' );
        let statuses = [ FieldStatus.C.NONE ];
        const cb = function( name, field ){
            if( fields.includes( name )){
                statuses.push( field.iStatusableStatus());
            }
            return true;
        };
        this.fieldsIterate( cb );
        return FieldStatus.worst( statuses );
    }

    /**
     * @returns {Boolean} the current (consolidated) true|false validity of this panel
     *  A reactive data source.
     */
    validity(){
        _trace( 'Checker.validity' );
        return this.iStatusableValidity();
    }
}
