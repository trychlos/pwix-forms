/*
 * pwix:forms/src/client/interfaces/icheck-status.iface.js
 *
 * ICheckStatus let us manage the results checks.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { TM } from 'meteor/pwix:typed-message';

import { CheckStatus } from '../../common/definitions/check-status.def.js'

export const ICheckStatus = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    /**
     * @returns {ICheckStatus} the instance
     */
    constructor( name, args ){
        super( ...arguments );
        return this;
    }

    /**
     * @summary Clear all status
     */
    iStatusClear(){
    }

    /**
     * @summary Compute the check result
     * @param {Object} eltData The dataset associated to the DOM element
     * @param {null|TypedMessage|Array<TypedMessage>} errs the value(s) returned by a single field-defined check function
     * @returns {Object} with following keys:
     *  - valid: true|false
     *  - status: invalid/uncomplete/valid/none
     */
    iStatusCompute( eltData, errs ){
        let status = CheckStatus.K.NONE;
        let valid = true;
        if( errs ){
            if( errs instanceof TM.TypedMessage ){
                errs = [ errs ];
            }
            let statuses = [];
            console.debug( 'errs', errs );
            errs.forEach(( tm ) => {
                if( tm instanceof TM.TypedMessage ){
                    const level = tm.iTypedMessageType();
                    // compute validity while true
                    valid &&= ( TM.TypeOrder.compare( level, TM.MessageType.C.ERROR ) < 0 );
                } else {
                    console.warn( 'expected ITypedMessage, found', tm );
                }
                // compute the status
                if( !valid ){
                    statuses.push( CheckStatus.C.INVALID );
                } else if( level === TM.MessageType.C.WARNING ){
                    statuses.push( CheckStatus.C.UNCOMPLETE );
                }
            });
            status = CheckStatus.worst( statuses );
        // if no err has been detected, may want show a status depending of the type of the field
        } else {
            const type = eltData.spec.iFieldType();
            switch( type ){
                case 'INFO':
                    status = CheckStatus.C.NONE;
                    break;
                default:
                    status = CheckStatus.C.VALID;
                    break
            }
        }
        const res = { valid: valid, status: status };
        return res;
    }
});
