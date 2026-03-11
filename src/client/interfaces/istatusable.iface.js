/*
 * pwix:forms/src/client/interfaces/istatusable.iface.js
 *
 * IStatusable manages both:
 * - a true|false validity status,
 * - a FieldStatus status.
 *
 * Both FormField (an instance of the field in a form) and Checker (a form) implement IStatusable.
 */

import _ from 'lodash';
import { strict as assert } from 'node:assert';
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { Logger } from 'meteor/pwix:logger';
import { ReactiveVar } from 'meteor/reactive-var';
import { TM } from 'meteor/pwix:typed-message';

import '../../common/js/index.js';

import { FieldStatus } from '../../common/definitions/field-status.def.js';

const logger = Logger.get();

export const IStatusable = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the check status of the field
    #status = new ReactiveVar( FieldStatus.C.NONE );

    // the true|false validity status of the field
    #validity = new ReactiveVar( true );

    // private methods

    /**
     * @returns {IStatusable} the instance
     */
    constructor( name, args ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IStatusable.IStatusable()', name, args );
        super( ...arguments );
        return this;
    }

    /**
     * @param {Array<TypedMessage>} tms
     * @returns {Object} an object with following keys:
     *  - status: the worst status computed from the messages
     *  - valid: whether the result is valid or not
     */
    iStatusableConsolidate( tms ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IStatusable.iStatusableConsolidate()', tms );
        //let valid = true;
        //let status = FieldStatus.C.NONE;
        let valid = this.iStatusableValidity();
        let status = this.iStatusableStatus();
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
                    logger.warn( 'IStatusable.iStatusableConsolidate() expected ITypedMessage, got', tm );
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

    /**
     * Getter/Setter
     * @param {FieldStatus} status
     * @returns {FieldStatus}
     */
    iStatusableStatus( status ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IStatusable.iStatusableStatus()', status );
        if( status !== undefined ){
            const index = FieldStatus.index( status );
            if( index >= 0 ){
                this.#status.set( status );
            } else {
                logger.warn( 'IStatusable.iStatusableStatus() unknwon status', status );
            }
        }
        return this.#status.get();
    }

    /**
     * @returns {ReactiveVar} the ReactiveVar which contains the FieldStatus
     *  Is provided in the FormsStatusIndicator component data context.
     *  Use case: outside of the IField interfaces, when the caller wants just use the indicator.
     */
    iStatusableStatusRv(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IStatusable.iStatusableStatusRv()' );
        return this.#status;
    }

    // 
    /**
     * Getter/Setter
     * @param {Boolean} valid
     * @returns {Boolean} the true|false validity of the field or the checker
     *  A reactive data source
     */
    iStatusableValidity( valid ){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'IStatusable.iStatusableValidity()', valid );
        if( valid !== undefined ){
            assert( valid == true || valid === false, 'validity must be a Boolean, found '+valid );
            this.#validity.set( valid );
        }
        if( this instanceof Forms.Checker && this.confName() === 'TenantEditPanel' ) logger.debug( 'iStatusableValidity()', this, valid );
        return this.#validity.get();
    }
});
