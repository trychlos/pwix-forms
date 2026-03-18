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
import { strict as assert } from 'node:assert';
import mix from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';

import { Base } from './base.class.js';

import { FieldStatus } from '../../common/definitions/field-status.def.js';

import { ICheckable } from '../interfaces/icheckable.iface.js';
import { ICheckerHierarchy } from '../interfaces/ichecker-hierarchy.iface.js';
import { ICheckerInit } from '../interfaces/ichecker-init.iface.js';
import { ISeq } from '../interfaces/iseq.iface.js';

const logger = Logger.get();

export class Checker extends mix( Base ).with( ICheckerHierarchy, ICheckerInit, ICheckable, ISeq ){

    // static data

    // static methods

    // private data

    // instanciation parameters
    #instance = null;

    // the topmost node of the template as a jQuery object
    #$topmost = null;

    // private methods

    /*
     * @summary Consolidate the status/validity of the checker children
     *  it is expected to be called *after* having consolidated fields - so start from there
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     */
    async _consolidateChildren( opts ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._consolidateChildren()', opts );
        let valid = this.iCheckableValidity();
        let statuses = [ this.iCheckableStatus() ];
        for( const child of this.rtChildren()){
            valid &&= child.iCheckableValidity();
            statuses.push( child.iCheckableStatus());
        }
        this.iCheckableValidity( valid );
        this.iCheckableStatus( FieldStatus.worst( statuses ));
    }

    /*
     * @summary Consolidate the status/validity of each field for this checker in a single status/validity for the checker
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     */
    async _consolidateFields( opts ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._consolidateFields()', opts );
        let valid = true;
        let statuses = [ FieldStatus.C.NONE ];
        if( opts.ignoreFields !== true ){
            let ignoreFields = opts.ignoreFields || [];
            for( const field of this.fieldsArray()){
                if( !ignoreFields.includes( field.name )){
                    valid &&= field.spec.iCheckableValidity();
                    statuses.push( field.spec.iCheckableStatus());
                }
            }
        }
        // set state of this checker as the consolidattion of the fields
        this.iCheckableValidity( valid );
        this.iCheckableStatus( FieldStatus.worst( statuses ));
    }

