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

import { check, Match } from 'meteor/check';
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

    // not public methods

    // Getter/Setter
    // @param {*} result the last check result of the field or the Checker, as a TypedMessage, or an array of TypedMessage's, or null
    // @returns {Array|null} the last check result of the field or the Checker, as an array of TypedMessage's, or null
    _icheckable_tms_normalize( tms ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable._icheckable_tms_normalize()', tms );
        if( tms !== undefined ){
            if( tms ){
                if( tms instanceof TM.TypedMessage ){
                    tms = [ tms ];
                } else if( !Match.test( tms, [TM.TypedMessage] )){
                    logger.error( 'expects tms be null or a TypedMessage or an Array of TypedMessage\'s, got', tms );
                }
            }
            this.#tm.set( tms );
        }
        return this.#tm.get();
    }

    // @summary Compute the status/validity from an array of TypedMessage's
    // @param {Array<TypedMessage>} tms
    // @param {Object>} opts an optional options object with following keys:
    //  - startFromCurrent: whether we initialize the computed state wit the current state, defaulting to false
    // @returns {Object} an object with following keys:
    //  - status: the worst status computed from the messages
    //  - valid: whether the result is valid or not
    _icheckable_tms_state( tms, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable._icheckable_tms_state()', tms );
        check( tms, Match.OneOf( null, [TM.TypedMessage] ));
        let valid;
        let statuses = [];
        if( opts.startFromCurrent === true ){
            valid = this.iCheckableValidity();
            statuses.push( this.iCheckableStatus());
        }
        if( tms ){
            let level;
            tms.forEach(( tm ) => {
                let tmValid = true;
                if( tm instanceof TM.TypedMessage ){
                    level = tm.iTypedMessageLevel();
                    // cf. man syslog 3: the higher the level, the lower the severity
                    tmValid = ( TM.LevelOrder.compare( level, TM.MessageLevel.C.ERROR ) > 0 );
                    valid = ( valid === undefined ) ? tmValid : valid && tmValid;
                } else {
                    logger.warn( 'ICheckable._icheckable_tms_state() expected ITypedMessage, got', tm );
                }
                // compute the status
                if( !tmValid ){
                    statuses.push( FieldStatus.C.INVALID );
                } else if( level === TM.MessageLevel.C.WARNING ){
                    statuses.push( FieldStatus.C.UNCOMPLETE );
                }
            });
        }
        return { status: FieldStatus.worst( statuses ), valid: valid };
    }

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
     *  Update this ICheckable status and validity
     * 
     * @param {Array<TypedMessage>} tms if specified, then we compute the status / validity from these messages
     *  else we compute the status/validity from last messages
     * 
     * @param {Object>} opts an optional options object with following keys:
     *  - startFromCurrent: whether we initialize the computed state with the current state, defaulting to false
     *  - updateState: whether to update the ICheckable state, defaulting to true
     * 
     * @returns {Object} an object with following keys:
     *  - status: the worst status computed from the messages
     *  - valid: whether the result is valid or not
     * This is returned for the caller convenience, as the ICheckable status and validity have been set by this method.
     */
    iCheckableComputeState( tms, opts={} ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckable.iCheckableComputeState()', tms, opts );
        tms = this._icheckable_tms_normalize( tms, opts );
        const res = this._icheckable_tms_state( tms, opts );
        // if we are unable to cmpute a state, because nobody has said anything then just consider it is valid
        if( res.status === undefined && res.valid === undefined ){
            res.valid = true;
            res.status = FieldStatus.C.VALID;
        }
        if( opts.updateState !== false ){
            this.iCheckableStatus( res.status  );
            this.iCheckableValidity( res.valid );
        }
        return res;
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
