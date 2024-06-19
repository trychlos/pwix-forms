/*
 * pwix:forms/src/client/interfaces/icheck-status.iface.js
 *
 * ICheckStatus let us manage the results checks.
 *
 * We have to maintain here:
 *
 * - A status per row in an array-ed panel
 * - a status at the panel level
 *
 * Where each status is both:
 * - a boolean status, named 'validity'
 * - and an indicator of the level of the status, name 'status'
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { TM } from 'meteor/pwix:typed-message';
import { ReactiveVar } from 'meteor/reactive-var';

import '../../common/js/index.js';

import { CheckStatus } from '../../common/definitions/check-status.def.js'

export const ICheckStatus = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // the validity status for this checker
    #valid = new ReactiveVar( false );

    // the check status for this checker
    #status = new ReactiveVar( CheckStatus.C.NONE );

    // private methods

    // reset the validity status to its initial true value
    _reset(){
        _trace( 'ICheckStatus._reset' );
        this.#status.set( CheckStatus.C.NONE );
        this.#valid.set( true );
    }

    // update the check status, consolidating from a field to the panel
    _updateStatus( status ){
        _trace( 'ICheckStatus._updateStatus' );
        const next = CheckStatus.worst([ this.#status.get(), status ]);
        console.debug( 'consolidating to', next );
        this.#status.set( next );
    }

    // update the validity status by AND-ed it with a field check computation status
    _updateValidity( valid ){
        _trace( 'ICheckStatus._updateValidity' );
        this.#valid.set( this.#valid.get() && valid );
    }

    /**
     * @returns {ICheckStatus} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckStatus.ICheckStatus' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Clear all status
     */
    iCkStatusClear(){
        _trace( 'ICheckStatus.iCkStatusClear' );
    }

    /**
     * @summary Compute the check result
     * @param {Object} eltData The dataset associated to the DOM element
     * @param {null|TypedMessage|Array<TypedMessage>} errs the value(s) returned by a single field-defined check function
     * @returns {Object} with following keys:
     *  - valid: true|false
     *  - status: invalid/uncomplete/valid/none
     */
    iCkStatusCompute( eltData, errs ){
        _trace( 'ICheckStatus.iCkStatusCompute' );
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
        console.debug( res );
        // update element validity and status
        eltData.valid.set( res.valid );
        eltData.status.set( res.status );
        // update the panel status and validity
        this._updateStatus( res.status );
        this._updateValidity( res.valid );
        return res;
    }

    /**
     * Getter/Setter
     * @param {CheckResult} status
     * @returns {CheckResult} the current (consolidated) check status
     */
    iCkStatusStatus( status ){
        _trace( 'ICheckStatus.iCkStatusStatus' );
        if( status !== undefined ){
            this.#status.set( status );
        }
        return this.#status.get();
    }

    /**
     * Getter/Setter
     * @param {Boolean} valid
     * @returns {Boolean} the current (consolidated) validity
     */
    iCkStatusValidity( valid ){
        _trace( 'ICheckStatus.iCkStatusValidity' );
        if( valid === true || valid === false ){
            this.#valid.set( valid );
        }
        return this.#valid.get();
    }

    /**
     * @summary Setup an autorun to update the OK button
     */
    statusInstallOkAutorun(){
        _trace( 'ICheckStatus.statusInstallOkAutorun' );
        const self = this;
        this.argInstance().autorun(() => {
            const valid = self.#valid.get();
            const $ok = self.conf$Ok()
            if( $ok && $ok.length ){
                $ok.prop( 'disabled', !valid );
            }
            const okFn = self.confOkFn()
            if( okFn ){
                okFn( valid );
            }
        });
    }

    /**
     * @summary Setup an autorun to bubble up to the parent the check status
     */
    statusInstallStatusAutorun(){
        _trace( 'ICheckStatus.statusInstallStatusAutorun' );
        const self = this;
        this.argInstance().autorun(() => {
            const status = self.#status.get();
            self.iCkHierarchyUp( '_updateStatus', status );
        });
    }

    /**
     * @summary Setup an autorun to bubble up to the parent the validity result
     */
    statusInstallValidityAutorun(){
        _trace( 'ICheckStatus.statusInstallValidityAutorun' );
        const self = this;
        this.argInstance().autorun(() => {
            const valid = self.#valid.get();
            self.iCkHierarchyUp( '_updateValidity', valid );
        });
    }
});
