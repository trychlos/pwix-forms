/*
 * pwix:forms/src/common/interfaces/istatusable.iface.js
 *
 * IStatusable manages both:
 * - a true|false validity status,
 * - a CheckStatus status.
 *
 * Both FieldSpec (an instance of the field in a form) and Checker (a form) implement IStatusable.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { ReactiveVar } from 'meteor/reactive-var';

import '../../common/js/index.js';

import { CheckStatus } from '../../common/definitions/check-status.def.js';

export const IStatusable = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the check status of the field
    #status = new ReactiveVar( CheckStatus.C.NONE );

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
     * @param {CheckStatus} status
     * @returns {CheckStatus}
     */
    iStatusableStatus( status ){
        _trace( 'IStatusable.iStatusableStatus' );
        if( status !== undefined ){
            const index = CheckStatus.index( status );
            if( index >= 0 ){
                //console.debug( 'status', status );
                this.#status.set( status );
            } else {
                console.warn( 'unknwon status', status );
            }
        }
        return this.#status.get();
    }

    /**
     * @returns {ReactiveVar} the ReactiveVar which contains the CheckStatus
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
            //console.debug( 'validity', valid );
            this.#validity.set( valid );
        }
        return this.#validity.get();
    }
});
