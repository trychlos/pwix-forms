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
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { ReactiveVar } from 'meteor/reactive-var';

import '../../common/js/index.js';

import { FieldStatus } from '../../common/definitions/field-status.def.js';

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
        _trace( 'IStatusable.IStatusable' );
        super( ...arguments );
        return this;
    }

    /**
     * Getter/Setter
     * @param {FieldStatus} status
     * @returns {FieldStatus}
     */
    iStatusableStatus( status ){
        _trace( 'IStatusable.iStatusableStatus' );
        if( status !== undefined ){
            const index = FieldStatus.index( status );
            if( index >= 0 ){
                this.#status.set( status );
                //console.warn( 'status change', this.iCheckableId(), status );
                //console.warn( 'status change', this.name(), status );
            } else {
                console.warn( 'unknwon status', status );
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
        _trace( 'IStatusable.iStatusableStatusRv' );
        return this.#status;
    }

    // getter/setter
    // the true|false validity of the field
    /**
     * Getter/Setter
     * @param {Boolean} valid
     * @returns {Boolean}
     */
    iStatusableValidity( valid ){
        _trace( 'IStatusable.iStatusableValidity' );
        if( valid !== undefined ){
            assert( valid == true || valid === false, 'validity must be a Boolean, found '+valid );
            this.#validity.set( valid );
            //console.debug( 'validity change', this.iCheckableId(), valid );
        }
        return this.#validity.get();
    }
});
