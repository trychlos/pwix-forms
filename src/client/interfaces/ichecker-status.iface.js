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

import { Logger } from 'meteor/pwix:logger';

import { FieldStatus } from '../../common/definitions/field-status.def.js'

const logger = Logger.get();

export const ICheckerStatus = DeclareMixin(( superclass ) => class extends superclass {

    // private data

    // private methods

    /*
     * @summary Consolidate the validity/status of each checker to their parent (down-to-up)
     *  Update the relevant Checker data
     */
    _consolidateStatusCheckersUp(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus._consolidateStatusCheckersUp()' );
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
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus._consolidateStatusFields()', opts );
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
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus.ICheckerStatus()', name, args );
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
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus.statusConsolidate()', opts );
        this._consolidateStatusFields( opts );
        this._consolidateStatusCheckersUp();
        return this.iStatusableValidity();
    }

    /**
     * @summary Setup an autorun to update the OK button
     */
    statusInstallOkAutorun(){
        logger.verbose({ verbosity: Forms.configure().verbosity, against: Forms.C.Verbose.FUNCTIONS }, 'ICheckerStatus.statusInstallOkAutorun()' );
        const self = this;
        this.argInstance().autorun(() => {
            const valid = self.iStatusableValidity();
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
