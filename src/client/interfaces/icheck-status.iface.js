/*
 * pwix:forms/src/common/interfaces/icheck-status.iface.js
 *
 * ICheckStatus let us manage the results checks.
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { TM } from 'meteor/pwix:typed-message';

import { CheckStatus } from '../../common/definitions/check-status.def.js';

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
     * @param {null|TypedMessage|Array<TypedMessage>}
     */
    iStatusCompute( eltData, errs ){
        let status = CheckStatus.K.NONE;
        if( errs ){

        }
        if( err ){
            switch( err.iTypedMessageType()){
                case TM.MessageType.C.ERROR:
                    status = 'INVALID';
                    break;
                case TM.MessageType.C.WARNING:
                    status = 'UNCOMPLETE';
                    break;
            }
        } else if( eltData.defn.type ){
            switch( eltData.defn.type ){
                case 'INFO':
                    status = 'NONE';
                    break;
                default:
                    status = 'VALID';
                    break
            }
        }
        //console.debug( eltData, err, status );
        return status;
    }
});