    // remove the messages send from this checker
    async _inHierarchyCheckersClear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._inHierarchyCheckersClear()', this.iSeq(),);
        this.hierarchyUp( '_inHierarchyMessagerRemoveById', [ this.iCheckableId() ]);
    }

    /*
     * @summary Consolidate the validity/status of that checker up
     *  Do not consider children nor besides, (so begins with children of parent)
     */
    async _inHierarchyConsolidateState(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._inHierarchyConsolidateState()' );
        let valid = true;
        let statuses = [];
        this.rtChildren().forEach(( child ) => {
            valid &&= child.iCheckableValidity();
            statuses.push( child.iCheckableStatus());
        });
        this.iCheckableValidity( valid );
        this.iCheckableStatus( FieldStatus.worst( statuses ));
    }

    /*
     * @summary try to cross check this checker if it is valid
     */
    async _inHierarchyCrossCheck( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._inHierarchyCrossCheck()' );
        //logger.debug( 'Checker._inHierarchyCrossCheck()', this.iSeq());
        const valid = this.iCheckableValidity();
        if( valid ){
            await this.crossCheck( opts );
        }
    }

    // clear the IMessager if any
    async _inHierarchyMessagerClear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._inHierarchyMessagerClear()', this.iSeq());
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerClear();
        }
    }

    // dump the IMessager
    async _inHierarchyMessagerDump(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._inHierarchyMessagerDump()', this.iSeq());
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerDump();
        }
    }

    // push a TypedMessage
    async _inHierarchyMessagerPush( tms, id ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._inHierarchyMessagerPush()',this.iSeq(), tms, id );
        const messager = this.confIMessager();
        //if( this.confName()) logger.debug( '_inHierarchyMessagerPush', this.confName(), this.iCheckableId(), messager, tms );
        if( messager ){
            messager.iMessagerPush( tms, id );
        }
    }

    // remove the messages send from this checker
    // - checkables is an identifier or an array of identifiers
    async _inHierarchyMessagerRemoveById( checkables ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._inHierarchyMessagerRemoveById()', this.iSeq(), checkables );
        const messager = this.confIMessager();
        if( messager ){
            messager.iMessagerRemove( checkables );
        }
    }

    // Run the onUpdateFn() function(s) (if any)
    async _inHierarchyOnUpdate( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._inHierarchyOnUpdate()', this.iSeq(), opts );
        for( const fn of this.confFieldUpdateFn().get()){
            await fn.call( this, this.confData(), opts );
        }
    }

    // protected methods
    // not really protected as called from others classes, but not member of the public API - said as internal API

    /*
     * @summary clear the messages from this checker and up from its parents
     */
    async intCheckersClear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.intCheckersClear()', this.iSeq());
        await this.hierarchyUp( '_inHierarchyCheckersClear' );
    }

    /*
     * @summary Consolidate the validity/status of each field for this checker
     *  and propagate this new status/validity to the parent
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     */
    async intConsolidateState( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.intConsolidateState()', opts );
        await this._consolidateFields( opts );
        await this._consolidateChildren( opts );
        //logger.debug( 'checker valid', this.iSeq(), this.iCheckableValidity());
        const parent = this.confParentChecker();
        if( parent ){
            await parent.hierarchyUp( '_inHierarchyConsolidateState' );
        }
    }

    // returns the Blaze.TemplateInstance defined at instanciation time
    intInstance(){
        const instance = this.#instance || null;
        assert( instance && instance instanceof Blaze.TemplateInstance, 'instance is expected to be a Blaze.TemplateInstance instance' );
        return instance;
    }

    /*
     * @summary Propagate the given TypedMessage's originated from the given 'id' up to first available Messager
     * @param {TypedMessage|Array<TypedMessage>} tms
     * @param {String} id the emitter ICheckable identifier, defaulting to this Checker
     */
    async intMessagerPush( tms, id=null ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.intMessagerPush()', this.iSeq(), tms, id );
        await this.hierarchyUp( '_inHierarchyMessagerPush', tms, id || this.iCheckableId());
    }

    /*
     * @summary Remove the messages published by these ICheckable's
     * @param {String|Array<String>} ids
     */
    async intMessagerRemoveByIds( ids ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.intMessagerRemoveByIds()', this.iSeq(), ids );
        await this.hierarchyUp( '_inHierarchyMessagerRemoveById', ids );
    }

    /*
     * @summary Run the onUpdate() function(s) (if any) unless update is false which has been checked by the caller field
     * @param {FormField} the originating field
     * @param {Object} an optional options object
     * 
     * Notes:
     *  - we trigger the event before propagating to the registered fnctions
     *  - this function does not change any status nor validity
     */
    async intOnUpdate( origin, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.intOnUpdate()', this.iSeq(), opts );
        if( this.enabled() && opts.update !== false ){
            this.intTopmost().trigger( Forms.configure().checkerUpdateEvent, { checker: this, checkableId: this.iCheckableId(), status: this.iCheckableStatus(), validity: this.iCheckableValidity(), origin: origin });
            await this.hierarchyUp( '_inHierarchyOnUpdate', opts );
        }
    }

    // returns the topmost node of the template as a jQuery object - always set
    // automaticaly computed the first time we need it
    intTopmost(){
        if( !this.#$topmost ){
            const instance = this.intInstance();
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
     * @summary Check a panel
     *  Default is to only check *that* panel (i.e. the managed fields), not the besides panels nor the eventual children
     *  + call the eventual cross checks of *that* panel
     *  + propagate up the status (and the validity and the messages).
     *  Refuses to do anything if the checker is not enabled (and initialized).
     * 
     * @param {Object} opts an option object with following keys:
     *  - update: whether the value found in the form should update the edited object, defaulting to true
     *    when false, the update event is not triggered either
     *  - id: the identifier of the checker or null, added by IFieldRun.iFieldRunCheck() function
     *  - ignoreFields: may be an array of fields to not re-checked
     *  - crossCheck: whether to run cross checks after all fields checks if no error has been detected yet, defaulting to true
     * @returns {Promise} which eventually resolves to the validity boolean flag of the checker
     */
    async check( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.check()', this.iSeq(), opts );
        let valid = true;
        if( this.enabled()){
            // check the children if any
            /*
            for( const child of this.rtChildren()){
                const v = await child.check( opts );
                valid &&= v;
            }
                */
            // check our fields
            const ignoreFields = opts.ignoreFields || [];
            for( const it of this.fieldsArray()){
                if( !ignoreFields.includes( it.name )){
                    const v = await it.spec.iFieldRunCheck( opts );
                    valid &&= v;
                }
            }
            if( valid ){
                await this.crossCheck( opts );
            }
            return valid;
        }
        return valid;
    }

    /**
     * @summary Recursively clear the panel if it exists
     * @param {Object} opts an optional options object with following keys:
     *  - propagateDown: whether to also recursively clear all children, defaulting to false
     */
    async clearForm( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.clearForm()', this.iSeq(), opts );
        for( const it of this.fieldsArray()){
            it.spec.iRunValueTo({}, { value: null });
        }
        if( opts.propagateDown === true ){
            for( const it of this.rtChildren()){
                await it.clearPanel( opts );
            }
        }
        await this.messagerClear();
    }

    /**
     * @summary Run the panel crossCheck() function(s) (if any)
     * @param {Object} an optional options object
     *  - origField: the origin field when cross check is triggered from an input handler
     *    when specified it takes the ownership of emitted messages so that removing them later will also manage them
     */
    async crossCheck( opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.crossCheck()', this.iSeq(), opts );
        //logger.debug( 'crossCheck()', this.iSeq());
        let msgs = [];
        // clear the last messages we may have emitted previously
        await this.intMessagerRemoveByIds( this.iCheckableId());
        // cross check if any
        for( const fn of this.confCrossCheckFn().get()){
            let res = await fn.call( this, this.confData(), opts );
            if( res ){
                res = _.isArray( res ) ? res : [ res ];
                msgs = msgs.concat( res );
            }
        };
        // set the checker state as the consolidated cross check result
        msgs = this.iCheckableTMsResult( msgs );
        const o = await this.iCheckableComputeFromTMs( msgs, { startFromCurrent: true });
        this.iCheckableStatus( o.status  );
        this.iCheckableValidity( o.valid );
        // propagate all returned TypedMessage's up to first available messager the hierarchy (stopping if a checker is not enabled)
        this.intMessagerPush( msgs, this.iCheckableId());
        // and ask the parent to consolidate the state of its children
        const parent = this.confParentChecker();
        if( parent ){
            await parent.hierarchyUp( '_inHierarchyConsolidateState' );
        }
    }

    /**
     * @summary Clears the messages stack
     */
    async messagerClear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.messagerClear()', this.iSeq());
        await this.hierarchyUp( '_inHierarchyMessagerClear' );
    }

    /**
     * @summary Clears the messages stack from the messages exclusively pushed by me or by the fields I manage
     */
    async messagerClearMine(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.messagerClearMine()', this.iSeq());
        let ids = [ this.iCheckableId() ];
        for( const it of this.fieldsArray()){
            ids.push( it.spec.iCheckableId());
        }
        await this.intMessagerRemoveByIds( ids );
    }

    /**
     * @summary Dump the Messager content in the display order
     */
    async messagerDump(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.messagerDump()', this.iSeq());
        await this.hierarchyUp( '_inHierarchyMessagerDump' );
    }

    /**
     * @returns {String} the configured name, or null
     */
    name(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.name()' );
        return this.confName();
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
        await this.messagerClearMine();
        // detach from the hierarchy tree
        const parent = this.confParentChecker();
        if( parent ){
            await this.hierarchyRemove( parent );
            await parent.intConsolidateState( parent );
        }
    }

    /**
     * @summary initialize the panel with the given data
     * @param {Object} item the values to be installed in the form
     * @param {Object} opts an optional options object
     */
    async setForm( item, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.setForm()', this.iSeq(), item, opts );
        for( const it of this.fieldsArray()){
            await it.spec.iRunValueTo( item, opts );
        }
        if( opts.check !== false ){
            opts.update = false;
            await this.check( opts );
        }
    }

    /**
     * @summary Set the checker as (externally) updated
     *  This doesn't change the status nor the validity, but triggers the intOnUpdate() function.
     *  'origin' is set to 'external'
     */
    async setUpdated(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.setUpdated()', this.iSeq());
        this.intOnUpdate( 'external' );
    }

    /**
     * @summary Set the validity from an external emitter
     *  As a side effect, the status is reset to NONE for this Checker
     *  Example of a use case: the form embeds an external component not managed by any Checker
     * @param {Boolean} valid
     */
    async setValid( valid ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.setValid()', this.iSeq(), valid );
        this.iCheckableStatus( FieldStatus.C.NONE );
        this.iCheckableValidity( valid );
        await this.intConsolidateState({ ignoreFields: true });
    }

    /**
     * @returns {FieldStatus} the current (consolidated) check status of this panel
     */
    status(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.status()', this.iSeq());
        return this.iCheckableStatus();
    }

    /**
     * @param {Array<String>} fields the array of field names to be consolidated
     * @returns {FieldStatus} the current (consolidated) check status of the fields
     */
    statusByFields( fields ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.statusByFields()', this.iSeq(), fields );
        let statuses = [ FieldStatus.C.NONE ];
        for( const it of this.fieldsArray()){
            if( fields.includes( it.name )){
                statuses.push( it.spec.iCheckableStatus());
            }
        }
        return FieldStatus.worst( statuses );
    }

    /**
     * @returns {Boolean} the current (consolidated) true|false validity of this panel
     *  A reactive data source.
     */
    validity(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.validity()', this.iSeq());
        return this.iCheckableValidity();
    }

    /* **********************************************************************************************************************************************************************************
     * **********************************************************************************************************************************************************************************
     * **********************************************************************************************************************************************************************************
     * **********************************************************************************************************************************************************************************
     ********************************************************************************************************************************************************************************** */

    // recursive explain
    async _explainRec( title, prefix ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker._explainRec()', this.iSeq(), title, prefix );
        logger.log( prefix+title, this.confName(), this.iCheckableId(), this.status(), this.validity());
        logger.log( prefix+'- parent' );
        const parent = this.confParentChecker();
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
        for( const it of this.fieldsArray()){
            logger.log( prefix+'  ', it.name, it.spec.iCheckableStatus(), it.spec.iCheckableValidity());
            count += 1;
        }
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

    // remove all messages emitted by this Checker and its fields
    //  and recurse on the children
    /*
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
        this.hierarchyUp( '_inHierarchyMessagerRemoveById', checkables );
        // iterate on all children
        for( const child of this.rtChildren()){
            await child._messagerRemove();
        }
    }
        */

    /**
     * @summary Clears the validity indicators
     */
    /*
    clear(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.clear()', this.iSeq());
        logger.warn( 'Checker.clear() is obsoleted, please use messagerClear()' );
        this.messagerClear();
    }
        */

    /**
     * @summary Set a message
     * @param {ITypedMessage} tm
     */
    /*
    errorSet( tm ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Checker.errorSet()', this.iSeq(), tm );
        // in our model, only fields have TypedMessage's
        logger.warn( 'Checker.errorSet() is obsoleted, please use intMessagerPush()' );
        this.intMessagerPush( tm );
    }
        */

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
    /*
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
        */

    /**
     * @returns {Object} with data from the form
     */
    /*
    async getForm(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.getForm()', this.iSeq());
        let res = {};
        for( const it of this.enumerable()){
            res[it.name] = await it.spec.iRunValueFrom();
        }
        return res;
    }
        */

    /**
     * @returns {Object} an object indexed by field names with field values
     */
    /*
    async objectData( args=null ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'Panel.objectData()', this.iSeq(), args );
        let res = {};
        for( const it of this.enumerable()){
            assert( it.spec instanceof FormField, 'expects an instance of FormField, got '+it.spec );
            res[it.name] = await it.spec.iRunValueFrom();
        }
        return res;
    }
    */
}
