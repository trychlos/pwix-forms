/*
 * pwix:forms/src/client/interfaces/ichecker-init.iface.js
 *
 * ICheckerInit manages all configuration and initialisation tasks.
 * 
 * All that code is installed here because it is rather verbose, and so this makes the main Checker code a bit more light, and keeps the main interface API.
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { check, Match } from 'meteor/check';
import { Field } from 'meteor/pwix:field';
import { Logger } from 'meteor/pwix:logger';
import { Tracker } from 'meteor/tracker';

import { FnArray } from '../classes/fn-array.class.js';
import { FormField } from '../classes/form-field.class.js';

import { IMessager } from '../interfaces/imessager.iface.js';

const logger = Logger.get();

export const ICheckerInit = DeclareMixin(( superclass ) => class extends superclass {

    // configuration
    #defaultConf = {
        check: true,
        data: null,
        enabled: true,
        fieldTypeShow: null,
        fieldStatusShow: null,
        hooks: {},
        messager: null,
        name: null,
        panel: null,
        parentChecker: null,
        parentClass: 'form-indicators-parent',
        rightSiblingClass: 'form-indicators-right-sibling',
        rowId: null,
        trace: false,
        validityObject: null
    };
    #conf = {};

    // runtime data

    // whether the checker has been initialized
    #initialized = false;

    // the FormField's set
    #set = {};

    // warn only once per field
    #warneds = {};

    // private methods
    
    // returns the FormField relative to the element which is the source of this event, or null
    _fieldSpecFromEvent( event ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerEvents._fieldSpecFromEvent()' );
        let found = null;
        for( const { name, spec } of this.fieldsArray()){
            const uiNode = spec.iRunUINode();
            if( uiNode[0].isSameNode( event.target ) || $.contains( uiNode[0], event.target )){
                found = spec;
                break;
            }
        }
        return found;
    }

    /*
     * @locus Client
     * @summary Defines and initializes the fields managed by the checker
     * @param {Object} arg a panel specification as provided by the application
     *  This is a keyed object, where keys are the field names, and values the field specifications for this panel
     * @param {Field.Set} set an optional previously defined Field.Set object which is able to provide default values
     * @returns {Array} the array of build (and initialized) Forms.FormField objects
     */
    async _fieldsInit( arg, set ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit._fieldsInit()', arg, set );

        // instanciate a FormField object for each field description
        for( const name of Object.keys( arg )){
            let defn = arg[name];
            if( set ){
                const spec = set.byName( name );
                if( spec ){
                    defn = _.merge( {}, spec.def(), defn );
                    // warn once
                } else if( !Object.keys( this.#warneds ).includes( name )){
                    logger.warn( 'ICheckerInit._fieldsInit() unknown name \''+name+'\' ignored' );
                    this.#warneds[name] = true;
                }
            }
            const field = new FormField( defn );
            this.#set[name] = field;
            await field.iFieldRunInit( this );
        }

        return this.fieldsArray();
    }

    // input handler
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event
    // The input event fires when the value of an <input>, <select>, or <textarea> element has been changed as a direct result of a user action (such as typing in a textbox or checking a checkbox).
    // - event is a jQuery.Event
    async _inputHandler( event ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit._inputHandler()', event );
        const spec = this._fieldSpecFromEvent( event );
        if( spec ){
            await spec.iFieldRunInputHandler();
        }
    }

    /*
     * @summary Install an input handler on the topmost node
     */
    _installInputHandler(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit._installInputHandler()' );
        const $node = this.intTopmost();
        const self = this;
        $node.on( 'input', ( event ) => { self._inputHandler( event ); });
    }

    /**
     * @summary Setup an autorun to be reactive on status changes at that level
     */
    _installStatusAutorun(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit._installStatusAutorun()' );
        const self = this;
        Tracker.nonreactive(() => {
            self.intInstance().autorun( async ( c ) => {
                if( c.firstRun ){
                    c.onStop(() => {
                        // only warn when debugging - this is the normal life for a computation to finish by stop
                        //logger.warning( '_installStatusAutorun() computation stopped' );
                    });
                }
                try {
                    // be only reactive to status changes
                    const status = self.iCheckableStatus();
                    Tracker.nonreactive(() => {
                        //logger.debug( 'statusChange autorun()', self.iSeq(), status );
                        const valid = self.iCheckableValidity();
                        const statusEvent = Forms.configure().checkerStatusEvent;
                        self.intTopmost().trigger( statusEvent, { checker: self, checkableId: self.iCheckableId(), status: status, validity: valid });
                    });
                } catch( e ){
                    logger.error( e );
                }
            });
        });
    }

    /**
     * @summary Setup an autorun to be reactive on validity changes at that level
     */
    _installValidityAutorun(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit._installValidityAutorun()' );
        const self = this;
        const $object = this.confValidityObject();
        const fnArray = this.confValidityChangeFn().get();
        //logger.debug( 'fnArray', this.iSeq(), fnArray );
        // doesn't test now the length of $object as dom can be not yet completed
        Tracker.nonreactive(() => {
            self.intInstance().autorun( async ( c ) => {
                if( c.firstRun ){
                    c.onStop(() => {
                        // only warn when debugging - this is the normal life for a computation to finish by stop
                        //logger.warning( '_installValidityAutorun() computation stopped' );
                    });
                }
                try {
                    // be only reactive on validity changes
                    const valid = self.iCheckableValidity();
                    Tracker.nonreactive(() => {
                        //logger.debug( 'validityChange autorun()', self.iSeq(), valid );
                        const status = self.iCheckableStatus();
                        if( $object && $object.length ){
                            $object.prop( 'disabled', !valid );
                        }
                        for( const fn of fnArray ){
                            Promise.resolve( fn( valid )).catch(( e ) => { logger.error( e ); });
                        }
                        const validityEvent = Forms.configure().checkerValidityEvent;
                        self.intTopmost().trigger( validityEvent, { checker: self, checkableId: self.iCheckableId(), status: status, validity: valid });
                    });
                } catch( e ){
                    logger.error( e );
                }
            });
        });
    }

    /*
     * @summary Install a validity handler on the topmost node
     */
    _installValidityHandler(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit._installValidityHandler()' );
        const $node = this.intTopmost();
        const self = this;
        const validityEvent = Forms.configure().checkerValidityEvent;
        $node.on( validityEvent, ( event ) => { self._validityHandler( event ); });
    }

    /*
     * @summary Register a new function on the specified hook
     * @param {String} hook
     * @param {Function} fn
     */
    _registerHook( hook, fn ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit._registerHook()', this.iSeq(), hook, fn );
        if( ICheckerInit.Hooks.includes( hook )){
            const array = this.#conf.hooks[hook] || new FnArray();
            array.register( fn );
            this.#conf.hooks[hook] = array;
        } else {
            logger.warning( 'unkown hook', hook );
        }
    }

    // validity handler
    _validityHandler( event ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit._validityHandler()', event );
    }

    /**
     * @constructor
     * @returns {ICheckerInit} the instance
     */
    constructor(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit.ICheckerInit()' );
        super( ...arguments );
        return this;
    }

    // returns the function(s) to be called to cross-check the panel
    confCrossCheckFn(){
        return this.#conf.hooks.crossCheck || new FnArray();
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
            logger.warn( 'confDisplayStatus() unexpected status definition', this.name(), display );
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

    // returns the function(s) to be called on a panel update
    confFieldUpdateFn(){
        return this.#conf.hooks.fieldUpdate || new FnArray();
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

    // returns the parent Checker if any, may be null
    confParentChecker(){
        const parent = this.#conf.parentChecker || null;
        assert( !parent || parent instanceof Forms.Checker, 'parentChecker is expected to be a Forms.Checker instance' );
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

    // returns the id row identifier, may be null
    confRowId(){
        const rowId = this.#conf.rowId || null;
        assert( rowId === null || ( rowId && _.isString( rowId )), 'rowId is expected to be a non-empty string' );
        return rowId;
    }

    // whether to be verbose on the execution
    confTrace(){
        const trace = this.#conf.trace;
        return !!trace;
    }

    // returns the function(s) to be called on a validity changes, may be empty
    confValidityChangeFn(){
        return this.#conf.hooks.validityChange || new FnArray();
    }

    // returns the validity jQuery object, may be null
    confValidityObject(){
        const object = this.#conf.validityObject || null;
        assert( !object || ( object instanceof jQuery && object.length ), 'validityObject is expected to be a jQuery object' );
        return object;
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
     * @returns {Array} an array of { name: <String>, spec: <Forms.FormField> } sync iterable objects which are the fields specifications of this panel
     *  As this method is sync, it can be called in for( ...  of ... ) loops (for await is not needed)
     */
    fieldsArray(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerInit.fieldsArray()', this.iSeq());
        const base = this.#set;
        assert( base && _.isObject( base ), 'expect base be a plain javascript object' );
        let res = [];
        for( const key of Object.keys( base )){
            res.push({ name: key, spec: base[key] });
        }
        return res;
    }

    /**
     * @param {Object} args an optional initialization object with following keys:
     *  At the checker level:
     *  - data: an optional data opaque object to be passed to field-defined check functions as additional argument
     *  - enabled: whether this new checker will start with checks enabled, defaulting to true; a disabled Checker also stops messages up propagation
     *  - fieldTypeShow: whether to display a field type indicator on the left of each field,
     *    this value overrides the configured default value
     *    it only applies if the field is itself qualified with a 'type' in the Forms.FieldType set
     *  - fieldStatusShow: whether and how to display the result indicator on the right of the field
     *    only considered if the corresponding package configured value is overridable
     *  - id: when the panel is array-ed, the row identifier
     *    > deprecated in favor of rowId in v1.6
     *  - messager: an optional IMessager implementation
     *    > this is a caller's design decision to have a message zone per panel, or globalized at a higher level
     *    > caller doesn't need to address a globalized messager at any lower panel: it is enough to identify the parent Checker (if any)
     *  - name: an optional instance name
     *  - $ok: an optional jquery object to be enabled/disabled on validity changes
     *    > deprecated in favor of validityObject in v1.6
     *  - okFn( valid<Boolean> ): an optional function which will be called on validity status changes
     *    > deprecated in favor of onvalidityChangeRegisterFn in v1.6
     *  - onValidityChangeRegisterFn: if set, a function or an array of functions to be called when the validity of the checker changes
     *  - panel: the fields as an object { fields, set }
     *  - parent: an optional parent Checker instance
     *    > deprecated in v1.6 in favor of parentChecker
     *  - parentChecker: an optional parent Checker instance
     *    > used to be 'parent' argument deprecated in v1.6
     *  - parentClass: if set, the class to be set on the parent DIV inserted on top of each field, defaulting to 'form-indicators-parent'
     *  - rightSiblingClass: if set, the class to be set on the DIV inserted just after each field, defaulting to 'form-indicators-right-sibling'
     *  - validityObject: an optional jQuery object which will be automatically enabled/disabled depending of validity status (e.g. an OK button)
     *    > used to be '$ok' argument deprecated in v1.6
     */
    async init( args={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.init()', this.iSeq());
        const self = this;
        // sanity checks
        if( Object.keys( args ).includes( 'check' ) && args.check !== true && args.check !== false ){
            logger.error( 'init() expects \'check\' be a Boolean when set, got', args.check, 'throwing...' );
            throw new Error( 'Bad argument: check' );
        }
        if( Object.keys( args ).includes( 'crossCheckRegisterFn' ) && ( !args.crossCheckRegisterFn || ( !_.isFunction( args.crossCheckRegisterFn ) && !_.isArray( args.crossCheckRegisterFn )))){
            logger.error( 'init() expects \'crossCheckRegisterFn\' be a function or an array of functions when set, got', args.crossCheckRegisterFn, 'throwing...' );
            throw new Error( 'Bad argument: crossCheckRegisterFn' );
        }
        if( Object.keys( args ).includes( 'enabled' ) && args.enabled !== true && args.enabled !== false ){
            logger.error( 'init() expects \'enabled\' be a Boolean when set, got', args.enabled, 'throwing...' );
            throw new Error( 'Bad argument: enabled' );
        }
        if( Object.keys( args ).includes( 'fieldStatusShow' ) && !args.fieldStatusShow === false && ( !_.isString( args.fieldStatusShow ) || !Object.values( Forms.C.ShowStatus ).includes( args.fieldStatusShow ))){
            logger.error( 'init() expects \'fieldStatusShow\' be false or a value from \'Forms.C.ShowStatus\' when set, got', args.fieldStatusShow, 'throwing...' );
            throw new Error( 'Bad argument: fieldStatusShow' );
        }
        if( Object.keys( args ).includes( 'fieldTypeShow' ) && args.fieldTypeShow !== true && args.fieldTypeShow !== false ){
            logger.error( 'init() expects \'fieldTypeShow\' be a vBoolean when set, got', args.fieldTypeShow, 'throwing...' );
            throw new Error( 'Bad argument: fieldTypeShow' );
        }
        if( Object.keys( args ).includes( 'id' ) && ( !args.id || !_.isString( args.id ))){
            logger.error( 'init() expects \'id\' be a non-empty string when set, got', args.id, 'throwing...' );
            throw new Error( 'Bad argument: id' );
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
        if( Object.keys( args ).includes( 'onFieldUpdateRegisterFn' ) && ( !args.onFieldUpdateRegisterFn || ( !_.isFunction( args.onFieldUpdateRegisterFn ) && !_.isArray( args.onFieldUpdateRegisterFn )))){
            logger.error( 'init() expects \'onFieldUpdateRegisterFn\' be a function or an array of functions when set, got', args.onFieldUpdateRegisterFn, 'throwing...' );
            throw new Error( 'Bad argument: onFieldUpdateRegisterFn' );
        }
        if( Object.keys( args ).includes( 'onValidityChangeRegisterFn' ) && ( !args.onValidityChangeRegisterFn || ( !_.isFunction( args.onValidityChangeRegisterFn ) && !_.isArray( args.onValidityChangeRegisterFn )))){
            logger.error( 'init() expects \'onValidityChangeRegisterFn\' be a function or an array of functions when set, got', args.onValidityChangeRegisterFn, 'throwing...' );
            throw new Error( 'Bad argument: onValidityChangeRegisterFn' );
        }
        if( Object.keys( args ).includes( 'panel' ) && !_.isObject( args.panel )){
            logger.error( 'init() expects \'panel\' be an object when set, got', args.panel, 'throwing...' );
            throw new Error( 'Bad argument: panel' );
        }
        if( args.panel ){
            if( args.panel.fields && !_.isObject( args.panel.fields )){
                logger.error( 'init() expects \'panel.fields\' be an object when set, got', args.panel.fields, 'throwing...' );
                throw new Error( 'Bad argument: panel.fields' );
            }
            if( args.panel.set && !( args.panel.set instanceof Field.Set )){
                logger.error( 'init() expects \'panel.set\' be an instance of Field.Set when set, got', args.panel.set, 'throwing...' );
                throw new Error( 'Bad argument: panel.set' );
            }
        }
        if( Object.keys( args ).includes( 'parent' ) && ( !args.parent || !( args.parent instanceof Forms.Checker ))){
            logger.error( 'init() expects \'parent\' be an instance of Forms.Checker when set, got', args.parent, 'throwing...' );
            throw new Error( 'Bad argument: parent' );
        }
        if( Object.keys( args ).includes( 'parentChecker' ) && ( !args.parentChecker || !( args.parentChecker instanceof Forms.Checker ))){
            logger.error( 'init() expects \'parentChecker\' be an instance of Forms.Checker when set, got', args.parentChecker, 'throwing...' );
            throw new Error( 'Bad argument: parentChecker' );
        }
        if( Object.keys( args ).includes( 'parentClass' ) && ( !args.parentClass || !_.isString( args.parentClass ))){
            logger.error( 'init() expects \'parentClass\' be a non-empty string when set, got', args.parentClass, 'throwing...' );
            throw new Error( 'Bad argument: parentClass' );
        }
        if( Object.keys( args ).includes( 'rightSiblingClass' ) && ( !args.rightSiblingClass || !_.isString( args.rightSiblingClass ))){
            logger.error( 'init() expects \'rightSiblingClass\' be a non-empty string when set, got', args.rightSiblingClass, 'throwing...' );
            throw new Error( 'Bad argument: rightSiblingClass' );
        }
        if( Object.keys( args ).includes( 'rowId' ) && ( !args.rowId || !_.isString( args.rowId ))){
            logger.error( 'init() expects \'rowId\' be a non-empty string when set, got', args.rowId, 'throwing...' );
            throw new Error( 'Bad argument: rowId' );
        }
        if( Object.keys( args ).includes( 'trace' ) && args.trace !== true && args.trace !== false ){
            logger.error( 'init() expects \'trace\' be a Boolean when set, got', args.trace, 'throwing...' );
            throw new Error( 'Bad argument: trace' );
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
        if( args.parent ){
            logger.warning( 'init() \'parent\' has been obsoleted since v1.6 in favor of \'parentChecker\'. You should update your code' );
            if( args.parentChecker ){
                logger.warning( 'init() specified \'parentChecker\' supersedes specified \'parent\' value' );
            } else {
                args.parentChecker = args.parent;
            }
        }
        // warnings for unknown keys
        const checkerKeys = ICheckerInit.confKeys();
        for( const key of Object.keys( args )){
            if( !checkerKeys.includes( key )){
                logger.warning( 'init() \''+key+'\' is unknown from Checker configuration keys, ignored' );
            }
        }
        // warns if a name has been already initialized
        if( Forms.configure().warnOnDuplicateName && args.name && ICheckerInit.initialized[args.name] ){
            logger.warning( 'init() a \''+args.name+'\' checker has already been initialized, the two will be kept distinct (but is that really what you want ?)');
        }

        // register the name as soon as possible to try to detect concurrent runs
        if( args.name ){
            ICheckerInit.initialized[args.name] = true;
        }

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, args );
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'conf merged', this.#conf );

        // setup hooks at checker level
        this.#conf.hooks.crossCheck = this.#conf.hooks.crossCheck || new FnArray();
        if( args.crossCheckRegisterFn ){
            //logger.debug( 'crossCheckRegisterFn', this.iSeq());
            this.#conf.hooks.crossCheck.register( args.crossCheckRegisterFn );
        }
        this.#conf.hooks.fieldUpdate = this.#conf.hooks.update || new FnArray();
        if( args.onFieldUpdateRegisterFn ){
            this.#conf.hooks.fieldUpdate.register( args.onFieldUpdateRegisterFn );
        }
        this.#conf.hooks.validityChange = this.#conf.hooks.validity || new FnArray();
        if( args.onValidityChangeRegisterFn ){
            this.#conf.hooks.validityChange.register( args.onValidityChangeRegisterFn );
        }
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'hooks setup', this.#conf.hooks );

        // install our own validityChange hook for manage crossCheck functions at that checker level
        // cross checks are only run when other fields are valid
        // nb: installing this validityChange hook is ok because it only tries to cross check when all fields are valid
        //  but unfortunately doesn't re-cross check when validity is not changed - which is bad because each field may be individually correct while cross is not
        if( 0 ){
            const _validityChange = async function( valid ){
                if( valid ){
                    await self.hierarchyUp( '_inHierarchyCrossCheck', { rowId: self.confRowId() });
                }
            };
            this.#conf.hooks.validityChange.register( _validityChange );
        }

        // install our own update hook for manage crossCheck functions at that checker level
        // cross checks are only run when other fields are valid
        //  cross check each time a field is changed as long as the checker is still valid
        const _updateHook = async function( data, opts ){
            if( self.iCheckableValidity()){
                await self.hierarchyUp( '_inHierarchyCrossCheck', { rowId: self.confRowId() });
            }
        };
        this.#conf.hooks.fieldUpdate.register( _updateHook );

        // initialize checker-level runtime data
        // have to wait for having returned from super() and have built the configuration
        this._installInputHandler();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), '_installInputHandler() done' );

        this._installValidityHandler();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), '_installValidityHandler() done' );

        this._installStatusAutorun();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), '_installStatusAutorun() done' );

        this._installValidityAutorun();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), '_installValidityAutorun() done' );

        this.hierarchyRegister();
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'hierarchyRegister() done' );

        // onDestroyed
        if( false ){
            const confRowId = this.confRowId();
            this.intInstance().view.onViewDestroyed( function(){
                //console.debug( 'onViewDestroyed', confRowId );
            });
        }

        // initialize the panel
        if( args.panel ){
            await this._fieldsInit( args.panel.fields, args.panel.set );
            if( args.trace ) logger.debug( 'init()', this.iSeq(), '_fieldsInit() done' );
        }

        // set initialized before calling check() which wants an enabled checker
        this.#initialized = true;
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'initialized', this.#initialized );

        // run an initial check with default values (but do not update the provided data if any)
        if( args.enabled !== false && args.check !== false ){
            await this.check({ update: false });
            if( args.trace ) logger.debug( 'init()', this.iSeq(), 'initial checks done' );
        } else {
            if( args.trace ) logger.debug( 'init()', this.iSeq(), 'no initial checks as enabled='+( args.enabled ?? true ), 'check='+( args.check ?? true ));
        }

        // trigger end-of-initialization event
        this.intTopmost().trigger( Forms.configure().checkerInitializationEvent, { checker: this, checkableId: this.iCheckableId(), status: this.status(), validity: this.validity() });

        return this;
    }
});

/*
 * This type of interface cannot have static data - so install it here
 */

ICheckerInit.Hooks = [
    'crossCheck',
    'fieldUpdate',
    'validityChange'
];

// if initialized checker has a name, then register it here
//  then use that as a guard to warn when a same name is initialized more than once
ICheckerInit.initialized = {};

ICheckerInit.confKeys = function(){
    return [
        'check',
        'crossCheckRegisterFn',
        'data',
        'enabled',
        'fieldStatusShow',
        'fieldTypeShow',
        'id',
        'messager',
        'name',
        '$ok',
        'okFn',
        'onFieldUpdateRegisterFn',
        'onValidityChangeRegisterFn',
        'panel',
        'parent',
        'parentChecker',
        'parentClass',
        'rightSiblingClass',
        'rowId',
        'trace',
        'validityObject'
    ]
};
