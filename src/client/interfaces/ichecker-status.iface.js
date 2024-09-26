/*
 * pwix:forms/src/client/interfaces/ichecker-status.iface.js
 *
 * ICheckerStatus manages, at the Checker level, both:
 * - a true|false validity
 * - a FieldStatus
 */

import _ from 'lodash';
const assert = require( 'assert' ).strict;
import { DeclareMixin } from '@vestergaard-company/js-mixin';

import { FieldStatus } from '../../common/definitions/field-status.def.js'

export const ICheckerStatus = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    /*
     * @summary Consolidate the validity/status of each checker to their parent (down-to-up)
     *  Update the relevant Checker data
     */
    _consolidateStatusCheckersUp(){
        _trace( 'ICheckerStatus._consolidateStatusCheckersUp' );
        const parent = this.confParent();
        if( parent ){
            let valid = true;
            let statuses = [];
            parent.rtChildren().forEach(( child ) => {
                valid &&= child.iStatusableValidity();
                statuses.push( child.iStatusableStatus());
            });
            parent.iStatusableValidity( valid );
            parent.iStatusableStatus( FieldStatus.worst( statuses ));
            parent._consolidateStatusCheckersUp();
        }
    }

    /*
     * @summary Consolidate the validity/status of each field for this checker
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     */
    _consolidateStatusFields( opts ){
        _trace( 'ICheckerStatus._consolidateStatusFields' );
        if( opts.ignoreFields !== true ){
            let valid = true;
            let statuses = [ FieldStatus.C.NONE ];
            const cb = function( name, spec ){
                valid &&= spec.iStatusableValidity();
                statuses.push( spec.iStatusableStatus());
                return valid;
            };
            this.fieldsIterate( cb );
            this.iStatusableValidity( valid );
            this.iStatusableStatus( FieldStatus.worst( statuses ));
        }
    }

    /**
     * @returns {ICheckerStatus} the instance
     */
    constructor( name, args ){
        _trace( 'ICheckerStatus.ICheckerStatus' );
        super( ...arguments );
        return this;
    }

    /**
     * @summary Consolidate the validity/status of each field for this checker
     *  Update the relevant Checker data
     * @param {Any} opts an optional behaviour options
     *  cf. Checker.check for a description of the known options
     * @returns {Boolean} the true|false validity flag of this checker
     */
    statusConsolidate( opts ){
        _trace( 'ICheckerStatus.statusConsolidate' );
        this._consolidateStatusFields( opts );
        this._consolidateStatusCheckersUp();
        //console.debug( 'setting checker status, validity to', this.iCheckableId(), this.iStatusableStatus(), this.iStatusableValidity());
        return this.iStatusableValidity();
    }

    /**
     * @summary Setup an autorun to update the OK button
     */
    statusInstallOkAutorun(){
        _trace( 'ICheckerStatus.statusInstallOkAutorun' );
        const self = this;
        this.argInstance().autorun(() => {
            const valid = self.iStatusableValidity();
            //console.debug( 'running ok autorun', self.iCheckableId(), valid );
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
});
