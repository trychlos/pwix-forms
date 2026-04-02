/*
 * pwix:forms/src/client/interfaces/icheckable.iface.js
 *
 * ICheckable if something which can be checked, either a field or a form.
 * The result of this check is either null, or a TypedMessage, or an array of TypedMessage's.
 * Each ICheckable instance is uniquely identified, so that the message it has generated can be removed and replaced on the time.
 *
 * Both FormField (an instance of the field in a form) and Checker (a form) implement ICheckable.
 * 
 * - status:    FieldStatus.C.NONE,
 *              FieldStatus.C.VALID,
 *              FieldStatus.C.UNCOMPLETE,
 *              FieldStatus.C.INVALID
 * 
 * - validity:  true|false
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';
import { Random } from 'meteor/random';
import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';

import { FieldStatus } from '../../common/definitions/field-status.def';

const logger = Logger.get();

export const ICheckable = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // an internal identifier so that the IMessager is able to identify this ICheckable
    #id = null;

    // the last check result of the field (or the checker) as an array of TypedMessage's, or null
    #tm = new ReactiveVar( null );

    // the check status of the field
    #status = new ReactiveVar( FieldStatus.C.NONE );

    // the true|false validity status of the field
    #validity = new ReactiveVar( true );

    // arguments at instanciation time

    /**
     * @constructor
     * @returns {ICheckable} the instance
     */
    constructor(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable.ICheckable()' );
        super( ...arguments );
        
        // allocate a random identifier
        this.#id = Random.id();

        // register this checkable
        ICheckable._registry[this.#id] = this;

        return this;
    }

    /**
     * @summary Compute the status/validity from an array of TypedMessage's
     *  Doesn't update anything
     * @param {Array<TypedMessage>} tms
     * @param {Object>} opts an optional options object with following keys:
     *  - startFromCurrent: whether we initialize the computed state wit the current state, defaulting to false
     * @returns {Object} an object with following keys:
     *  - status: the worst status computed from the messages
     *  - valid: whether the result is valid or not
     */
    iCheckableComputeFromTMs( tms, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable.iCheckableComputeFromTMs()', tms );
        let valid = true;
        let status = FieldStatus.C.NONE;
        if( opts.startFromCurrent === true ){
            valid = this.iCheckableValidity();
            status = this.iCheckableStatus();
        }
        if( tms ){
            let statuses = [ FieldStatus.C.VALID ];
            let level;
            tms.forEach(( tm ) => {
                let tmValid = true;
                if( tm instanceof TM.TypedMessage ){
                    level = tm.iTypedMessageLevel();
                    // cf. man syslog 3: the higher the level, the lower the severity
                    tmValid = ( TM.LevelOrder.compare( level, TM.MessageLevel.C.ERROR ) > 0 );
                    valid &&= tmValid;
                } else {
                    logger.warn( 'ICheckable.iCheckableComputeFromTMs() expected ITypedMessage, got', tm );
                }
                // compute the status
                if( !tmValid ){
                    statuses.push( FieldStatus.C.INVALID );
                } else if( level === TM.MessageLevel.C.WARNING ){
                    statuses.push( FieldStatus.C.UNCOMPLETE );
                }
            });
            status = FieldStatus.worst( statuses );
        }
        return { status: status, valid: valid };
    }

    // getter
    iCheckableId(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable.iCheckableId()' );
        return this.#id;
    }

    /**
     * Getter/Setter
     * @param {FieldStatus} status
     * @returns {FieldStatus}
     */
    iCheckableStatus( status ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable.iCheckableStatus()', status );
        if( status !== undefined ){
            const index = FieldStatus.index( status );
            if( index >= 0 ){
                this.#status.set( status );
            } else {
                logger.warn( 'ICheckable.iCheckableStatus() unknwon status', status );
            }
        }
        const res = this.#status.get();
        assert( FieldStatus.Order.includes( res ), 'ICheckable.iCheckableStatus() expects status in FieldStatus.Order array, got '+res );
        return res;
    }

    /**
     * @returns {ReactiveVar} the ReactiveVar which contains the FieldStatus
     *  Is provided in the FormsStatusIndicator component data context.
     *  Use case: outside of the IField interfaces, when the caller wants just use the indicator.
     */
    iCheckableStatusRv(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable.iCheckableStatusRv()' );
        return this.#status;
    }

    /**
     * Getter/Setter
     * @param {*} result the last check result of the field or the Checker, as a TypedMessage, or an array of TypedMessage's, or null
     * @returns {Array|null} the last check result of the field or the Checker, as an array of TypedMessage's, or null
     */
    iCheckableTMsResult( result ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable.iCheckableTMsResult()', result );
        if( result !== undefined ){
            if( result ){
                if( result instanceof TM.TypedMessage ){
                    result = [ result ];
                } else if( !( result instanceof Array )){
                    assert( result === null || result instanceof Array, 'expects result be null or a TypedMessage or an Array of TypedMessage\'s' );
                }
            }
            this.#tm.set( result );
        }
        return this.#tm.get();
    }

    /**
     * Getter/Setter
     * @param {Boolean} valid
     * @returns {Boolean} the true|false validity of the field or the checker
     *  A reactive data source
     */
    iCheckableValidity( valid ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable.iCheckableValidity()', valid );
        if( valid !== undefined ){
            assert( valid == true || valid === false, 'validity must be a Boolean, found '+valid );
            this.#validity.set( valid );
        }
        return this.#validity.get();
    }
});

ICheckable._registry = {};

ICheckable.byId = function( id ){
    return ICheckable._registry[id];
};
