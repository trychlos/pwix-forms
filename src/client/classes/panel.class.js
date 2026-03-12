/*
 * pwix:forms/src/client/classes/panel.class.js
 *
 * Gathers a keyed set of fields specifications for a form panel.
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert'; // up to nodejs v16.x
import mix from '@vestergaard-company/js-mixin';

import { Field } from 'meteor/pwix:field';
import { Logger } from 'meteor/pwix:logger';

import { Base } from './base.class.js';
import { FormField } from './form-field.class.js';

import { ISeq } from '../interfaces/iseq.iface.js';

const logger = Logger.get();

export class Panel extends mix( Base ).with( ISeq ){

    // static data

    // static methods

    static confKeys(){
        return [
            'fieldStatusShow',
            'fieldTypeShow',
            'id',
            'parentClass',,
            'rightSiblingClass',
            'rowId',
            'setForm',
            'trace'
        ]
    };

    // private data

    // configuration
    #defaultConf = {
        data: null,
        fieldTypeShow: null,
        fieldStatusShow: null,
        parentClass: 'form-indicators-parent',
        rightSiblingClass: 'form-indicators-right-sibling',
        rowId: null,
        setForm: null
    };
    #conf = {};

    // the FormField's set
    #set = {};

    // warn only once per field
    #warneds = {};

    // the checker
    #checker = null;

    // runtime data

    // private methods

    // protected methods

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

    // returns the item to be used to fill-in the form at startup
    confSetForm(){
        const item = this.#conf.setForm || null;
        return item;
    }

    // public data

    /**
     * @constructor
     * @locus Client
     * @summary Instanciates a new Panel instance
     * @param {Object} arg a panel specification as provided by the application
     *  This is a keyed object, where keys are the field names, and values the field specifications for this panel
     * @param {Field.Set} set an optional previously defined Field.Set object which is able to provide default values
     * @returns {Panel} this instance
     *  NB: we keep none of the provided instanciation args, relying on them to build the Forms.FormField set of data we need
     */
    constructor( arg, set ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.Panel()', arg, set );
        if( !arg || !_.isObject( arg )){
            logger.error( 'Panel() expects \'arg\' be a plain Javascript Object, got', arg, 'throwing...' );
            throw new Error( 'bad argument: arg' );
        }
        if( set && !( set instanceof Field.Set )){
            logger.error( 'Panel() expects \'set\' be a Field.Set instance when set, got', set, 'throwing...' );
            throw new Error( 'bad argument: set' );
        }

        super( ...arguments );
        const self = this;
        this.iSeqAllocate( 'Panel' );

        // instanciate a FormField object for each field description
        for( const name of Object.keys( arg )){
            //const res = cb( it.name, it.spec );
            let defn = arg[name];
            if( set ){
                const spec = set.byName( name );
                if( spec ){
                    defn = _.merge( {}, spec.def(), defn );
                    // warn once
                } else if( !Object.keys( self.#warneds ).includes( name )){
                    logger.warn( 'Panel.Panel() unknown name \''+name+'\' ignored' );
                    self.#warneds[name] = true;
                }
            }
            self.#set[name] = new FormField( defn );
        }

        return this;
    }

    /**
     * @param {String} name the searched field name
     * @returns {FormField} the definition for this named field, or null
     */
    byName( name ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.byName()', this.iSeq(), name );
        if( !name || !_.isString( name )){
            logger.error( 'byName() expects \'name`\' be a non-empty string, got', name, 'throwing...' );
            throw new Error( 'Bad argument: name' );
        }
        return this.#set[name] || null;
    }

    /**
     * @summary Check the panel, and all rows of an array-ed panel, and update its status
     * @param {Object} opts an option object with following keys:
     *  - update: whether the value found in the form should update the edited object, defaulting to true
     *  - id: the identifier of the checker or null, added by IFieldRun.iFieldRunCheck() function
     *  - ignoreFields: whether fields must be considered when consolidating the status, defaulting to false
     *    use case: when the checker actually manages an external component and the defined fields have to be ignored
     *  - crossCheck: whether to run cross checks after all fields checks if no error has been detected yet, defaulting to true
     * @returns {Promise} which eventually resolves to the validity boolean flag of the checker
     */
    async check( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.check()', this.iSeq(), opts );
        let valid = true;
        const prevCross = opts.crossCheck;
        // check the fields of this one
        // crossed checks are only called at last if the fields are all valid
        opts.crossCheck = false;
        for( const it of this.enumerable()){
            const v = await it.spec.iFieldRunCheck( opts );
            valid &&= v;
        }
        if( prevCross === undefined ){
            delete opts.crossCheck;
        } else {
            opts.crossCheck = prevCross;
        }
        if( valid ){
            await this.checker().onCrossCheck( opts );
        }
        return valid;
    }

    /**
     * @returns {Checker} the Forms.Checker instance defined at initialization
     */
    checker(){
        const checker = this.#checker;
        assert( checker && checker instanceof Forms.Checker, 'expect checker be an instance of Forms.Checker' );
        return checker;
    }

    /**
     * @returns {Array} an array of { name: <String>, spec: <Forms.FormField> } sync iterable objects which are the fields specifications of this panel
     *  As this method is sync, it can be called in for( ...  of ... ) loops (for await is not needed)
     */
    enumerable(){
        const base = this.#set;
        assert( base && _.isObject( base ), 'expect base be a plain javascript object' );
        let res = [];
        for( const key of Object.keys( base )){
            res.push({ name: key, spec: base[key] });
        }
        return res;
    }

    /**
     * @returns {Object} with data from the form
     */
    async getForm(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.getForm()', this.iSeq());
        let res = {};
        for( const it of this.enumerable()){
            res[it.name] = await it.spec.iRunValueFrom();
        }
        return res;
    }

    /**
     * @summary Initialize the panel when the Checker is initialized
     * @param {Checker} checker
     * @param {Object} args the optional args provided at Checker initialization time
     */
    async init( checker, args={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.init()', this.iSeq(), checker );
        // sanity checks
        if( Object.keys( args ).includes( 'fieldStatusShow' ) && !args.fieldStatusShow === false && ( !_.isString( args.fieldStatusShow ) || !Forms.C.ShowStatus.includes( args.fieldStatusShow ))){
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
        // maybe some obsolescence warnings
        if( args.id ){
            logger.warning( 'init() \'id\' has been obsoleted since v1.6 in favor of \'rowId\'. You should update your code' );
            if( args.rowId ){
                logger.warning( 'init() specified \'rowId\' supersedes specified \'id\' value' );
            } else {
                args.rowId = args.id;
            }
        }
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'starting with', args, this.enumerable());

        // build the configuration
        this.#conf = _.merge( this.#conf, this.#defaultConf, args );
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'conf merged', this.#conf );

        // save the checker
        this.#checker = checker;

        // initialize each field: UI, DOM, event handler
        const runOpts = {};
        if( args.trace ) runOpts.trace = true;
        for( const it of this.enumerable()){
            await it.spec.iFieldRunInit( this, runOpts );
        }
        if( args.trace ) logger.debug( 'init()', this.iSeq(), 'iFieldRunInit() done' );

        // initialize form if values are provided
        const values = this.confSetForm();
        if( values ){
            await this.setForm( values );
            if( args.trace ) logger.debug( 'init()', this.iSeq(), 'setForm() done' );
        } else {
            if( args.trace ) logger.debug( 'init()', this.iSeq(), 'no values to be set' );
        }
    }

    /**
     * @returns {Object} an object indexed by field names with field values
     */
    async objectData( args=null ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.objectData()', this.iSeq(), args );
        let res = {};
        for( const it of this.enumerable()){
            assert( it.spec instanceof FormField, 'expects an instance of FormField, got '+it.spec );
            res[it.name] = await it.spec.iRunValueFrom();
        }
        return res;
    }

    /**
     * @summary initialize the panel with the given data
     * @param {Object} item the values to be installed in the form
     * @param {Object} opts an optional options object
     */
    async setForm( item, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.setForm()', this.iSeq(), item, opts );
        for( const it of this.enumerable()){
            await it.spec.iRunValueTo( item, opts );
        }
        await this.check({ update: false });
    }
}
