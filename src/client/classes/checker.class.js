/*
 * pwix:forms/src/client/classes/checker.class.js
 *
 * Checker aims to industrialize and homogeneize the management of any of our input forms:
 * - let the application provides its check per fields
 * - provides indicators to show to the user the mandatory character of the fields and their check status
 * - manage a TypedMessage's error message stack.
 *
 * Checker is bound to a Blaze.TemplateInstance. When your form is built with several Blaze components,
 * then you will have a tree of Checker's which will all cooperate together to produce consolidated results.
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
import { strict as assert } from 'node:assert'; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';

import { Base } from './base.class.js';
import { FnArray } from './fn-array.class.js';
import { Panel } from './panel.class.js';

import { FieldStatus } from '../../common/definitions/field-status.def.js';

import { ICheckable } from '../interfaces/icheckable.iface.js';
import { ICheckerEvents } from '../interfaces/ichecker-events.iface.js';
import { ICheckerHierarchy } from '../interfaces/ichecker-hierarchy.iface.js';
import { ICheckerStatus } from '../interfaces/ichecker-status.iface.js';
import { IMessager } from '../interfaces/imessager.iface.js';
import { ISeq } from '../interfaces/iseq.iface.js';
import { IStatusable } from '../interfaces/istatusable.iface.js';

const logger = Logger.get();

export class Checker extends mix( Base ).with( ICheckerEvents, ICheckerHierarchy, ICheckerStatus, ICheckable, ISeq, IStatusable ){

    // static data

    static confKeys(){
        return [
            'data',
            'enabled',
            'messager',
            'name',
            '$ok',
            'okFn',
            'onCrossCheckRegisterFn',
            'onUpdateRegisterFn',
            'onValidityChangeRegisterFn',
            'panel',
            'parent',
            'trace',
            'validityEvent',
            'validityObject'
        ]
    };

    // static methods

    // private data

    // instanciation parameters
    #instance = null;
    #initialized = false;

    // configuration
    #defaultConf = {
        enabled: true,
        hooks: {},
        messager: null,
        name: null,
        panel: null,
        parent: null,
        validityEvent: 'forms-checker-validity',
        validityObject: null,
    };
    #conf = {};

    // runtime data

    // the topmost node of the template as a jQuery object
    #$topmost = null;

    // private methods

    // recursive explain
    async _explainRec( title, prefix ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._explainRec()', this.iSeq(), title, prefix );
        logger.log( prefix+title, this.confName(), this.iCheckableId(), this.status(), this.validity());
        logger.log( prefix+'- parent' );
        const parent = this.confParent();
        if( parent ){
            logger.log( prefix+'  '+parent.confName()+ ' '+parent.iCheckableId());
        } else {
            logger.log( prefix+'  (none)' );
        }
        logger.log( )
        logger.log( prefix+'- children' );
        let count = 0;
        this.rtChildren().forEach(( child ) => {
            child._explainRec( '', prefix+'  ' );
            count += 1;
        });
        if( !count ){
            logger.log( prefix+'  (none)' );
        }
        logger.log( prefix+'- fields' );
        count = 0;
        // check the fields of this one
        const cb = function( name, spec ){
            logger.log( prefix+'  ', name, spec.iStatusableStatus(), spec.iStatusableValidity());
            count += 1;
            return true;
        };
        await this.fieldsIterate( cb );
        if( !count ){
            logger.log( prefix+'  (none)' );
        }
        logger.log( prefix+'- messager' );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerDump();
        } else {
            logger.log( prefix+'  (none)' );
        }
    }

    // clear the IMessager if any
    _messagerClear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._messagerClear()', this.iSeq());
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerClear();
        }
    }

    // dump the IMessager
    _messagerDump(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._messagerDump()', this.iSeq());
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerDump();
        }
    }

    // push a TypedMessage
    _messagerPush( tms, id ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._messagerPush()',this.iSeq(), tms, id );
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
    async _messagerRemove(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._messagerRemove()', this.iSeq());
        // cleanup the messages stack from this checker
        let checkables = [];
        const cb = function( name, spec ){
            checkables.push( spec.iCheckableId());
            return true;
        };
        await this.fieldsIterate( cb );
        checkables.push( this.iCheckableId());
        this.hierarchyUp( '_messagerRemoveById', checkables );
        // iterate on all children
        for( const child of this.rtChildren()){
            await child._messagerRemove();
        }
    }

    // remove the messages send from this checker
    // - checkables is an identifier or an array of identifiers
    _messagerRemoveById( checkables ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._messagerRemoveById()', this.iSeq(), checkables );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerRemove( checkables );
        }
    }

    // Run the panel crossCheck() function(s) (if any)
    async _onCrossCheck( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._onCrossCheck()', this.iSeq(), opts );
        let msgs = [];
        this.messagerRemove( this.iCheckableId());
        for( const fn of this.confCrossCheckFn().get()){
            const res = await fn.call( this, this.confData(), opts );
            if( res ){
                msgs = msgs.concat( res );
                self.messagerPush( res );
            }
        };
        // consolidate the result
        const o = await this.iStatusableConsolidate( msgs );
        this.iStatusableStatus( o.status  );
        this.iStatusableValidity( o.valid );
        await this._consolidateStatusCheckersUp();
    }

    // Run the onUpdateFn() function(s) (if any)
    async _onUpdate( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._onUpdate()', this.iSeq(), opts );
        //logger.debug( 'Checker._onUpdate()', this.iSeq(), opts );
        for( const fn of this.confUpdateFn().get()){
            await fn.call( this, this.confData(), opts );
        }
    }

    // protected methods

    // returns the Blaze.TemplateInstance defined at instanciation time
    argInstance(){
        const instance = this.#instance || null;
        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance is expected to be a Blaze.TemplateInstance instance' );
        return instance;
    }

    // returns the function(s) to be called to cross-check the panel
    confCrossCheckFn(){
        return this.#conf.hooks.crossCheck || new FnArray();
    }

    // returns the data to be passed to field-defined check functions, may be null
    confData(){
        return this.#conf.data || null;
    }

    // whether the Checker is enabled, defaulting to true
    confEnabled(){
        const enabled = this.#conf.enabled;
        assert( enabled === true || enabled === false, 'enabled is expected to be a true|false Boolean, got '+enabled );
        return enabled;
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

    // returns the function(s) to be called on a panel update
    confUpdateFn(){
        return this.#conf.hooks.update || new FnArray();
    }

    // returns the function(s) to be called on a validity changes, may be empty
    confValidityFn(){
        return this.#conf.hooks.validity || new FnArray();
    }

    // returns the validity event, always set
    confValidityEvent(){
        const event = this.#conf.validityEvent || null;
        assert( !event || _.isString( event ), 'validityEvent is expected to be a non empty string' );
        return event;
    }

    // returns the validity jQuery object, may be null
    confValidityObject(){
        const object = this.#conf.validityObject || null;
        assert( !object || ( object instanceof jQuery && object.length ), 'validityObject is expected to be a jQuery object' );
        return object;
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
     * @constructor
     * @locus Client
     * @summary Instanciates a new Checker instance
     *  The new Checker MUST be initialized before being used.
     * 
     * @param {Blaze.TemplateInstance} instance the (mandatory) bound Blaze template instance
     *  - let us defines autorun() functions
     *  - provides a '$' jQuery operator which is tied to this template instance
     *  - provides the DOM element which will act as a global event receiver
     *  - provides the topmost DOM element to let us find all managed fields
     * 
     * @returns {Checker} this Checker instance
     */
    constructor( instance ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.Checker()', instance );
        if( !instance || !( instance instanceof Blaze.TemplateInstance )){
            logger.error( 'Checker() expects \'instance\' be an instance of Blaze.TemplateInstance, got', instance, 'throwing...' );
            throw new Error( 'Bad argument: instance' );
        }

        super( ...arguments );
        const self = this;
        this.iSeqAllocate( 'Checker' );

        // keep the provided instance
        this.#instance = instance;
        return this;
    }

    /**
     * @summary Check a panel and recursively all its children (but not besides nor up), and all rows of an array-ed panel, and update its status
     * @param {Object} opts an option object with following keys:
     *  - update: whether the value found in the form should update the edited object, defaulting to true
     *  - id: the identifier of the checker or null, added by IFieldRun.iFieldRunCheck() function
     *  - ignoreFields: whether fields must be considered when consolidating the status, defaulting to false
     *    use case: when the checker actually manages an external component and the defined fields have to be ignored
     *  - crossCheck: whether to run cross checks after all fields checks if no error has been detected yet, defaulting to true
     * @returns {Promise} which eventually resolves to the validity boolean flag of the checker
     */
    async check( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.check()', this.iSeq(), opts );
        let valid = true;
        if( this.enabled()){
            // check the children if any
            for( const child of this.rtChildren()){
                const v = await child.check( opts );
                valid &&= v;
            }
            const panel = this.panel();
            if( panel ){
                await panel.check( opts );
            }
        }
        return valid;
    }

    /**
     * @summary Clears the validity indicators
     */
    clear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.clear()', this.iSeq());
        logger.warn( 'Checker.clear() is obsoleted, please use messagerClear()' );
        this.messagerClear();
    }

    /**
     * @summary Recursively clear the panel if it exists
     * @param {Object} opts an optional options object with following keys:
     *  - propagateDown: whether to also recursively clear all children, defaulting to false
     */
    async clearPanel( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.clearPanel()', this.iSeq(), opts );
        const _clearField = function( name, field ){
            field.iRunValueTo({}, { value: null });
        };
        await this.fieldsIterate( _clearField );
        if( opts.propagateDown === true ){
            for( const it of this.rtChildren()){
                await it.clearPanel( opts );
            }
        }
    }

    /**
     * @summary Run the crossChecks function(s) (if any)
     *  Note that this function will not change any field status, but is only capable of pushing new error messages
     */
    async crossCheck( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.crossCheck()', this.iSeq(), opts );
        this.hierarchyUp( '_crossCheck', opts );
    }

    /**
     * Getter/Setter
     * @param {Boolean} enabled
     * @returns {Boolean} whether this checker is enabled, defaulting to true at instanciation time
     *  Note that wether the checker is actually enabled requires that it has been previously initialized
     */
    enabled( enabled ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.enabled()', this.iSeq(), enabled );
        if( enabled === true || enabled === false ){
            this.#conf.enabled = enabled;
        }
        return this.#initialized && this.confEnabled();
    }

    /**
     * @summary Set a message
     * @param {ITypedMessage} tm
     */
    errorSet( tm ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.errorSet()', this.iSeq(), tm );
        // in our model, only fields have TypedMessage's
        logger.warn( 'Checker.errorSet() is obsoleted, please use messagerPush()' );
        this.messagerPush( tm );
    }

    /**
     * @summary Try to explain the current status and validity
     */
    async explain(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.explain()', this.iSeq());
        await this._explainRec( 'This checker', '' );
    }

    /**
     * @summary Iterate on each field specification, calling the provided 'cb' callback for each one
     *  the recursive iteration stops as soon as the 'cb' doesn't return true
     *  in other words, iterate until end of iterator or 'cb' returns a falsy value
     * 
     * @param {Function} cb callback
     *  async cb( fieldName<String>, fieldSpec<IFieldSpec>, args<Any>) : Boolean
     *  NB: inside of the 'cb' callback, 'this' is this Checker instance
     * 
     * @param {Any} args to be passed to the callback
     */
    async fieldsIterate( cb, args=null ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.fieldsIterate()', this.iSeq(), cb, args );
        const panel = this.confPanel();
        if( panel ){
            for( const it of panel.enumerable()){
                const res = await cb.call( this, it.name, it.spec, args );
                if( !res ){
                    break;
                }
            }
        }
    }

    /**
     * @param {Object} args an optional initialization object with following keys:
     *  At the checker level:
     *  - enabled: whether this new checker will start with checks enabled, defaulting to true; a disabled Checker also stops messages up propagation
     *  - messager: an optional IMessager implementation
     *    > this is a caller's design decision to have a message zone per panel, or globalized at a higher level
     *    > caller doesn't need to address a globalized messager at any lower panel: it is enough to identify the parent Checker (if any)
     *  - name: an optional instance name
     *  - onValidityChangeRegisterFn: if set, a function or an array of functions to be called when the validity of the checker changes
     *  - parent: an optional parent Checker instance
     *  - validityEvent: if set, the event used to advertise of each Checker validity status, defaulting to 'checker-validity'
     *  - validityObject: an optional jQuery object which will be automatically enabled/disabled depending of validity status (e.g. an OK button)
     *    > used to be '$ok' argument deprecated in v1.6
     * 
     *  - okFn( valid<Boolean> ): an optional function which will be called on validity status changes
     * 
     *  - panel: an optional Panel instance which defines the managed fields
     *  - data: an optional data opaque object to be passed to field-defined check functions as additional argument
     *  - id: when the panel is array-ed, the row identifier
     *    will be passed as an 'id' option to field-defined check functions
     *  - fieldTypeShow: whether to display a field type indicator on the left of each field,
     *    this value overrides the configured default value
     *    it only applies if the field is itself qualified with a 'type' in the Forms.FieldType set
     *  - fieldStatusShow: whether and how to display the result indicator on the right of the field
     *    only considered if the corresponding package configured value is overridable
     *  - setForm: if set, the item to be used to fill-in the form at startup, defaulting to none
     *  - parentClass: if set, the class to be set on the parent DIV inserted on top of each field, defaulting to 'form-indicators-parent'
     *  - rightSiblingClass: if set, the class to be set on the DIV inserted just after each field, defaulting to 'form-indicators-right-sibling'
     */
    async init( args={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.init()', this.iSeq());
        // sanity checks
        if( Object.keys( args ).includes( 'enabled' ) && args.enabled !== true && args.enabled !== false ){
            logger.error( 'init() expects \'enabled\' be a Boolean when set, got', args.enabled, 'throwing...' );
            throw new Error( 'Bad argument: enabled' );
        }
        if( Object.keys( args ).includes( 'messager' ) && ( !args.messager || !( args.messager instanceof Forms.IMessager ))){
            logger.error( 'init() expects \'messager\' be an instance of Forms.IMessager when set, got', args.messager, 'throwing...' );
            throw new Error( 'Bad argument: messager' );
        }
        if( Object.keys( args ).includes( 'name' ) && ( !args.name || !_.isString( args.name ))){
            logger.error( 'init() expects \'name\' be a non-empty string when set, got', args.name, 'throwing...' );
            throw new Error( 'Bad argument: name' );
        }
        if( Object.keys( args ).includes( '$ok' ) && ( !args.$ok || !( args.$ok instanceof jQuery ) || !args.$ok.length )){
            logger.error( 'init() expects \'$ok\' be a non-empty jQuery object when set, got', args.$ok, 'throwing...' );
            throw new Error( 'Bad argument: $ok' );
        }
        if( Object.keys( args ).includes( 'okFn' ) && ( !args.okFn || !_.isFunction( args.okFn ))){
            logger.error( 'init() expects \'okFn\' be a function or an array of functions when set, got', args.okFn, 'throwing...' );
            throw new Error( 'Bad argument: okFn' );
        }
        if( Object.keys( args ).includes( 'onCrossCheckRegisterFn' ) && ( !args.onCrossCheckRegisterFn || ( !_.isFunction( args.onCrossCheckRegisterFn ) && !_.isArray( args.onCrossCheckRegisterFn )))){
            logger.error( 'init() expects \'onCrossCheckRegisterFn\' be a function or an array of functions when set, got', args.onCrossCheckRegisterFn, 'throwing...' );
            throw new Error( 'Bad argument: onCrossCheckRegisterFn' );
        }
        if( Object.keys( args ).includes( 'onUpdateRegisterFn' ) && ( !args.onUpdateRegisterFn || ( !_.isFunction( args.onUpdateRegisterFn ) && !_.isArray( args.onCrossCheckReonUpdateRegisterFngisterFn )))){
            logger.error( 'init() expects \'onUpdateRegisterFn\' be a function or an array of functions when set, got', args.onUpdateRegisterFn, 'throwing...' );
            throw new Error( 'Bad argument: onUpdateRegisterFn' );
        }
        if( Object.keys( args ).includes( 'onValidityChangeRegisterFn' ) && ( !args.onValidityChangeRegisterFn || ( !_.isFunction( args.onValidityChangeRegisterFn ) && !_.isArray( args.onValidityChangeRegisterFn )))){
            logger.error( 'init() expects \'onValidityChangeRegisterFn\' be a function or an array of functions when set, got', args.onValidityChangeRegisterFn, 'throwing...' );
            throw new Error( 'Bad argument: onValidityChangeRegisterFn' );
        }
        if( Object.keys( args ).includes( 'panel' ) && ( !args.panel || !( args.panel instanceof Forms.Panel ))){
            logger.error( 'init() expects \'panel\' be an instance of Forms.Panel when set, got', args.panel, 'throwing...' );
            throw new Error( 'Bad argument: panel' );
        }
        if( Object.keys( args ).includes( 'parent' ) && ( !args.parent || !( args.parent instanceof Forms.Checker ))){
            logger.error( 'init() expects \'parent\' be an instance of Forms.Checker when set, got', args.parent, 'throwing...' );
            throw new Error( 'Bad argument: parent' );
        }
        if( Object.keys( args ).includes( 'validityEvent' ) && ( !args.validityEvent || !_.isString( args.validityEvent ))){
            logger.error( 'init() expects \'validityEvent\' be a non-empty string when set, got', args.validityEvent, 'throwing...' );
            throw new Error( 'Bad argument: validityEvent' );
        }
        if( Object.keys( args ).includes( 'validityObject' ) && ( !args.validityObject || !( args.validityObject instanceof jQuery ) || !args.validityObject.length )){
            logger.error( 'init() expects \'validityObject\' be a non-empty jQuery object when set, got', args.validityObject, 'throwing...' );
            throw new Error( 'Bad argument: validityObject' );
        }
        if( this.#initialized ){
            logger.error( 'init() expects be run only once, throwing...' );
            throw new Error( 'Runtime: already initialized' );
        }
        // maybe some obsolescence warnings
        if( args.$ok ){
            logger.warning( 'init() \'$ok\' has been obsoleted since v1.6 in favor of \'validityObject\'. You should update your code' );
            if( args.validityObject ){
                logger.warning( 'init() specified \'validityObject\' supersedes specified \'$ok\' value' );
            } else {
                args.validityObject = args.$ok;
            }
        }
        if( args.okFn ){
            logger.warning( 'init() \'okFn\' has been obsoleted since v1.6 in favor of \'onValidityChangeRegisterFn\'. You should update your code' );
            if( args.onValidityChangeRegisterFn ){
                logger.warning( 'init() specified \'onValidityChangeRegisterFn\' supersedes specified \'okFn\' value' );
            } else {
                args.onValidityChangeRegisterFn = args.okFn;
            }
        }
        // warnings relative to panel data when there is no panel - actual checks being delegated to the Panel instance
        const panelKeys = Panel.confKeys();
        if( !args.panel ){
            for( const key of panelKeys ){
                if( Object.keys( args ).includes( key )){
                    logger.warning( 'init() \''+key+'\' is ignored as no Panel is defined' );
                }
            }
        }
        // warnings for unknown keys
        const checkerKeys = Checker.confKeys();
        for( const key of Object.keys( args )){
            if( !panelKeys.includes( key ) && !checkerKeys.includes( key )){
                logger.warning( 'init() \''+key+'\' is unknown from both Checker and Panel configuration keys' );
            }
        }

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, args );
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'conf merged', this.#conf );

        // setup hooks at checker level
        this.#conf.hooks.crossCheck = this.#conf.hooks.crossCheck || new FnArray();
        if( args.onCrossCheckRegisterFn ){
            this.#conf.hooks.crossCheck.set( args.onCrossCheckRegisterFn );
        }
        this.#conf.hooks.update = this.#conf.hooks.update || new FnArray();
        if( args.onUpdateRegisterFn ){
            this.#conf.hooks.update.set( args.onUpdateRegisterFn );
        }
        this.#conf.hooks.validity = this.#conf.hooks.validity || new FnArray();
        if( args.onValidityChangeRegisterFn ){
            this.#conf.hooks.validity.set( args.onValidityChangeRegisterFn );
        }
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'hooks setup', this.#conf.hooks );

        // initialize checker-level runtime data
        // have to wait for having returned from super() and have built the configuration
        this.eventInstallInputHandler();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'eventInstallInputHandler() done' );

        this.eventInstallValidityHandler();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'eventInstallValidityHandler() done' );

        this.hierarchyRegister();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'hierarchyRegister() done' );

        this.statusInstallOkAutorun();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'statusInstallOkAutorun() done' );

        // if we have a panel, then initialize it
        //  will also initialize field-level data if any + install values into the form if provided
        const panel = this.panel();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'got panel', panel );
        if( panel ){
            const panelArgs = _.cloneDeep( args );
            for( const key of Object.keys( panelArgs )){
                if( !panelKeys.includes( key )){
                    delete panelArgs[key];
                }
            }
            await panel.init( this, panelArgs );
            if( args.trace ) logger.debug( 'init()', this.iSeq(), 'panel initialized' );
        } else {
            if( args.trace ) logger.debug( 'init()', this.iSeq(), 'no panel' );
        }

        // onDestroyed
        if( false ){
            const confRowId = this.confRowId();
            this.argInstance().view.onViewDestroyed( function(){
                //console.debug( 'onViewDestroyed', confRowId );
            });
        }

        // set initialized before calling check() which wants an enabled checker
        this.#initialized = true;
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'initialized', this.#initialized );

        // run an initial check with default values (but do not update the provided data if any)
        if( args.enabled !== false ){
            await this.check({ update: false });
            if( args.trace ) logger.debug( 'init()', this.iSeq(), 'initial checks done' );
        } else {
            if( args.trace ) logger.debug( 'init()', this.iSeq(), 'no initial checks as enabled=false' );
        }

        // track checker status and validity
        if( false ){
            this.argInstance().autorun(() => {
                const status = this.iStatusableStatus();
                const validity = this.iStatusableValidity()
                //console.debug( 'Checker (autorun)', this.iCheckableId(), status, validity );
            });
        }

        // trigger end-of-initialization event
        this.rtTopmost().trigger( Forms.configure().checkerInitializationEvent, { checker: this, checkableId: this.iCheckableId(), status: this.status(), validity: this.validity() });

        return this;
    }

    /**
     * @summary Clears the messages stack
     */
    messagerClear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.messagerClear()', this.iSeq());
        this.hierarchyUp( '_messagerClear' );
    }

    /**
     * @summary Clears the messages stack from the messages exclusively pushed by me
     */
    messagerClearMine(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.messagerClearMine()', this.iSeq());
        this.messagerRemove( this.iCheckableId());
    }

    /**
     * @summary Dump the Messager content in the display order
     */
    messagerDump(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.messagerDump()', this.iSeq());
        this.hierarchyUp( '_messagerDump' );
    }

    /**
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the emitter ICheckable identifier, defaulting to this Checker
     */
    messagerPush( tms, id=null ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.messagerPush()', this.iSeq(), tms, id );
        this.hierarchyUp( '_messagerPush', tms, id || this.iCheckableId());
    }

    /**
     * @summary Remove the messages published by these ICheckable's
     * @param {String|Array<String>} ids
     */
    messagerRemove( ids ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.messagerRemove()', this.iSeq(), ids );
        this.hierarchyUp( '_messagerRemoveById', ids );
    }

    /**
     * @returns {String} the configured name, or null
     */
    name(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.name()' );
        return this.confName();
    }

    /**
     * @summary Run the onCrossCheck() function(s) (if any) unless crosscheck is false
     *  Note that this function will not change any field status
     */
    async onCrossCheck( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.onCrossCheck()', this.iSeq(), opts );
        if( opts.crossCheck !== false ){
            this.hierarchyUp( '_onCrossCheck', opts );
        }
    }

    /**
     * @summary Run the onUpdate() function(s) (if any) unless update is false
     *  Note that this function will not change any field status
     */
    async onUpdate( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.onUpdate()', this.iSeq(), opts );
        if( this.enabled() && opts.update !== false ){
            this.hierarchyUp( '_onUpdate', opts );
        }
    }

    /**
     * @returns {Panel} the configured panel, or null
     */
    panel(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.panel()', this.iSeq());
        return this.confPanel();
    }

    /**
     * @summary Remove this Checker from the hierarchy tree
     *  In an array-ed form, removing a row implies to also cleanup the associated Checker
     *  - remove the messages published from this Checker and its dependants
     *  - remove all this subtree from the hierarchy tree
     */
    async removeMe(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.removeMe()', this.iSeq());
        // cleanup the messages stack from this checker
        await this._messagerRemove();
        // detach from the hierarchy tree
        const parent = this.confParent();
        if( parent ){
            await this.hierarchyRemove( parent );
            await this.statusConsolidate( parent );
        }
    }

    /**
     * @summary Set the validity from an external emitter
     *  As a side effect, the status is reset to NONE for this Checker
     *  Example of a use case: the form embeds an external component not managed by any Checker
     * @param {Boolean} valid
     */
    setValid( valid ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.setValid()', this.iSeq(), valid );
        this.iStatusableStatus( FieldStatus.C.NONE );
        this.iStatusableValidity( valid );
        this.statusConsolidate({ ignoreFields: true });
    }

    /**
     * @returns {FieldStatus} the current (consolidated) check status of this panel
     */
    status(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.status()', this.iSeq());
        return this.iStatusableStatus();
    }

    /**
     * @param {Array<String>} fields the array of field names to be consolidated
     * @returns {FieldStatus} the current (consolidated) check status of the fields
     */
    async statusByFields( fields ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.statusByFields()', this.iSeq(), fields );
        let statuses = [ FieldStatus.C.NONE ];
        const cb = function( name, field ){
            if( fields.includes( name )){
                statuses.push( field.iStatusableStatus());
            }
            return true;
        };
        await this.fieldsIterate( cb );
        return FieldStatus.worst( statuses );
    }

    /**
     * @returns {Boolean} the current (consolidated) true|false validity of this panel
     *  A reactive data source.
     */
    validity(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.validity()', this.iSeq());
        return this.iStatusableValidity();
    }
}
